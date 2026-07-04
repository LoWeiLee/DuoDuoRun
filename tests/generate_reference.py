#!/usr/bin/env python3
"""
多多快跑 統計驗證基準值產生器
用 scipy / statsmodels / pingouin / factor_analyzer / sklearn 產生黃金標準值。
（R 為首選基準，但沙盒無法安裝；Python 這批套件與 R 核心演算法一致，
 差異項另標記由 Kevin 本機 JASP 複核。）

輸出：
  tests/fixtures/datasets.json   — 固定種子測試資料
  tests/fixtures/reference.json  — 各方法基準值
"""
import json
import math
import os
import sys

import numpy as np
import pandas as pd
from scipy import stats as sps

HERE = os.path.dirname(os.path.abspath(__file__))
FIX = os.path.join(HERE, "fixtures")
os.makedirs(FIX, exist_ok=True)

rng = np.random.default_rng(42)

# ---------------------------------------------------------------
# 1. 測試資料集
# ---------------------------------------------------------------
N = 60
group2 = np.tile(np.array(["M", "F"]), 30)  # 交錯排列，與 group3 交叉後為平衡 2×3（每格 10）
group3 = np.array(["A"] * 20 + ["B"] * 20 + ["C"] * 20)
x1 = np.round(rng.normal(50, 10, N), 4)
x2 = np.round(0.6 * x1 + rng.normal(20, 8, N), 4)
x3 = np.round(rng.normal(100, 15, N), 4)
g3eff = np.select([group3 == "A", group3 == "B", group3 == "C"], [0.0, 4.0, 8.0])
g2eff = np.where(group2 == "M", 3.0, 0.0)
y = np.round(0.4 * x1 + 0.3 * x2 + g3eff + g2eff + rng.normal(0, 5, N), 4)

logit_p = 1 / (1 + np.exp(-(0.08 * (x1 - 50) + 1.0 * (group2 == "M") - 0.3)))
ybin = (rng.uniform(size=N) < logit_p).astype(int)

# Likert 兩因子結構（i1-i3 = F1, i4-i6 = F2）
f1 = rng.normal(0, 1, N)
f2 = 0.35 * f1 + rng.normal(0, 1, N) * math.sqrt(1 - 0.35**2)
def likert(f, loading):
    raw = loading * f + rng.normal(0, math.sqrt(1 - loading**2), N)
    return np.clip(np.round(3 + 1.1 * raw), 1, 5).astype(int)
i1, i2, i3 = likert(f1, .8), likert(f1, .75), likert(f1, .7)
i4, i5, i6 = likert(f2, .8), likert(f2, .75), likert(f2, .7)

# 重複量測（3 條件，含個體效果）
subj = rng.normal(0, 4, N)
cond1 = np.round(20 + subj + rng.normal(0, 3, N), 4)
cond2 = np.round(23 + subj + rng.normal(0, 3, N), 4)
cond3 = np.round(24.5 + subj + rng.normal(0, 3, N), 4)

# 評分者（1-4 序位，高一致性）
true_score = rng.integers(1, 5, N)
def rater(agree=0.75):
    noise = rng.uniform(size=N) > agree
    r = true_score.copy()
    r[noise] = np.clip(true_score[noise] + rng.choice([-1, 1], noise.sum()), 1, 4)
    return r
rater1, rater2 = rater(), rater()

# 2×2 類別（卡方 / Fisher）
cat_r = np.array(["Yes"] * 26 + ["No"] * 34)
cat_c = np.where(
    (cat_r == "Yes") & (rng.uniform(size=N) < 0.65) | (cat_r == "No") & (rng.uniform(size=N) < 0.35),
    "High", "Low")

main = pd.DataFrame({
    "id": np.arange(1, N + 1), "group2": group2, "group3": group3,
    "x1": x1, "x2": x2, "x3": x3, "y": y, "ybin": ybin,
    "i1": i1, "i2": i2, "i3": i3, "i4": i4, "i5": i5, "i6": i6,
    "cond1": cond1, "cond2": cond2, "cond3": cond3,
    "rater1": rater1, "rater2": rater2, "catR": cat_r, "catC": cat_c,
})

# 邊界資料集
small = pd.DataFrame({  # n=8，小樣本
    "g": ["A"] * 4 + ["B"] * 4,
    "v": [3.1, 4.2, 2.8, 5.0, 6.3, 7.1, 5.9, 8.2],
})
ties = pd.DataFrame({  # 大量並列（Likert 型）
    "g": ["A"] * 12 + ["B"] * 12,
    "v": [3, 4, 3, 2, 4, 3, 5, 3, 4, 2, 3, 4, 4, 5, 4, 3, 5, 4, 5, 5, 4, 3, 5, 4],
})

datasets = {
    "main": main.to_dict(orient="records"),
    "small": small.to_dict(orient="records"),
    "ties": ties.to_dict(orient="records"),
}
with open(os.path.join(FIX, "datasets.json"), "w") as f:
    json.dump(datasets, f, default=str)

# ---------------------------------------------------------------
# 2. 基準值
# ---------------------------------------------------------------
REF = {}
def put(name, source, **values):
    REF[name] = {"source": source, "values": {
        k: (None if v is None or (isinstance(v, float) and not math.isfinite(v)) else
            float(v) if isinstance(v, (int, float, np.floating, np.integer)) else v)
        for k, v in values.items()}}

xM = main.loc[main.group2 == "M", "x1"].values
xF = main.loc[main.group2 == "F", "x1"].values

# --- 敘述統計（pandas 偏度/峰度 = SPSS type 2）
s = main["y"]
put("descriptive_y", "pandas/scipy",
    n=len(s), mean=s.mean(), sd=s.std(ddof=1), se=s.std(ddof=1) / math.sqrt(len(s)),
    median=s.median(), min=s.min(), max=s.max(),
    skewness=s.skew(), kurtosis=s.kurt())

# --- t 檢定
t, p = sps.ttest_ind(xM, xF, equal_var=False)
df_w = sps.ttest_ind(xM, xF, equal_var=False).df
sp = math.sqrt(((len(xM)-1)*xM.var(ddof=1) + (len(xF)-1)*xF.var(ddof=1)) / (len(xM)+len(xF)-2))
put("ttest_independent_welch", "scipy.ttest_ind(equal_var=False)",
    t=t, df=df_w, p=p, d=(xM.mean()-xF.mean())/sp, meanDiff=xM.mean()-xF.mean())

c1, c2 = main["cond1"].values, main["cond2"].values
t, p = sps.ttest_rel(c1, c2)
put("ttest_paired", "scipy.ttest_rel",
    t=t, df=len(c1)-1, p=p, d=(c1-c2).mean()/ (c1-c2).std(ddof=1), meanDiff=(c1-c2).mean())

t, p = sps.ttest_1samp(main["y"], 40)
put("ttest_one_sample", "scipy.ttest_1samp(mu=40)",
    t=t, df=len(main)-1, p=p, d=(main["y"].mean()-40)/main["y"].std(ddof=1))

# --- 相關
r, p = sps.pearsonr(main["x1"], main["x2"])
put("pearson_x1_x2", "scipy.pearsonr", r=r, p=p, n=N)
rho, p = sps.spearmanr(main["x1"], main["x2"])
put("spearman_x1_x2", "scipy.spearmanr", rho=rho, p=p, n=N)

# --- One-way ANOVA + Tukey
groups = [main.loc[main.group3 == g, "y"].values for g in ["A", "B", "C"]]
F, p = sps.f_oneway(*groups)
ssb = sum(len(g)*(g.mean()-main["y"].mean())**2 for g in groups)
sst = ((main["y"]-main["y"].mean())**2).sum()
ssw = sst - ssb
msw = ssw / (N-3)
put("anova_oneway", "scipy.f_oneway",
    F=F, p=p, dfBetween=2, dfWithin=N-3,
    ssBetween=ssb, ssWithin=ssw, ssTotal=sst,
    eta2=ssb/sst, omega2=(ssb-2*msw)/(sst+msw))
tk = sps.tukey_hsd(*groups)
put("tukey_hsd", "scipy.tukey_hsd",
    p_AB=tk.pvalue[0][1], p_AC=tk.pvalue[0][2], p_BC=tk.pvalue[1][2])

# --- 迴歸
import statsmodels.api as sm
X = sm.add_constant(main[["x1"]])
m = sm.OLS(main["y"], X).fit()
put("regression_simple", "statsmodels.OLS",
    intercept=m.params["const"], slope=m.params["x1"],
    seSlope=m.bse["x1"], tSlope=m.tvalues["x1"], pSlope=m.pvalues["x1"],
    r2=m.rsquared, adjR2=m.rsquared_adj, F=m.fvalue, pF=m.f_pvalue)

X = sm.add_constant(main[["x1", "x2", "x3"]])
m = sm.OLS(main["y"], X).fit()
from statsmodels.stats.outliers_influence import variance_inflation_factor
vifs = [variance_inflation_factor(X.values, i) for i in range(1, X.shape[1])]
put("regression_multiple", "statsmodels.OLS",
    intercept=m.params["const"],
    b_x1=m.params["x1"], b_x2=m.params["x2"], b_x3=m.params["x3"],
    se_x1=m.bse["x1"], t_x1=m.tvalues["x1"], p_x1=m.pvalues["x1"],
    r2=m.rsquared, adjR2=m.rsquared_adj, F=m.fvalue, pF=m.f_pvalue,
    vif_x1=vifs[0], vif_x2=vifs[1], vif_x3=vifs[2])

m1 = sm.OLS(main["y"], sm.add_constant(main[["x1"]])).fit()
m2 = sm.OLS(main["y"], sm.add_constant(main[["x1", "x2", "x3"]])).fit()
dR2 = m2.rsquared - m1.rsquared
dfn, dfd = 2, N - 3 - 1
dF = (dR2 / dfn) / ((1 - m2.rsquared) / dfd)
put("regression_hierarchical", "statsmodels.OLS (manual ΔF)",
    r2_step1=m1.rsquared, r2_step2=m2.rsquared, deltaR2=dR2,
    deltaF=dF, deltaP=float(sps.f.sf(dF, dfn, dfd)))

# --- 邏輯斯迴歸
Xl = sm.add_constant(main[["x1"]].assign(male=(main.group2 == "M").astype(int)))
ml = sm.Logit(main["ybin"], Xl).fit(disp=0)
llnull, llf = ml.llnull, ml.llf
cox = 1 - math.exp((2 / N) * (llnull - llf))
nagel = cox / (1 - math.exp((2 / N) * llnull))
from sklearn.metrics import roc_auc_score
put("logistic_regression", "statsmodels.Logit",
    intercept=ml.params["const"], b_x1=ml.params["x1"], b_male=ml.params["male"],
    se_x1=ml.bse["x1"], z_x1=ml.tvalues["x1"], p_x1=ml.pvalues["x1"],
    llNull=llnull, ll=llf, lrStat=2 * (llf - llnull), lrP=ml.llr_pvalue,
    mcFadden=ml.prsquared, nagelkerke=nagel,
    auc=roc_auc_score(main["ybin"], ml.predict(Xl)))

# --- 卡方 / Fisher（2×2）
ct = pd.crosstab(main["catR"], main["catC"]).reindex(index=["Yes", "No"], columns=["High", "Low"])
chi2, p, dof, _ = sps.chi2_contingency(ct, correction=False)
chi2y, py, _, _ = sps.chi2_contingency(ct, correction=True)
cramer = math.sqrt(chi2 / (N * (min(ct.shape) - 1)))
put("chisquare_2x2", "scipy.chi2_contingency",
    chi2=chi2, p=p, df=dof, chi2Yates=chi2y, pYates=py, cramerV=cramer)
orr, pf = sps.fisher_exact(ct)
put("fisher_exact", "scipy.fisher_exact", p=pf, oddsRatio=orr)

# --- 無母數
U, p = sps.mannwhitneyu(xM, xF, alternative="two-sided", method="asymptotic", use_continuity=True)
put("mann_whitney", "scipy.mannwhitneyu(asymptotic, continuity)", U=U, p=p)
Us, ps = sps.mannwhitneyu(small.loc[small.g == "A", "v"], small.loc[small.g == "B", "v"],
                          alternative="two-sided", method="asymptotic", use_continuity=True)
Ue, pe_ = sps.mannwhitneyu(small.loc[small.g == "A", "v"], small.loc[small.g == "B", "v"],
                           alternative="two-sided", method="exact")
put("mann_whitney_small", "scipy (asymptotic + exact 對照)", U=Us, p=ps, pExact=pe_)
Ut, pt_ = sps.mannwhitneyu(ties.loc[ties.g == "A", "v"], ties.loc[ties.g == "B", "v"],
                           alternative="two-sided", method="asymptotic", use_continuity=True)
put("mann_whitney_ties", "scipy.mannwhitneyu", U=Ut, p=pt_)

w = sps.wilcoxon(c1, c2, zero_method="wilcox", correction=True, method="approx")
put("wilcoxon_signed_rank", "scipy.wilcoxon(wilcox, correction, approx)",
    T=w.statistic, p=w.pvalue, z=getattr(w, "zstatistic", None))

H, p = sps.kruskal(*groups)
put("kruskal_wallis", "scipy.kruskal", H=H, p=p, df=2, epsilon2=(H - 3 + 1) / (N - 3))

# --- 常態性 / 變異數同質性
W, p = sps.shapiro(main["y"])
put("shapiro_wilk", "scipy.shapiro", W=W, p=p)
from statsmodels.stats.diagnostic import lilliefors
D, p = lilliefors(main["y"], dist="norm", pvalmethod="approx")
put("ks_lilliefors", "statsmodels.lilliefors(approx)", D=D, p=p)
F, p = sps.levene(*groups, center="median")
put("levene_median", "scipy.levene(center=median)", F=F, p=p, df1=2, df2=N-3)
F, p = sps.levene(*groups, center="mean")
put("levene_mean_spss_default", "scipy.levene(center=mean)（SPSS 預設對照）", F=F, p=p)

# --- Two-way ANOVA（Type III，效應編碼）
from statsmodels.formula.api import ols
mainc = main.copy()
mod = ols("y ~ C(group2, Sum) * C(group3, Sum)", data=mainc).fit()
a3 = sm.stats.anova_lm(mod, typ=3)
put("twoway_anova_type3", "statsmodels anova_lm(typ=3, Sum coding)",
    ssA=a3.loc["C(group2, Sum)", "sum_sq"], fA=a3.loc["C(group2, Sum)", "F"], pA=a3.loc["C(group2, Sum)", "PR(>F)"],
    ssB=a3.loc["C(group3, Sum)", "sum_sq"], fB=a3.loc["C(group3, Sum)", "F"], pB=a3.loc["C(group3, Sum)", "PR(>F)"],
    ssAB=a3.loc["C(group2, Sum):C(group3, Sum)", "sum_sq"],
    fAB=a3.loc["C(group2, Sum):C(group3, Sum)", "F"],
    pAB=a3.loc["C(group2, Sum):C(group3, Sum)", "PR(>F)"],
    ssError=a3.loc["Residual", "sum_sq"])

# --- pingouin 系列
import pingouin as pg

anc = pg.ancova(data=mainc, dv="y", covar=["x1", "x2"], between="group3")
put("ancova", "pingouin.ancova",
    fFactor=anc.loc[anc.Source == "group3", "F"].iloc[0],
    pFactor=anc.loc[anc.Source == "group3", "p_unc"].iloc[0],
    ssFactor=anc.loc[anc.Source == "group3", "SS"].iloc[0],
    fCov1=anc.loc[anc.Source == "x1", "F"].iloc[0],
    pCov1=anc.loc[anc.Source == "x1", "p_unc"].iloc[0])

long = mainc.melt(id_vars=["id"], value_vars=["cond1", "cond2", "cond3"],
                  var_name="cond", value_name="score")
rm = pg.rm_anova(data=long, dv="score", within="cond", subject="id", detailed=True, correction=True)
sph = pg.sphericity(data=long, dv="score", within="cond", subject="id")
put("repeated_anova", "pingouin.rm_anova + sphericity",
    F=rm.loc[0, "F"], p=rm.loc[0, "p_unc"],
    dfNum=rm.loc[0, "DF"], dfDen=rm.loc[1, "DF"],
    ssTreat=rm.loc[0, "SS"], ssError=rm.loc[1, "SS"],
    ggEps=rm.loc[0, "eps"], pGG=rm.loc[0, "p_GG_corr"],
    mauchlyW=sph.W, mauchlyP=sph.pval)

longm = mainc.melt(id_vars=["id", "group2"], value_vars=["cond1", "cond2", "cond3"],
                   var_name="cond", value_name="score")
mx = pg.mixed_anova(data=longm, dv="score", within="cond", between="group2", subject="id")
put("mixed_anova", "pingouin.mixed_anova",
    fBetween=mx.loc[0, "F"], pBetween=mx.loc[0, "p_unc"],
    fWithin=mx.loc[1, "F"], pWithin=mx.loc[1, "p_unc"],
    fInter=mx.loc[2, "F"], pInter=mx.loc[2, "p_unc"])

alpha_res = pg.cronbach_alpha(data=mainc[["i1", "i2", "i3", "i4", "i5", "i6"]])
put("cronbach_alpha_6items", "pingouin.cronbach_alpha", alpha=alpha_res[0])
alpha_f1 = pg.cronbach_alpha(data=mainc[["i1", "i2", "i3"]])
put("cronbach_alpha_f1", "pingouin.cronbach_alpha", alpha=alpha_f1[0])

icc_long = mainc.melt(id_vars=["id"], value_vars=["rater1", "rater2"],
                      var_name="rater", value_name="score")
icc_res = pg.intraclass_corr(data=icc_long, targets="id", raters="rater", ratings="score")
icc_map = dict(zip(icc_res["Type"], icc_res["ICC"]))
put("icc", "pingouin.intraclass_corr",
    icc11=icc_map["ICC(1,1)"], icc21=icc_map["ICC(A,1)"], icc31=icc_map["ICC(C,1)"],
    icc1k=icc_map["ICC(1,k)"], icc2k=icc_map["ICC(A,k)"], icc3k=icc_map["ICC(C,k)"])

from sklearn.metrics import cohen_kappa_score
put("cohen_kappa", "sklearn.cohen_kappa_score",
    kappa=cohen_kappa_score(main["rater1"], main["rater2"]),
    kappaLinear=cohen_kappa_score(main["rater1"], main["rater2"], weights="linear"),
    kappaQuadratic=cohen_kappa_score(main["rater1"], main["rater2"], weights="quadratic"))

# --- 比例 z 檢定
from statsmodels.stats.proportion import proportions_ztest, proportion_confint
x_succ = int(main["ybin"].sum())
z, p = proportions_ztest(x_succ, N, value=0.5, prop_var=0.5)
ciw = proportion_confint(x_succ, N, method="wilson")
put("zprop_one", "statsmodels.proportions_ztest(prop_var=p0)",
    z=z, p=p, phat=x_succ / N, wilsonLow=ciw[0], wilsonHigh=ciw[1])
xm = int(main.loc[main.group2 == "M", "ybin"].sum())
xf = int(main.loc[main.group2 == "F", "ybin"].sum())
z, p = proportions_ztest([xm, xf], [30, 30])
put("zprop_two", "statsmodels.proportions_ztest(pooled)", z=z, p=p,
    p1=xm / 30, p2=xf / 30)

# --- EFA（PCA + varimax，對齊 JS 實作選擇）
from factor_analyzer import FactorAnalyzer, calculate_bartlett_sphericity, calculate_kmo
items = mainc[["i1", "i2", "i3", "i4", "i5", "i6"]]
bart_chi2, bart_p = calculate_bartlett_sphericity(items)
kmo_per, kmo_overall = calculate_kmo(items)
corr = items.corr().values
eigvals = np.sort(np.linalg.eigvalsh(corr))[::-1]
fa = FactorAnalyzer(n_factors=2, rotation="varimax", method="principal")
fa.fit(items)
load = fa.loadings_
put("efa_pca_varimax", "factor_analyzer(principal, varimax)",
    bartlettChi2=bart_chi2, bartlettP=bart_p, kmo=kmo_overall,
    eig1=eigvals[0], eig2=eigvals[1], eig3=eigvals[2],
    # 轉軸後負荷（絕對值排序無關符號/因子順序，比對時取絕對值）
    absLoadingsSorted=sorted(np.abs(load).max(axis=1).round(6).tolist()),
    communalities=sorted(fa.get_communalities().round(6).tolist()))

# --- MANOVA
from statsmodels.multivariate.manova import MANOVA
mv = MANOVA.from_formula("y + x1 + x2 ~ group3", data=mainc)
r = mv.mv_test().results["group3"]["stat"]
put("manova", "statsmodels.MANOVA",
    wilks=r.loc["Wilks' lambda", "Value"], wilksF=r.loc["Wilks' lambda", "F Value"],
    wilksP=r.loc["Wilks' lambda", "Pr > F"],
    pillai=r.loc["Pillai's trace", "Value"], pillaiF=r.loc["Pillai's trace", "F Value"],
    pillaiP=r.loc["Pillai's trace", "Pr > F"],
    hotelling=r.loc["Hotelling-Lawley trace", "Value"],
    roy=r.loc["Roy's greatest root", "Value"])

# --- CFA（semopy，2 因子簡單結構）
try:
    import semopy
    desc = "F1 =~ i1 + i2 + i3\nF2 =~ i4 + i5 + i6\nF1 ~~ F2"
    mod_cfa = semopy.Model(desc)
    mod_cfa.fit(items)
    stats_cfa = semopy.calc_stats(mod_cfa)
    put("cfa_2factor", "semopy(ML)",
        chi2=stats_cfa["chi2"].iloc[0], df=stats_cfa["DoF"].iloc[0],
        cfi=stats_cfa["CFI"].iloc[0], tli=stats_cfa["TLI"].iloc[0],
        rmsea=stats_cfa["RMSEA"].iloc[0])
except Exception as e:
    put("cfa_2factor", f"semopy FAILED: {e}")

# --- PLS-SEM（plspm PATH scheme ＋ numpy 手算），Wave 1 基準
# 模型：F1 =~ i1+i2+i3、F2 =~ i4+i5+i6（皆反映型 Mode A）、F1 → F2，path scheme。
#
# ⚠ Python plspm 的 scaled=True「不是」逐欄 z-score——它把所有欄位除以同一個
#   pooled SD（config.treat: metric_data.stack().std()），與 R plspm / SmartPLS /
#   seminr 的逐指標標準化不同（2026-07-04 讀源碼確認的移植怪癖）。欄位變異不等時
#   其 Mode A 共變異數權重會收斂到不同解。因此這裡「先逐欄 z-score 再餵 plspm」，
#   使各欄尺度相等 → 共變異數權重等價 correlation weights，對齊 SmartPLS 4 行為。
#   （由 Kevin 本機 R seminr 抽驗複核，見 roadmap W1 驗證基準。）
#
# plspm 不提供的量以 numpy 依公式手算：
#   rho_A  — Dijkstra & Henseler (2015), Psychometrika 80(2), eq. (12)，
#            權重先正規化使 w'Sw=1（LV 分數單位變異）
#   rho_c  — Jöreskog (1971) composite reliability
#   AVE    — Fornell & Larcker (1981)
#   HTMT   — Henseler, Ringle & Sarstedt (2015), JAMS 43(1)
#   alphaStd — 標準化 Cronbach's α（相關矩陣版；PLS 對標準化資料運算，
#              與 pingouin 原始分數版的 cronbach_alpha_f1 數值不同屬預期）
try:
    import plspm.config as plsc
    from plspm.plspm import Plspm
    from plspm.scheme import Scheme as PlsScheme
    from plspm.mode import Mode as PlsMode

    pls_items = mainc[["i1", "i2", "i3", "i4", "i5", "i6"]].astype(float)
    pls_z = (pls_items - pls_items.mean()) / pls_items.std(ddof=1)
    pls_structure = pd.DataFrame([[0, 0], [1, 0]], index=["F1", "F2"], columns=["F1", "F2"])
    pls_cfg = plsc.Config(pls_structure, scaled=True)
    pls_cfg.add_lv("F1", PlsMode.A, plsc.MV("i1"), plsc.MV("i2"), plsc.MV("i3"))
    pls_cfg.add_lv("F2", PlsMode.A, plsc.MV("i4"), plsc.MV("i5"), plsc.MV("i6"))
    pls = Plspm(pls_z, pls_cfg, PlsScheme.PATH, iterations=1000, tolerance=1e-12)

    pls_om = pls.outer_model()
    pls_blocks = {"F1": ["i1", "i2", "i3"], "F2": ["i4", "i5", "i6"]}
    pls_cols = list(pls_items.columns)
    R_ind = np.corrcoef(pls_items.values.T)  # 指標相關矩陣（原始與標準化資料相同）

    def _block_R(lv):
        idx = [pls_cols.index(cc) for cc in pls_blocks[lv]]
        return R_ind[np.ix_(idx, idx)]

    pls_load = {lv: pls_om.loc[pls_blocks[lv], "loading"].values for lv in pls_blocks}
    # 權重正規化：w'Sw = 1（LV 分數單位樣本變異）——消除實作間縮放慣例差異
    # （plspm 分數為母體單位變異、JS 為樣本單位變異，正規化後兩者可直接比對）
    pls_w = {}
    for lv in pls_blocks:
        S = _block_R(lv)
        wv = pls_om.loc[pls_blocks[lv], "weight"].values
        pls_w[lv] = wv / np.sqrt(wv @ S @ wv)

    def _rho_a(lv):  # Dijkstra & Henseler 2015, eq. (12)
        S = _block_R(lv)
        wv = pls_w[lv]
        S0 = S - np.diag(np.diag(S))
        W0 = np.outer(wv, wv) - np.diag(wv ** 2)
        return float((wv @ wv) ** 2 * (wv @ S0 @ wv) / (wv @ W0 @ wv))

    def _rho_c(lv):  # Jöreskog 1971
        l = pls_load[lv]
        return float(l.sum() ** 2 / (l.sum() ** 2 + (1 - l ** 2).sum()))

    def _ave(lv):  # Fornell & Larcker 1981
        return float((pls_load[lv] ** 2).mean())

    def _alpha_std(lv):  # 標準化 α（相關矩陣版）
        S = _block_R(lv)
        k = S.shape[0]
        return float(k / (k - 1) * (1 - k / S.sum()))

    def _htmt(lv_a, lv_b):  # Henseler et al. 2015
        ia = [pls_cols.index(cc) for cc in pls_blocks[lv_a]]
        ib = [pls_cols.index(cc) for cc in pls_blocks[lv_b]]
        hetero = R_ind[np.ix_(ia, ib)].mean()
        def mono(idx):
            k = len(idx)
            S = R_ind[np.ix_(idx, idx)]
            return (S.sum() - k) / (k * (k - 1))
        return float(hetero / np.sqrt(mono(ia) * mono(ib)))

    pls_scores = pls.scores()
    pls_lv_corr = float(np.corrcoef(pls_scores["F1"], pls_scores["F2"])[0, 1])
    pls_path = float(pls.path_coefficients().loc["F2", "F1"])
    pls_r2 = float(pls.inner_summary().loc["F2", "r_squared"])
    pls_adj_r2 = 1 - (1 - pls_r2) * (N - 1) / (N - 1 - 1)  # 1 個前置 LV
    pls_f2 = pls_r2 / (1 - pls_r2)  # 唯一前置 LV：R²_excluded = 0
    # cross-loadings：列 = i1..i6、欄 = F1,F2，攤平成 12 元素陣列（row-major）
    pls_cross = pls.crossloadings().loc[pls_cols, ["F1", "F2"]].values.flatten().tolist()

    put("pls_basic",
        "plspm 0.5.7(PATH scheme, 逐欄 z-score 後輸入, tol=1e-12) + numpy 手算"
        "（rho_A: Dijkstra-Henseler 2015 eq.12; rho_c: Jöreskog 1971; "
        "AVE: Fornell-Larcker 1981; HTMT: Henseler et al. 2015; "
        "權重正規化 w'Sw=1 後比對）",
        loading_i1=pls_load["F1"][0], loading_i2=pls_load["F1"][1], loading_i3=pls_load["F1"][2],
        loading_i4=pls_load["F2"][0], loading_i5=pls_load["F2"][1], loading_i6=pls_load["F2"][2],
        weight_i1=pls_w["F1"][0], weight_i2=pls_w["F1"][1], weight_i3=pls_w["F1"][2],
        weight_i4=pls_w["F2"][0], weight_i5=pls_w["F2"][1], weight_i6=pls_w["F2"][2],
        path_F1_F2=pls_path, r2_F2=pls_r2, adjR2_F2=pls_adj_r2, f2_F1_F2=pls_f2,
        alphaStd_F1=_alpha_std("F1"), alphaStd_F2=_alpha_std("F2"),
        rhoA_F1=_rho_a("F1"), rhoA_F2=_rho_a("F2"),
        rhoC_F1=_rho_c("F1"), rhoC_F2=_rho_c("F2"),
        ave_F1=_ave("F1"), ave_F2=_ave("F2"),
        sqrtAve_F1=math.sqrt(_ave("F1")), sqrtAve_F2=math.sqrt(_ave("F2")),
        lvCorr_F1F2=pls_lv_corr, htmt_F1F2=_htmt("F1", "F2"),
        crossLoadings=[round(v, 10) for v in pls_cross])
except Exception as e:
    put("pls_basic", f"plspm FAILED: {e}")

# --- PLS-SEM Wave 3 基準（2026-07-04） ------------------------------------
# 內容與來源：
#   pls_scheme_centroid / pls_scheme_factorial
#       — plspm 0.5.7 的另外兩種 weighting scheme（M4 四構念模型，逐欄 z-score 後輸入）
#   pls_formative
#       — plspm Mode B（形成型 / regression weights）＋ numpy 手算外部 VIF
#         （指標相關矩陣反矩陣對角線；Hair et al. 2017 形成型評估程序）
#   pls_plsc
#       — consistent PLS：Dijkstra & Henseler (2015), Psychometrika 80(2) eq.(12)
#         與 MIS Quarterly 39(2)；rho_A 校正構念相關 + 一致 loadings（numpy 手算）
#   pls_fit
#       — SRMR：Henseler et al. (2014), Organizational Research Methods 17(2)
#         d_ULS / d_G：Dijkstra & Henseler (2015), MIS Quarterly 39(2)
#         NFI：Bentler & Bonett (1980)；ML 差異函數 F = ln|Σ̂|−ln|S|+tr(SΣ̂⁻¹)−p
#         飽和模型 = 構念相關自由；估計模型 = 構念相關由路徑模型（遞迴 path tracing）隱含
#   pls_q2
#       — blindfolding Q²（Stone 1974; Geisser 1974），程序依 Hair et al. (2017) 教科書
#         第 6 章／SmartPLS 慣例：omission distance D=7、cross-validated redundancy、
#         略去點以其餘資料的欄平均補值後全模型重估。SmartPLS 未公開全部實作細節，
#         此為文獻程序的忠實手算——待 Kevin 本機 SmartPLS/seminr 抽驗（見 validation-report）
#   pls_bca_reference
#       — BCa bootstrap CI：Efron (1987), JASA 82(397)；Efron & Tibshirani (1993) §14.3。
#         固定 draws＋jackknife 存入 fixture，供 JS bcaInterval() 逐值比對（tests/pls.test.js）
# 手算部分使用獨立實作的 numpy PLS 引擎 _pls_engine（Lohmöller 1989 演算法，
# 與 JS 實作為兩套獨立程式碼），並以 assert 與 plspm（path scheme）交叉驗證 <1e-6。
try:
    import plspm.config as plsc3
    from plspm.plspm import Plspm as Plspm3
    from plspm.scheme import Scheme as PlsScheme3
    from plspm.mode import Mode as PlsMode3

    def _pls_engine(Xz, blocks, modes, path_pairs, scheme="path", tol=1e-12, max_iter=5000):
        """獨立 numpy PLS（Lohmöller 1989）。Xz: n×p 逐欄 z-score（ddof=1）。
        blocks: 每個 LV 的欄索引；modes: 'A'（相關權重）/'B'（迴歸權重）；
        path_pairs: (from,to) 索引；scheme: path/factorial/centroid。
        回傳 (W 權重, Y 分數 n×L, loadings, 迭代數)；符號採 dominant orientation。"""
        n, p = Xz.shape
        L = len(blocks)
        pred = [[] for _ in range(L)]
        succ = [[] for _ in range(L)]
        for a, b in path_pairs:
            pred[b].append(a)
            succ[a].append(b)
        Sb = [np.corrcoef(Xz[:, b], rowvar=False).reshape(len(b), len(b)) for b in blocks]
        W = [np.ones(len(b)) for b in blocks]
        Y = np.column_stack([Xz[:, blocks[j]] @ W[j] for j in range(L)])
        sd0 = Y.std(axis=0, ddof=1)
        Y = Y / sd0
        W = [W[j] / sd0[j] for j in range(L)]
        it = 0
        for it in range(1, max_iter + 1):
            R = np.corrcoef(Y, rowvar=False)
            Z = np.zeros_like(Y)
            for j in range(L):
                if scheme == "path":
                    P = pred[j]
                    if P:
                        bcoef = np.linalg.solve(R[np.ix_(P, P)], R[P, j])
                        Z[:, j] += Y[:, P] @ bcoef
                    for s_ in succ[j]:
                        Z[:, j] += R[j, s_] * Y[:, s_]
                else:
                    for k in sorted(set(pred[j]) | set(succ[j])):
                        e = R[j, k]
                        if scheme == "centroid":
                            e = 1.0 if e >= 0 else -1.0
                        Z[:, j] += e * Y[:, k]
            Wn = []
            for j in range(L):
                zb = Xz[:, blocks[j]]
                zj = Z[:, j]
                r = np.array([np.corrcoef(zb[:, h], zj)[0, 1] for h in range(zb.shape[1])])
                w = r if modes[j] == "A" else np.linalg.solve(Sb[j], r)
                w = w / (zb @ w).std(ddof=1)
                Wn.append(w)
            diff = max(np.max(np.abs(Wn[j] - W[j])) for j in range(L))
            W = Wn
            Y = np.column_stack([Xz[:, blocks[j]] @ W[j] for j in range(L)])
            if diff < tol:
                break
        for j in range(L):  # dominant orientation：與所屬指標相關總和為正
            s = sum(np.corrcoef(Xz[:, h], Y[:, j])[0, 1] for h in blocks[j])
            if s < 0:
                Y[:, j] *= -1
                W[j] = -W[j]
        loadings = [np.array([np.corrcoef(Xz[:, h], Y[:, j])[0, 1] for h in blocks[j]])
                    for j in range(L)]
        return W, Y, loadings, it

    def _zsc(df):
        return (df - df.mean()) / df.std(ddof=1)

    # ── M4 模型：F1(i1-3)→F2(i4-6)；F1→C、F2→C（C=cond1-3，雙前置）；F2→Y(y 單指標) ──
    _m4_cols = ["i1", "i2", "i3", "i4", "i5", "i6", "cond1", "cond2", "cond3", "y"]
    _m4_blocks = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [9]]
    _m4_lv = ["F1", "F2", "C", "Y"]
    _m4_pairs = [(0, 1), (0, 2), (1, 2), (1, 3)]
    _m4_X = mainc[_m4_cols].astype(float)
    _m4_Z = _zsc(_m4_X)

    def _m4_plspm(scheme):
        st = pd.DataFrame(0, index=_m4_lv, columns=_m4_lv)
        st.loc["F2", "F1"] = 1
        st.loc["C", "F1"] = 1
        st.loc["C", "F2"] = 1
        st.loc["Y", "F2"] = 1
        cfg = plsc3.Config(st, scaled=True)
        cfg.add_lv("F1", PlsMode3.A, plsc3.MV("i1"), plsc3.MV("i2"), plsc3.MV("i3"))
        cfg.add_lv("F2", PlsMode3.A, plsc3.MV("i4"), plsc3.MV("i5"), plsc3.MV("i6"))
        cfg.add_lv("C", PlsMode3.A, plsc3.MV("cond1"), plsc3.MV("cond2"), plsc3.MV("cond3"))
        cfg.add_lv("Y", PlsMode3.A, plsc3.MV("y"))
        p = Plspm3(_m4_Z, cfg, scheme, iterations=2000, tolerance=1e-12)
        om = p.outer_model()
        load = {mv: float(om.loc[mv, "loading"]) for mv in _m4_cols}
        pc = p.path_coefficients()
        paths = {
            ("F1", "F2"): float(pc.loc["F2", "F1"]),
            ("F1", "C"): float(pc.loc["C", "F1"]),
            ("F2", "C"): float(pc.loc["C", "F2"]),
            ("F2", "Y"): float(pc.loc["Y", "F2"]),
        }
        r2 = p.inner_summary()["r_squared"]
        # dominant orientation（plspm 不保證；與 JS 慣例對齊）：
        # 若某 LV 的 loadings 總和為負 → 翻轉該 LV 的 loadings 與所有觸及路徑
        flips = {}
        for lv, idxs in zip(_m4_lv, _m4_blocks):
            names = [_m4_cols[i] for i in idxs]
            flips[lv] = -1.0 if sum(load[nm] for nm in names) < 0 else 1.0
            for nm in names:
                load[nm] *= flips[lv]
        paths = {k: v * flips[k[0]] * flips[k[1]] for k, v in paths.items()}
        return load, paths, {lv: float(r2[lv]) for lv in ["F2", "C", "Y"]}

    for _scheme_obj, _scheme_key in [(PlsScheme3.CENTROID, "centroid"),
                                     (PlsScheme3.FACTORIAL, "factorial")]:
        _ld, _pa, _r2 = _m4_plspm(_scheme_obj)
        put(f"pls_scheme_{_scheme_key}",
            f"plspm 0.5.7({_scheme_key.upper()} scheme, 逐欄 z-score 後輸入, tol=1e-12)；"
            "dominant orientation 對齊 JS 慣例",
            **{f"loading_{mv}": _ld[mv] for mv in _m4_cols},
            path_F1_F2=_pa[("F1", "F2")], path_F1_C=_pa[("F1", "C")],
            path_F2_C=_pa[("F2", "C")], path_F2_Y=_pa[("F2", "Y")],
            r2_F2=_r2["F2"], r2_C=_r2["C"], r2_Y=_r2["Y"])

    # ── 自家 numpy 引擎交叉驗證（path scheme vs plspm，<1e-6 才放行手算基準） ──
    _W4, _Y4, _L4, _it4 = _pls_engine(_m4_Z.values, _m4_blocks, ["A"] * 4, _m4_pairs, "path")
    _ldp, _pap, _r2p = _m4_plspm(PlsScheme3.PATH)
    _own_flat = np.concatenate(_L4)
    _plspm_flat = np.array([_ldp[mv] for mv in _m4_cols])
    assert np.max(np.abs(_own_flat - _plspm_flat)) < 1e-6, "numpy PLS 引擎與 plspm 不一致"
    _R4 = np.corrcoef(_Y4, rowvar=False)
    _bC4 = np.linalg.solve(_R4[np.ix_([0, 1], [0, 1])], _R4[[0, 1], 2])
    assert abs(_R4[0, 1] - _pap[("F1", "F2")]) < 1e-6
    assert abs(_bC4[0] - _pap[("F1", "C")]) < 1e-6 and abs(_bC4[1] - _pap[("F2", "C")]) < 1e-6

    # ── 形成型（Mode B）：XF(x1,x2,x3 formative) → Y(y 單指標反映型) ──
    _fm_cols = ["x1", "x2", "x3", "y"]
    _fm_Z = _zsc(mainc[_fm_cols].astype(float))
    _fm_st = pd.DataFrame([[0, 0], [1, 0]], index=["XF", "Y"], columns=["XF", "Y"])
    _fm_cfg = plsc3.Config(_fm_st, scaled=True)
    _fm_cfg.add_lv("XF", PlsMode3.B, plsc3.MV("x1"), plsc3.MV("x2"), plsc3.MV("x3"))
    _fm_cfg.add_lv("Y", PlsMode3.A, plsc3.MV("y"))
    _fm = Plspm3(_fm_Z, _fm_cfg, PlsScheme3.PATH, iterations=2000, tolerance=1e-12)
    _fm_om = _fm.outer_model()
    _fm_S = np.corrcoef(mainc[["x1", "x2", "x3"]].astype(float).values.T)
    _fm_w = _fm_om.loc[["x1", "x2", "x3"], "weight"].values
    _fm_w = _fm_w / np.sqrt(_fm_w @ _fm_S @ _fm_w)  # 正規化 w'Sw=1（同 W1 慣例）
    _fm_vif = np.diag(np.linalg.inv(_fm_S))  # 形成型外部 VIF：指標相關矩陣反矩陣對角線
    put("pls_formative",
        "plspm 0.5.7(Mode B regression weights, PATH scheme, 逐欄 z-score, tol=1e-12, "
        "權重正規化 w'Sw=1) + numpy 手算外部 VIF（指標相關矩陣反矩陣對角線）",
        weight_x1=_fm_w[0], weight_x2=_fm_w[1], weight_x3=_fm_w[2],
        loading_x1=_fm_om.loc["x1", "loading"], loading_x2=_fm_om.loc["x2", "loading"],
        loading_x3=_fm_om.loc["x3", "loading"],
        path_XF_Y=_fm.path_coefficients().loc["Y", "XF"],
        r2_Y=_fm.inner_summary().loc["Y", "r_squared"],
        vif_x1=_fm_vif[0], vif_x2=_fm_vif[1], vif_x3=_fm_vif[2])

    # ── PLSc（Dijkstra & Henseler 2015）：M4、path scheme，numpy 手算 ──
    _S4 = np.corrcoef(_m4_Z.values, rowvar=False)
    _rhoA = []
    _lamc = []
    for _j, _b in enumerate(_m4_blocks):
        if len(_b) < 2:
            _rhoA.append(1.0)
            _lamc.append(np.array([1.0]))
            continue
        _Sb = _S4[np.ix_(_b, _b)]
        _w = np.asarray(_W4[_j])  # 已滿足 w'Sw=1（單位樣本變異分數）
        _S0 = _Sb - np.diag(np.diag(_Sb))
        _W0 = np.outer(_w, _w) - np.diag(_w ** 2)
        _c2 = (_w @ _S0 @ _w) / (_w @ _W0 @ _w)
        _lamc.append(np.sqrt(_c2) * _w)
        _rhoA.append(float((_w @ _w) ** 2 * _c2))
    _q = np.sqrt(_rhoA)
    _Rc = _R4 / np.outer(_q, _q)
    np.fill_diagonal(_Rc, 1.0)
    _pc_f2 = float(_Rc[0, 1])
    _pc_C = np.linalg.solve(_Rc[np.ix_([0, 1], [0, 1])], _Rc[[0, 1], 2])
    _pc_Y = float(_Rc[1, 3])
    _lamc_flat = np.concatenate(_lamc)
    put("pls_plsc",
        "numpy 手算 consistent PLS（Dijkstra & Henseler 2015, Psychometrika 80(2) eq.12 與 "
        "MIS Quarterly 39(2)）：rho_A 反衰減構念相關 → OLS 路徑；一致 loadings = √c²·ŵ；"
        "底層權重來自與 plspm 交叉驗證過的 numpy PLS（path scheme）",
        rhoA_F1=_rhoA[0], rhoA_F2=_rhoA[1], rhoA_C=_rhoA[2],
        **{f"cloading_{mv}": float(_lamc_flat[i]) for i, mv in enumerate(_m4_cols)},
        corr_F1_F2=_pc_f2, corr_F2_Y=_pc_Y,
        path_F1_F2=_pc_f2, path_F1_C=float(_pc_C[0]), path_F2_C=float(_pc_C[1]),
        path_F2_Y=_pc_Y,
        r2_F2=_pc_f2 * _Rc[0, 1], r2_C=float(_pc_C @ _Rc[[0, 1], 2]), r2_Y=_pc_Y * _Rc[1, 3])

    # ── Model fit（composite loadings、M4、path scheme）：numpy 手算 ──
    from scipy.linalg import eigh as _geigh
    _own_load_flat = _own_flat
    _owner = np.concatenate([[j] * len(b) for j, b in enumerate(_m4_blocks)])

    def _implied(Rlv):
        pdim = _S4.shape[0]
        Sig = np.empty((pdim, pdim))
        for i in range(pdim):
            for k in range(pdim):
                if i == k:
                    Sig[i, k] = 1.0
                elif _owner[i] == _owner[k]:
                    Sig[i, k] = _own_load_flat[i] * _own_load_flat[k]
                else:
                    Sig[i, k] = (_own_load_flat[i] * Rlv[_owner[i], _owner[k]]
                                 * _own_load_flat[k])
        return Sig

    def _fitstats(Sig):
        pdim = _S4.shape[0]
        res = _S4 - Sig
        srmr = math.sqrt(sum(res[i, k] ** 2 for i in range(pdim) for k in range(i, pdim))
                         / (pdim * (pdim + 1) / 2))
        d_uls = 0.5 * float(np.sum(res ** 2))
        ev = _geigh(Sig, _S4, eigvals_only=True)  # S⁻¹Σ̂ 的特徵值（廣義對稱）
        d_g = 0.5 * float(np.sum(np.log(ev) ** 2))
        f_ml = float(np.sum(np.log(ev) + 1 / ev - 1))
        f_null = -float(np.sum(np.log(np.linalg.eigvalsh(_S4))))
        return srmr, d_uls, d_g, 1 - f_ml / f_null

    _bY4 = float(_R4[1, 3])
    _Re = np.eye(4)
    _Re[0, 1] = _Re[1, 0] = float(_R4[0, 1])                        # F1→F2 直接
    _Re[0, 2] = _Re[2, 0] = float(_bC4[0] + _bC4[1] * _R4[0, 1])    # F1→C
    _Re[1, 2] = _Re[2, 1] = float(_bC4[0] * _R4[0, 1] + _bC4[1])    # F2→C
    _Re[0, 3] = _Re[3, 0] = _bY4 * float(_R4[0, 1])                 # F1→Y（僅間接）
    _Re[1, 3] = _Re[3, 1] = _bY4
    _Re[2, 3] = _Re[3, 2] = _bY4 * _Re[1, 2]
    _sat = _fitstats(_implied(_R4))
    _est = _fitstats(_implied(_Re))
    put("pls_fit",
        "numpy 手算 model fit（SRMR: Henseler et al. 2014 ORM 17(2)；d_ULS/d_G: "
        "Dijkstra & Henseler 2015 MISQ 39(2)；NFI: Bentler & Bonett 1980，F_ML 差異函數）；"
        "composite loadings，飽和=構念相關自由、估計=遞迴 path tracing 隱含相關",
        srmrSat=_sat[0], dUlsSat=_sat[1], dGSat=_sat[2], nfiSat=_sat[3],
        srmrEst=_est[0], dUlsEst=_est[1], dGEst=_est[2], nfiEst=_est[3])

    # ── Blindfolding Q²（D=7、cross-validated redundancy）：numpy 手算 ──
    _m4_raw = mainc[_m4_cols].astype(float).values

    def _q2_for(j_target, Dd=7):
        b = _m4_blocks[j_target]
        k = len(b)
        n_ = _m4_raw.shape[0]
        sse = 0.0
        sso = 0.0
        P = sorted({a for a, t_ in _m4_pairs if t_ == j_target})
        for d in range(Dd):
            omitted = [(i, b[h]) for i in range(n_) for h in range(k)
                       if (i * k + h) % Dd == d]
            Xd = _m4_raw.copy()
            colmeans = {}
            for c in {c for _, c in omitted}:
                mask = np.ones(n_, bool)
                mask[[i for i, cc in omitted if cc == c]] = False
                colmeans[c] = _m4_raw[mask, c].mean()
            for i, c in omitted:
                Xd[i, c] = colmeans[c]
            mu = Xd.mean(axis=0)
            sd = Xd.std(axis=0, ddof=1)
            Zd = (Xd - mu) / sd
            Wd, Yd, loadd, _ = _pls_engine(Zd, _m4_blocks, ["A"] * 4, _m4_pairs, "path")
            Rd = np.corrcoef(Yd, rowvar=False)
            bd = (np.linalg.solve(Rd[np.ix_(P, P)], Rd[P, j_target]) if len(P) > 1
                  else np.array([Rd[P[0], j_target]]))
            Yhat = Yd[:, P] @ bd
            lmap = dict(zip(b, loadd[j_target]))
            for i, c in omitted:
                zt = (_m4_raw[i, c] - mu[c]) / sd[c]
                sse += (zt - lmap[c] * Yhat[i]) ** 2
                sso += (zt - (colmeans[c] - mu[c]) / sd[c]) ** 2
        return 1 - sse / sso

    put("pls_q2",
        "numpy 手算 blindfolding Q²（Stone 1974; Geisser 1974；程序依 Hair et al. 2017 "
        "第 6 章／SmartPLS 慣例：D=7、cross-validated redundancy、略去點以其餘資料欄平均"
        "補值後全模型重估、對整批資料重新標準化）——獨立 numpy PLS 引擎複算",
        q2_F2=_q2_for(1), q2_C=_q2_for(2), q2_Y=_q2_for(3))

    # ── BCa bootstrap CI（Efron 1987）：固定 draws＋jackknife 的公式複算 ──
    _rng_bca = np.random.default_rng(20260704)
    _yv = mainc["y"].values.astype(float)
    _orig = float(_yv.mean())
    _B = 999
    _draws = np.array([_yv[_rng_bca.integers(0, N, N)].mean() for _ in range(_B)])
    _jack = np.array([np.delete(_yv, i).mean() for i in range(N)])
    _below = int(np.sum(_draws < _orig))
    _prop = min(max(_below / _B, 1 / (_B + 1)), _B / (_B + 1))
    _z0 = float(sps.norm.ppf(_prop))
    _dj = _jack.mean() - _jack
    _a_acc = float(np.sum(_dj ** 3) / (6 * np.sum(_dj ** 2) ** 1.5))

    def _bca_adj(z):
        t_ = _z0 + z
        return float(sps.norm.cdf(_z0 + t_ / (1 - _a_acc * t_)))

    _a1 = _bca_adj(float(sps.norm.ppf(0.025)))
    _a2 = _bca_adj(float(sps.norm.ppf(0.975)))
    _ci = np.quantile(_draws, [_a1, _a2])  # 線性內插 = R type 7，同 JS quantile
    put("pls_bca_reference",
        "numpy 手算 BCa（Efron 1987 JASA 82(397); Efron & Tibshirani 1993 §14.3）："
        "統計量=main.y 平均、B=999 固定 draws（rng seed 20260704）＋jackknife；"
        "draws/jackknife 一併入 fixture 供 JS bcaInterval() 逐值比對",
        original=_orig, z0=_z0, a=_a_acc, alphaLower=_a1, alphaUpper=_a2,
        ciLower=float(_ci[0]), ciUpper=float(_ci[1]),
        draws=[float(v) for v in _draws], jackknife=[float(v) for v in _jack])
except Exception as e:
    put("pls_w3", f"PLS W3 baselines FAILED: {e}")

with open(os.path.join(FIX, "reference.json"), "w") as f:
    json.dump(REF, f, indent=1)

print(f"datasets: main n={N}, small n=8, ties n=24")
print(f"reference methods: {len(REF)}")
for k in REF:
    print(" -", k)
