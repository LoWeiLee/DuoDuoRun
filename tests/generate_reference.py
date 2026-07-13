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

# NCA 必要條件分析資料集（獨立種子，不擾動既有 rng 序列）：
# 設計為左上角空白的必要條件結構——高 Y 需要高 X。
_ncarng = np.random.default_rng(19)
_nca_n = 48
nca_x = np.round(_ncarng.uniform(10, 90, _nca_n), 4)
nca_u = _ncarng.uniform(0.1, 1.0, _nca_n)
nca_y = np.round(np.clip((0.45 * nca_x + 20) * nca_u + _ncarng.normal(0, 7, _nca_n), 1, None), 4)
# 固定 permutation draws（注入引擎做交叉驗證，見 pls_mga_perm 慣例）
nca_perms = [_ncarng.permutation(_nca_n).tolist() for _ in range(199)]

# cIPMA（Hauff et al. 2024）用的固定 permutation draws：對 main（n=60）的
# IPMA 0–100 LV 分數跑 NCA，需與 JS 引擎注入同一批排列
_ciprng = np.random.default_rng(23)
cipma_perms = [_ciprng.permutation(N).tolist() for _ in range(199)]

# CTA-PLS（Gudergan et al. 2008）專屬資料集（獨立種子，不擾動既有 rng 序列）：
# 需要「≥4 指標」的區塊——main 的四個區塊都只有 3 指標，無法做 tetrad 檢定。
#   R5（cr1–cr5）：單因子反映型（loadings .85/.80/.75/.70/.65）→ tetrads 應消失
#   M4（cm1–cm4）：兩對高相關、跨對低相關的非單因子結構（模擬形成型／多維）
#                  → tetrads 不應消失
# bootstrap 用固定重抽索引注入（同 pls_bca_reference 的注入慣例），B=300
_ctarng = np.random.default_rng(31)
_cta_f = _ctarng.normal(0, 1, N)
def _cta_ref_ind(loading):
    return np.round(loading * _cta_f + _ctarng.normal(0, math.sqrt(1 - loading ** 2), N), 4)
cta_cols = {f"cr{h + 1}": _cta_ref_ind(l).tolist()
            for h, l in enumerate([0.85, 0.80, 0.75, 0.70, 0.65])}
_cta_a = _ctarng.normal(0, 1, N)                                       # 第一對的共同成分
_cta_b = 0.3 * _cta_a + math.sqrt(1 - 0.3 ** 2) * _ctarng.normal(0, 1, N)  # 第二對（與第一對僅 .3 相關）
for _nm, _src in (("cm1", _cta_a), ("cm2", _cta_a), ("cm3", _cta_b), ("cm4", _cta_b)):
    cta_cols[_nm] = np.round(
        0.9 * _src + math.sqrt(1 - 0.9 ** 2) * _ctarng.normal(0, 1, N), 4).tolist()
cta_boot = [_ctarng.integers(0, N, N).tolist() for _ in range(300)]


# FIMIX-PLS（Hahn, Johnson, Herrmann & Huber 2002）專屬資料集（獨立種子，不擾動既有 rng 序列）：
# 兩段已知結構的模擬資料——引擎必須把段結構還原出來。這是本法唯一可信的驗證，
# 因為 FIMIX 沒有主流 Python/R 完整實作可對照。
#
#   段 1（前 180 筆）：FX → FY 的真實路徑 = +0.80
#   段 2（後 120 筆）：FX → FY 的真實路徑 = −0.80
#
# 對稱設計的三個理由：
#   (a) 兩段的 Var(η) 相同 → 全樣本標準化不會把兩段的斜率縮放成不同倍率，
#       段別解可直接對照真實值（僅剩測量誤差造成的衰減，約 ×0.9）
#   (b) 兩段方向相反 → 全域路徑被大幅相消（遠小於任一段的絕對值；段別大小不等
#       故不會完全歸零）。「整體只看到微弱關係，其實是一強正、一強負兩個段」
#       正是 FIMIX 要抓的未觀察異質性，也是最有說服力的教學案例
#   (c) 段別大小刻意不等（180 / 120）→ ρ 有資訊量，且能檢驗 label switching 的處理
#
# 殘差 σ = 0.25（分離良好）：基準要能驗證「段結構確實存在時引擎找得到它」；
# 分離不良時 EM 落入局部最優，驗證不了任何東西。
# 兩段共用同一組測量模型（loadings .90/.85/.85）→ 異質性純粹在結構層。
_fxrng = np.random.default_rng(101)
_FX_N1, _FX_N2 = 180, 120
_FX_N = _FX_N1 + _FX_N2
_fx_beta = np.concatenate([np.full(_FX_N1, 0.80), np.full(_FX_N2, -0.80)])
_fx_xi = _fxrng.normal(0, 1, _FX_N)                                   # 外生 LV
_fx_eta = _fx_beta * _fx_xi + _fxrng.normal(0, 0.25, _FX_N)           # 內生 LV（段別係數）
def _fx_ind(lv, loading):
    lv_s = (lv - lv.mean()) / lv.std(ddof=1)
    return np.round(loading * lv_s + _fxrng.normal(0, math.sqrt(1 - loading ** 2), _FX_N), 4)
fimix_cols = {}
for _h, _l in enumerate([0.90, 0.85, 0.85]):
    fimix_cols[f"fx{_h + 1}"] = _fx_ind(_fx_xi, _l).tolist()          # 外生區塊 fx1–fx3
for _h, _l in enumerate([0.90, 0.85, 0.85]):
    fimix_cols[f"fy{_h + 1}"] = _fx_ind(_fx_eta, _l).tolist()         # 內生區塊 fy1–fy3
# 真實段別（僅供還原率驗證，引擎看不到）
fimix_truth = ([0] * _FX_N1) + ([1] * _FX_N2)

# pairwise deletion ＋ WPLS（W6，§6.6／§6.7）專屬 fixture（獨立種子，不擾動既有 rng）：
#   miss_mask：對 main 的 M1 六個指標（i1–i6）施加固定的 MCAR 缺失遮罩（約 12%）
#   wpls_w   ：對 main 的 60 列施加固定的抽樣權重（右偏，模擬事後分層加權）
# 兩者都是「輸入」——引擎注入同一批 → JS↔numpy 逐值可比。
_pwrng = np.random.default_rng(404)
_PW_COLS = ["i1", "i2", "i3", "i4", "i5", "i6"]
miss_mask = (_pwrng.random((N, len(_PW_COLS))) < 0.12).tolist()   # True = 缺失
# 每列至少留 2 個可觀察值（避免整列全缺）、每欄至少留 40 個（避免 pairwise 配對過少）
_mm = np.array(miss_mask)
for _i in range(N):
    if (~_mm[_i]).sum() < 2:
        _mm[_i, :2] = False
for _j in range(len(_PW_COLS)):
    while (~_mm[:, _j]).sum() < 40:
        _cand = np.where(_mm[:, _j])[0]
        _mm[_cand[0], _j] = False
miss_mask = _mm.tolist()
wpls_w = np.round(_pwrng.gamma(shape=2.0, scale=0.5, size=N) + 0.1, 4).tolist()
datasets = {
    "main": main.to_dict(orient="records"),
    "small": small.to_dict(orient="records"),
    "ties": ties.to_dict(orient="records"),
    "nca": {"x": nca_x.tolist(), "y": nca_y.tolist(), "perms": nca_perms},
    "cipma": {"perms": cipma_perms},
    "cta": {**cta_cols, "boot": cta_boot},
    "fimix": {**fimix_cols, "truth": fimix_truth},
    "pw": {"cols": _PW_COLS, "mask": miss_mask, "w": wpls_w},
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
# ⚠ 2026-07-13 紅隊修復：factor_analyzer 的 varimax 預設容差沒收斂完全
#   （準則值 2.4540048 < 嚴格收斂的 2.4540421），與 JS 的差距 1.75e-3 迫使
#   compare.test.js 把容差放寬到 5e-3，反而掩蓋了真實的防線。查證方式：以
#   tol=1e-12 的 SVD varimax 重算，得到的正是 JS 的解（差 5.3e-7）→ 錯的是基準。
#   改用 rotation_kwargs 收緊容差後，容差得以從 5e-3 收回 1e-6。
fa = FactorAnalyzer(n_factors=2, rotation="varimax", method="principal",
                    rotation_kwargs={"tol": 1e-12, "max_iter": 1000})
fa.fit(items)
load = fa.loadings_
put("efa_pca_varimax", "factor_analyzer(principal, varimax, rotation tol=1e-12)",
    bartlettChi2=bart_chi2, bartlettP=bart_p, kmo=kmo_overall,
    eig1=eigvals[0], eig2=eigvals[1], eig3=eigvals[2],
    # 轉軸後負荷（絕對值排序無關符號/因子順序，比對時取絕對值）
    absLoadingsSorted=sorted(np.abs(load).max(axis=1).round(8).tolist()),
    communalities=sorted(fa.get_communalities().round(8).tolist()))

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

# --- PLS-SEM Wave 4 基準（2026-07-04） ------------------------------------
# 內容與來源：
#   pls_mediation
#       — 中介效果分解（specific/total indirect、VAF）：路徑係數乘積（Baron & Kenny 1986
#         的路徑分解；bootstrap CI 慣例依 Preacher & Hayes 2008；VAF 依 Hair et al. 2017
#         第 7 章）。點估計由與 plspm 交叉驗證過的 numpy PLS（M4、path scheme）路徑相乘
#   pls_mod_twostage
#       — 調節 two-stage（Chin, Marcolin & Newsted 2003 的兩階段法；SmartPLS 4 官方
#         Moderation 文件行為：交互項 = 第一階段標準化 LV 分數乘積、**不標準化**、
#         自動補調節變數主效果路徑）。第二階段全單指標構念 → 路徑 = 分數 OLS；
#         交互項係數以「未標準化乘積」量尺回報（= 標準化係數 ÷ sd(乘積)）。
#         simple slope（Aiken & West 1991）：調節值 ±1 SD 下的條件斜率。
#         待 Kevin 本機 SmartPLS 4 / seminr 抽驗
#   pls_quadratic — 二次效果：同一 two-stage 機制，交互項 = 分數平方（SmartPLS 4
#         Nonlinear/Quadratic Effect 同法）；條件斜率 dY/dX = b1 + 2·b_q·x
#   pls_mod_threeway — 三向交互：two-stage 之下三個 LV 分數乘積（含全部兩向項）
#   pls_mod_pi — product indicator 法（Chin et al. 2003）：交互構念指標 =
#         兩構念標準化指標的全配對乘積（再與其他指標一起 z-score 進引擎）；
#         係數為標準化量尺（對齊 seminr product_indicator，非 SmartPLS 慣例）
#   pls_mod_ortho — orthogonalizing 法（Little, Bovaird & Widaman 2006）：
#         乘積指標對全部一階指標 OLS 殘差化後作為交互構念指標（對齊 seminr）
#   pls_hoc_repeated — 高階構念 repeated indicators（Wold 原始法；程序依
#         Becker, Klein & Wetzels 2012）：HOC 區塊 = 全部 LOC 指標（重複掛載）、
#         反映型 HOC 之內部路徑 HOC→LOC。以 plspm（欄位複製別名）交叉驗證
#   pls_hoc_disjoint / pls_hoc_embedded — 兩階段 HOC（disjoint：Becker et al. 2023
#         guidelines；embedded：Sarstedt et al. 2019）：第一階段取 LOC 分數，
#         第二階段以 LOC 分數為 HOC 指標（disjoint 其他構念用原始指標、
#         embedded 全構念用第一階段分數）
# 手算部分沿用 W3 的獨立 numpy PLS 引擎 _pls_engine（已與 plspm 交叉驗證 <1e-6）。
try:
    if "_pls_engine" not in dir():
        raise RuntimeError("W3 區塊未成功（_pls_engine 不存在），W4 基準略過")

    def _ols_std(Xcols, yv):
        """全部欄位已置中；回傳 (coefs, R²)。yv 為單位變異。"""
        Xm = np.column_stack(Xcols)
        b, *_ = np.linalg.lstsq(Xm, yv, rcond=None)
        r2 = 1 - np.sum((yv - Xm @ b) ** 2) / np.sum(yv ** 2)
        return b, float(r2)

    # ── 中介（M4、path scheme）：路徑乘積分解 ──
    _W4m, _Y4m, _L4m, _ = _pls_engine(_m4_Z.values, _m4_blocks, ["A"] * 4, _m4_pairs, "path")
    _Rm = np.corrcoef(_Y4m, rowvar=False)
    _p_f1_f2 = float(_Rm[0, 1])
    _bCm = np.linalg.solve(_Rm[np.ix_([0, 1], [0, 1])], _Rm[[0, 1], 2])
    _p_f1_c, _p_f2_c = float(_bCm[0]), float(_bCm[1])
    _p_f2_y = float(_Rm[1, 3])
    _ind_f1_f2_c = _p_f1_f2 * _p_f2_c
    _tot_f1_c = _p_f1_c + _ind_f1_f2_c
    _ind_f1_f2_y = _p_f1_f2 * _p_f2_y
    put("pls_mediation",
        "numpy PLS（與 plspm 交叉驗證）路徑乘積分解：specific indirect = 鏈上路徑係數"
        "乘積（Baron & Kenny 1986；bootstrap CI 慣例 Preacher & Hayes 2008）；"
        "VAF = indirect/total（Hair et al. 2017 第 7 章）。M4、path scheme",
        indirect_F1_F2_C=_ind_f1_f2_c, direct_F1_C=_p_f1_c,
        total_F1_C=_tot_f1_c, vaf_F1_C=_ind_f1_f2_c / _tot_f1_c,
        indirect_F1_F2_Y=_ind_f1_f2_y, total_F1_Y=_ind_f1_f2_y)

    # ── 調節 two-stage：X=F1(i1-3)、M=C(cond1-3)、Y=y ──
    _mo_cols = ["i1", "i2", "i3", "cond1", "cond2", "cond3", "y"]
    _mo_blocks = [[0, 1, 2], [3, 4, 5], [6]]
    _mo_pairs = [(0, 2), (1, 2)]  # 第一階段：主效果模型
    _mo_Z = _zsc(mainc[_mo_cols].astype(float))
    _Wmo, _Ymo, _Lmo, _ = _pls_engine(_mo_Z.values, _mo_blocks, ["A"] * 3, _mo_pairs, "path")
    # plspm 交叉驗證第一階段（同 W3 慣例；取絕對值避免符號慣例差異）
    _mo_st = pd.DataFrame(0, index=["F1", "C", "Y"], columns=["F1", "C", "Y"])
    _mo_st.loc["Y", "F1"] = 1
    _mo_st.loc["Y", "C"] = 1
    _mo_cfg = plsc3.Config(_mo_st, scaled=True)
    _mo_cfg.add_lv("F1", PlsMode3.A, plsc3.MV("i1"), plsc3.MV("i2"), plsc3.MV("i3"))
    _mo_cfg.add_lv("C", PlsMode3.A, plsc3.MV("cond1"), plsc3.MV("cond2"), plsc3.MV("cond3"))
    _mo_cfg.add_lv("Y", PlsMode3.A, plsc3.MV("y"))
    _mo_p = Plspm3(_mo_Z, _mo_cfg, PlsScheme3.PATH, iterations=2000, tolerance=1e-12)
    _mo_om = _mo_p.outer_model()
    _mo_plspm_load = np.abs(_mo_om.loc[_mo_cols, "loading"].values)
    assert np.max(np.abs(np.abs(np.concatenate(_Lmo)) - _mo_plspm_load)) < 1e-6, \
        "two-stage 第一階段與 plspm 不一致"
    _s1, _s2, _sy = _Ymo[:, 0], _Ymo[:, 1], _Ymo[:, 2]
    _prod = _s1 * _s2
    _sd_p = float(_prod.std(ddof=1))
    _zp = (_prod - _prod.mean()) / _sd_p
    _b2, _r2_full = _ols_std([_s1, _s2, _zp], _sy)
    _b_int_unstd = float(_b2[2]) / _sd_p
    _, _r2_wo = _ols_std([_s1, _s2], _sy)
    _f2_int = (_r2_full - _r2_wo) / (1 - _r2_full)
    put("pls_mod_twostage",
        "numpy 手算 two-stage 調節（Chin et al. 2003；SmartPLS 4 Moderation 文件慣例："
        "交互項=第一階段標準化 LV 分數乘積、不標準化、自動補主效果路徑）；"
        "第一階段與 plspm 交叉驗證 <1e-6；第二階段全單指標 → 路徑 = 分數 OLS；"
        "交互項係數 = 標準化係數 ÷ sd(乘積)；simple slope：Aiken & West 1991。"
        "待 Kevin 本機 SmartPLS 4 / seminr 抽驗",
        path_F1_Y=float(_b2[0]), path_C_Y=float(_b2[1]),
        path_int_Y=_b_int_unstd, path_int_Y_std=float(_b2[2]),
        sd_product=_sd_p, r2_Y=_r2_full, f2_int=float(_f2_int),
        slope_lo=float(_b2[0]) - _b_int_unstd, slope_mid=float(_b2[0]),
        slope_hi=float(_b2[0]) + _b_int_unstd)

    # ── 二次效果（quadratic）：F1(i1-3) → Y(y)，交互項 = 分數平方 ──
    _q_cols = ["i1", "i2", "i3", "y"]
    _q_Z = _zsc(mainc[_q_cols].astype(float))
    _Wq, _Yq, _Lq, _ = _pls_engine(_q_Z.values, [[0, 1, 2], [3]], ["A"] * 2, [(0, 1)], "path")
    _qs, _qy = _Yq[:, 0], _Yq[:, 1]
    _qp = _qs * _qs
    _sd_qp = float(_qp.std(ddof=1))
    _zqp = (_qp - _qp.mean()) / _sd_qp
    _bq, _r2_q = _ols_std([_qs, _zqp], _qy)
    _b_q_unstd = float(_bq[1]) / _sd_qp
    put("pls_quadratic",
        "numpy 手算二次效果（SmartPLS 4 Quadratic Effect：two-stage 機制、"
        "交互項=分數平方、不標準化）；條件斜率 dY/dX = b1 + 2·b_q·x",
        path_F1_Y=float(_bq[0]), path_quad_Y=_b_q_unstd, sd_product=_sd_qp,
        r2_Y=_r2_q,
        slope_lo=float(_bq[0]) + 2 * _b_q_unstd * (-1), slope_mid=float(_bq[0]),
        slope_hi=float(_bq[0]) + 2 * _b_q_unstd * (+1))

    # ── 三向交互：X=F1、M=C、W=F2 → Y（含全部兩向項；階層完整規格） ──
    _t_cols = ["i1", "i2", "i3", "cond1", "cond2", "cond3", "i4", "i5", "i6", "y"]
    _t_blocks = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [9]]
    _t_pairs = [(0, 3), (1, 3), (2, 3)]
    _t_Z = _zsc(mainc[_t_cols].astype(float))
    _Wt, _Yt, _Lt, _ = _pls_engine(_t_Z.values, _t_blocks, ["A"] * 4, _t_pairs, "path")
    _t1, _t2, _t3, _ty = (_Yt[:, j] for j in range(4))
    _tprods = [_t1 * _t2, _t1 * _t3, _t2 * _t3, _t1 * _t2 * _t3]
    _t_sds = [float(pv.std(ddof=1)) for pv in _tprods]
    _t_zps = [(pv - pv.mean()) / sd for pv, sd in zip(_tprods, _t_sds)]
    _bt, _r2_t = _ols_std([_t1, _t2, _t3, *_t_zps], _ty)
    put("pls_mod_threeway",
        "numpy 手算三向交互（two-stage；三 LV 分數乘積＋全部兩向項，交互項皆不標準化）",
        path_F1_Y=float(_bt[0]), path_C_Y=float(_bt[1]), path_F2_Y=float(_bt[2]),
        path_F1xC_Y=float(_bt[3]) / _t_sds[0], path_F1xF2_Y=float(_bt[4]) / _t_sds[1],
        path_CxF2_Y=float(_bt[5]) / _t_sds[2], path_F1xCxF2_Y=float(_bt[6]) / _t_sds[3],
        r2_Y=_r2_t)

    # ── product indicator（Chin et al. 2003）與 orthogonalizing（Little et al. 2006） ──
    _pi_first = _mo_Z[["i1", "i2", "i3", "cond1", "cond2", "cond3", "y"]].values
    _pi_prods = np.column_stack([
        _pi_first[:, a] * _pi_first[:, 3 + b] for a in range(3) for b in range(3)])
    _pi_X = np.column_stack([_pi_first, _pi_prods])  # 7 + 9 欄
    _pi_Xz = (_pi_X - _pi_X.mean(axis=0)) / _pi_X.std(axis=0, ddof=1)
    _pi_blocks = [[0, 1, 2], [3, 4, 5], [6], list(range(7, 16))]
    _pi_pairs = [(0, 2), (1, 2), (3, 2)]
    _Wpi, _Ypi, _Lpi, _ = _pls_engine(_pi_Xz, _pi_blocks, ["A"] * 4, _pi_pairs, "path")
    _Rpi = np.corrcoef(_Ypi, rowvar=False)
    _bpi = np.linalg.solve(_Rpi[np.ix_([0, 1, 3], [0, 1, 3])], _Rpi[[0, 1, 3], 2])
    _r2_pi = float(_bpi @ _Rpi[[0, 1, 3], 2])
    put("pls_mod_pi",
        "numpy 手算 product indicator 調節（Chin, Marcolin & Newsted 2003）：交互構念"
        "指標 = 兩構念標準化指標全配對乘積（乘積欄再 z-score 進引擎）；係數為標準化量尺"
        "（對齊 seminr product_indicator）。待 Kevin 本機 seminr 抽驗",
        path_F1_Y=float(_bpi[0]), path_C_Y=float(_bpi[1]), path_int_Y=float(_bpi[2]),
        r2_Y=_r2_pi)

    _oX = _pi_first[:, :6]  # 一階指標（z-scored）
    _oXi = np.column_stack([np.ones(_oX.shape[0]), _oX])
    _ortho = np.column_stack([
        pv - _oXi @ np.linalg.lstsq(_oXi, pv, rcond=None)[0]
        for pv in _pi_prods.T])
    _or_X = np.column_stack([_pi_first, _ortho])
    _or_Xz = (_or_X - _or_X.mean(axis=0)) / _or_X.std(axis=0, ddof=1)
    _Wor, _Yor, _Lor, _ = _pls_engine(_or_Xz, _pi_blocks, ["A"] * 4, _pi_pairs, "path")
    _Ror = np.corrcoef(_Yor, rowvar=False)
    _bor = np.linalg.solve(_Ror[np.ix_([0, 1, 3], [0, 1, 3])], _Ror[[0, 1, 3], 2])
    _r2_or = float(_bor @ _Ror[[0, 1, 3], 2])
    put("pls_mod_ortho",
        "numpy 手算 orthogonalizing 調節（Little, Bovaird & Widaman 2006）：乘積指標"
        "對全部一階指標 OLS 殘差化後作為交互構念指標（對齊 seminr orthogonal）。"
        "待 Kevin 本機 seminr 抽驗",
        path_F1_Y=float(_bor[0]), path_C_Y=float(_bor[1]), path_int_Y=float(_bor[2]),
        r2_Y=_r2_or)

    # ── HOC repeated indicators：G={F1,F2}（反映型）、G→C、C→Y ──
    _h_cols = ["i1", "i2", "i3", "i4", "i5", "i6", "cond1", "cond2", "cond3", "y"]
    _h_X = mainc[_h_cols].astype(float)
    _h_Z = _zsc(_h_X)
    #    區塊以欄索引重複參照（等價於欄位複製）：G=[0..5]
    _h_blocks = [list(range(6)), [0, 1, 2], [3, 4, 5], [6, 7, 8], [9]]
    _h_lv = ["G", "F1", "F2", "C", "Y"]
    _h_pairs = [(0, 1), (0, 2), (0, 3), (3, 4)]  # G→F1、G→F2、G→C、C→Y
    _Wh, _Yh, _Lh, _ = _pls_engine(_h_Z.values, _h_blocks, ["A"] * 5, _h_pairs, "path")
    _Rh = np.corrcoef(_Yh, rowvar=False)
    # plspm 交叉驗證：以欄位複製別名宣告重複指標
    _hp = _h_Z.copy()
    for _c in ["i1", "i2", "i3", "i4", "i5", "i6"]:
        _hp[_c + "_g"] = _hp[_c]
    _h_st = pd.DataFrame(0, index=_h_lv, columns=_h_lv)
    _h_st.loc["F1", "G"] = 1
    _h_st.loc["F2", "G"] = 1
    _h_st.loc["C", "G"] = 1
    _h_st.loc["Y", "C"] = 1
    _h_cfg = plsc3.Config(_h_st, scaled=True)
    _h_cfg.add_lv("G", PlsMode3.A, *[plsc3.MV(c + "_g") for c in
                                     ["i1", "i2", "i3", "i4", "i5", "i6"]])
    _h_cfg.add_lv("F1", PlsMode3.A, plsc3.MV("i1"), plsc3.MV("i2"), plsc3.MV("i3"))
    _h_cfg.add_lv("F2", PlsMode3.A, plsc3.MV("i4"), plsc3.MV("i5"), plsc3.MV("i6"))
    _h_cfg.add_lv("C", PlsMode3.A, plsc3.MV("cond1"), plsc3.MV("cond2"), plsc3.MV("cond3"))
    _h_cfg.add_lv("Y", PlsMode3.A, plsc3.MV("y"))
    _h_p = Plspm3(_hp, _h_cfg, PlsScheme3.PATH, iterations=2000, tolerance=1e-12)
    _h_pc = _h_p.path_coefficients()
    _h_own = {
        ("G", "F1"): float(_Rh[0, 1]), ("G", "F2"): float(_Rh[0, 2]),
        ("G", "C"): float(_Rh[0, 3]), ("C", "Y"): float(_Rh[3, 4]),
    }
    for (_a, _b), _v in [(("G", "F1"), _h_pc.loc["F1", "G"]), (("G", "F2"), _h_pc.loc["F2", "G"]),
                         (("G", "C"), _h_pc.loc["C", "G"]), (("C", "Y"), _h_pc.loc["Y", "C"])]:
        assert abs(abs(_h_own[(_a, _b)]) - abs(float(_v))) < 1e-6, \
            f"HOC repeated：{_a}→{_b} 與 plspm 不一致"
    put("pls_hoc_repeated",
        "repeated indicators HOC（Wold 原始法；程序依 Becker, Klein & Wetzels 2012）："
        "HOC 區塊=全部 LOC 指標（重複掛載）、反映型 HOC 內部路徑 HOC→LOC；"
        "numpy PLS 與 plspm（欄位複製別名）雙實作交叉驗證 <1e-6",
        **{f"loading_G_{_h_cols[i]}": float(_Lh[0][i]) for i in range(6)},
        path_G_F1=_h_own[("G", "F1")], path_G_F2=_h_own[("G", "F2")],
        path_G_C=_h_own[("G", "C")], path_C_Y=_h_own[("C", "Y")],
        r2_C=_h_own[("G", "C")] ** 2, r2_Y=_h_own[("C", "Y")] ** 2)

    # ── HOC disjoint two-stage（Becker et al. 2023）──
    #    第一階段：無 HOC，LOC 直接連 HOC 的下游（F1→C、F2→C、C→Y）→ 取 LOC 分數
    _d1_blocks = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [9]]
    _d1_pairs = [(0, 2), (1, 2), (2, 3)]
    _Wd1, _Yd1, _Ld1, _ = _pls_engine(_h_Z.values, _d1_blocks, ["A"] * 4, _d1_pairs, "path")
    #    第二階段：G=[sF1,sF2]（Mode A）、C 用原始指標、Y 原始；G→C、C→Y
    _d2_X = np.column_stack([_Yd1[:, 0], _Yd1[:, 1],
                             _h_X[["cond1", "cond2", "cond3", "y"]].values])
    _d2_Xz = (_d2_X - _d2_X.mean(axis=0)) / _d2_X.std(axis=0, ddof=1)
    _Wd2, _Yd2, _Ld2, _ = _pls_engine(_d2_Xz, [[0, 1], [2, 3, 4], [5]], ["A"] * 3,
                                      [(0, 1), (1, 2)], "path")
    _Rd2 = np.corrcoef(_Yd2, rowvar=False)
    put("pls_hoc_disjoint",
        "disjoint two-stage HOC（Becker, Cheah, Gholamzade, Ringle & Sarstedt 2023 "
        "guidelines）：第一階段無 HOC、LOC 直連下游取分數；第二階段 HOC 指標 = LOC 分數、"
        "其他構念用原始指標。numpy PLS（與 plspm 交叉驗證過的引擎）複算。"
        "待 Kevin 本機 SmartPLS 4 / seminr 抽驗",
        loading_G_sF1=float(_Ld2[0][0]), loading_G_sF2=float(_Ld2[0][1]),
        path_G_C=float(_Rd2[0, 1]), path_C_Y=float(_Rd2[1, 2]),
        r2_C=float(_Rd2[0, 1]) ** 2, r2_Y=float(_Rd2[1, 2]) ** 2)

    # ── HOC embedded two-stage（Sarstedt et al. 2019）──
    #    第一階段：repeated indicators 模型取全構念分數；第二階段：G=[sF1,sF2]、C/Y=分數單指標
    _e2_X = np.column_stack([_Yh[:, 1], _Yh[:, 2], _Yh[:, 3], _Yh[:, 4]])
    _e2_Xz = (_e2_X - _e2_X.mean(axis=0)) / _e2_X.std(axis=0, ddof=1)
    _We2, _Ye2, _Le2, _ = _pls_engine(_e2_Xz, [[0, 1], [2], [3]], ["A"] * 3,
                                      [(0, 1), (1, 2)], "path")
    _Re2 = np.corrcoef(_Ye2, rowvar=False)
    put("pls_hoc_embedded",
        "embedded two-stage HOC（Sarstedt, Hair, Cheah, Becker & Ringle 2019）："
        "第一階段 repeated indicators 模型取分數；第二階段 HOC 指標 = LOC 分數、"
        "其他構念 = 分數單指標。numpy PLS 複算。待 Kevin 本機抽驗",
        loading_G_sF1=float(_Le2[0][0]), loading_G_sF2=float(_Le2[0][1]),
        path_G_C=float(_Re2[0, 1]), path_C_Y=float(_Re2[1, 2]),
        r2_C=float(_Re2[0, 1]) ** 2, r2_Y=float(_Re2[1, 2]) ** 2)
except Exception as e:
    put("pls_w4", f"PLS W4 baselines FAILED: {e}")

# --- PLS-SEM W3 順延項基準（2026-07-06）：GoF index ------------------------
# GoF = sqrt(平均 communality × 平均 R²)（Tenenhaus et al. 2005）。
# 慣例：communality 取「反映型且多指標」區塊的 loading²（單指標 communality=1 屬
# 平凡值，納入會虛增 GoF，故排除——與 plspm R 版慣例一致）；R² 取全部內生構念。
# 官方文件列出 GoF 但不建議作為適配指標，報表附註記。
try:
    _W4g, _Y4g, _L4g, _ = _pls_engine(_m4_Z.values, _m4_blocks, ["A"] * 4, _m4_pairs, "path")
    _Rg = np.corrcoef(_Y4g, rowvar=False)
    _bCg = np.linalg.solve(_Rg[np.ix_([0, 1], [0, 1])], _Rg[[0, 1], 2])
    _r2s = [_Rg[0, 1] ** 2, float(_bCg @ _Rg[[0, 1], 2]), _Rg[1, 3] ** 2]
    _comm = np.concatenate([_L4g[j] ** 2 for j in range(3)])  # F1/F2/C（Y 單指標排除）
    put("pls_gof",
        "numpy 手算 GoF（Tenenhaus, Vinzi, Chatelin & Lauro 2005）："
        "sqrt(mean communality × mean R²)；communality 限反映型多指標區塊、"
        "R² 取全部內生構念。M4、path scheme。官方文件不建議作為適配指標",
        gof=float(np.sqrt(_comm.mean() * np.mean(_r2s))),
        meanCommunality=float(_comm.mean()), meanR2=float(np.mean(_r2s)))
except Exception as e:
    put("pls_gof", f"GoF baseline FAILED: {e}")

# --- PLS-SEM Wave 5 基準（2026-07-06）：群組與預測 ------------------------
# 跨實作驗證策略（bootstrap/permutation/k-fold 的隨機性使逐值比對不可能，
# 沿用 W3 BCa「固定輸入入 fixture」模式）：
#   pls_mga_formulas — 參數檢定（Keil et al. 2000 pooled；Welch-Satterthwaite:
#       Sarstedt, Henseler & Ringle 2011）與 Henseler MGA p（Henseler, Ringle &
#       Sinkovics 2009：偏誤校正 draws 的成對比較）——以「固定 se/draws 輸入」
#       逐值比對 JS 公式函式
#   pls_mga_perm — permutation 檢定（Chin & Dibbern 2010）：40 組固定標籤指派
#       入 fixture，numpy 引擎算每組 pseudo-group 路徑差，JS 注入同指派逐值比對
#       （引擎層級交叉驗證）；p = (#{|diff*|≥|diff|}+1)/(P+1)
#   pls_micom — MICOM（Henseler, Ringle & Sarstedt 2016）：step 2 compositional
#       invariance c = corr(Z_pooled·w_g1, Z_pooled·w_g2)；step 3 平均/變異差
#       （pooled 分數的組間差）；permutation 用同一批固定指派
#   pls_predict — PLSpredict（Shmueli, Ray, Estrada & Chatla 2016；程序依
#       Shmueli et al. 2019 指南）：k=10 固定 fold 指派入 fixture、訓練摺標準化、
#       結構遞迴預測、LM 基準（內生指標 ~ 全部外生指標 OLS）；
#       CVPAT（Liengaard, Sharma, Hult, Jensen, Sarstedt, Hair & Ringle 2021）：
#       成對 t 檢定 on 逐案損失差（PLS vs IA、PLS vs LM）
#   pls_itcriteria — IT 準則（Sharma, Shmueli, Sarstedt, Danks & Ray 2019）：
#       AIC/AICc/BIC/HQ，由 SSE=(n−1)(1−R²) 封閉式
#   pls_ipma — IPMA（Ringle & Sarstedt 2016）：0–100 重標定、非標準化權重
#       正規化 Σw̃=1、非標準化路徑 OLS、importance = 對目標的非標準化總效果
try:
    if "_pls_engine" not in dir():
        raise RuntimeError("W3 區塊未成功（_pls_engine 不存在），W5 基準略過")
    _rng5 = np.random.default_rng(20260706)

    # ── 共用：兩群組（group2 = M / F）＋ 簡單模型 F1(i1-3)→F2(i4-6) ──
    _g_cols = ["i1", "i2", "i3", "i4", "i5", "i6"]
    _g_blocks = [[0, 1, 2], [3, 4, 5]]
    _g_pairs = [(0, 1)]
    _gvals = mainc["group2"].values
    _rowsM = np.where(_gvals == "M")[0]
    _rowsF = np.where(_gvals == "F")[0]

    def _grp_path(row_idx):
        Xg = mainc.iloc[row_idx][_g_cols].astype(float)
        Zg = _zsc(Xg)
        _, Yg, Lg, _ = _pls_engine(Zg.values, _g_blocks, ["A"] * 2, _g_pairs, "path")
        return float(np.corrcoef(Yg[:, 0], Yg[:, 1])[0, 1]), Yg, Lg

    _thM, _YM, _LM_ = _grp_path(_rowsM)
    _thF, _YF, _LF_ = _grp_path(_rowsF)

    # ── pls_mga_formulas：固定輸入的公式層驗證 ──
    _n1, _n2 = len(_rowsM), len(_rowsF)
    _se1, _se2 = 0.0812, 0.1147  # 固定假想 bootstrap SE（公式層驗證用）
    _sp = math.sqrt(((_n1 - 1) ** 2 / (_n1 + _n2 - 2)) * _se1 ** 2
                    + ((_n2 - 1) ** 2 / (_n1 + _n2 - 2)) * _se2 ** 2) \
        * math.sqrt(1 / _n1 + 1 / _n2)
    _t_pool = (_thM - _thF) / _sp
    _df_pool = _n1 + _n2 - 2
    _p_pool = 2 * sps.t.sf(abs(_t_pool), _df_pool)
    # Welch-Satterthwaite（Sarstedt, Henseler & Ringle 2011）：變異數以 (n-1)/n 加權。
    # n1 = n2 時與 Keil 的 pooled t 恆等（cSEM 0.6.1 兩者同值，2026-07-13 本機 R 抽驗確認）。
    _vw1 = ((_n1 - 1) / _n1) * _se1 ** 2
    _vw2 = ((_n2 - 1) / _n2) * _se2 ** 2
    _sw = math.sqrt(_vw1 + _vw2)
    _t_w = (_thM - _thF) / _sw
    _df_w = (_vw1 + _vw2) ** 2 / (_vw1 ** 2 / (_n1 - 1) + _vw2 ** 2 / (_n2 - 1))
    _p_w = 2 * sps.t.sf(abs(_t_w), _df_w)
    _dr1 = (_thM + _rng5.normal(0, 0.09, 200)).tolist()
    _dr2 = (_thF + _rng5.normal(0, 0.12, 200)).tolist()
    _c1 = 2 * _thM - np.array(_dr1)
    _c2 = 2 * _thF - np.array(_dr2)
    _hp = 1.0 - float(np.mean(_c1[:, None] > _c2[None, :]))  # P(θ1 ≤ θ2) 之估計
    put("pls_mga_formulas",
        "MGA 公式層基準（固定輸入）：pooled t（Keil, Tan, Wei, Saarinen, Tuunainen & "
        "Wassenaar 2000）、Welch-Satterthwaite（Sarstedt, Henseler & Ringle 2011）、"
        "Henseler MGA p（Henseler et al. 2009：偏誤校正 2θ̂−θ* 成對比較，"
        "回報 one-tailed P(θ1≤θ2)）。draws/se 固定入 fixture 供 JS 公式函式逐值比對",
        th1=_thM, th2=_thF, n1=_n1, n2=_n2, se1=_se1, se2=_se2,
        tPooled=_t_pool, dfPooled=_df_pool, pPooled=_p_pool,
        tWelch=_t_w, dfWelch=_df_w, pWelch=_p_w,
        henselerP=_hp, draws1=_dr1, draws2=_dr2)

    # ── pls_mga_perm ＋ pls_micom：40 組固定 permutation 指派 ──
    _rows_all = np.concatenate([_rowsM, _rowsF])  # 前 30 = group1
    _P = 40
    _perms = [_rng5.permutation(_rows_all).tolist() for _ in range(_P)]
    _diff_obs = _thM - _thF
    _pdiffs = []
    for _pm in _perms:
        _t1, _, _ = _grp_path(np.array(_pm[:_n1]))
        _t2, _, _ = _grp_path(np.array(_pm[_n1:]))
        _pdiffs.append(_t1 - _t2)
    _p_perm = (sum(1 for d in _pdiffs if abs(d) >= abs(_diff_obs)) + 1) / (_P + 1)
    put("pls_mga_perm",
        "MGA permutation 基準（Chin & Dibbern 2010 程序）：40 組固定標籤指派"
        "（permutations 欄，值為原始資料列索引、前 n1 個為 pseudo-group1），"
        "numpy 引擎逐組估計路徑差；p=(#{|d*|≥|d|}+1)/(P+1)。"
        "JS 以 options.permutationIndices 注入同指派 → 引擎層級交叉驗證",
        diffObs=_diff_obs, pPerm=_p_perm,
        permDiffs=[float(d) for d in _pdiffs])
    put("pls_mga_perm_inputs",
        "pls_mga_perm / pls_micom 的固定 permutation 指派（原始資料列索引；"
        "前 n1 個為 pseudo-group1）。無 adapter——僅供測試注入，不直接比對",
        permutations=[[int(i) for i in pm] for pm in _perms])

    # MICOM：step 2 c ＋ step 3 平均/變異差（pooled 標準化資料）
    _Xp = mainc.iloc[_rows_all][_g_cols].astype(float)
    _Zp = _zsc(_Xp).values  # pooled z（列序 = _rows_all）
    def _micom_c(idx1, idx2):
        cs = []
        w1s, w2s = [], []
        for idx, store in [(idx1, w1s), (idx2, w2s)]:
            Zg = _zsc(mainc.iloc[idx][_g_cols].astype(float))
            Wg, _, _, _ = _pls_engine(Zg.values, _g_blocks, ["A"] * 2, _g_pairs, "path")
            store.extend(Wg)
        for j, b in enumerate(_g_blocks):
            s1 = _Zp[:, b] @ w1s[j]
            s2 = _Zp[:, b] @ w2s[j]
            cs.append(float(np.corrcoef(s1, s2)[0, 1]))
        return cs
    # 觀察值：idx 需對映 _Zp 列序——用 _rows_all 內位置
    _pos = {r: i for i, r in enumerate(_rows_all)}
    def _micom_c_pos(pos1, pos2):
        cs = []
        wpair = []
        for pos in (pos1, pos2):
            sub = _Xp.iloc[pos]
            Zg = _zsc(sub)
            Wg, _, _, _ = _pls_engine(Zg.values, _g_blocks, ["A"] * 2, _g_pairs, "path")
            wpair.append(Wg)
        for j, b in enumerate(_g_blocks):
            s1 = _Zp[:, b] @ wpair[0][j]
            s2 = _Zp[:, b] @ wpair[1][j]
            cs.append(float(np.corrcoef(s1, s2)[0, 1]))
        return cs
    _pos1 = list(range(_n1))
    _pos2 = list(range(_n1, _n1 + _n2))
    _c_obs = _micom_c_pos(_pos1, _pos2)
    _c_perm = []
    for _pm in _perms:
        _pp = [_pos[r] for r in _pm]
        _c_perm.append(_micom_c_pos(_pp[:_n1], _pp[_n1:]))
    _c_perm = np.array(_c_perm)  # P × 2
    # step 3：pooled 權重分數的組間平均/變異差 ＋ permutation 分布
    _Wp, _Yp, _Lp, _ = _pls_engine(_Zp, _g_blocks, ["A"] * 2, _g_pairs, "path")
    def _mv_diff(pos1, pos2):
        out = []
        for j in range(2):
            s = _Yp[:, j]
            # Henseler, Ringle & Sarstedt (2016) step 3：變異數比較為 log 變異數比
            # log(var1) - log(var2)，非變異數差（cSEM 原始碼同）。
            out.append([float(s[pos1].mean() - s[pos2].mean()),
                        float(math.log(s[pos1].var(ddof=1)) - math.log(s[pos2].var(ddof=1)))])
        return out
    _mv_obs = _mv_diff(_pos1, _pos2)
    _mv_perm = []
    for _pm in _perms:
        _pp = [_pos[r] for r in _pm]
        _mv_perm.append(_mv_diff(_pp[:_n1], _pp[_n1:]))
    _mv_perm = np.array(_mv_perm)  # P × 2構念 × 2(mean,var)
    put("pls_micom",
        "MICOM 基準（Henseler, Ringle & Sarstedt 2016）：step2 c = corr(Z_pooled·w_g1, "
        "Z_pooled·w_g2)（各組權重估自組內標準化資料、分數算在 pooled 標準化資料）；"
        "step3 = pooled 權重分數的組間 平均差/變異差；permutation 用 pls_mga_perm 的"
        "同 40 組固定指派；c 的 p=(#{c*≤c}+1)/(P+1)、5% 分位為 type-7",
        c_F1=_c_obs[0], c_F2=_c_obs[1],
        cQuant5_F1=float(np.quantile(_c_perm[:, 0], 0.05)),
        cQuant5_F2=float(np.quantile(_c_perm[:, 1], 0.05)),
        cP_F1=(int(np.sum(_c_perm[:, 0] <= _c_obs[0])) + 1) / (_P + 1),
        cP_F2=(int(np.sum(_c_perm[:, 1] <= _c_obs[1])) + 1) / (_P + 1),
        meanDiff_F1=_mv_obs[0][0], varDiff_F1=_mv_obs[0][1],
        meanDiff_F2=_mv_obs[1][0], varDiff_F2=_mv_obs[1][1],
        meanCiLo_F1=float(np.quantile(_mv_perm[:, 0, 0], 0.025)),
        meanCiHi_F1=float(np.quantile(_mv_perm[:, 0, 0], 0.975)),
        varCiLo_F1=float(np.quantile(_mv_perm[:, 0, 1], 0.025)),
        varCiHi_F1=float(np.quantile(_mv_perm[:, 0, 1], 0.975)),
        meanCiLo_F2=float(np.quantile(_mv_perm[:, 1, 0], 0.025)),
        meanCiHi_F2=float(np.quantile(_mv_perm[:, 1, 0], 0.975)),
        varCiLo_F2=float(np.quantile(_mv_perm[:, 1, 1], 0.025)),
        varCiHi_F2=float(np.quantile(_mv_perm[:, 1, 1], 0.975)))

    # ── pls_predict：M4、k=10 固定 fold ──
    _pd_cols = _m4_cols
    _pd_X = mainc[_pd_cols].astype(float).values
    _n = _pd_X.shape[0]
    _fold_of = np.zeros(_n, dtype=int)
    _shuf = _rng5.permutation(_n)
    for f in range(10):
        _fold_of[_shuf[f * 6:(f + 1) * 6]] = f
    _endo = {1: [3, 4, 5], 2: [6, 7, 8], 3: [9]}  # F2/C/Y 的指標欄
    _exo_cols = [0, 1, 2]  # F1 指標（唯一外生）
    _pred_pls = np.full((_n, 10), np.nan)  # 10 = 全部指標欄
    _pred_lm = np.full((_n, 10), np.nan)
    _pred_naive = np.full((_n, 10), np.nan)
    for f in range(10):
        _tr = np.where(_fold_of != f)[0]
        _ho = np.where(_fold_of == f)[0]
        _mu = _pd_X[_tr].mean(axis=0)
        _sd = _pd_X[_tr].std(axis=0, ddof=1)
        _Ztr = (_pd_X[_tr] - _mu) / _sd
        _Wt, _Yt, _Lt, _ = _pls_engine(_Ztr, _m4_blocks, ["A"] * 4, _m4_pairs, "path")
        _Rt = np.corrcoef(_Yt, rowvar=False)
        _b_f2 = _Rt[0, 1]
        _b_c = np.linalg.solve(_Rt[np.ix_([0, 1], [0, 1])], _Rt[[0, 1], 2])
        _b_y = _Rt[1, 3]
        _Zho = (_pd_X[_ho] - _mu) / _sd
        _sF1 = _Zho[:, [0, 1, 2]] @ _Wt[0]
        _sF2 = _b_f2 * _sF1
        _sC = _b_c[0] * _sF1 + _b_c[1] * _sF2
        _sY = _b_y * _sF2
        for j, sc in [(1, _sF2), (2, _sC), (3, _sY)]:
            for hi, h in enumerate(_m4_blocks[j]):
                _pred_pls[_ho, h] = (_Lt[j][hi] * sc) * _sd[h] + _mu[h]
                _pred_naive[_ho, h] = _mu[h]
        # LM 基準：各內生指標 ~ 全部外生指標（含截距、原始量尺）
        _Xtr_lm = np.column_stack([np.ones(len(_tr)), _pd_X[_tr][:, _exo_cols]])
        _Xho_lm = np.column_stack([np.ones(len(_ho)), _pd_X[_ho][:, _exo_cols]])
        for j in (1, 2, 3):
            for h in _m4_blocks[j]:
                _bb, *_ = np.linalg.lstsq(_Xtr_lm, _pd_X[_tr][:, h], rcond=None)
                _pred_lm[_ho, h] = _Xho_lm @ _bb
    _pd_vals = {}
    _endo_cols_flat = [3, 4, 5, 6, 7, 8, 9]
    for h in _endo_cols_flat:
        x = _pd_X[:, h]
        for tag, pr in [("pls", _pred_pls), ("lm", _pred_lm)]:
            e = x - pr[:, h]
            _pd_vals[f"rmse_{tag}_{_pd_cols[h]}"] = float(np.sqrt(np.mean(e ** 2)))
            _pd_vals[f"mae_{tag}_{_pd_cols[h]}"] = float(np.mean(np.abs(e)))
            _pd_vals[f"q2p_{tag}_{_pd_cols[h]}"] = float(
                1 - np.sum(e ** 2) / np.sum((x - _pred_naive[:, h]) ** 2))
    # CVPAT：逐案損失 = 內生指標平方誤差之平均；D = loss_bench − loss_pls
    _l_pls = np.mean((_pd_X[:, _endo_cols_flat] - _pred_pls[:, _endo_cols_flat]) ** 2, axis=1)
    _l_ia = np.mean((_pd_X[:, _endo_cols_flat] - _pred_naive[:, _endo_cols_flat]) ** 2, axis=1)
    _l_lm = np.mean((_pd_X[:, _endo_cols_flat] - _pred_lm[:, _endo_cols_flat]) ** 2, axis=1)
    for tag, lb in [("ia", _l_ia), ("lm", _l_lm)]:
        D = lb - _l_pls
        tstat = D.mean() / (D.std(ddof=1) / math.sqrt(_n))
        _pd_vals[f"cvpat_{tag}_dbar"] = float(D.mean())
        _pd_vals[f"cvpat_{tag}_t"] = float(tstat)
        _pd_vals[f"cvpat_{tag}_p"] = float(2 * sps.t.sf(abs(tstat), _n - 1))
    put("pls_predict",
        "PLSpredict 基準（Shmueli et al. 2016；程序依 Shmueli et al. 2019 指南）："
        "k=10 固定 fold（foldOf 欄）、訓練摺標準化、外生分數→結構遞迴預測→"
        "loading 還原、Q²predict 以訓練摺平均為 naive；LM = 內生指標對全部外生指標"
        "OLS（原始量尺、含截距）。CVPAT（Liengaard et al. 2021）：逐案平均平方損失"
        "之成對 t 檢定（PLS vs IA、PLS vs LM）。JS 注入同 fold 指派交叉驗證",
        foldOf=[int(v) for v in _fold_of], **_pd_vals)

    # ── pls_itcriteria：AIC/AICc/BIC/HQ（Sharma et al. 2019；SSE=(n−1)(1−R²)） ──
    _W5m, _Y5m, _L5m, _ = _pls_engine(_m4_Z.values, _m4_blocks, ["A"] * 4, _m4_pairs, "path")
    _R5 = np.corrcoef(_Y5m, rowvar=False)
    _bC5 = np.linalg.solve(_R5[np.ix_([0, 1], [0, 1])], _R5[[0, 1], 2])
    _its = {}
    for lv, r2, k in [("F2", _R5[0, 1] ** 2, 1),
                      ("C", float(_bC5 @ _R5[[0, 1], 2]), 2),
                      ("Y", _R5[1, 3] ** 2, 1)]:
        sse = (N - 1) * (1 - r2)
        _its[f"aic_{lv}"] = N * math.log(sse / N) + 2 * (k + 1)
        _its[f"aicc_{lv}"] = N * math.log(sse / N) + 2 * (k + 1) + \
            2 * (k + 1) * (k + 2) / (N - k - 2)
        _its[f"bic_{lv}"] = N * math.log(sse / N) + (k + 1) * math.log(N)
        _its[f"hq_{lv}"] = N * math.log(sse / N) + 2 * (k + 1) * math.log(math.log(N))
    put("pls_itcriteria",
        "IT 模型選擇準則（Sharma, Shmueli, Sarstedt, Danks & Ray 2019）："
        "SSE=(n−1)(1−R²)（標準化分數），AIC=n·ln(SSE/n)+2(k+1)、"
        "AICc=AIC+2(k+1)(k+2)/(n−k−2)、BIC=n·ln(SSE/n)+(k+1)·ln(n)、"
        "HQ=n·ln(SSE/n)+2(k+1)·ln(ln n)。M4、path scheme", **_its)

    # ── pls_ipma：M4、目標 C（Ringle & Sarstedt 2016 程序） ──
    _raw = mainc[_m4_cols].astype(float).values
    _mins = _raw.min(axis=0)
    _maxs = _raw.max(axis=0)
    _resc = (_raw - _mins) / (_maxs - _mins) * 100.0
    _s100 = np.zeros((N, 4))
    _wnorm_store = {}
    for j, b in enumerate(_m4_blocks):
        w_un = np.array([_W5m[j][hi] / _raw[:, h].std(ddof=1) for hi, h in enumerate(b)])
        w_n = w_un / w_un.sum()
        _wnorm_store[j] = w_n
        _s100[:, j] = _resc[:, b] @ w_n
    def _ols_i(Xc, yv):
        Xi = np.column_stack([np.ones(N), *Xc])
        bb, *_ = np.linalg.lstsq(Xi, yv, rcond=None)
        return bb[1:]
    _u_f1f2 = float(_ols_i([_s100[:, 0]], _s100[:, 1])[0])
    _u_c = _ols_i([_s100[:, 0], _s100[:, 1]], _s100[:, 2])
    _imp_F1 = float(_u_c[0] + _u_f1f2 * _u_c[1])  # 總效果（直接＋經 F2）
    _imp_F2 = float(_u_c[1])
    put("pls_ipma",
        "IPMA 基準（Ringle & Sarstedt 2016）：指標 0–100 重標定（觀察 min/max）、"
        "非標準化權重 w/sd 後正規化 Σw̃=1、構念分數=Σw̃·x′、performance=分數平均、"
        "非標準化路徑=分數 OLS（含截距）、importance=對目標 C 的非標準化總效果。"
        "M4、path scheme。待 Kevin 本機 SmartPLS 4 抽驗",
        perf_F1=float(_s100[:, 0].mean()), perf_F2=float(_s100[:, 1].mean()),
        perf_C=float(_s100[:, 2].mean()),
        upath_F1_F2=_u_f1f2, upath_F1_C=float(_u_c[0]), upath_F2_C=_imp_F2,
        importance_F1=_imp_F1, importance_F2=_imp_F2,
        indImp_i1=float(_imp_F1 * _wnorm_store[0][0]),
        indPerf_i1=float(_resc[:, 0].mean()))
except Exception as e:
    put("pls_w5", f"PLS W5 baselines FAILED: {e}")

# --- NCA（必要條件分析）基準區塊 起 ------------------------------------------
# Dul (2016) ORM 19(1):10–52；統計檢定 Dul, van der Laan & Kuik (2020) ORM。
# 沙盒無 R NCA 套件 → 依封閉式定義以 numpy 手算作引擎交叉驗證基準；
# CE-FDH 為封閉式階梯，CR-FDH 為過 ceiling 點 OLS＋scope 夾擠，permutation 用固定 draws。
# 慣例對齊（scope 用實證 min/max、CE-FDH 階梯上方空白）待 Kevin 本機 R NCA::nca 抽驗。
_nx = np.asarray(datasets["nca"]["x"], float)
_ny = np.asarray(datasets["nca"]["y"], float)
_nperms = [np.asarray(p) for p in datasets["nca"]["perms"]]


def _nca_ce_peers(xx, yy):
    order = np.lexsort((yy, xx))
    xs, ys = xx[order], yy[order]
    rx, ry, run, i, m = [], [], -np.inf, 0, len(xs)
    while i < m:
        xv = xs[i]
        mm = ys[i]
        j = i
        while j < m and xs[j] == xv:
            mm = max(mm, ys[j]); j += 1
        if mm > run:
            rx.append(xv); ry.append(mm); run = mm
        i = j
    return np.array(rx), np.array(ry)


def _nca_zone_ce(xx, yy):
    xmin, xmax, ymin, ymax = xx.min(), xx.max(), yy.min(), yy.max()
    rx, ry = _nca_ce_peers(xx, yy)
    C = 0.0
    for j in range(len(rx)):
        nx = rx[j + 1] if j + 1 < len(rx) else xmax
        C += (ymax - ry[j]) * (nx - rx[j])
    S = (xmax - xmin) * (ymax - ymin)
    return C, S, C / S, rx, ry


def _nca_area_clamped(a, b, xmin, xmax, ymin, ymax):
    bps = {xmin, xmax}
    if b != 0:
        for yv in (ymin, ymax):
            xc = (yv - a) / b
            if xmin < xc < xmax:
                bps.add(xc)
    pts = sorted(bps)

    def gap(xv):
        L = a + b * xv
        return ymax - min(max(L, ymin), ymax)
    return sum((pts[k + 1] - pts[k]) * (gap(pts[k]) + gap(pts[k + 1])) / 2 for k in range(len(pts) - 1))


_C, _S, _d, _rx, _ry = _nca_zone_ce(_nx, _ny)
_xmin, _xmax, _ymin, _ymax = _nx.min(), _nx.max(), _ny.min(), _ny.max()
# CR-FDH：過 CE peers 的 OLS
_mx, _my = _rx.mean(), _ry.mean()
_b = ((_rx - _mx) * (_ry - _my)).sum() / ((_rx - _mx) ** 2).sum()
_a = _my - _b * _mx
_Ccr = _nca_area_clamped(_a, _b, _xmin, _xmax, _ymin, _ymax)
# bottleneck（CE-FDH，Y 0..100% → 所需 X 實際值）
_levels = list(range(0, 101, 10))
_bx = []
for _pct in _levels:
    _ystar = _ymin + _pct / 100.0 * (_ymax - _ymin)
    _idx = int(np.searchsorted(_ry, _ystar, side="left"))
    _bx.append(_xmax if _idx >= len(_ry) else _rx[_idx])
# permutation p（統計量 = CE-FDH d）
_cnt = sum(1 for _p in _nperms if _nca_zone_ce(_nx, _ny[_p])[2] >= _d)
_p_ce = _cnt / len(_nperms)

put("nca_ce_fdh",
    "Dul (2016) NCA CE-FDH：scope 用實證 min/max、ceiling(x)=max{y:x_i≤x} 階梯、"
    "空白區/scope=d。numpy 封閉式手算，待 Kevin 本機 R NCA::nca(ceiling='ce_fdh') 抽驗",
    xmin=_xmin, xmax=_xmax, ymin=_ymin, ymax=_ymax, scope=_S,
    n_peers=len(_rx), ceiling_zone=_C, d=_d,
    peers_x=_rx.tolist(), peers_y=_ry.tolist())
put("nca_cr_fdh",
    "Dul (2016) NCA CR-FDH：過 CE-FDH ceiling 點 OLS 得線性 ceiling，"
    "scope 內夾擠上方空白/scope=d。待 Kevin 本機 R NCA::nca(ceiling='cr_fdh') 抽驗",
    intercept=_a, slope=_b, ceiling_zone=_Ccr, d=_Ccr / _S)
put("nca_bottleneck",
    "Dul (2016) NCA bottleneck（CE-FDH）：各 Y 水準（%）反讀 ceiling 所需 X 實際值。"
    "待 Kevin 本機 R NCA::bottleneck 抽驗",
    x_required=_bx, p_ce=_p_ce)
# --- NCA 基準區塊 迄 ---------------------------------------------------------

# --- cIPMA 基準區塊 起 --------------------------------------------------------
# Hauff, Richter, Sarstedt & Ringle (2024, J. Retailing & Consumer Services)：
# combined importance-performance map analysis。NCA 跑在 IPMA 的 0–100 重標定
# LV 分數上（實證 scope、CE-FDH 為主），只測目標構念的「直接前置構念」；
# 必要性判準：d ≥ .1 且 permutation p < .05（＋理論支持）。
# bottleneck 以 0–100 實際值＋「未達所需水準之案例 %」雙格式（論文 Table 5 慣例）。
# 依賴：pls_ipma 區塊的 _s100（M4、target C）＋ NCA 區塊的 numpy 助手。
try:
    _cipX = {"F1": _s100[:, 0], "F2": _s100[:, 1]}  # C 的直接前置構念
    _cipY = _s100[:, 2]
    _cip_perms = [np.asarray(pp) for pp in datasets["cipma"]["perms"]]
    _cip_vals = {}
    for _nm, _cx in _cipX.items():
        _C_, _S_, _d_, _rx_, _ry_ = _nca_zone_ce(_cx, _cipY)
        _xmin_, _xmax_ = _cx.min(), _cx.max()
        _ymin_, _ymax_ = _cipY.min(), _cipY.max()
        # CR-FDH（過 CE peers 的 OLS＋scope 夾擠）
        _mx_, _my_ = _rx_.mean(), _ry_.mean()
        _b_ = ((_rx_ - _mx_) * (_ry_ - _my_)).sum() / ((_rx_ - _mx_) ** 2).sum()
        _a_ = _my_ - _b_ * _mx_
        _dcr_ = _nca_area_clamped(_a_, _b_, _xmin_, _xmax_, _ymin_, _ymax_) / _S_
        # permutation p（統計量 = CE-FDH d）
        _cnt_ = sum(1 for _pp in _cip_perms if _nca_zone_ce(_cx, _cipY[_pp])[2] >= _d_)
        # bottleneck @ Y=80%：所需 X 實際值＋未達案例 %
        _ystar_ = _ymin_ + 0.8 * (_ymax_ - _ymin_)
        _idx_ = int(np.searchsorted(_ry_, _ystar_, side="left"))
        _xr_ = _xmax_ if _idx_ >= len(_ry_) else _rx_[_idx_]
        _nn_ = _xr_ <= _xmin_ + 1e-9
        _pb_ = 0.0 if _nn_ else float((_cx < _xr_).mean() * 100.0)
        _cip_vals[f"d_ce_{_nm}"] = _d_
        _cip_vals[f"d_cr_{_nm}"] = _dcr_
        _cip_vals[f"p_{_nm}"] = _cnt_ / len(_cip_perms)
        _cip_vals[f"xreq80_{_nm}"] = float(_xr_)
        _cip_vals[f"pctBelow80_{_nm}"] = _pb_
    put("pls_cipma",
        "cIPMA（Hauff et al. 2024）：NCA on IPMA 0–100 LV 分數（M4、target C、"
        "直接前置構念 F1/F2）；CE-FDH＋CR-FDH、實證 scope、199 組固定 permutation、"
        "bottleneck@80% 附未達案例 %。numpy 手算（重用 pls_ipma 的 _s100 與 NCA 助手）。"
        "待 Kevin 本機 SmartPLS 4 cIPMA 抽驗",
        **_cip_vals)
except Exception as e:
    put("pls_cipma", f"cIPMA baseline FAILED: {e}")
# --- cIPMA 基準區塊 迄 --------------------------------------------------------

# --- CTA-PLS 基準區塊 起 ------------------------------------------------------
# Gudergan, Ringle, Wende & Will (2008), JBR 61(12) 的 confirmatory tetrad analysis。
#
# 【tetrad】Bollen & Ting (1993)：τ_ghij = σ_gh·σ_ij − σ_gi·σ_hj。
#   反映型（共同因子）測量模型隱含「所有 model-implied tetrads 消失」；
#   顯著不為 0 → 反映型設定被否證 → 該構念應改採形成型。
#   在標準化資料上運算（σ = 指標相關；PLS 慣例），tetrad 的消失與否不受尺度影響。
#
# 【非冗餘 tetrad 的選取】k 個指標的區塊 → 恰 k(k−3)/2 個非冗餘 tetrad
#   （= k(k−1)/2 個共變異數 − k 個 loading 的自由度差）。本實作用「逐一加入指標」
#   的確定性構造：加入第 m 個指標時新增 (m−1) 個共變異數、1 個新 loading
#   → (m−2) 個約束，取法為
#     · {0,1,2,m} 上的 2 個獨立 tetrad：(0,1,2,m) 與 (0,1,m,2)
#     · 對 c = 3..m−1 各取 1 個：(0,1,c,m)
#   Σ_{m=3}^{k−1}(m−1) = k(k−3)/2，數量與自由度一致（下方以 Jacobian 秩 assert 驗證）。
#   ※ 任一極大獨立子集張成相同的約束空間 → omnibus 判讀等價，但「個別 tetrad 的 CI」
#     會隨選取不同而不同。SmartPLS 的選取細節未文件化 → 列入待抽驗清單。
#
# 【信賴區間】Gudergan et al. (2008)：bias-corrected ＋ Bonferroni（區塊內）
#   bias = mean(τ*) − τ̂ ；SE = sd(τ*, ddof=1)
#   CI = (τ̂ − bias) ± t_{1−α/(2T), B−1} · SE     （T = 該區塊的非冗餘 tetrad 數）
#   判讀：任一 CI 不含 0 → 拒絕反映型（判為形成型）。
#   基準以固定重抽索引注入（同 pls_bca_reference 慣例），B=300、α=.05。
try:
    _cta_R_names = ["cr1", "cr2", "cr3", "cr4", "cr5"]
    _cta_M_names = ["cm1", "cm2", "cm3", "cm4"]
    _cta_all = _cta_R_names + _cta_M_names
    _cta_X = np.column_stack([np.asarray(datasets["cta"][c], dtype=float) for c in _cta_all])
    _cta_boot_idx = [np.asarray(b, dtype=int) for b in datasets["cta"]["boot"]]
    _CTA_B = len(_cta_boot_idx)
    _CTA_ALPHA = 0.05

    def _cta_nonredundant(k):
        """非冗餘 tetrad 的 (g,h,i,j) 索引清單（區塊內 0-based），數量 = k(k−3)/2。"""
        if k < 4:
            return []
        out = []
        for m in range(3, k):
            out.append((0, 1, 2, m))        # σ01·σ2m − σ02·σ1m
            out.append((0, 1, m, 2))        # σ01·σ2m − σ0m·σ12
            for c in range(3, m):
                out.append((0, 1, c, m))    # σ01·σcm − σ0c·σ1m
        return out

    def _cta_tetrad(R, t):
        g, h, i, j = t
        return float(R[g, h] * R[i, j] - R[g, i] * R[h, j])

    # 選取集的獨立性驗證：在一般點（隨機正定相關矩陣）上算 tetrad 對各 σ_ab 的
    # 梯度，Jacobian 的秩必須等於 tetrad 數（= 極大獨立）。
    def _cta_assert_independent(k, tets):
        _g = np.random.default_rng(7)
        A = _g.normal(size=(k, k + 3))
        S = np.corrcoef(A)
        pairs = [(a, b) for a in range(k) for b in range(a + 1, k)]
        J = np.zeros((len(tets), len(pairs)))
        for ti, t in enumerate(tets):
            g, h, i, j = t
            for pi, (a, b) in enumerate(pairs):
                d = 0.0
                if {a, b} == {g, h}: d += S[i, j]
                if {a, b} == {i, j}: d += S[g, h]
                if {a, b} == {g, i}: d -= S[h, j]
                if {a, b} == {h, j}: d -= S[g, i]
                J[ti, pi] = d
        r = np.linalg.matrix_rank(J, tol=1e-8)
        assert r == len(tets) == k * (k - 3) // 2, \
            f"CTA 非冗餘選取有誤：k={k} 選了 {len(tets)} 個、秩 {r}、應為 {k * (k - 3) // 2}"

    def _cta_block(names, label):
        idx = [_cta_all.index(c) for c in names]
        k = len(names)
        tets = _cta_nonredundant(k)
        _cta_assert_independent(k, tets)
        T = len(tets)
        Xb = _cta_X[:, idx]
        R0 = np.corrcoef(Xb, rowvar=False)
        obs = np.array([_cta_tetrad(R0, t) for t in tets])
        draws = np.zeros((_CTA_B, T))
        for r_ in range(_CTA_B):
            Rb = np.corrcoef(Xb[_cta_boot_idx[r_], :], rowvar=False)
            draws[r_] = [_cta_tetrad(Rb, t) for t in tets]
        bias = draws.mean(axis=0) - obs
        se = draws.std(axis=0, ddof=1)
        tcrit = float(sps.t.ppf(1 - _CTA_ALPHA / (2 * T), _CTA_B - 1))
        centre = obs - bias
        lo = centre - tcrit * se
        hi = centre + tcrit * se
        nonzero = (lo > 0) | (hi < 0)
        vals = {
            f"{label}_nTetrads": T,
            f"{label}_tCrit": tcrit,
            f"{label}_verdict": "formative" if nonzero.any() else "reflective",
            f"{label}_nNonVanishing": int(nonzero.sum()),
        }
        for q in range(T):
            g, h, i, j = tets[q]
            vals[f"{label}_t{q + 1}_label"] = ",".join(names[z] for z in (g, h, i, j))
            vals[f"{label}_t{q + 1}_value"] = float(obs[q])
            vals[f"{label}_t{q + 1}_bias"] = float(bias[q])
            vals[f"{label}_t{q + 1}_se"] = float(se[q])
            vals[f"{label}_t{q + 1}_ciLower"] = float(lo[q])
            vals[f"{label}_t{q + 1}_ciUpper"] = float(hi[q])
        return vals

    _cta_vals = {}
    _cta_vals.update(_cta_block(_cta_R_names, "R"))
    _cta_vals.update(_cta_block(_cta_M_names, "M"))
    # 設計檢核：反映型區塊不該被否證、非單因子區塊該被否證
    assert _cta_vals["R_verdict"] == "reflective", "CTA 基準資料設計失效：R5 區塊被判形成型"
    assert _cta_vals["M_verdict"] == "formative", "CTA 基準資料設計失效：M4 區塊未被否證"

    put("pls_cta",
        "CTA-PLS（Gudergan et al. 2008, JBR 61(12)；tetrad 定義 Bollen & Ting 1993）："
        "非冗餘 model-implied tetrads 在標準化資料（指標相關矩陣）上手算，"
        "bias-corrected ＋ 區塊內 Bonferroni 的 bootstrap CI（B=300 固定重抽索引注入、"
        "α=.05、t 臨界值 df=B−1）。非冗餘選取為『逐一加入指標』的確定性構造（k(k−3)/2 個，"
        "以 Jacobian 秩 assert 驗證極大獨立）。numpy 手算；"
        "SmartPLS 的 tetrad 選取與 CI 變體未文件化 → 待抽驗",
        **_cta_vals)
except Exception as e:
    put("pls_cta", f"CTA baseline FAILED: {e}")
# --- CTA-PLS 基準區塊 迄 ------------------------------------------------------

# --- Gaussian copula 內生性檢查 基準區塊 起 -----------------------------------
# Park & Gupta (2012, Marketing Science 31(4))；程序依 Hult, Hair, Proksch,
# Sarstedt, Pinkwart & Ringle (2018, JIM 26(3)) 的 PLS-SEM 應用流程：
#   c_p = Φ⁻¹(H(p))，H = 經驗 CDF（ecdf(P)(P) = 並列取最大秩 / n），H=1 夾為 1−1e−7
#   → 把 c_p 加進該內生構念的結構迴歸，檢定 c_p 係數的顯著性
#   前置：內生解釋變數須為非常態（Park & Gupta 的識別條件）→ 先跑 KS 把關
# 分數為標準化 LV 分數（copula 項為秩基底 → 對單調變換不變，標準化與否不影響）
# 顯著性以 bootstrap（B=300 固定重抽索引注入）取 SE 與 percentile CI，
# 因 copula 項的漸近 SE 非標準（Hult et al. 2018 建議 bootstrap）。
try:
    if "_pls_engine" not in dir():
        raise RuntimeError("W3 區塊未成功（_pls_engine 不存在），copula 基準略過")

    def _copula_term(v):
        """c = Φ⁻¹(ecdf(v)(v))；ecdf 並列取最大秩；H=1 夾為 1−1e−7（Hult et al. 2018 程式碼）。"""
        v = np.asarray(v, dtype=float)
        nn = len(v)
        order = np.argsort(v, kind="mergesort")
        sv = v[order]
        # 每個值的「≤ 該值的個數」＝ 右插入點（並列取最大秩）
        cnt = np.searchsorted(sv, v, side="right")
        h = cnt / nn
        h = np.where(h >= 1.0, 1.0 - 1e-7, h)
        return sps.norm.ppf(h)

    def _ols_full(Xcols, yv):
        """含截距的 OLS（欄位未必置中）；回傳 (coefs 不含截距, r2)。"""
        Xm = np.column_stack([np.ones(len(yv))] + list(Xcols))
        b, *_ = np.linalg.lstsq(Xm, yv, rcond=None)
        resid = yv - Xm @ b
        ss_tot = float(np.sum((yv - yv.mean()) ** 2))
        r2 = 1.0 - float(np.sum(resid ** 2)) / ss_tot
        return b[1:], r2

    def _copula_scores(Zmat):
        """跑 M4 引擎取標準化 LV 分數（欄序 F1, F2, C, Y）。"""
        _W, _Y, _L, _ = _pls_engine(Zmat, _m4_blocks, ["A"] * 4, _m4_pairs, "path")
        return _Y

    _cop_Y = _copula_scores(_m4_Z.values)
    _F1, _F2, _C, _Yl = (_cop_Y[:, 0], _cop_Y[:, 1], _cop_Y[:, 2], _cop_Y[:, 3])
    _cop_F1 = _copula_term(_F1)
    _cop_F2 = _copula_term(_F2)

    # KS（Lilliefors）D 統計量：JS 與 statsmodels 的 D 對齊至 1e-6；
    # p 值屬已知慣例差異（Dallal-Wilkinson vs 查表內插，見 validation-report），故只鎖 D。
    def _ks_D(v):
        v = np.asarray(v, dtype=float)
        nn = len(v)
        z = (np.sort(v) - v.mean()) / v.std(ddof=1)
        F = sps.norm.cdf(z)
        emp1 = np.arange(1, nn + 1) / nn
        emp0 = np.arange(0, nn) / nn
        return float(max(np.max(np.abs(emp1 - F)), np.max(np.abs(F - emp0))))

    _cvals = {
        "ksD_F1": _ks_D(_F1), "ksD_F2": _ks_D(_F2),
        "cop_F1": _cop_F1.tolist(), "cop_F2": _cop_F2.tolist(),
    }

    # 各結構方程的擴充迴歸（標準化 LV 分數）
    # F2 ~ F1 + c(F1)
    _b, _r2 = _ols_full([_F1, _cop_F1], _F2)
    _cvals.update(eq1_b_F1=float(_b[0]), eq1_b_copF1=float(_b[1]), eq1_r2=_r2)
    # Y ~ F2 + c(F2)
    _b, _r2 = _ols_full([_F2, _cop_F2], _Yl)
    _cvals.update(eq3_b_F2=float(_b[0]), eq3_b_copF2=float(_b[1]), eq3_r2=_r2)
    # C ~ F1 + F2 (+ copula 三種組合)
    _b, _r2 = _ols_full([_F1, _F2, _cop_F1], _C)
    _cvals.update(eq2a_b_F1=float(_b[0]), eq2a_b_F2=float(_b[1]), eq2a_b_copF1=float(_b[2]), eq2a_r2=_r2)
    _b, _r2 = _ols_full([_F1, _F2, _cop_F2], _C)
    _cvals.update(eq2b_b_F1=float(_b[0]), eq2b_b_F2=float(_b[1]), eq2b_b_copF2=float(_b[2]), eq2b_r2=_r2)
    _b, _r2 = _ols_full([_F1, _F2, _cop_F1, _cop_F2], _C)
    _cvals.update(eq2c_b_F1=float(_b[0]), eq2c_b_F2=float(_b[1]),
                  eq2c_b_copF1=float(_b[2]), eq2c_b_copF2=float(_b[3]), eq2c_r2=_r2)

    # bootstrap：300 組固定重抽索引（注入引擎交叉驗證）——每次重抽都重估權重與 copula 項
    _cop_rng = np.random.default_rng(77)
    _cop_boot_idx = [_cop_rng.integers(0, N, N).tolist() for _ in range(300)]
    _dr_c1, _dr_c2 = [], []
    for _idx in _cop_boot_idx:
        _Xb = _m4_X.values[_idx, :]
        _Zb = (_Xb - _Xb.mean(axis=0)) / _Xb.std(axis=0, ddof=1)
        _Yb = _copula_scores(_Zb)
        _f1b, _f2b, _cb = _Yb[:, 0], _Yb[:, 1], _Yb[:, 2]
        _bb, _ = _ols_full([_f1b, _f2b, _copula_term(_f1b), _copula_term(_f2b)], _cb)
        _dr_c1.append(float(_bb[2]))
        _dr_c2.append(float(_bb[3]))
    _dr_c1 = np.array(_dr_c1); _dr_c2 = np.array(_dr_c2)
    _cvals.update(
        bootN=300,
        se_copF1=float(_dr_c1.std(ddof=1)), se_copF2=float(_dr_c2.std(ddof=1)),
        ciLo_copF1=float(np.quantile(_dr_c1, 0.025)), ciHi_copF1=float(np.quantile(_dr_c1, 0.975)),
        ciLo_copF2=float(np.quantile(_dr_c2, 0.025)), ciHi_copF2=float(np.quantile(_dr_c2, 0.975)))

    # 重抽索引另存獨立鍵（為「輸入」而非「輸出」，無 adapter → compare 自動略過）
    put("pls_copula_inputs",
        "copula bootstrap 的 300 組固定重抽索引（值為原始資料列位置，可重複）；"
        "JS 以 options.bootstrapIndices 注入同一批 → 引擎層級交叉驗證",
        bootIdx=_cop_boot_idx)

    put("pls_copula",
        "Gaussian copula 內生性檢查（Park & Gupta 2012；流程依 Hult et al. 2018 JIM）："
        "c = Φ⁻¹(ecdf(P)(P))（並列取最大秩，H=1 夾為 1−1e−7）加入該內生構念的結構迴歸；"
        "KS（Lilliefors）D 為非常態前置把關（p 屬已知慣例差異，故只鎖 D）；"
        "SE／percentile CI 以 300 組固定 bootstrap 重抽索引注入（每次重估權重與 copula 項）。"
        "numpy 手算；標準化 LV 分數（copula 為秩基底，對單調變換不變）",
        **_cvals)
except Exception as e:
    put("pls_copula", f"copula baseline FAILED: {e}")
# --- Gaussian copula 內生性檢查 基準區塊 迄 -----------------------------------

# --- FIMIX-PLS 基準區塊 起 ----------------------------------------------------
# Hahn, Johnson, Herrmann & Huber (2002), Schmalenbach Business Review 54(3)；
# 段數選擇準則依 Sarstedt, Becker, Ringle & Schwaiger (2011), Schmalenbach BR 63(1)。
#
# 演算法：以全域 PLS 的標準化 LV 分數為輸入，對「內模型」做有限混合迴歸的 EM。
#   段 k、內生構念 j：η_ij ~ N(x_ij'β_kj, σ²_kj)（Hahn et al. 原式不含截距）
#   E 步：p_ik ∝ ρ_k · Π_j N(η_ij; x_ij'β_kj, σ²_kj)
#   M 步：ρ_k = mean_i p_ik；β_kj = 加權 OLS（權重 p_ik）；σ²_kj = Σp_ik·resid² / Σp_ik
#
# 為什麼沒有外部基準：FIMIX 沒有主流 Python/R 完整實作。驗證改採三重策略——
#   (a) 模擬還原：datasets["fimix"] 為兩段已知係數（+0.70 / −0.30）的模擬資料
#   (b) EM 單調性：lnL 每步不得下降（引擎端行為測試斷言）
#   (c) JS↔numpy 逐值：初始後驗機率固定注入（pls_fimix_inputs），繞開兩邊 RNG 不同的問題
try:
    if "_pls_engine" not in dir():
        raise RuntimeError("W3 區塊未成功（_pls_engine 不存在），FIMIX 基準略過")

    _fx_cols = ["fx1", "fx2", "fx3", "fy1", "fy2", "fy3"]
    _fx_X = np.column_stack([np.asarray(datasets["fimix"][c], dtype=float) for c in _fx_cols])
    _fx_Z = (_fx_X - _fx_X.mean(axis=0)) / _fx_X.std(axis=0, ddof=1)
    _fx_blocks = [[0, 1, 2], [3, 4, 5]]
    _fx_pairs = [(0, 1)]                      # FX → FY
    _fxW, _fxY, _fxL, _ = _pls_engine(_fx_Z, _fx_blocks, ["A"] * 2, _fx_pairs, "path")
    _fx_n = _fxY.shape[0]
    _fx_xi = _fxY[:, 0]                       # 外生 LV 分數
    _fx_eta = _fxY[:, 1]                      # 內生 LV 分數

    # 內模型：1 個內生構念、1 個路徑 → R = 1、M = 1 → N_k = (K−1) + K·R + K·M = 3K − 1
    def _fimix_em(K, P0, tol=1e-10, max_iter=2000):
        """回傳 (rho, beta, sigma2, post, lnL, n_iter, lnL_trace)。P0: n×K 初始後驗。"""
        P = np.asarray(P0, dtype=float).copy()
        P = P / P.sum(axis=1, keepdims=True)
        lnL_prev = -np.inf
        trace = []
        for it in range(1, max_iter + 1):
            # M 步
            rho = P.mean(axis=0)
            beta = np.empty(K)
            s2 = np.empty(K)
            for k in range(K):
                w = P[:, k]
                sw = w.sum()
                if sw < 1e-12:
                    beta[k] = 0.0
                    s2[k] = 1e-8
                    continue
                beta[k] = float((w * _fx_xi * _fx_eta).sum() / max((w * _fx_xi ** 2).sum(), 1e-12))
                r = _fx_eta - beta[k] * _fx_xi
                s2[k] = float(max((w * r ** 2).sum() / sw, 1e-8))
            # E 步（對數空間求 lnL，避免 underflow）
            logf = np.empty((_fx_n, K))
            for k in range(K):
                r = _fx_eta - beta[k] * _fx_xi
                logf[:, k] = (-0.5 * math.log(2 * math.pi * s2[k]) - r ** 2 / (2 * s2[k])
                              + math.log(max(rho[k], 1e-300)))
            mx = logf.max(axis=1, keepdims=True)
            lse = mx[:, 0] + np.log(np.exp(logf - mx).sum(axis=1))
            lnL = float(lse.sum())
            trace.append(lnL)
            P = np.exp(logf - lse[:, None])
            if abs(lnL - lnL_prev) < tol:
                return rho, beta, s2, P, lnL, it, trace
            lnL_prev = lnL
        return rho, beta, s2, P, lnL, max_iter, trace

    def _fimix_criteria(K, lnL, post):
        nk = 3 * K - 1                                    # (K−1) + K·R + K·M，R=M=1
        n = _fx_n
        out = {
            "lnL": lnL, "nParams": nk,
            "aic": -2 * lnL + 2 * nk,
            "aic3": -2 * lnL + 3 * nk,
            "aic4": -2 * lnL + 4 * nk,
            "bic": -2 * lnL + math.log(n) * nk,
            "caic": -2 * lnL + (math.log(n) + 1) * nk,
            "hq": -2 * lnL + 2 * math.log(math.log(n)) * nk,
            "mdl5": -2 * lnL + 5 * math.log(n) * nk,
        }
        if K >= 2:
            pp = np.clip(post, 1e-300, 1.0)
            ent = float(-(post * np.log(pp)).sum())
            out["en"] = 1.0 - ent / (n * math.log(K))     # normed entropy（Ramaswamy et al. 1993）
        else:
            out["en"] = None
        return out

    _fx_initrng = np.random.default_rng(202)
    _fx_vals = {}
    _fx_inputs = {}
    for _K in (1, 2, 3, 4):
        if _K == 1:
            _P0 = np.ones((_fx_n, 1))
        else:
            _P0 = _fx_initrng.random((_fx_n, _K)) + 0.1
            _P0 = np.round(_P0 / _P0.sum(axis=1, keepdims=True), 6)
            _fx_inputs[f"init_K{_K}"] = _P0.tolist()
        _rho, _beta, _s2, _post, _lnL, _it, _trace = _fimix_em(_K, _P0)
        _cr = _fimix_criteria(_K, _lnL, _post)
        for _f, _v in _cr.items():
            _fx_vals[f"{_f}_K{_K}"] = _v
        # 段別解（依段別佔比 ρ 遞減排序，消除 label switching；與 JS 引擎同規則）
        _ord = np.argsort(-_rho)
        for _i, _k in enumerate(_ord):
            _fx_vals[f"rho{_i + 1}_K{_K}"] = float(_rho[_k])
            _fx_vals[f"beta{_i + 1}_K{_K}"] = float(_beta[_k])
            _fx_vals[f"sigma2_{_i + 1}_K{_K}"] = float(_s2[_k])
        # EM 單調性（基準端自我斷言，不入 fixture）
        assert all(_trace[i + 1] >= _trace[i] - 1e-9 for i in range(len(_trace) - 1)), \
            f"FIMIX EM lnL 非單調（K={_K}）"

    # K=2 的還原率（對照 datasets["fimix"]["truth"]；label switching 取較大者）
    _rho2, _beta2, _s22, _post2, _lnL2, _, _ = _fimix_em(2, np.asarray(_fx_inputs["init_K2"]))
    _assign = _post2.argmax(axis=1)
    _truth = np.asarray(datasets["fimix"]["truth"])
    _acc = float(max((_assign == _truth).mean(), (_assign != _truth).mean()))
    _fx_vals["recovery_K2"] = _acc

    put("pls_fimix",
        "FIMIX-PLS（Hahn, Johnson, Herrmann & Huber 2002；段數準則依 Sarstedt et al. 2011）："
        "全域 PLS 的標準化 LV 分數 → 內模型的有限混合迴歸 EM（Hahn 原式不含截距）。"
        "K = 1–4 的 lnL／AIC／AIC3／AIC4／BIC／CAIC／HQ／MDL5／EN（normed entropy，"
        "Ramaswamy et al. 1993）與段別解（β 遞減排序以消除 label switching）。"
        "初始後驗機率固定注入（見 pls_fimix_inputs）→ JS↔numpy 逐值可比。"
        "資料為兩段已知係數（+0.70 / −0.30）的模擬資料，recovery_K2 為段別還原率。"
        "無主流 Python/R 實作可對照 → 驗證採「模擬還原＋EM 單調性＋JS↔numpy 逐值」三重策略",
        **_fx_vals)

    put("pls_fimix_inputs",
        "FIMIX EM 的固定初始後驗機率（n×K，逐列已正規化）；JS 以 options.initPosteriors "
        "注入同一批 → 繞開兩邊 RNG 不同、達成引擎層級逐值交叉驗證",
        **_fx_inputs)
except Exception as e:
    put("pls_fimix", f"FIMIX baseline FAILED: {e}")
# --- FIMIX-PLS 基準區塊 迄 ----------------------------------------------------

# --- PLS-POS 基準區塊 起 -------------------------------------------------------
# Becker, Rai, Ringle & Völckner (2013), MIS Quarterly 37(3)：
# prediction-oriented segmentation。與 FIMIX 互補——
#   FIMIX：軟指派（後驗機率）、目標＝混合概似
#   POS  ：硬指派、目標＝**預測誤差**（內生構念的殘差平方和），逐案重新指派的爬山法
#
# 目標函數：Obj = Σ_段 Σ_內生構念 SSE（該段該方程的殘差平方和），愈小愈好。
# 等價於最大化各段 R² 的（以段別大小加權的）總和。
#
# 爬山法（確定性，JS 端同規則）：
#   起始分割固定注入 → 逐案（依索引序）試著搬到其他段（依段索引序），
#   以充分統計量（A = Σxx'、b = Σxy、yy = Σy²、n）增量更新，
#   取「改善最大且 > 1e-12」的搬移；同分時取段索引較小者（嚴格 > 比較）。
#   一輪掃完沒有任何搬移即停止。段別大小下限 minSize 為硬約束。
#
# 驗證策略同 FIMIX（無主流實作可對照）：模擬還原＋性質斷言＋JS↔numpy 逐值。
try:
    if "_fx_xi" not in dir():
        raise RuntimeError("FIMIX 區塊未成功（_fx_xi 不存在），POS 基準略過")

    def _pos_stats(idx, xi, eta):
        """單段的充分統計量（單一預測變數、無截距）。"""
        A = float((xi[idx] ** 2).sum())
        b = float((xi[idx] * eta[idx]).sum())
        yy = float((eta[idx] ** 2).sum())
        return A, b, yy, len(idx)

    def _pos_sse(A, b, yy):
        if A <= 1e-12:
            return yy, 0.0
        beta = b / A
        return yy - beta * b, beta

    def _pos_hillclimb(assign0, xi, eta, K, min_size, max_pass=100):
        assign = np.asarray(assign0, dtype=int).copy()
        n = len(assign)
        # 充分統計量
        A = np.zeros(K); b = np.zeros(K); yy = np.zeros(K); cnt = np.zeros(K, dtype=int)
        for k in range(K):
            idx = np.where(assign == k)[0]
            A[k], b[k], yy[k], cnt[k] = _pos_stats(idx, xi, eta)

        def total():
            return sum(_pos_sse(A[k], b[k], yy[k])[0] for k in range(K))

        obj = total()
        trace = [obj]
        moves = 0
        for p in range(1, max_pass + 1):
            moved = False
            for i in range(n):
                s = assign[i]
                if cnt[s] - 1 < min_size:
                    continue
                xi2 = xi[i] ** 2; xy = xi[i] * eta[i]; y2 = eta[i] ** 2
                sse_s_out, _ = _pos_sse(A[s] - xi2, b[s] - xy, yy[s] - y2)
                sse_s_in, _ = _pos_sse(A[s], b[s], yy[s])
                best_t = -1; best_gain = 1e-12
                for t in range(K):
                    if t == s:
                        continue
                    sse_t_in, _ = _pos_sse(A[t], b[t], yy[t])
                    sse_t_out, _ = _pos_sse(A[t] + xi2, b[t] + xy, yy[t] + y2)
                    gain = (sse_s_in + sse_t_in) - (sse_s_out + sse_t_out)
                    if gain > best_gain:          # 嚴格 > → 同分取段索引較小者
                        best_gain = gain; best_t = t
                if best_t >= 0:
                    t = best_t
                    A[s] -= xi2; b[s] -= xy; yy[s] -= y2; cnt[s] -= 1
                    A[t] += xi2; b[t] += xy; yy[t] += y2; cnt[t] += 1
                    assign[i] = t
                    moved = True; moves += 1
            obj = total()
            trace.append(obj)
            if not moved:
                return assign, A, b, yy, cnt, obj, p, trace, moves
        return assign, A, b, yy, cnt, obj, max_pass, trace, moves

    _pos_rng = np.random.default_rng(303)
    _pos_vals = {}
    _pos_inputs = {}
    _pos_n = len(_fx_xi)
    _eta_ss = float((_fx_eta ** 2).sum())

    for _K in (2, 3):
        _min_size = max(3, int(0.05 * _pos_n))
        _a0 = _pos_rng.integers(0, _K, _pos_n)
        # 確保起始分割每段都達下限
        for _k in range(_K):
            while (_a0 == _k).sum() < _min_size:
                _cand = np.where(_a0 != _k)[0]
                _a0[_cand[0]] = _k
        _pos_inputs[f"init_K{_K}"] = _a0.tolist()

        _as, _A, _b, _yy, _cnt, _obj, _passes, _trace, _moves = _pos_hillclimb(
            _a0, _fx_xi, _fx_eta, _K, _min_size)

        # 爬山法單調性：目標函數每輪不得上升
        assert all(_trace[i + 1] <= _trace[i] + 1e-9 for i in range(len(_trace) - 1)), \
            f"PLS-POS 目標函數非單調遞減（K={_K}）"

        _pos_vals[f"objective_K{_K}"] = _obj
        _pos_vals[f"passes_K{_K}"] = _passes
        _pos_vals[f"r2Overall_K{_K}"] = 1.0 - _obj / _eta_ss   # 分段後整體可解釋比例
        # 段別解（依段別大小遞減排序，消除 label switching；與 JS 引擎同規則）
        _ord = np.argsort(-_cnt)
        for _i, _k in enumerate(_ord):
            _sse, _beta = _pos_sse(_A[_k], _b[_k], _yy[_k])
            _pos_vals[f"size{_i + 1}_K{_K}"] = int(_cnt[_k])
            _pos_vals[f"share{_i + 1}_K{_K}"] = float(_cnt[_k] / _pos_n)
            _pos_vals[f"beta{_i + 1}_K{_K}"] = float(_beta)
            _pos_vals[f"sse{_i + 1}_K{_K}"] = float(_sse)
            _pos_vals[f"r2_{_i + 1}_K{_K}"] = float(1.0 - _sse / max(_yy[_k], 1e-12))

        if _K == 2:
            _truth = np.asarray(datasets["fimix"]["truth"])
            _acc = float(max((_as == _truth).mean(), (_as != _truth).mean()))
            _pos_vals["recovery_K2"] = _acc
            _pos_vals["moves_K2"] = _moves

    # 全域（單段）基準：分段前的預測誤差，用來凸顯分段的增益
    _gA, _gb, _gyy, _gn = _pos_stats(np.arange(_pos_n), _fx_xi, _fx_eta)
    _gsse, _gbeta = _pos_sse(_gA, _gb, _gyy)
    _pos_vals["objective_K1"] = _gsse
    _pos_vals["beta_K1"] = _gbeta
    _pos_vals["r2Overall_K1"] = 1.0 - _gsse / _eta_ss

    put("pls_pos",
        "PLS-POS（Becker, Rai, Ringle & Völckner 2013, MISQ 37(3)）：prediction-oriented "
        "segmentation。目標＝內生構念的殘差平方和（預測誤差），硬指派＋逐案重新指派的爬山法；"
        "以充分統計量（Σxx'、Σxy、Σy²、n）增量更新；同分取段索引較小者；段別大小下限為硬約束。"
        "段別依大小遞減排序以消除 label switching。起始分割固定注入（見 pls_pos_inputs）"
        "→ JS↔numpy 逐值可比。與 FIMIX 用同一組模擬資料（兩段 β = ±0.80）；"
        "無主流實作可對照 → 驗證採「模擬還原＋目標函數單調遞減＋JS↔numpy 逐值」三重策略",
        **_pos_vals)

    put("pls_pos_inputs",
        "PLS-POS 爬山法的固定起始分割（每個個案的段索引）；JS 以 options.initAssignment "
        "注入同一批 → 繞開兩邊 RNG 不同、達成引擎層級逐值交叉驗證",
        **_pos_inputs)
except Exception as e:
    put("pls_pos", f"PLS-POS baseline FAILED: {e}")
# --- PLS-POS 基準區塊 迄 -------------------------------------------------------

# --- pairwise deletion ＋ WPLS 基準區塊 起 -------------------------------------
# handoff-roadmap §6.6（WPLS）＋§6.7（pairwise deletion）。
#
# 兩者的共同設計：Lohmöller 迭代**完全可由指標相關矩陣 R 驅動**（見 pls.js 的
# estimateCoreFromCorr）。差別只在「R 怎麼算」：
#   pairwise：R[a][b] 只用「a、b 兩欄同時可觀察」的列 → pairwise-complete 相關
#   WPLS    ：R 以抽樣權重加權（加權平均／加權共變異／加權相關）
# 統計量（loadings、lvCorr、信效度、HTMT、model fit）一律走 R；
# LV 分數則以 zero-imputed（pairwise）／加權標準化（WPLS）值加權，僅供下游使用。
#
# 模型：M1（F1: i1–i3、F2: i4–i6，Mode A、path scheme），與 pls_basic 同一組。
try:
    if "_pls_engine_from_corr" not in dir():
        # 相關矩陣驅動的 numpy 迭代（與 pls.js 的 estimateCoreFromCorr 同一套公式）
        def _pls_engine_from_corr(R, blocks, modes, path_pairs, scheme="path",
                                  tol=1e-12, max_iter=5000):
            L = len(blocks)
            pred = [[a for (a, b) in path_pairs if b == j] for j in range(L)]
            succ = [[b for (a, b) in path_pairs if a == j] for j in range(L)]

            def var_of(j, w):
                bj = blocks[j]
                return float(w @ R[np.ix_(bj, bj)] @ w)

            def lv_corr(W, j, k):
                bj, bk = blocks[j], blocks[k]
                return float(W[j] @ R[np.ix_(bj, bk)] @ W[k])

            def ind_lv(W, h, k):
                bk = blocks[k]
                return float(R[h, bk] @ W[k])

            def normalize(j, w):
                v = var_of(j, w)
                if not (v > 0):
                    raise RuntimeError("零變異 LV")
                return w / math.sqrt(v)

            W = [normalize(j, np.ones(len(blocks[j]))) for j in range(L)]
            it = 0
            for it in range(1, max_iter + 1):
                E = [dict() for _ in range(L)]
                for j in range(L):
                    if scheme == "path":
                        P = pred[j]
                        if P:
                            Rpp = np.array([[1.0 if a == b else lv_corr(W, a, b) for b in P] for a in P])
                            rpy = np.array([lv_corr(W, a, j) for a in P])
                            bco = np.array([rpy[0]]) if len(P) == 1 else np.linalg.solve(Rpp, rpy)
                            for k, a in enumerate(P):
                                E[j][a] = E[j].get(a, 0.0) + float(bco[k])
                        for sx in succ[j]:
                            E[j][sx] = E[j].get(sx, 0.0) + lv_corr(W, j, sx)
                    else:
                        for k in set(pred[j] + succ[j]):
                            e = lv_corr(W, j, k)
                            if scheme == "centroid":
                                e = 1.0 if e >= 0 else -1.0
                            E[j][k] = E[j].get(k, 0.0) + e
                Wn = []
                for j in range(L):
                    bj = blocks[j]
                    c = np.array([sum(e * ind_lv(W, h, k) for k, e in E[j].items()) for h in bj])
                    if modes[j] == "B" and len(bj) >= 2:
                        c = np.linalg.solve(R[np.ix_(bj, bj)], c)
                    Wn.append(normalize(j, c))
                diff = max(float(np.abs(Wn[j] - W[j]).max()) for j in range(L))
                W = Wn
                if diff < tol:
                    break
            for j in range(L):
                if sum(ind_lv(W, h, j) for h in blocks[j]) < 0:
                    W[j] = -W[j]
            return W, it

    _pw_cols = datasets["pw"]["cols"]
    _pw_mask = np.array(datasets["pw"]["mask"], dtype=bool)
    _pw_w = np.array(datasets["pw"]["w"], dtype=float)
    _pw_X = mainc[_pw_cols].astype(float).values
    _pw_blocks = [[0, 1, 2], [3, 4, 5]]
    _pw_pairs = [(0, 1)]

    def _pw_report(R, W):
        """由相關矩陣與權重導出 loadings / lvCorr / 路徑 / R² / rhoC / AVE。"""
        load = {}
        for j, bj in enumerate(_pw_blocks):
            for h in bj:
                load[_pw_cols[h]] = float(R[h, bj] @ W[j])
        lv01 = float(W[0] @ R[np.ix_(_pw_blocks[0], _pw_blocks[1])] @ W[1])
        # M1：F1 → F2，單一預測變數 → 路徑 = LV 相關
        out = {"path_F1_F2": lv01, "lvCorr_F1F2": lv01, "r2_F2": lv01 ** 2}
        for j, bj in enumerate(_pw_blocks):
            lam = np.array([load[_pw_cols[h]] for h in bj])
            ave = float((lam ** 2).mean())
            rhoc = float(lam.sum() ** 2 / (lam.sum() ** 2 + (1 - lam ** 2).sum()))
            out[f"ave_F{j + 1}"] = ave
            out[f"rhoC_F{j + 1}"] = rhoc
        for h, name in enumerate(_pw_cols):
            out[f"loading_{name}"] = load[name]
        for j, bj in enumerate(_pw_blocks):
            for hh, h in enumerate(bj):
                out[f"weight_{_pw_cols[h]}"] = float(W[j][hh])
        return out

    # ── (1) pairwise deletion ──
    _pw_Xm = _pw_X.copy()
    _pw_Xm[_pw_mask] = np.nan
    _p = len(_pw_cols)
    _R_pw = np.eye(_p)
    _min_pairs = len(_pw_X)
    for _a in range(_p):
        for _b in range(_a + 1, _p):
            _ok = ~np.isnan(_pw_Xm[:, _a]) & ~np.isnan(_pw_Xm[:, _b])
            _min_pairs = min(_min_pairs, int(_ok.sum()))
            _va, _vb = _pw_Xm[_ok, _a], _pw_Xm[_ok, _b]
            _r = float(np.corrcoef(_va, _vb)[0, 1])
            _R_pw[_a, _b] = _R_pw[_b, _a] = _r
    _W_pw, _it_pw = _pls_engine_from_corr(_R_pw, _pw_blocks, ["A"] * 2, _pw_pairs, "path")
    _pw_vals = {f"pw_{k}": v for k, v in _pw_report(_R_pw, _W_pw).items()}
    _pw_vals["pw_minPairs"] = _min_pairs
    _pw_vals["pw_minEig"] = float(np.linalg.eigvalsh(_R_pw).min())

    # ── (2) WPLS（加權相關矩陣）──
    _sw = _pw_w.sum()
    _mu = (_pw_w[:, None] * _pw_X).sum(axis=0) / _sw
    _dev = _pw_X - _mu
    _cov = (_pw_w[:, None, None] * (_dev[:, :, None] * _dev[:, None, :])).sum(axis=0) / _sw
    _sd = np.sqrt(np.diag(_cov))
    _R_w = _cov / np.outer(_sd, _sd)
    np.fill_diagonal(_R_w, 1.0)
    _W_w, _it_w = _pls_engine_from_corr(_R_w, _pw_blocks, ["A"] * 2, _pw_pairs, "path")
    _pw_vals.update({f"w_{k}": v for k, v in _pw_report(_R_w, _W_w).items()})

    # ── (3) 自我一致性：完整資料 + 全 1 權重 → 必須等於 pls_basic ──
    _R_full = np.corrcoef(_pw_X, rowvar=False)
    _W_full, _ = _pls_engine_from_corr(_R_full, _pw_blocks, ["A"] * 2, _pw_pairs, "path")
    _full = _pw_report(_R_full, _W_full)
    # 自我一致性：完整資料下，相關矩陣驅動的迭代必須重現原欄位驅動引擎的 pls_basic。
    # 容差 1e-6 而非機器精度——兩者代數等價，但收斂終止的浮點位置不同
    # （原引擎的內部權重由分數向量的相關累加而得，本式為代數乘積），
    # 實測差 ~1.3e-8，遠在 PLS 迭代量的比對容差（1e-4）之內。
    assert abs(_full["path_F1_F2"] - 0.3603108815299656) < 1e-6, \
        f"相關矩陣驅動的引擎未能重現 pls_basic 的 path（得到 {_full['path_F1_F2']}）"
    _pw_vals.update({f"full_{k}": v for k, v in _full.items()})

    put("pls_pairwise_wpls",
        "pairwise deletion（handoff §6.7）與 WPLS 加權 PLS（§6.6）：兩者共用「相關矩陣驅動」"
        "的 Lohmöller 迭代，差別只在 R 怎麼算。pairwise：R[a][b] 只用該配對同時可觀察的列；"
        "WPLS：加權平均／加權共變異／加權相關（權重同乘常數不影響結果）。"
        "統計量（loadings／lvCorr／路徑／R²／rhoC／AVE）一律由 R 導出。"
        "固定 MCAR 遮罩（約 11.4%）與固定抽樣權重見 datasets.json:pw。"
        "full_* 為自我一致性欄位：完整資料走同一條相關矩陣路徑，必須重現 pls_basic",
        **_pw_vals)
except Exception as e:
    put("pls_pairwise_wpls", f"pairwise/WPLS baseline FAILED: {e}")
# --- pairwise deletion ＋ WPLS 基準區塊 迄 -------------------------------------





# ---------------------------------------------------------------
# 紅隊 R1 增補（2026-07-13）：cluster / lda 首次建立基準、EFA 補設定、
# CFA 擴充至 loadings 與非中央 χ² 機制。見 docs/redteam-audit-workplan-v1.md。
# ---------------------------------------------------------------

# 共用正規化：消除「與統計內容無關」的任意性，讓逐值比對可行
def _canon_labels(lab):
    """分群標籤依首次出現順序重新編號 → 兩邊的分割相同則陣列逐值相等。"""
    m, out, nxt = {}, [], 0
    for v in lab:
        if v not in m:
            m[v] = nxt; nxt += 1
        out.append(m[v])
    return out

def _canon_cols(L):
    """負荷/係數矩陣（列=變項、欄=因子）：每欄符號使 |最大| 元素為正，
    欄序依平方和遞減。消除因子順序與符號的任意性。"""
    L = np.array(L, float).copy()
    for j in range(L.shape[1]):
        if L[np.argmax(np.abs(L[:, j])), j] < 0:
            L[:, j] *= -1
    return L[:, np.argsort(-(L ** 2).sum(0))]

# --- 集群分析（k-means / Ward 階層）：JS 以樣本 SD（ddof=1）做 z-score
from sklearn.cluster import KMeans, AgglomerativeClustering
from sklearn.metrics import silhouette_score

_cl_vars = ["x1", "x2", "x3"]
_Xcl = mainc[_cl_vars].values.astype(float)
_Zcl = (_Xcl - _Xcl.mean(0)) / _Xcl.std(0, ddof=1)
_tss = float(((_Zcl - _Zcl.mean(0)) ** 2).sum())

def _cluster_metrics(lab, k):
    cent = np.array([_Zcl[lab == c].mean(0) for c in range(k)])
    wss_pc = np.array([((_Zcl[lab == c] - cent[c]) ** 2).sum() for c in range(k)])
    o = np.argsort(np.bincount(lab, minlength=k))  # 依群大小排序，消除標籤任意性
    return dict(
        wss=float(wss_pc.sum()), tss=_tss, bss=_tss - float(wss_pc.sum()),
        silhouette=float(silhouette_score(_Zcl, lab)),
        sizesSorted=sorted(np.bincount(lab, minlength=k).tolist()),
        wssPerClusterSorted=sorted(np.round(wss_pc, 8).tolist()),
        labelsCanonical=_canon_labels(lab.tolist()),
    )

# k-means：n_init=50 取近全域最佳解。JS 用 k-means++ ＋ 10 次重啟，
# 在 k=2/3（fixture 的實際結構）會收斂到同一組全域最佳解。
_km = KMeans(n_clusters=3, init="k-means++", n_init=50, max_iter=300, random_state=0).fit(_Zcl)
put("cluster_kmeans_k3",
    "sklearn.KMeans(k=3, k-means++, n_init=50) on z-scored(ddof=1) x1,x2,x3；"
    "silhouette 由 sklearn.metrics.silhouette_score（歐氏）計算。"
    "標籤以「首次出現順序」正規化後逐值比對（分割相同即完全相等，ARI=1）",
    **_cluster_metrics(_km.labels_, 3))

# Ward 階層：scipy/sklearn 的 ward linkage 距離為 sqrt(2·ΔSS)，與 JS 儲存的 ΔSS
# 差一個單調變換 → 合併順序與切樹結果完全相同。
_ag = AgglomerativeClustering(n_clusters=3, linkage="ward").fit(_Zcl)
_ward_elbow = []
for _k in range(2, 11):
    _a = AgglomerativeClustering(n_clusters=_k, linkage="ward").fit(_Zcl).labels_
    _c = np.array([_Zcl[_a == j].mean(0) for j in range(_k)])
    _ward_elbow.append(float(sum(((_Zcl[_a == j] - _c[j]) ** 2).sum() for j in range(_k))))
put("cluster_ward_k3",
    "sklearn.AgglomerativeClustering(k=3, linkage='ward') on z-scored(ddof=1) x1,x2,x3。"
    "elbowWss 為 k=2..10 的 within-SS 曲線（Ward 為確定性演算法，可逐值比對）",
    elbowWss=[round(v, 8) for v in _ward_elbow],
    **_cluster_metrics(_ag.labels_, 3))

# --- LDA（Fisher 多組線性判別）
from scipy.linalg import eigh as _geigh

_lda_pred = ["x1", "x2", "x3"]
_Xl = mainc[_lda_pred].values.astype(float)
_gl = mainc["group3"].values
_lev = sorted(set(_gl))
_Yl = np.array([_lev.index(v) for v in _gl])
_kl, _pl, _Nl = len(_lev), len(_lda_pred), len(_Yl)
_gm = np.array([_Xl[_Yl == c].mean(0) for c in range(_kl)])
_ng = np.array([(_Yl == c).sum() for c in range(_kl)])
_grand = (_ng[:, None] * _gm).sum(0) / _Nl
_Bl = sum(_ng[c] * np.outer(_gm[c] - _grand, _gm[c] - _grand) for c in range(_kl))
_Wl = sum((_Xl[_Yl == c] - _gm[c]).T @ (_Xl[_Yl == c] - _gm[c]) for c in range(_kl))
_Sp = _Wl / (_Nl - _kl)
_lam, _vec = _geigh(_Bl, _Wl)                       # 廣義特徵問題 B w = λ W w
_ord = np.argsort(_lam)[::-1]
_nf = min(_kl - 1, _pl)
_lam = np.clip(_lam[_ord][:_nf], 0, None)
_vec = _vec[:, _ord][:, :_nf]
# 未標準化係數（SPSS unstandardized）：縮放使 wᵀ Sp w = 1
_Wun = np.column_stack([_vec[:, i] / np.sqrt(_vec[:, i] @ _Sp @ _vec[:, i]) for i in range(_nf)])
# 符號正規化：使每個函數中絕對值最大的未標準化係數為正（消除特徵向量符號任意性）
for i in range(_nf):
    if _Wun[np.argmax(np.abs(_Wun[:, i])), i] < 0:
        _Wun[:, i] *= -1
_scores = (_Xl - _grand) @ _Wun
# 標準化係數（SPSS standardized）= 未標準化 × 組內合併 SD
_Wstd = _Wun * np.sqrt(np.diag(_Sp))[:, None]
# structure matrix：SPSS = 組內合併（pooled within-group）相關
_Xw = np.vstack([_Xl[_Yl == c] - _gm[c] for c in range(_kl)])
_Sw = np.vstack([_scores[_Yl == c] - _scores[_Yl == c].mean(0) for c in range(_kl)])
_struct_w = np.array([[np.corrcoef(_Xw[:, j], _Sw[:, i])[0, 1] for j in range(_pl)] for i in range(_nf)])
_struct_t = np.array([[np.corrcoef(_Xl[:, j], _scores[:, i])[0, 1] for j in range(_pl)] for i in range(_nf)])
_cent_l = np.array([(_gm[c] - _grand) @ _Wun for c in range(_kl)])
_wilks = [float(np.prod([1 / (1 + _lam[q]) for q in range(i, _nf)])) for i in range(_nf)]
_chi2_l = [-(_Nl - 1 - (_pl + _kl) / 2) * math.log(_wilks[i]) for i in range(_nf)]
# 分類（resubstitution）：δ_g(x) = xᵀSp⁻¹μ_g − ½μ_gᵀSp⁻¹μ_g + ln π_g
_SpI = np.linalg.inv(_Sp)
_delta = _Xl @ (_SpI @ _gm.T) - 0.5 * np.einsum("gi,ij,gj->g", _gm, _SpI, _gm) + np.log(_ng / _Nl)
_pred = _delta.argmax(1)
put("lda_group3",
    "Fisher 多組 LDA（group3 ~ x1+x2+x3）：scipy.linalg.eigh(B, W) 廣義特徵分解；"
    "未標準化係數縮放使 wᵀSp w = 1（SPSS unstandardized），標準化係數 = 未標準化 × 組內合併 SD"
    "（SPSS standardized），structure matrix 為組內合併（pooled within-group）相關（SPSS/R MASS 定義）。"
    "符號以「函數內絕對值最大的未標準化係數為正」正規化",
    eigenvalues=_lam.tolist(),
    canonicalCorrelations=np.sqrt(_lam / (1 + _lam)).tolist(),
    proportionOfVariance=(_lam / _lam.sum()).tolist(),
    wilksLambda=_wilks,
    chi2=_chi2_l,
    df=[float((_pl - i) * (_kl - 1 - i)) for i in range(_nf)],
    unstandardizedCoefficients=_Wun.T.flatten().tolist(),
    standardizedCoefficients=_Wstd.T.flatten().tolist(),
    structureCoefficients=_struct_w.flatten().tolist(),
    structureCoefficientsTotal=_struct_t.flatten().tolist(),
    groupCentroids=_cent_l.flatten().tolist(),
    groupSizes=_ng.tolist(),
    overallAccuracy=float((_pred == _Yl).mean()))

# --- EFA 補設定：未轉軸（rotation='none'）與 3 因子 varimax
# ⚠ 模組邊界：EFA 只支援 PCA 萃取（principal）＋ varimax|none。
#   promax 斜交與 ML 萃取尚未實作 → 無法建立基準，見 validation-report「模組邊界」。
_fa_none = FactorAnalyzer(n_factors=2, rotation=None, method="principal")
_fa_none.fit(items)
put("efa_pca_none",
    "factor_analyzer(principal, rotation=None)：未轉軸主成分負荷。"
    "負荷矩陣以「每欄 |最大| 元素為正、欄序依平方和遞減」正規化後逐值比對",
    loadings=_canon_cols(_fa_none.loadings_).flatten().tolist(),
    communalities=sorted(_fa_none.get_communalities().round(8).tolist()),
    eigAll=np.sort(np.linalg.eigvalsh(items.corr().values))[::-1].tolist())

_fa_k3 = FactorAnalyzer(n_factors=3, rotation="varimax", method="principal",
                        rotation_kwargs={"tol": 1e-12, "max_iter": 1000})
_fa_k3.fit(items)
put("efa_pca_varimax_k3",
    "factor_analyzer(principal, varimax, 3 因子, rotation tol=1e-12)",
    loadings=_canon_cols(_fa_k3.loadings_).flatten().tolist(),
    communalities=sorted(_fa_k3.get_communalities().round(8).tolist()))

# --- CFA 擴充：標準化 loadings、因子相關（semopy 逐值比對）
try:
    _ins = mod_cfa.inspect(std_est=True)
    _lam_rows = _ins[_ins["op"] == "~"]
    _lstd = {r["lval"]: float(r["Est. Std"]) for _, r in _lam_rows.iterrows()}
    _pc = _ins[(_ins["op"] == "~~") & (_ins["lval"] == "F1") & (_ins["rval"] == "F2")]
    put("cfa_2factor_loadings",
        "semopy(ML) 標準化解：各指標的標準化因子負荷與 F1–F2 因子相關。"
        "χ² 慣例差異（N vs N−1）只影響適配指標，不影響參數估計 → loadings 可逐值比對",
        lambdaStd_i1=_lstd["i1"], lambdaStd_i2=_lstd["i2"], lambdaStd_i3=_lstd["i3"],
        lambdaStd_i4=_lstd["i4"], lambdaStd_i5=_lstd["i5"], lambdaStd_i6=_lstd["i6"],
        factorCorr_F1F2=float(_pc["Est. Std"].iloc[0]))
except Exception as e:
    put("cfa_2factor_loadings", f"semopy loadings FAILED: {e}")

# --- 非中央 χ² 尾機率與 RMSEA 90% CI（MacCallum, Browne & Sugawara 1996）
# 2026-07-13 修復的 pChiSqNoncentral 級數截斷 bug 的回歸防線：
# 修復前 ncp ≳ 100 會塌成 ~0，導致 RMSEA CI 印出 [59.954, 59.954]。
from scipy.stats import ncx2 as _ncx2, chi2 as _chi2d
from scipy.optimize import brentq as _brentq

_nc_grid = [(7.1044, 8, 5.0), (7.1044, 8, 50.0), (7.1044, 8, 100.0), (7.1044, 8, 500.0),
            (60.0, 50, 20.0), (60.0, 50, 62.4), (200.0, 50, 100.0), (500.0, 120, 300.0)]
put("cfa_noncentral_chi2",
    "scipy.stats.ncx2.sf(x, df, ncp) — 非中央 χ² 尾機率 P(X ≥ x)。"
    "格點刻意涵蓋 ncp ≳ 100 的區間（2026-07-13 修復前此區塊會塌成 ~0）",
    **{f"sf_x{x:g}_df{df}_ncp{ncp:g}": float(_ncx2.sf(x, df, ncp)) for x, df, ncp in _nc_grid})

def _rmsea_ci(chi2v, dfv, nv, level=0.9):
    a = (1 - level) / 2
    def _ncp_at(target):
        f = lambda L: _ncx2.sf(chi2v, dfv, L) - target
        if _chi2d.sf(chi2v, dfv) >= target:
            return 0.0
        return _brentq(f, 0, 1e6)
    den = dfv * max(nv - 1, 1)
    return math.sqrt(_ncp_at(a) / den), math.sqrt(_ncp_at(1 - a) / den)

_ci_grid = [(7.1044, 8, 60), (60.0, 50, 200), (200.0, 50, 500), (500.0, 120, 800)]
_ci_vals = {}
for _c, _d, _n in _ci_grid:
    _lo, _hi = _rmsea_ci(_c, _d, _n)
    _tag = f"chi2{_c:g}_df{_d}_n{_n}"
    _ci_vals[f"lo_{_tag}"] = _lo
    _ci_vals[f"hi_{_tag}"] = _hi
    _ci_vals[f"pclose_{_tag}"] = float(_ncx2.sf(_c, _d, 0.05 ** 2 * _d * (_n - 1)))
put("cfa_rmsea_ci",
    "RMSEA 90% CI（MacCallum, Browne & Sugawara 1996）：λ_L 使 P(χ²_df,λ ≥ χ²) = .05、"
    "λ_U 使 = .95，RMSEA = √(λ / (df·(N−1)))；pclose = close-fit 檢定 P(χ² ≥ χ²obs | λ = .05²·df·(N−1))。"
    "scipy.stats.ncx2 ＋ brentq。2026-07-13 修復前上下界標籤對調且級數截斷 → 全部失效",
    **_ci_vals)


with open(os.path.join(FIX, "reference.json"), "w") as f:
    json.dump(REF, f, indent=1)

print(f"datasets: main n={N}, small n=8, ties n=24")
print(f"reference methods: {len(REF)}")
for k in REF:
    print(" -", k)
