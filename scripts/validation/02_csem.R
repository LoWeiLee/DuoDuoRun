# ============================================================================
# 多多快跑 抽驗腳本 02：cSEM
# 對象：PLSc（一致 loadings／校正相關）、模型適配（SRMR / dL=d_ULS / dG / NFI）、
#       MICOM（step 2 的 c、step 3 平均/變異差）、MGD（多群組差異檢定）
# 輸出：out/02_csem_out.txt（把整份內容回報給 AI 即可）
# ----------------------------------------------------------------------------
# 模型（與 tests/generate_reference.py 一致）：
#   M4  : F1 =~ i1+i2+i3 ; F2 =~ i4+i5+i6 ; C =~ cond1+cond2+cond3 ; Y =~ y
#         F1 -> F2 ; F1 -> C ; F2 -> C ; F2 -> Y
#   群組: group2（M / F，各 30）；MGA/MICOM 用簡單模型 F1 -> F2
# ============================================================================

if (!requireNamespace("cSEM", quietly = TRUE)) install.packages("cSEM", repos = "https://cloud.r-project.org")
library(cSEM)

dir.create("out", showWarnings = FALSE)
sink("out/02_csem_out.txt", split = TRUE)
cat("== cSEM 版本 ==\n"); print(packageVersion("cSEM"))

dat <- read.csv("data/main.csv", stringsAsFactors = FALSE)
cat("\n== 資料檢核（應為 n=60）==\n"); cat("n =", nrow(dat), "\n")

model_m4 <- "
# 測量模型（composite，Mode A）
F1 <~ i1 + i2 + i3
F2 <~ i4 + i5 + i6
C  <~ cond1 + cond2 + cond3
Y  <~ y

# 結構模型
F2 ~ F1
C  ~ F1 + F2
Y  ~ F2
"

# ---------------------------------------------------------------- 標準 PLS（未 disattenuate）
cat("\n\n########## [1] M4 標準 PLS（.disattenuate = FALSE）##########\n")
res_pls <- csem(.data = dat, .model = model_m4,
                .approach_weights = "PLS-PM", .PLS_weight_scheme_inner = "path",
                .disattenuate = FALSE, .tolerance = 1e-12)
cat("\n-- 路徑係數 --\n"); print(round(res_pls$Estimates$Path_estimates, 6))
cat("\n-- loadings --\n"); print(round(res_pls$Estimates$Loading_estimates, 6))
cat("\n-- 構念相關 --\n"); print(round(res_pls$Estimates$Construct_VCV, 6))
cat("\n-- R2 --\n"); print(round(res_pls$Estimates$R2, 6))

# ---------------------------------------------------------------- 模型適配（高優先）
cat("\n\n########## [2] 模型適配 SRMR / dL(=d_ULS) / dG / NFI ##########\n")
cat("★ 高優先抽驗項：多多快跑用 Henseler et al. (2014) composite factor model 的隱含矩陣。\n")
cat("  cSEM 的飽和/估計模型口徑若不同，此處數字會有系統性差異。\n")
fit_all <- assess(res_pls, .quality_criterion = c("srmr", "dl", "dg", "nfi", "chi_square", "df"))
print(fit_all)
cat("\n-- fit_summary（若可用，含 saturated vs estimated）--\n")
try(print(fit(res_pls)), silent = TRUE)

# ---------------------------------------------------------------- PLSc（高優先）
cat("\n\n########## [3] PLSc（.disattenuate = TRUE，Dijkstra & Henseler 2015）##########\n")
res_plsc <- csem(.data = dat, .model = model_m4,
                 .approach_weights = "PLS-PM", .PLS_weight_scheme_inner = "path",
                 .disattenuate = TRUE, .tolerance = 1e-12)
cat("\n-- 一致 loadings --\n"); print(round(res_plsc$Estimates$Loading_estimates, 6))
cat("\n-- 校正後路徑 --\n");    print(round(res_plsc$Estimates$Path_estimates, 6))
cat("\n-- 校正後構念相關 --\n"); print(round(res_plsc$Estimates$Construct_VCV, 6))
cat("\n-- R2 --\n");             print(round(res_plsc$Estimates$R2, 6))
cat("\n-- rhoA（cSEM 的 Reliabilities 欄位）--\n")
cat("   對照：rhoA F1=1.017597（>1！）、F2=0.707796、C=0.888324\n")
try(print(round(res_plsc$Estimates$Reliabilities, 6)), silent = FALSE)
cat("\n-- assess() 全量品質指標（版本間欄位名稱可能不同，全印出來保險）--\n")
try(print(assess(res_plsc)), silent = FALSE)

cat("\n※ 關鍵行為問題：多多快跑的 rhoA(F1)=1.017597、一致 loading(i2)=1.151977，\n")
cat("  兩者都 > 1。多多快跑的處置是『警告但不截斷』（自認對齊 cSEM）。\n")
cat("  請看上面 cSEM 的輸出：是同樣不截斷、截斷至 1、還是直接報錯？\n")
cat("  （如果 cSEM 這裡出現 warning 訊息，也請一併把 warning 全文回報。）\n")

# ---------------------------------------------------------------- MICOM（高優先）
cat("\n\n########## [4] MICOM（group2：M vs F；簡單模型 F1 -> F2）##########\n")
cat("★ 高優先抽驗項：step 2 的 c（多多快跑：各組權重估自組內標準化資料、分數算在 pooled 標準化資料）\n")
model_simple <- "
F1 <~ i1 + i2 + i3
F2 <~ i4 + i5 + i6
F2 ~ F1
"
set.seed(2026)
mic <- testMICOM(.object = csem(.data = dat, .model = model_simple,
                                .approach_weights = "PLS-PM",
                                .PLS_weight_scheme_inner = "path",
                                .disattenuate = FALSE,
                                .id = "group2"),
                 .R = 1000, .verbose = TRUE)
print(mic)

# ---------------------------------------------------------------- MGD
cat("\n\n########## [5] MGD 多群組差異檢定（group2）##########\n")
cat("註：多多快跑以 permutation 為主判準；Henseler MGA 回報單尾 P(b1<=b2)。\n")
cat("    請確認 cSEM 的 Henseler p 是單尾還是雙尾。\n")
set.seed(2026)
mgd <- testMGD(.object = csem(.data = dat, .model = model_simple,
                              .ap