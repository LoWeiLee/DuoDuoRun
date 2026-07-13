# ============================================================================
# 多多快跑 抽驗腳本 03：R NCA 套件（Dul 2016）
# 對象：validation-report「W6/NCA 慣例決策與待抽驗清單」7 項
# 輸出：out/03_nca_out.txt（把整份內容回報給 AI 即可）
# ----------------------------------------------------------------------------
# 資料：data/nca.csv（n=48，與 tests/fixtures/datasets.json:nca 同一批 x/y）
# 抽驗項目：
#   [1] scope 界線（實證 min/max vs 理論界線）        ★★
#   [2] CE-FDH ceiling zone 與 effect size d          ★★
#   [3] CR-FDH 迴歸線 截距/斜率（樣本點選取細節）      ★★
#   [4] CR-FDH scope 內夾擠處理
#   [5] permutation 檢定 p（近似，數字相近即可）
#   [6] bottleneck 表達（所需 X 實際值）
#   [7] cIPMA → 見 SmartPLS 4 抽驗（README §3）
#
# 註：本腳本刻意同時用 nca_output() 的格式化輸出 ＋ str() 的原始結構傾印，
#     不同 NCA 版本的欄位名稱略有出入，兩者並列可確保數字不漏。
# ============================================================================

if (!requireNamespace("NCA", quietly = TRUE)) install.packages("NCA", repos = "https://cloud.r-project.org")
library(NCA)

dir.create("out", showWarnings = FALSE)
sink("out/03_nca_out.txt", split = TRUE)
cat("== NCA 版本 ==\n"); print(packageVersion("NCA"))

dat <- read.csv("data/nca.csv")
cat("\n== 資料檢核（應為 n=48）==\n")
cat("n =", nrow(dat), "\n")
cat("x: min =", min(dat$x), " max =", max(dat$x), "\n")
cat("y: min =", min(dat$y), " max =", max(dat$y), "\n")
cat("（多多快跑：xmin=12.9495 xmax=86.334 ymin=1 ymax=48.7151）\n")

# ------------------------------------------------- [A] 實證 scope（R 預設）
cat("\n\n########## [A] 實證 scope：ce_fdh + cr_fdh + permutation 檢定 ##########\n")
cat("對照：scope=3501.548756 / CE zone=835.013354 / d_ce=0.238470 / peers=8\n")
cat("      CR intercept=13.142064 / slope=0.516124 / CR zone=808.530148 / d_cr=0.230906\n")
cat("      permutation p (CE-FDH d) = 0.005025\n\n")

res <- nca_analysis(dat, x = "x", y = "y",
                    ceilings = c("ce_fdh", "cr_fdh"),
                    test.rep = 10000)

cat("\n---- nca_output（格式化摘要 ＋ 檢定 ＋ bottleneck）----\n")
try(nca_output(res, summaries = TRUE, test = TRUE, bottlenecks = TRUE, plots = FALSE),
    silent = FALSE)

cat("\n\n---- 原始結構傾印（欄位名稱以此為準）----\n")
try(str(res$summaries, max.level = 4), silent = FALSE)

cat("\n\n---- 直接取數（若上面版本欄位不同，看這裡）----\n")
try({
  p <- res$summaries[["x"]]$params
  cat("params：\n"); print(p)
}, silent = FALSE)
try({
  cat("\nceilings 區塊：\n"); print(res$summaries[["x"]]$ceilings)
}, silent = FALSE)

# ------------------------------------------------- [B] CR-FDH 迴歸線
cat("\n\n########## [B] ★★ CR-FDH 迴歸線：截距與斜率 ##########\n")
cat("多多快跑對『CE-FDH peers（8 點）』做 OLS → intercept=13.142064, slope=0.516124\n")
cat("若 R 的數字不同，代表迴歸樣本點選取慣例不同（是否含水平段上的觀察值）——\n")
cat("這會連動 d_cr，是最可能出岔的一項。\n")
cat("\n多多快跑的 8 個 peers（x, y）：\n")
peers <- data.frame(
  x = c(12.9495, 14.8039, 20.3327, 23.4081, 45.3518, 53.4781, 61.7612, 76.4722),
  y = c(12.1885, 15.1187, 29.7227, 33.6525, 35.2303, 44.0808, 45.6817, 48.7151)
)
print(peers)
cat("\n對這 8 點做 OLS 的結果（本機重算，應等於 13.142064 / 0.516124）：\n")
print(coef(lm(y ~ x, data = peers)))
cat("\n→ 請與上面 R NCA 報的 CR-FDH intercept/slope 比對。\n")

# ------------------------------------------------- [C] bottleneck
cat("\n\n########## [C] bottleneck 表（所需 X 的實際值）##########\n")
cat("對照（多多快跑，y 以 range% 表達）：10%→12.9495、40%→20.3327、80%→45.3518\n\n")
bn <- nca_analysis(dat, x = "x", y = "y", ceilings = c("ce_fdh"),
                   bottleneck.x = "actual", bottleneck.y = "percentage.range",
                   steps = 10, test.rep = 0)
try(nca_output(bn, summaries = FALSE, test = FALSE, bottlenecks = TRUE, plots = FALSE),
    silent = FALSE)
try(print(bn$bottlenecks), silent = FALSE)

# ------------------------------------------------- [D] 理論界線（敏感性留底）
cat("\n\n########## [D] 理論界線 scope（敏感性檢查，不需對齊）##########\n")
cat("多多快跑用實證 min/max。這裡跑一次理論界線版留底：x:[0,100]、y:[0,50]。\n")
cat("（僅示範用的界線，非正式判準——目的是確認 d 對 scope 設定的敏感度。）\n\n")
try({
  res_th <- nca_analysis(dat, x = "x", y = "y",
                         ceilings = c("ce_fdh", "cr_fdh"),
                         scope = c(0, 100, 0, 50), test.rep = 0)
  nca_output(res_th, summaries = TRUE, test = FALSE, bottlenecks = FALSE, plots = FALSE)
}, silent = FALSE)

cat("\n\n== 完成。請把 out/03_nca_out.txt 全文回報 ==\n")
sink()
