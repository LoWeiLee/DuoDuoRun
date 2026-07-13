/*
 * ⚠ 歷史原型 — 唯讀，請勿修改、請勿 import。
 *
 * 這是多多快跑最早的單檔實作（React + 統計核心 + 檔案解析全部混在一起）。
 * 現行程式碼已把統計核心抽到 src/lib/stats/、UI 抽到 src/components/ 與
 * src/analyses/，本檔不再參與 build、不被任何模組 import。
 *
 * 保留原因：src/lib/stats/{pvalue,descriptive,ttest}.js 的檔頭註解以本檔為
 * 出處（「從 reference/statlite.jsx 抽出，已對標 SPSS / R」）——刪掉會讓那些
 * 溯源說明失去指向。
 *
 * 已於 eslint.config.js 的 globalIgnores 排除（2026-07-13 紅隊 R4）：它的舊寫法
 * 會持續產生 lint 噪音，掩蓋真正該修的新警報。
 */
import { useState, useCallback } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

// ══════════════════════════════════════════════════════════
//  Statistical Math (Numerical Methods)
// ══════════════════════════════════════════════════════════

function lgamma(x) {
  const c = [76.18009172947146,-86.50532032941677,24.01409824083091,
    -1.231739572450155,0.1208650973866179e-2,-0.5395239384953e-5];
  let y=x, tmp=x+5.5;
  tmp -= (x+0.5)*Math.log(tmp);
  let ser=1.000000000190015;
  for (let j=0;j<6;j++) ser += c[j]/ ++y;
  return -tmp+Math.log(2.5066282746310005*ser/x);
}

function betacf(x,a,b) {
  const MAXIT=200,EPS=3e-7,FPMIN=1e-30;
  const qab=a+b,qap=a+1,qam=a-1;
  let c=1,d=1-qab*x/qap;
  if(Math.abs(d)<FPMIN) d=FPMIN; d=1/d; let h=d;
  for(let m=1;m<=MAXIT;m++){
    const m2=2*m;
    let aa=m*(b-m)*x/((qam+m2)*(a+m2));
    d=1+aa*d; if(Math.abs(d)<FPMIN) d=FPMIN;
    c=1+aa/c; if(Math.abs(c)<FPMIN) c=FPMIN;
    d=1/d; h*=d*c;
    aa=-(a+m)*(qab+m)*x/((a+m2)*(qap+m2));
    d=1+aa*d; if(Math.abs(d)<FPMIN) d=FPMIN;
    c=1+aa/c; if(Math.abs(c)<FPMIN) c=FPMIN;
    d=1/d; const del=d*c; h*=del;
    if(Math.abs(del-1)<EPS) break;
  }
  return h;
}

function ibeta(x,a,b) {
  if(x<=0) return 0; if(x>=1) return 1;
  const lbet=lgamma(a)+lgamma(b)-lgamma(a+b);
  const bt=Math.exp(Math.log(x)*a+Math.log(1-x)*b-lbet);
  return x<(a+1)/(a+b+2) ? bt*betacf(x,a,b)/a : 1-bt*betacf(1-x,b,a)/b;
}

const pT = (t,df) => ibeta(df/(df+t*t), df/2, 0.5);       // two-tailed
const pF = (f,d1,d2) => ibeta(d2/(d2+d1*f), d2/2, d1/2); // right-tail

// ══════════════════════════════════════════════════════════
//  Descriptive Helpers
// ══════════════════════════════════════════════════════════

const mean = a => a.reduce((s,v)=>s+v,0)/a.length;
const variance = (a,ddof=1) => { const m=mean(a); return a.reduce((s,v)=>s+(v-m)**2,0)/(a.length-ddof); };
const sd = (a,ddof=1) => Math.sqrt(variance(a,ddof));
const median = a => { const s=[...a].sort((x,y)=>x-y),m=Math.floor(s.length/2); return s.length%2?s[m]:(s[m-1]+s[m])/2; };
const skew = a => { const n=a.length,m=mean(a),s=sd(a); return n/((n-1)*(n-2))*a.reduce((ss,v)=>ss+((v-m)/s)**3,0); };
const kurt = a => { const n=a.length,m=mean(a),s=sd(a),s4=a.reduce((ss,v)=>ss+((v-m)/s)**4,0); return n*(n+1)/((n-1)*(n-2)*(n-3))*s4-3*(n-1)**2/((n-2)*(n-3)); };
const nums = (data,col) => data.map(r=>parseFloat(r[col])).filter(v=>!isNaN(v));

// ══════════════════════════════════════════════════════════
//  Analysis Runners
// ══════════════════════════════════════════════════════════

function descStats(data, vars) {
  return vars.map(v => {
    const a=nums(data,v);
    if(!a.length) return {v,err:'No numeric data'};
    return {v, n:a.length, mean:mean(a), sd:sd(a), se:sd(a)/Math.sqrt(a.length),
      min:Math.min(...a), max:Math.max(...a), median:median(a), skew:skew(a), kurt:kurt(a)};
  });
}

function groupify(data, dep, grp) {
  const G={};
  data.forEach(r=>{const g=r[grp],v=parseFloat(r[dep]); if(!isNaN(v)&&g!==''&&g!=null){if(!G[g])G[g]=[];G[g].push(v);}});
  return G;
}

function indepT(data, dep, grp) {
  const G=groupify(data,dep,grp), ks=Object.keys(G);
  if(ks.length!==2) return {err:'Group variable must have exactly 2 groups (found '+ks.length+')'};
  const [g1,g2]=ks, a1=G[g1], a2=G[g2];
  const n1=a1.length,n2=a2.length,m1=mean(a1),m2=mean(a2),v1=variance(a1),v2=variance(a2);
  const se=Math.sqrt(v1/n1+v2/n2);
  const t=(m1-m2)/se;
  const df=(v1/n1+v2/n2)**2/((v1/n1)**2/(n1-1)+(v2/n2)**2/(n2-1));
  return {label:"Independent Samples t-test (Welch's)",
    grps:[{name:g1,n:n1,m:m1,s:Math.sqrt(v1)},{name:g2,n:n2,m:m2,s:Math.sqrt(v2)}],
    t,df,p:pT(Math.abs(t),df),diff:m1-m2,se};
}

function oneT(data, dep, mu0) {
  const a=nums(data,dep),n=a.length,m=mean(a),s=sd(a),se=s/Math.sqrt(n);
  const t=(m-mu0)/se,df=n-1;
  return {label:'One-Sample t-test',n,m,s,se,mu0,t,df,p:pT(Math.abs(t),df)};
}

function pairedT(data, v1, v2) {
  const pairs=data.map(r=>[parseFloat(r[v1]),parseFloat(r[v2])]).filter(([a,b])=>!isNaN(a)&&!isNaN(b));
  const d=pairs.map(([a,b])=>a-b),n=d.length,m=mean(d),s=sd(d),se=s/Math.sqrt(n);
  const t=m/se,df=n-1;
  return {label:'Paired Samples t-test',n,m,s,se,t,df,p:pT(Math.abs(t),df)};
}

function corrAnalysis(data, vars) {
  const res=[];
  for(let i=0;i<vars.length;i++) for(let j=i+1;j<vars.length;j++){
    const pairs=data.map(r=>[parseFloat(r[vars[i]]),parseFloat(r[vars[j]])]).filter(([a,b])=>!isNaN(a)&&!isNaN(b));
    const n=pairs.length;
    if(n<3){res.push({v1:vars[i],v2:vars[j],r:NaN,p:NaN,n});continue;}
    const x=pairs.map(p=>p[0]),y=pairs.map(p=>p[1]),mx=mean(x),my=mean(y);
    const Sxy=x.reduce((s,xi,k)=>s+(xi-mx)*(y[k]-my),0);
    const den=Math.sqrt(x.reduce((s,xi)=>s+(xi-mx)**2,0)*y.reduce((s,yi)=>s+(yi-my)**2,0));
    const r=den===0?0:Sxy/den;
    const p=Math.abs(r)>=1?0:pT(Math.abs(r)*Math.sqrt((n-2)/(1-r*r)),n-2);
    res.push({v1:vars[i],v2:vars[j],r,p,n});
  }
  return res;
}

function oneWayANOVA(data, dep, grp) {
  const G=groupify(data,dep,grp),ks=Object.keys(G),k=ks.length;
  if(k<2) return {err:'Need at least 2 groups'};
  const all=ks.flatMap(g=>G[g]),N=all.length,gm=mean(all);
  const SSb=ks.reduce((s,g)=>s+G[g].length*(mean(G[g])-gm)**2,0);
  const SSw=ks.reduce((s,g)=>{const m=mean(G[g]);return s+G[g].reduce((ss,v)=>ss+(v-m)**2,0);},0);
  const dfb=k-1,dfw=N-k,MSb=SSb/dfb,MSw=SSw/dfw,F=MSb/MSw;
  return {k,N,SSb,SSw,SSt:SSb+SSw,dfb,dfw,MSb,MSw,F,p:pF(F,dfb,dfw),
    grps:ks.map(g=>({name:g,n:G[g].length,m:mean(G[g]),s:sd(G[g])}))};
}

function simpleReg(data, xv, yv) {
  const pairs=data.map(r=>[parseFloat(r[xv]),parseFloat(r[yv])]).filter(([a,b])=>!isNaN(a)&&!isNaN(b));
  const n=pairs.length;
  if(n<3) return {err:'Insufficient data (need ≥ 3 cases)'};
  const X=pairs.map(p=>p[0]),Y=pairs.map(p=>p[1]),mx=mean(X),my=mean(Y);
  const Sxy=X.reduce((s,xi,i)=>s+(xi-mx)*(Y[i]-my),0);
  const Sxx=X.reduce((s,xi)=>s+(xi-mx)**2,0);
  if(Sxx===0) return {err:'No variance in X variable'};
  const b1=Sxy/Sxx,b0=my-b1*mx;
  const Yhat=X.map(xi=>b0+b1*xi);
  const SSres=Y.reduce((s,yi,i)=>s+(yi-Yhat[i])**2,0);
  const SStot=Y.reduce((s,yi)=>s+(yi-my)**2,0);
  const SSreg=SStot-SSres,r2=SStot===0?0:SSreg/SStot,adjR2=1-(1-r2)*(n-1)/(n-2);
  const MSres=SSres/(n-2),MSreg=SSreg,F=MSres===0?Infinity:MSreg/MSres;
  const se_b1=Math.sqrt(MSres/Sxx),se_b0=Math.sqrt(MSres*(1/n+mx*mx/Sxx));
  const t_b0=b0/se_b0,t_b1=b1/se_b1;
  return {n,b0,b1,se_b0,se_b1,t_b0,t_b1,
    p_b0:pT(Math.abs(t_b0),n-2),p_b1:pT(Math.abs(t_b1),n-2),
    r2,adjR2,SSreg,SSres,SStot,MSreg,MSres,F,p:pF(F,1,n-2)};
}

// ══════════════════════════════════════════════════════════
//  Formatting
// ══════════════════════════════════════════════════════════

const f = (v,d=3) => (typeof v==='number'&&!isNaN(v)&&isFinite(v)) ? v.toFixed(d) : '—';
const fp = p => { if(p===undefined||p===null||isNaN(p)) return '—'; return p<.001?'< .001':p.toFixed(3); };
const star = p => (p<.001?'***':p<.01?'**':p<.05?'*':'');

// ══════════════════════════════════════════════════════════
//  UI Primitives
// ══════════════════════════════════════════════════════════

const Sel = ({label,value,onChange,options,placeholder}) => (
  <div>
    <label className="block text-xs text-slate-500 mb-1">{label}</label>
    <select value={value} onChange={e=>onChange(e.target.value)}
      className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
      <option value="">{placeholder||'— select —'}</option>
      {options.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const CB = ({label,checked,onChange}) => (
  <label className="flex items-center gap-2 cursor-pointer py-1 px-2 rounded hover:bg-slate-50">
    <input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)} className="accent-blue-500 w-3.5 h-3.5" />
    <span className="text-sm text-slate-700 truncate">{label}</span>
  </label>
);

function Tbl({headers,rows,className=''}) {
  return (
    <div className={`overflow-x-auto rounded-lg border border-slate-200 ${className}`}>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {headers.map(h=><th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 text-xs whitespace-nowrap">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row,i)=>(
            <tr key={i} className={i%2===0?'bg-white':'bg-slate-50/40'}>
              {row.map((cell,j)=><td key={j} className="px-3 py-2 text-slate-700 whitespace-nowrap font-mono text-xs">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const SigNote = () => (
  <div className="text-xs text-slate-400 mt-2">* p &lt; .05 &nbsp; ** p &lt; .01 &nbsp; *** p &lt; .001</div>
);

const SectionTitle = ({children}) => (
  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 mt-4 first:mt-0">{children}</div>
);

// ══════════════════════════════════════════════════════════
//  Results Renderers
// ══════════════════════════════════════════════════════════

function DescResults({data}) {
  return <>
    <div className="font-semibold text-slate-700 mb-4">Descriptive Statistics</div>
    <Tbl
      headers={['Variable','N','Mean','SD','SE','Min','Max','Median','Skewness','Kurtosis']}
      rows={data.map(r => r.err
        ? [r.v,'—','—','—','—','—','—','—','—','—']
        : [r.v, r.n, f(r.mean), f(r.sd), f(r.se), f(r.min), f(r.max), f(r.median), f(r.skew), f(r.kurt)]
      )}
    />
  </>;
}

function TTestResults({data:r}) {
  if(r.err) return <div className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{r.err}</div>;
  return <>
    <div className="font-semibold text-slate-700 mb-4">{r.label}</div>
    {r.grps && <>
      <SectionTitle>Group Statistics</SectionTitle>
      <Tbl className="mb-1" headers={['Group','N','Mean','SD']}
        rows={r.grps.map(g=>[g.name, g.n, f(g.m), f(g.s)])} />
    </>}
    {r.mu0 !== undefined && <>
      <SectionTitle>Sample Statistics</SectionTitle>
      <Tbl className="mb-1" headers={['N','Mean','SD','SE','Test Value (μ₀)']}
        rows={[[r.n, f(r.m), f(r.s), f(r.se), r.mu0]]} />
    </>}
    {r.mu0 === undefined && !r.grps && <>
      <SectionTitle>Difference Statistics</SectionTitle>
      <Tbl className="mb-1" headers={['N','Mean Difference','SD','SE']}
        rows={[[r.n, f(r.m), f(r.s), f(r.se)]]} />
    </>}
    <SectionTitle>t-Test Results</SectionTitle>
    <Tbl headers={['t','df','p (two-tailed)','']}
      rows={[[f(r.t,4), f(r.df,2), fp(r.p), star(r.p)]]} />
    {r.diff !== undefined && (
      <div className="text-xs text-slate-400 mt-2">
        Mean difference: {f(r.diff,4)} &nbsp;|&nbsp; 95% CI (approx): [{f(r.diff-1.96*r.se,4)}, {f(r.diff+1.96*r.se,4)}]
      </div>
    )}
    <SigNote />
  </>;
}

function CorrResults({data}) {
  if(!data.length) return <div className="text-slate-500 text-sm">No pairs computed.</div>;
  return <>
    <div className="font-semibold text-slate-700 mb-4">Pearson Correlation Matrix</div>
    <Tbl headers={['Variable 1','Variable 2','N','r','p (two-tailed)','']}
      rows={data.map(r=>[r.v1, r.v2, r.n, f(r.r,4), fp(r.p), star(r.p)])} />
    <SigNote />
  </>;
}

function AnovaResults({data:r}) {
  if(r.err) return <div className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{r.err}</div>;
  return <>
    <div className="font-semibold text-slate-700 mb-4">One-Way ANOVA</div>
    <SectionTitle>Group Statistics (k = {r.k}, N = {r.N})</SectionTitle>
    <Tbl className="mb-1" headers={['Group','N','Mean','SD']}
      rows={r.grps.map(g=>[g.name, g.n, f(g.m), f(g.s)])} />
    <SectionTitle>ANOVA Table</SectionTitle>
    <Tbl headers={['Source','SS','df','MS','F','p','']}
      rows={[
        ['Between Groups', f(r.SSb), r.dfb, f(r.MSb), f(r.F,4), fp(r.p), star(r.p)],
        ['Within Groups',  f(r.SSw), r.dfw, f(r.MSw), '',        '',      ''],
        ['Total',          f(r.SSt), r.dfb+r.dfw, '', '', '',     ''],
      ]} />
    <SigNote />
  </>;
}

function RegResults({data:r}) {
  if(r.err) return <div className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{r.err}</div>;
  return <>
    <div className="font-semibold text-slate-700 mb-4">Simple Linear Regression</div>
    <SectionTitle>Model Summary (N = {r.n})</SectionTitle>
    <Tbl className="mb-1" headers={['R²','Adj. R²','F','df1','df2','p','']}
      rows={[[f(r.r2,4), f(r.adjR2,4), f(r.F,4), 1, r.n-2, fp(r.p), star(r.p)]]} />
    <SectionTitle>ANOVA Table</SectionTitle>
    <Tbl className="mb-1" headers={['Source','SS','df','MS','F','p']}
      rows={[
        ['Regression', f(r.SSreg), 1,     f(r.MSreg), f(r.F,4), fp(r.p)],
        ['Residual',   f(r.SSres), r.n-2, f(r.MSres), '',        ''],
        ['Total',      f(r.SStot), r.n-1, '',          '',        ''],
      ]} />
    <SectionTitle>Coefficients</SectionTitle>
    <Tbl headers={['','B','SE','t','p','']}
      rows={[
        ['(Intercept)', f(r.b0), f(r.se_b0), f(r.t_b0,4), fp(r.p_b0), star(r.p_b0)],
        ['X (predictor)', f(r.b1), f(r.se_b1), f(r.t_b1,4), fp(r.p_b1), star(r.p_b1)],
      ]} />
    <SigNote />
  </>;
}

// ══════════════════════════════════════════════════════════
//  Config Panels
// ══════════════════════════════════════════════════════════

function DescConfig({numericCols,selected,onToggle}) {
  return <>
    <div className="text-sm font-semibold text-slate-700 mb-3">Select Variables</div>
    <div className="grid grid-cols-2 gap-x-2 max-h-52 overflow-y-auto border border-slate-100 rounded-lg p-2">
      {numericCols.map(c=><CB key={c} label={c} checked={selected.includes(c)} onChange={()=>onToggle(c)} />)}
    </div>
  </>;
}

function TTestConfig({columns,numericCols,tTestType,setTTestType,tDepVar,setTDepVar,tGroupVar,setTGroupVar,tVar2,setTVar2,tMu0,setTMu0}) {
  return <div className="space-y-4">
    <div>
      <div className="text-sm font-semibold text-slate-700 mb-2">Test Type</div>
      <div className="flex gap-5">
        {[['independent','Independent Samples'],['paired','Paired Samples'],['onesample','One Sample']].map(([v,l])=>(
          <label key={v} className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input type="radio" value={v} checked={tTestType===v} onChange={()=>setTTestType(v)} className="accent-blue-500" />{l}
          </label>
        ))}
      </div>
    </div>
    {tTestType==='independent' && <>
      <Sel label="Dependent Variable (numeric)" value={tDepVar} onChange={setTDepVar} options={numericCols} />
      <Sel label="Group Variable (2 groups)" value={tGroupVar} onChange={setTGroupVar} options={columns} />
    </>}
    {tTestType==='paired' && <>
      <Sel label="Variable 1" value={tDepVar} onChange={setTDepVar} options={numericCols} />
      <Sel label="Variable 2" value={tVar2} onChange={setTVar2} options={numericCols} />
    </>}
    {tTestType==='onesample' && <>
      <Sel label="Variable" value={tDepVar} onChange={setTDepVar} options={numericCols} />
      <div>
        <label className="block text-xs text-slate-500 mb-1">Test Value (μ₀)</label>
        <input type="number" value={tMu0} onChange={e=>setTMu0(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-blue-300" />
      </div>
    </>}
  </div>;
}

function CorrConfig({numericCols,selected,onToggle}) {
  return <>
    <div className="text-sm font-semibold text-slate-700 mb-1">Select Variables <span className="text-slate-400 font-normal">(≥ 2, all pairs computed)</span></div>
    <div className="grid grid-cols-2 gap-x-2 max-h-52 overflow-y-auto border border-slate-100 rounded-lg p-2 mt-3">
      {numericCols.map(c=><CB key={c} label={c} checked={selected.includes(c)} onChange={()=>onToggle(c)} />)}
    </div>
  </>;
}

function AnovaConfig({columns,numericCols,depVar,setDepVar,groupVar,setGroupVar}) {
  return <div className="space-y-4">
    <Sel label="Dependent Variable (numeric)" value={depVar} onChange={setDepVar} options={numericCols} />
    <Sel label="Factor / Group Variable" value={groupVar} onChange={setGroupVar} options={columns} />
  </div>;
}

function RegConfig({numericCols,xVar,setXVar,yVar,setYVar}) {
  return <div className="space-y-4">
    <Sel label="Independent Variable (X)" value={xVar} onChange={setXVar} options={numericCols} />
    <Sel label="Dependent Variable (Y)" value={yVar} onChange={setYVar} options={numericCols} />
  </div>;
}

// ══════════════════════════════════════════════════════════
//  Main App
// ══════════════════════════════════════════════════════════

export default function StatApp() {
  const [data, setData] = useState(null);
  const [columns, setColumns] = useState([]);
  const [numCols, setNumCols] = useState([]);
  const [activeTab, setActiveTab] = useState('desc');
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  // Selections
  const [descVars, setDescVars] = useState([]);
  const [tTestType, setTTestType] = useState('independent');
  const [tDepVar, setTDepVar] = useState('');
  const [tGroupVar, setTGroupVar] = useState('');
  const [tVar2, setTVar2] = useState('');
  const [tMu0, setTMu0] = useState('0');
  const [corrVars, setCorrVars] = useState([]);
  const [anovaDep, setAnovaDep] = useState('');
  const [anovaGrp, setAnovaGrp] = useState('');
  const [regX, setRegX] = useState('');
  const [regY, setRegY] = useState('');

  const ingest = useCallback((rows, name='') => {
    if(!rows?.length) { setError('File appears to be empty.'); return; }
    const cols = Object.keys(rows[0]);
    const nCols = cols.filter(c => {
      const sample = rows.slice(0, Math.min(rows.length, 100));
      const ok = sample.map(r=>parseFloat(r[c])).filter(v=>!isNaN(v));
      return ok.length > sample.length * 0.5;
    });
    setData(rows); setColumns(cols); setNumCols(nCols); setFileName(name);
    setResults(null); setError('');
    setDescVars([]); setCorrVars([]);
    setTDepVar(''); setTGroupVar(''); setTVar2('');
    setAnovaDep(''); setAnovaGrp(''); setRegX(''); setRegY('');
  }, []);

  const handleFile = useCallback((file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'csv') {
      Papa.parse(file, { header:true, skipEmptyLines:true, complete: r => ingest(r.data, file.name) });
    } else if (['xlsx','xls'].includes(ext)) {
      const reader = new FileReader();
      reader.onload = e => {
        const wb = XLSX.read(e.target.result, {type:'binary'});
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {defval:''});
        ingest(rows, file.name);
      };
      reader.readAsBinaryString(file);
    } else {
      setError('Please upload a CSV or XLSX file.');
    }
  }, [ingest]);

  const toggle = (v, sel, setSel) => setSel(p => p.includes(v) ? p.filter(x=>x!==v) : [...p,v]);

  const run = () => {
    setError(''); setResults(null);
    try {
      if (activeTab==='desc') {
        if(!descVars.length){setError('Select at least one variable.');return;}
        setResults({type:'desc',d:descStats(data,descVars)});
      } else if (activeTab==='ttest') {
        let r;
        if(tTestType==='independent'){if(!tDepVar||!tGroupVar){setError('Select both variables.');return;} r=indepT(data,tDepVar,tGroupVar);}
        else if(tTestType==='onesample'){if(!tDepVar){setError('Select a variable.');return;} r=oneT(data,tDepVar,parseFloat(tMu0)||0);}
        else{if(!tDepVar||!tVar2){setError('Select both variables.');return;} r=pairedT(data,tDepVar,tVar2);}
        setResults({type:'ttest',d:r});
      } else if (activeTab==='corr') {
        if(corrVars.length<2){setError('Select at least 2 variables.');return;}
        setResults({type:'corr',d:corrAnalysis(data,corrVars)});
      } else if (activeTab==='anova') {
        if(!anovaDep||!anovaGrp){setError('Select both variables.');return;}
        setResults({type:'anova',d:oneWayANOVA(data,anovaDep,anovaGrp)});
      } else if (activeTab==='reg') {
        if(!regX||!regY){setError('Select X and Y variables.');return;}
        setResults({type:'reg',d:simpleReg(data,regX,regY)});
      }
    } catch(e) { setError('Computation error: '+e.message); }
  };

  // ── Upload screen ──────────────────────────────────────

  if (!data) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📊</div>
          <div className="text-2xl font-bold text-slate-800">StatLite</div>
          <div className="text-slate-500 text-sm mt-1">Lightweight statistical analysis · No installation needed</div>
        </div>
        <div
          className="border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all bg-white shadow-sm"
          onDragOver={e=>e.preventDefault()}
          onDrop={e=>{e.preventDefault();handleFile(e.dataTransfer.files[0]);}}
          onClick={()=>document.getElementById('fi').click()}>
          <div className="text-slate-600 font-medium mb-1">Drop your data file here</div>
          <div className="text-slate-400 text-sm">CSV or XLSX · First row = headers</div>
          {error && <div className="mt-4 text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</div>}
        </div>
        <div className="text-center mt-5">
          <button onClick={()=>document.getElementById('fi').click()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm">
            Choose File
          </button>
        </div>
        <div className="mt-6 grid grid-cols-5 gap-2 text-center">
          {['Descriptive','t-Test','Correlation','ANOVA','Regression'].map(s=>(
            <div key={s} className="bg-white rounded-lg px-2 py-2 text-xs text-slate-500 border border-slate-100">{s}</div>
          ))}
        </div>
        <input id="fi" type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e=>handleFile(e.target.files[0])} />
      </div>
    </div>
  );

  // ── Main interface ─────────────────────────────────────

  const tabs = [['desc','Descriptive'],['ttest','t-Test'],['corr','Correlation'],['anova','ANOVA'],['reg','Regression']];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800" style={{fontFamily:'system-ui,sans-serif'}}>
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-5 py-2.5 flex items-center gap-4 shrink-0 shadow-sm">
        <span className="font-bold text-blue-600 text-base">StatLite</span>
        <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">{fileName}</span>
        <span className="text-xs text-slate-400">{data.length.toLocaleString()} rows · {columns.length} variables</span>
        <button onClick={()=>{setData(null);setResults(null);}}
          className="ml-auto text-xs text-blue-500 hover:text-blue-700 hover:underline">
          ↩ New file
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Variable sidebar */}
        <aside className="w-44 bg-white border-r border-slate-200 flex flex-col shrink-0">
          <div className="px-3 py-2.5 border-b border-slate-100">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Variables</div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {columns.map(c=>(
              <div key={c} className="flex items-center gap-1.5 py-1 border-b border-slate-50 last:border-0">
                <span className={`text-xs px-1 py-0.5 rounded font-bold shrink-0 ${numCols.includes(c)?'bg-blue-100 text-blue-600':'bg-amber-100 text-amber-600'}`}>
                  {numCols.includes(c)?'N':'C'}
                </span>
                <span className="text-xs text-slate-600 truncate" title={c}>{c}</span>
              </div>
            ))}
          </div>
          <div className="px-3 py-2 border-t border-slate-100 text-xs text-slate-400">
            <span className="text-blue-500 font-semibold">N</span> numeric &nbsp;
            <span className="text-amber-500 font-semibold">C</span> categorical
          </div>
        </aside>

        {/* Main panel */}
        <main className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Tabs */}
          <div className="bg-white border-b border-slate-200 flex shrink-0">
            {tabs.map(([id,lbl])=>(
              <button key={id} onClick={()=>{setActiveTab(id);setResults(null);}}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab===id?'border-blue-500 text-blue-600':'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                {lbl}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl space-y-4">
              {/* Config card */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                {activeTab==='desc' && <DescConfig numericCols={numCols} selected={descVars} onToggle={v=>toggle(v,descVars,setDescVars)} />}
                {activeTab==='ttest' && <TTestConfig columns={columns} numericCols={numCols} tTestType={tTestType} setTTestType={setTTestType} tDepVar={tDepVar} setTDepVar={setTDepVar} tGroupVar={tGroupVar} setTGroupVar={setTGroupVar} tVar2={tVar2} setTVar2={setTVar2} tMu0={tMu0} setTMu0={setTMu0} />}
                {activeTab==='corr' && <CorrConfig numericCols={numCols} selected={corrVars} onToggle={v=>toggle(v,corrVars,setCorrVars)} />}
                {activeTab==='anova' && <AnovaConfig columns={columns} numericCols={numCols} depVar={anovaDep} setDepVar={setAnovaDep} groupVar={anovaGrp} setGroupVar={setAnovaGrp} />}
                {activeTab==='reg' && <RegConfig numericCols={numCols} xVar={regX} setXVar={setRegX} yVar={regY} setYVar={setRegY} />}

                {error && <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{error}</div>}

                <button onClick={run}
                  className="mt-5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-7 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm">
                  Run Analysis ▶
                </button>
              </div>

              {/* Results card */}
              {results && (
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  {results.type==='desc' && <DescResults data={results.d} />}
                  {results.type==='ttest' && <TTestResults data={results.d} />}
                  {results.type==='corr' && <CorrResults data={results.d} />}
                  {results.type==='anova' && <AnovaResults data={results.d} />}
                  {results.type==='reg' && <RegResults data={results.d} />}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
