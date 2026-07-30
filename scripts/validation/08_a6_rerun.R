# ============================================================================
# 多多快跑 抽驗腳本 08：A6a 補跑（2026-07-30）
#
# 為什麼有這一支：07 號的第 [2b] 段（R60 的參數空間掃描）因腳本 bug 整段陣亡——
#   nortest::lillie.test 要求 n >= 5，而第一組探針 n = 4；失敗時填了邏輯型 NA，
#   formatC(NA, format="f") 回報 "unsupported type"，又因為整個迴圈包在單一 tryCatch 裡，
#   一組失敗就把 12 組全部帶走。07 本身已修，但重跑 07 要再等一次套件檢查——
#   本檔只做「還沒拿到的兩段」，秒級完成。
#
# 兩段：
#   [A] R60 的 12 組探針（Lilliefors ＋ Shapiro）—— 本批 L4 修正後唯一的獨立證人
#   [B] ★ Spearman 精確法 vs t 近似的參數空間掃描 —— 07 號第 [4] 段在 n = 60 那一點
#       已經量到差異（R 精確 1.705e-05 vs 本工具近似 1.252e-05，本工具偏寬鬆 1.36 倍），
#       但 A5b 的 R58 教訓是「一個點量不出通則」。本段沿 n 掃描。
#       ★ 資料用確定性排列（x = 1..n、y = ((i*k-1) mod n)+1），沙盒可逐一重現，不依賴亂數。
#
# 輸出：out/08_a6_rerun_out.txt
# 依賴：nortest（07 號已裝）。不需要 car / e1071 / pROC。
# ============================================================================

user_lib <- Sys.getenv("R_LIBS_USER")
if (!nzchar(user_lib) || user_lib == "NULL") {
  user_lib <- file.path(path.expand("~"), "R", paste0("win-library-", getRversion()[1, 1:2]))
}
dir.create(user_lib, recursive = TRUE, showWarnings = FALSE)
.libPaths(c(user_lib, .libPaths()))

need <- function(pkg) {
  if (requireNamespace(pkg, quietly = TRUE)) return(TRUE)
  cat("  [安裝]", pkg, "…\n"); flush.console()
  try(install.packages(pkg, lib = user_lib, repos = "https://cloud.r-project.org"), silent = TRUE)
  ok <- requireNamespace(pkg, quietly = TRUE)
  if (!ok) cat("  [x]", pkg, "安裝失敗\n")
  ok
}

dir.create("out", showWarnings = FALSE)
sink("out/08_a6_rerun_out.txt", split = TRUE)

cat("=================================================================\n")
cat(" 多多快跑 R 側交叉驗證 08（A6a 補跑，2026-07-30）\n")
cat(" ", R.version.string, "\n")
cat("=================================================================\n")

has_nortest <- need("nortest")

hr <- function(t) cat("\n\n##################################################\n#", t,
                      "\n##################################################\n")

# ============================================================================
hr("[A] R60 的 12 組探針 —— 本批 L4 修正後唯一的獨立證人")
# ============================================================================
cat("
expected（多多快跑，R60 修正後實跑）：
  probe               n      D          p(本工具)
  ------------------ ----- ---------- ------------
  n4_bigD                4  0.388290   0.034932
  n5_bigD                5  0.326006   0.088516
  n30_mid               30  0.121910   0.304263
  n100_mid             100  0.055679   0.626097
  n200_lowD            200  0.038614   0.670308
  n400_clampzone       400  0.048541   0.024549   <- 舊版印 1.000
  n500_clampzone       500  0.043459   0.024863   <- 舊版印 1.000
  n800_clampzone       800  0.037375   0.010159   <- 舊版印 1.000
  n1000_clampzone     1000  0.034103   0.008130   <- 舊版印 1.000
  n2000_clampzone     2000  0.026126   0.002936   <- 舊版印 1.000
  likert_n300          300  0.205601   0.000000
  likert_n1000        1000  0.201823   0.000000

  ★ 主資料集那一點（n = 60）07 號已經量到：R 0.47548932 vs 本工具 0.51605447。
    兩者都遠離 .05，差的是 p 大時 statsmodels 查表與 nortest 的 Stephens 修正的落差。
    本段要看的是：**決策區（p 介於 .01 ~ .10）那五組 clampzone 會不會也差這麼多。**
")

if (file.exists("data/a6_probe.csv") && has_nortest) {
  pr <- read.csv("data/a6_probe.csv", stringsAsFactors = FALSE)
  cat("\n資料檢核：", length(unique(pr$probe)), "組探針、", nrow(pr), "列\n\n")
  cat(sprintf("%-18s %5s %10s %12s %12s %12s\n",
              "probe", "n", "D(R)", "p(lillie)", "W(shapiro)", "p(shapiro)"))
  for (nm in unique(pr$probe)) {
    v <- pr$value[pr$probe == nm]
    dv <- NA_real_; pv <- NA_real_; wv <- NA_real_; wp <- NA_real_; note <- ""
    if (length(v) >= 5) {
      lt <- try(nortest::lillie.test(v), silent = TRUE)
      if (!inherits(lt, "try-error")) { dv <- as.numeric(lt$statistic); pv <- lt$p.value }
      else note <- "  <- lillie.test 失敗"
    } else {
      note <- "  <- nortest 要求 n >= 5，Lilliefors 跳過"
    }
    sw <- try(shapiro.test(v), silent = TRUE)
    if (!inherits(sw, "try-error")) { wv <- as.numeric(sw$statistic); wp <- sw$p.value }
    cat(sprintf("%-18s %5d %10s %12s %12s %12s%s\n", nm, length(v),
                formatC(dv, format = "f", digits = 6),
                formatC(pv, format = "g", digits = 6),
                formatC(wv, format = "f", digits = 6),
                formatC(wp, format = "g", digits = 6), note))
  }
} else {
  cat("\n[x] 找不到 data/a6_probe.csv 或 nortest，本段跳過。\n")
}

# ============================================================================
hr("[B] Spearman：精確法 vs t 近似的參數空間掃描")
# ============================================================================
cat("
背景：07 號第 [4] 段在 n = 60 那一點量到——這 60 筆**沒有並列**，所以 R 走精確法（AS 89），
      p = 1.705e-05；本工具（與 scipy 相同）走 t 近似，p = 1.252e-05。
      ★ 本工具偏小 1.36 倍 ＝ **偏寬鬆方向**。這與 A5b 的 R58 是同一型。
      但 R58 的教訓正是「一個點量不出通則」，所以本段沿 n 掃描。

設計：x = 1..n；y = 1..n 但**把最後 j 個元素反轉**（j = 2..n）。
      反轉長度 j 的區塊會讓 sum(d^2) = j(j^2-1)/3，於是
        rho = 1 - 2*j*(j^2-1) / (n*(n^2-1))
      ⇒ j 由小到大掃，rho 從接近 1 平滑降到接近 -1，**保證會穿過 .05 的臨界區**。
      這比隨機排列好的地方是：**完全確定性**，沙盒可以用同一條構造逐一重現。
      （前一版用 y = ((i*k-1) mod n) + 1，實測 24 組的 rho 全部落在 |rho| < 0.45、
        p 介於 0.17~0.79——一組都沒靠近 .05，等於白掃。這一版改掉。）

判讀：exact 與 approx 都由 R 產生，兩者的差就是慣例分歧的量；
      本工具的值等於 approx（07 號已證實 exact = FALSE 時逐位元相符）。
      ★ 要盯的是「有沒有在 .05 兩側翻面」，以及翻面時是哪個方向。
      ★ 另注意：R 的 exact 只在 n <= 9 是真的全枚舉，n >= 10 走 AS 89 的 Edgeworth 級數
        ——所以 n 大時「exact」本身也是近似，這一點要寫進文件，不能講成「精確 vs 近似」。
")

cat(sprintf("\n%4s %4s %10s %14s %14s %10s %s\n",
            "n", "j", "rho", "p(exact)", "p(approx)", "比值", "旗標"))
flip <- 0; anti <- 0; total <- 0; maxratio <- 0; minratio <- Inf
near <- 0
for (n in c(6, 8, 10, 12, 15, 20, 25, 30, 40, 60)) {
  for (j in 2:n) {
    x <- 1:n
    y <- 1:n
    y[(n - j + 1):n] <- rev(y[(n - j + 1):n])
    ce <- try(suppressWarnings(cor.test(x, y, method = "spearman", exact = TRUE)), silent = TRUE)
    ca <- try(suppressWarnings(cor.test(x, y, method = "spearman", exact = FALSE)), silent = TRUE)
    if (inherits(ce, "try-error") || inherits(ca, "try-error")) next
    pe <- ce$p.value; pa <- ca$p.value; rho <- as.numeric(ce$estimate)
    total <- total + 1
    fl <- (pe < 0.05) != (pa < 0.05)
    ratio <- if (pe > 0) pa / pe else NA_real_
    if (!is.na(ratio) && is.finite(ratio)) {
      if (ratio > maxratio) maxratio <- ratio
      if (ratio < minratio) minratio <- ratio
    }
    interesting <- fl || (pe > 0.005 && pe < 0.30)
    if (interesting) near <- near + 1
    if (fl) {
      flip <- flip + 1
      if (pa < 0.05) anti <- anti + 1
    }
    # 只印決策區附近與翻面的，避免輸出爆量
    if (interesting) {
      cat(sprintf("%4d %4d %10.6f %14.8g %14.8g %10.4f %s\n", n, j, rho, pe, pa, ratio,
                  if (fl) (if (pa < 0.05) "<<< 近似偽顯著" else "<<< 近似漏抓") else ""))
    }
  }
}
cat(sprintf("\n合計 %d 組（印出決策區附近 %d 組）：.05 判定翻面 %d 組\n", total, near, flip))
cat(sprintf("  其中「近似偽顯著」%d 組、「近似漏抓」%d 組\n", anti, flip - anti))
cat(sprintf("近似 p 對精確 p 的比值範圍 = %.4f ~ %.4f\n", minratio, maxratio))
cat("  （比值 大於 1 ＝ 近似偏保守；小於 1 ＝ 近似偏寬鬆。07 號在 n = 60 那一點量到 0.734）\n")
cat("
★ 提醒 AI：本段的 x, y 是確定性構造（y 為 1..n 的後 j 個反轉），
  沙盒要用完全相同的構造重算本工具的值，不要自己另生亂數。
")

hr("完成")
cat("
請把 out/08_a6_rerun_out.txt 整份回報給 AI。

[A] 段是 R60（本批 L4）修正後的獨立證人；
[B] 段是 Spearman 慣例分歧的量化，會決定要不要在 UI 加警告（比照 A5b 的 R58）。
")
sink()
