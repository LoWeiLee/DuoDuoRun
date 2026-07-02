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

with open(os.path.join(FIX, "reference.json"), "w") as f:
    json.dump(RE