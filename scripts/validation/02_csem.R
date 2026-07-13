# ============================================================================
# 多多快跑 抽驗腳本 02：cSEM（v2 修正版 2026-07-13）
# 對象：PLSc（一致 loadings／校正相關）、模型適配（SRMR / dL=d_ULS / dG / NFI）、
#       MICOM（step 2 的 c、step 3 平均/變異差）、MGD（多群組差異檢定）
# 輸出：out/02_csem_out.txt（把整份內容回報給 AI 即可）
# ----------------------------------------------------------------------------
# v2 修正兩個 bug：
#   (1) 模型宣告誤用 `<~`（cSEM 語法＝形成型 Mode B），造成估的不是 Mode A，
#       與多多快跑／seminr 不可比。改為 `=~`（反映型），並以 .disattenuate 切換
#       標準 PLS（FALSE，Mode A 複合體）與 PLSc（TRUE）。
#   (2) 原檔在第 97 行截斷（MGD 段寫到一半），testMGD 與 sink() 從未執行。
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
cat("== 腳本版本：v2（=~ 反映型宣告；MGD 段補完）==\n")

dat <- read.csv("data/main.csv", stringsAsFactors = FALSE)
cat("\n== 資料檢核（應為 n=60）==\n"); cat("n =", nrow(dat), "\n")

model_m4 <- "
# 測量模型（反映型；Mode A 由 .disattenuate = FALSE 給出標準 PLS 複合體）
F1 =~ i1 + i2 + i3
F2 =~ i4 + i5 + i6
C  =~ cond1 + cond2 + cond3
Y  =~ y

# 結構模型
F2 ~ F1
C  ~ F1 + F2
Y  ~ F2
"

# ---------------------------------------------------------------- 標準 PLS（Mode A，未 disattenuate）
cat("\n\n########## [1] M4 標準 PLS（Mode A，.disattenuate = FALSE）##########\n")
cat("對照（多多快跑／seminr）：loading i1=0.766 i2=0.923 i3=0.731；\n")
cat("  path F1->F2=0.353、F1->C=-0.230、F2->C=-0.218、F2->Y=0.160；R2 F2=0.124 C=0.136 Y=0.025\n")
res_pls <- csem(.data = dat, .model = model_m4,
                .approach_weights = "PLS-PM", .PLS_weight_scheme_inner = "path",
                .disattenuate = FALSE, .tolerance = 1e-12)
cat("\n-- 路徑係數 --\n"); print(round(res_pls$Estimates$Path_estimates, 6))
cat("\n-- loadings --\n"); print(round(res_pls$Estimates$Loading_estimates, 6))
cat("\n-- weights --\n"); print(round(res_pls$Estimates$Weight_estimates, 6))
cat("\n-- 構念相關 --\n"); print(round(res_pls$Estimates$Construct_VCV, 6))
cat("\n-- R2 --\n"); print(round(res_pls$Estimates$R2, 6))

# ---------------------------------------------------------------- 模型適配（高優先）
cat("\n\n########## [2] 模型適配 SRMR / dL(=d_ULS) / dG / NFI ##########\n")
cat("★ 高優先抽驗項。多多快跑（Henseler et al. 2014 composite factor model 隱含矩陣）：\n")
cat("  飽和模型 srmrSat=0.097562 dUlsSat=0.523512 dGSat=1.046563 nfiSat=0.679375\n")
cat("  估計模型 srmrEst=0.104374 dUlsEst=0.599161 dGEst=1.098801 nfiEst=0.668422\n")
cat("  → 請注意 cSEM 報的是飽和口徑還是估計口徑。\n")
fit_all <- assess(res_pls, .quality_criterion = c("srmr", "dl", "dg", "nfi", "chi_square", "df"))
print(fit_all)
cat("\n-- calculateSRMR / calculateDL / calculateDG（逐項，明確口徑）--\n")
try({
  cat("SRMR (saturated=TRUE) :", calculateSRMR(res_pls, .saturated = TRUE), "\n")
  cat("SRMR (saturated=FALSE):", calculateSRMR(res_pls, .saturated = FALSE), "\n")
  cat("dL   (saturated=TRUE) :", calculateDL(res_pls, .saturated = TRUE), "\n")
  cat("dL   (saturated=FALSE):", calculateDL(res_pls, .saturated = FALSE), "\n")
  cat("dG   (saturated=TRUE) :", calculateDG(res_pls, .saturated = TRUE), "\n")
  cat("dG   (saturated=FALSE):", calculateDG(res_pls, .saturated = FALSE), "\n")
  cat("NFI  (saturated=TRUE) :", calculateNFI(res_pls, .saturated = TRUE), "\n")
  cat("NFI  (saturated=FALSE):", calculateNFI(res_pls, .saturated = FALSE), "\n")
}, silent = FALSE)

# ---------------------------------------------------------------- PLSc（高優先）
cat("\n\n########## [3] PLSc（.disattenuate = TRUE，Dijkstra & Henseler 2015）##########\n")
cat("對照（多多快跑）：rhoA F1=1.017597（>1！）、F2=0.707796、C=0.888324\n")
cat("  一致 loadings：i1=0.528871 i2=1.151977（>1！）i3=0.474594\n")
cat("  校正後路徑：F1->F2=0.415649、F1->C=-0.200825、F2->C=-0.293462、F2->Y=0.189810\n")
cat("  R2：F2=0.172764 C=0.175443 Y=0.036028\n")
res_plsc <- csem(.data = dat, .model = model_m4,
                 .approach_weights = "PLS-PM", .PLS_weight_scheme_inner = "path",
                 .disattenuate = TRUE, .tolerance = 1e-12)
cat("\n-- 一致 loadings --\n"); print(round(res_plsc$Estimates$Loading_estimates, 6))
cat("\n-- 校正後路徑 --\n");    print(round(res_plsc$Estimates$Path_estimates, 6))
cat("\n-- 校正後構念相關 --\n"); print(round(res_plsc$Estimates$Construct_VCV, 6))
cat("\n-- R2 --\n");             print(round(res_plsc$Estimates$R2, 6))
cat("\n-- rhoA（Reliabilities）--\n")
try(print(round(res_plsc$Estimates$Reliabilities, 6)), silent = FALSE)
cat("\n-- assess() 全量品質指標 --\n")
try(print(assess(res_plsc)), silent = FALSE)

cat("\n※ 關鍵行為問題：多多快跑的 rhoA(F1)=1.017597、一致 loading(i2)=1.151977，\n")
cat("  兩者都 > 1。多多快跑的處置是『警告但不截斷』（自認對齊 cSEM）。\n")
cat("  請看上面 cSEM 的輸出：是同樣不截斷、截斷至 1、還是直接報錯？\n")
cat("  （如果 cSEM 這裡出現 warning 訊息，也請一併把 warning 全文回報。）\n")

# ---------------------------------------------------------------- MICOM（高優先）
cat("\n\n########## [4] MICOM（group2：M vs F；簡單模型 F1 -> F2）##########\n")
cat("★ 高優先抽驗項：step 2 的 c（多多快跑：各組權重估自組內標準化資料、分數算在 pooled 標準化資料）\n")
model_simple <- "
F1 =~ i1 + i2 + i3
F2 =~ i4 + i5 + i6
F2 ~ F1
"
set.seed(2026)
csem_simple <- csem(.data = dat, .model = model_simple,
                    .approach_weights = "PLS-PM",
                    .PLS_weight_scheme_inner = "path",
                    .disattenuate = FALSE,
                    .id = "group2")
mic <- testMICOM(.object = csem_simple, .R = 1000, .verbose = TRUE)
print(mic)

# ---------------------------------------------------------------- MGD
cat("\n\n########## [5] MGD 多群組差異檢定（group2）##########\n")
cat("註：多多快跑以 permutation 為主判準；Henseler MGA 回報單尾 P(b1<=b2)。\n")
cat("    請確認 cSEM 的 Henseler p 是單尾還是雙尾。\n")
set.seed(2026)
mgd <- testMGD(.object = csem_simple,
               .approach_mgd = "all",
               .R_permutation = 1000,
               .R_bootstrap = 1000,
               .verbose = TRUE)
print(mgd)

cat("\n\n== 完成。請把 out/02_csem_out.txt 全文回報 ==\n")
sink()
