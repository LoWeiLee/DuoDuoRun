# ============================================================================
# 多多快跑 抽驗腳本 06：CFA 標準誤高精度診斷（2026-07-30）
#
# 為什麼要跑：05 號腳本發現六個**標準化**負荷與 lavaan 完全吻合，
#   未標準化負荷差一個固定比例 sqrt(60/59) = 1.008439（＝共變數矩陣分母 N vs N−1，
#   屬慣例、可解釋），**但標準誤不是**：
#       多多快跑 i1  se = 0.147094   z = 5.1020
#       lavaan   i1  se ≈ 0.1406     z = 5.290      ⇒ z 小 3.5%
#   05 號只印 3 位小數，不足以判斷成因。
#
# 本工具的 SE 做法（cfa.js:729–777）：
#   對 F_ML 做**數值 Hessian**（中央差分，h = 1e-4），
#   Cov(θ̂) ≈ 2 / (N − 1) · H⁻¹      ⇒ 屬「觀察訊息（observed information）」＋ N−1
#
# lavaan 預設：likelihood = "normal"（N）＋ information = "expected"
#
# 所以有三個互相獨立的候選成因，本腳本把 2×2 組合全部跑出來，逐一排除：
#   (a) 觀察訊息 vs 期望訊息      → information = "observed" / "expected"
#   (b) N vs N−1                  → likelihood  = "normal"   / "wishart"
#   (c) 數值 Hessian 的截斷誤差   → 若 (a)(b) 都排除完仍差，就是這一項
#
# 輸出：out/06_cfa_se_probe_out.txt
# 執行很快（套件已在 05 號裝好），約 10 到 30 秒。
# ============================================================================

user_lib <- Sys.getenv("R_LIBS_USER")
if (!nzchar(user_lib) || user_lib == "NULL") {
  user_lib <- file.path(path.expand("~"), "R", paste0("win-library-", getRversion()[1, 1:2]))
}
dir.create(user_lib, recursive = TRUE, showWarnings = FALSE)
.libPaths(c(user_lib, .libPaths()))

dir.create("out", showWarnings = FALSE)
sink("out/06_cfa_se_probe_out.txt", split = TRUE)

cat("=================================================================\n")
cat(" CFA 標準誤高精度診斷（2026-07-30）\n")
cat(" ", R.version.string, "\n")
cat("=================================================================\n")

if (!requireNamespace("lavaan", quietly = TRUE)) {
  cat("[x] 找不到 lavaan。請先跑「跑R抽驗.bat」把套件裝好，再回來執行本檔。\n")
  sink(); quit(save = "no")
}
library(lavaan)
cat("lavaan 版本：", as.character(packageVersion("lavaan")), "\n")

dat <- read.csv("data/main.csv", stringsAsFactors = FALSE)
cat("資料檢核：n =", nrow(dat), "（應為 60）\n")

mdl <- 'F1 =~ i1 + i2 + i3
        F2 =~ i4 + i5 + i6'

cat("\n\n########## 多多快跑目前的值（cfa.js，2026-07-30 實跑）##########\n")
cat("  指標   未標準化 lambda        se              z\n")
cat("  i1     0.7504730000    0.1470940000    5.102000\n")
cat("  i2     0.8720020000    0.1538200000    5.669000\n")
cat("  i3     0.7275370000    0.1497740000    4.857600\n")
cat("  i4     0.6847560000    0.1510740000    4.532600\n")
cat("  i5     0.6555440000    0.1455290000    4.504600\n")
cat("  i6     0.8106080000    0.1695220000    4.781700\n")
cat("  F1~~F2 0.4519151173    （★ 本工具不報因子相關的 se）\n")
cat("  chi2 = 7.104400478   df = 8\n")
cat("  做法：數值 Hessian（中央差分 h=1e-4）＋ Cov = 2/(N−1)·H^-1\n")
cat("        ⇒ 觀察訊息 ＋ N−1\n")

probe <- function(tag, ...) {
  cat("\n\n########## ", tag, " ##########\n")
  r <- tryCatch(lavaan::cfa(mdl, data = dat, std.lv = TRUE, ...),
                error = function(e) { cat("  [x] 失敗：", conditionMessage(e), "\n"); NULL })
  if (is.null(r)) return(invisible(NULL))
  pe <- lavaan::parameterEstimates(r, standardized = TRUE)
  pe <- pe[pe$op %in% c("=~") | (pe$op == "~~" & pe$lhs != pe$rhs), ]
  out <- data.frame(
    par = paste(pe$lhs, pe$op, pe$rhs),
    est = sprintf("%.10f", pe$est),
    se  = sprintf("%.10f", pe$se),
    z   = sprintf("%.6f",  pe$z),
    std = sprintf("%.10f", pe$std.all),
    stringsAsFactors = FALSE
  )
  print(out, row.names = FALSE)
  cat("  chi2 =", sprintf("%.9f", lavaan::fitMeasures(r, "chisq")),
      "  df =", lavaan::fitMeasures(r, "df"),
      "  srmr =", sprintf("%.10f", lavaan::fitMeasures(r, "srmr")), "\n")
  invisible(pe)
}

a <- probe("[A] lavaan 預設：likelihood=normal（N）＋ information=expected",
           likelihood = "normal", information = "expected")
b <- probe("[B] likelihood=normal（N）＋ information=observed",
           likelihood = "normal", information = "observed")
c_ <- probe("[C] likelihood=wishart（N−1）＋ information=expected",
            likelihood = "wishart", information = "expected")
d <- probe("[D] ★ likelihood=wishart（N−1）＋ information=observed  ← 最接近本工具的設定",
           likelihood = "wishart", information = "observed")

cat("\n\n########## ★ 四種設定的 i1 標準誤並排（對照 0.1470940000）##########\n")
duo_se <- c(0.147094, 0.153820, 0.149774, 0.151074, 0.145529, 0.169522)
duo_z  <- c(5.1020, 5.6690, 4.8576, 4.5326, 4.5046, 4.7817)
get_se <- function(pe) if (is.null(pe)) rep(NA_real_, 6) else pe$se[pe$op == "=~"][1:6]
get_z  <- function(pe) if (is.null(pe)) rep(NA_real_, 6) else pe$z[pe$op == "=~"][1:6]
tab <- data.frame(
  指標   = c("i1", "i2", "i3", "i4", "i5", "i6"),
  多多快跑 = sprintf("%.10f", duo_se),
  A_norm_exp = sprintf("%.10f", get_se(a)),
  B_norm_obs = sprintf("%.10f", get_se(b)),
  C_wish_exp = sprintf("%.10f", get_se(c_)),
  D_wish_obs = sprintf("%.10f", get_se(d)),
  stringsAsFactors = FALSE
)
print(tab, row.names = FALSE)

cat("\n★ 比值（多多快跑 / 各設定）——最接近 1.000000 的那一欄就是本工具實際採用的口徑：\n")
rat <- data.frame(
  指標 = c("i1", "i2", "i3", "i4", "i5", "i6"),
  vs_A = sprintf("%.6f", duo_se / get_se(a)),
  vs_B = sprintf("%.6f", duo_se / get_se(b)),
  vs_C = sprintf("%.6f", duo_se / get_se(c_)),
  vs_D = sprintf("%.6f", duo_se / get_se(d)),
  stringsAsFactors = FALSE
)
print(rat, row.names = FALSE)

cat("\n★ z 值並排（多多快跑 vs 四種設定）：\n")
ztab <- data.frame(
  指標 = c("i1", "i2", "i3", "i4", "i5", "i6"),
  多多快跑 = sprintf("%.4f", duo_z),
  A = sprintf("%.4f", get_z(a)),
  B = sprintf("%.4f", get_z(b)),
  C = sprintf("%.4f", get_z(c_)),
  D = sprintf("%.4f", get_z(d)),
  stringsAsFactors = FALSE
)
print(ztab, row.names = FALSE)

cat("
=================================================================
 判讀指引（給 AI，不需要你自己看）
   - 若某一欄的比值整排 ≈ 1.000000  ⇒ 純慣例差異，雙處標註即可，不必改實作
   - 若最接近的一欄仍差 2% 以上      ⇒ 剩下的就是數值 Hessian 的截斷誤差，
                                        屬實作品質問題，要考慮改用解析梯度或縮小 h
   - chi2 那一行也順便確認：wishart 版應該等於 7.104400478（本工具的值）
=================================================================
")
sink()
