# ============================================================================
# 多多快跑 抽驗腳本 07：R 側交叉驗證（2026-07-30，階段 A / A6a）
#
# 為什麼要跑這一支：
#   A6a 這批（敘述／常態／變異數同質／相關／迴歸）全部是 tier A，基準由 Python
#   （scipy / statsmodels）產生。但「同一族演算法的另一次編碼」不等於第二意見——
#   roadmap-v2.md §0 講的就是這件事。R 在這一批有三個不可替代的角色：
#
#     (A) **R60（L4）的第三個證人**。本工具的 Lilliefors p 值在 2026-07-30 之前有兩個
#         定義域錯誤（n > 100 未重標定；p > 0.1 未改走臨界值表），在 n >= 325 會把顯著的
#         樣本印成 p = 1.000。修正後對齊 statsmodels，但 R 的 nortest::lillie.test 走的是
#         **另一套 dispatch**（Dallal-Wilkinson + Stephens），它的值能告訴我們：
#         修正後剩下的差異是「還有 bug」還是「兩套慣例本來就不同」。
#     (B) **慣例分歧的量測**。最重要的一項是 Spearman：本工具（與 scipy 相同）用 t 近似，
#         R 預設在 n < 1290 且無並列時走 **精確法**。A5b 的 R58 就是這一型——
#         「近似 vs 精確」的差異在小樣本會翻面。
#     (C) **零基準量的補強**。相關係數的 95% CI（Fisher z）本工具**完全沒有提供**，
#         偏態／峰度的三種算法本工具只實作一種且註解宣稱「與 e1071 type=2 一致」——
#         那句話從未實跑核實過。
#
# 輸出：out/07_a6_r_audit_out.txt（整份回報給 AI 即可，不必自己判讀）
# 資料：data/main.csv（n=60，與 tests/fixtures/datasets.json:main 同一批固定種子）
#       data/a6_probe.csv（12 組探針，長格式 probe,value；專為 R60 的參數空間掃描而生）
#
# 每一段都先印 expected（多多快跑目前的值），再印 R 的值，供肉眼快速掃描。
# 判定「實作錯誤（要修）」或「慣例差異（雙處標註）」由 AI 收回後處理。
# ============================================================================

# ---------------------------------------------------------------- 0. 個人套件庫
# ★ Kevin 本機的 R 系統 library 不可寫，install.packages 會靜默失敗。
#    .bat 已先建好 R_LIBS_USER；這裡再防守一次，直接執行本檔也不會踩到。
user_lib <- Sys.getenv("R_LIBS_USER")
if (!nzchar(user_lib) || user_lib == "NULL") {
  user_lib <- file.path(path.expand("~"), "R", paste0("win-library-", getRversion()[1, 1:2]))
}
dir.create(user_lib, recursive = TRUE, showWarnings = FALSE)
.libPaths(c(user_lib, .libPaths()))

need <- function(pkg) {
  if (requireNamespace(pkg, quietly = TRUE)) return(TRUE)
  cat("  [安裝]", pkg, "…（第一次會花幾分鐘）\n"); flush.console()
  try(install.packages(pkg, lib = user_lib, repos = "https://cloud.r-project.org"), silent = TRUE)
  ok <- requireNamespace(pkg, quietly = TRUE)
  if (!ok) cat("  [x]", pkg, "安裝失敗 —— 該段會跳過，不影響其他段\n")
  ok
}

dir.create("out", showWarnings = FALSE)
sink("out/07_a6_r_audit_out.txt", split = TRUE)

cat("=================================================================\n")
cat(" 多多快跑 R 側交叉驗證 07（階段 A / A6a，2026-07-30）\n")
cat(" ", R.version.string, "\n")
cat("  套件庫：", user_lib, "\n")
cat("=================================================================\n")

cat("\n-- 套件準備 --\n")
has_e1071   <- need("e1071")     # 偏態／峰度的三種算法
has_nortest <- need("nortest")   # lillie.test（Lilliefors）
has_car     <- need("car")       # leveneTest（center = median / mean）、vif

dat <- read.csv("data/main.csv", stringsAsFactors = FALSE)
cat("\n資料檢核：main.csv n =", nrow(dat), "（應為 60）\n")

probe_ok <- file.exists("data/a6_probe.csv")
if (probe_ok) {
  pr <- read.csv("data/a6_probe.csv", stringsAsFactors = FALSE)
  cat("資料檢核：a6_probe.csv 共", length(unique(pr$probe)), "組探針、", nrow(pr), "列（應為 12 組、6339 列）\n")
} else {
  cat("[x] 找不到 data/a6_probe.csv —— 第 [2b] 段會跳過\n")
}

hr <- function(t) cat("\n\n##################################################\n#", t,
                      "\n##################################################\n")
sub <- function(t) cat("\n---- ", t, " ----\n", sep = "")
fmt <- function(x, d = 8) formatC(x, format = "f", digits = d)

# ============================================================================
hr("[1] 敘述統計 —— 類 (C)：偏態／峰度的算法宣稱從未核實")
# ============================================================================
cat("
背景：src/lib/stats/descriptive.js 的檔頭註解寫著
        「兩個公式都是 SPSS 預設的 unbiased 估計，與 R 的 e1071::skewness(type=2)
          / DescTools::Skew(method=2) 一致」
      這是一句**斷言**，而它從未被實跑核實過（紅隊第 2 條：authority 是否真的支持該公式）。
      偏態有三種算法（g1 / G1 / b1）、峰度同樣三種，選錯會讓報表與 SPSS 對不上。
      本段把三種都印出來，確認本工具落在哪一種。
")
cat("expected（多多快跑 reference.json / descriptive_y）：\n")
cat("  n = 60   mean = 40.34334000   sd = 7.46786949   se = 0.96409781\n")
cat("  median = 40.14595000   min = 25.93380000   max = 61.36160000\n")
cat("  ★ skewness = 0.42007779   ★ kurtosis = 0.65636834\n")
cat("  （本工具只實作一種，宣稱 = e1071 type 2 = SPSS 預設）\n\n")

tryCatch({
  y <- dat$y
  cat("R base：\n")
  cat("  n =", length(y), "  mean =", fmt(mean(y)), "  sd =", fmt(sd(y)),
      "  se =", fmt(sd(y) / sqrt(length(y))), "\n")
  cat("  median =", fmt(median(y)), "  min =", fmt(min(y)), "  max =", fmt(max(y)), "\n")
  if (has_e1071) {
    cat("\ne1071 的三種算法（★ 對照 expected 的 0.42007779 / 0.65636834）：\n")
    for (ty in 1:3) {
      cat("  type =", ty, "  skewness =", fmt(e1071::skewness(y, type = ty)),
          "   kurtosis =", fmt(e1071::kurtosis(y, type = ty)), "\n")
    }
    cat("\n  判讀提示：type 1 = g1（動差比，Excel 以外的多數程式）\n")
    cat("            type 2 = G1（SPSS / SAS 預設，n 校正）\n")
    cat("            type 3 = b1（Minitab 預設）\n")
  }
  cat("\n★ 順帶記錄一件事：本工具的敘述統計**沒有四分位數（Q1／Q3／IQR）**。\n")
  cat("  R 的 quantile() 有九種 type，這是常見的慣例分歧點；本工具目前無此欄位，\n")
  cat("  故不存在分歧風險，但也代表報表缺 IQR。R 的預設（type 7）值供未來參考：\n")
  cat("  Q1 =", fmt(quantile(y, .25)), "  Q3 =", fmt(quantile(y, .75)),
      "  IQR =", fmt(IQR(y)), "\n")
}, error = function(e) cat("  [x] 第 1 段失敗：", conditionMessage(e), "\n"))

# ============================================================================
hr("[2a] 常態性（主資料集）—— 類 (A)：R60 修正後的第三個證人")
# ============================================================================
cat("
背景：2026-07-30 紅隊 R60（L4）發現本工具的 Lilliefors p 值有兩個定義域錯誤，
      已改為忠實移植 statsmodels 的 approx 路徑。R 的 nortest::lillie.test 走的是
      另一套 dispatch，兩者的差距就是「慣例差異的量」。
      ★ 這一組是 n = 60、p ≈ 0.52，落在 Dallal-Wilkinson 近似的**無效區**
        （該近似只在 p < 0.1 有效），所以三方在這裡本來就會有可見差距——
        重點不是「一不一致」，而是**差多少、方向為何**。
")
cat("expected（多多快跑，R60 修正後實跑）：\n")
cat("  Shapiro-Wilk：W = 0.97556912   p = 0.27045225\n")
cat("  Lilliefors  ：D = 0.07844228   p = 0.51605447   ← 修正前為 0.44254182\n\n")

tryCatch({
  y <- dat$y
  sw <- shapiro.test(y)
  cat("R shapiro.test：W =", fmt(sw$statistic), "  p =", fmt(sw$p.value), "\n")
  if (has_nortest) {
    lt <- nortest::lillie.test(y)
    cat("R nortest::lillie.test：D =", fmt(lt$statistic), "  p =", fmt(lt$p.value), "\n")
  }
}, error = function(e) cat("  [x] 第 2a 段失敗：", conditionMessage(e), "\n"))

# ============================================================================
hr("[2b] 常態性（12 組探針）—— ★ 本腳本最重要的一段：R60 的參數空間掃描")
# ============================================================================
cat("
背景：R50（A5a 的 L4）的教訓是「只有一個基準點的方法，要對參數空間掃描」。
      R60 就是同一型：唯一的基準點 n = 60 落在安全區，而 bug 在 n >= 325 才發作。
      這 12 組探針刻意涵蓋舊實作的兩個失效區：
        - n = 4 / 5 且 D > 0.30 → 舊版強制 p <= 0.05（偽顯著方向）
        - n = 400~2000 且 D < 0.05 → 舊版一律回 p = 1.000（漏抓方向）
      另加兩組 5 點量表資料（大量並列），量並列對經驗 CDF 的影響。

expected（多多快跑，R60 修正後實跑）：
  probe               n      D          p(本工具)
  ------------------ ----- ---------- ------------
  n4_bigD                4  0.388290   0.034932
  n5_bigD                5  0.326006   0.088516
  n30_mid               30  0.121910   0.304263
  n100_mid             100  0.055679   0.626097
  n200_lowD            200  0.038614   0.670308
  n400_clampzone       400  0.048541   0.024549   ← 舊版印 1.000
  n500_clampzone       500  0.043459   0.024863   ← 舊版印 1.000
  n800_clampzone       800  0.037375   0.010159   ← 舊版印 1.000
  n1000_clampzone     1000  0.034103   0.008130   ← 舊版印 1.000
  n2000_clampzone     2000  0.026126   0.002936   ← 舊版印 1.000
  likert_n300          300  0.205601   0.000000
  likert_n1000        1000  0.201823   0.000000
")

if (probe_ok && has_nortest) {
  tryCatch({
    cat("\nR 的值：\n")
    cat(sprintf("%-18s %5s %10s %12s %12s %12s\n",
                "probe", "n", "D(R)", "p(lillie)", "W(shapiro)", "p(shapiro)"))
    for (nm in unique(pr$probe)) {
      v <- pr$value[pr$probe == nm]
      lt <- try(nortest::lillie.test(v), silent = TRUE)
      sw <- try(shapiro.test(v), silent = TRUE)
      dv <- if (inherits(lt, "try-error")) NA else as.numeric(lt$statistic)
      pv <- if (inherits(lt, "try-error")) NA else lt$p.value
      wv <- if (inherits(sw, "try-error")) NA else as.numeric(sw$statistic)
      wp <- if (inherits(sw, "try-error")) NA else sw$p.value
      cat(sprintf("%-18s %5d %10s %12s %12s %12s\n", nm, length(v),
                  formatC(dv, format = "f", digits = 6),
                  formatC(pv, format = "g", digits = 6),
                  formatC(wv, format = "f", digits = 6),
                  formatC(wp, format = "g", digits = 6)))
    }
    cat("\n判讀提示給 AI：\n")
    cat("  - D 欄若與 expected 逐位元級相符 ⇒ 統計量本身無爭議，差異全在 p 的近似路線。\n")
    cat("  - p 欄的差異要看**方向**：R 偏小 = 本工具偏保守（漏抓）；R 偏大 = 本工具偏寬鬆（偽顯著）。\n")
    cat("  - nortest 對 p > 0.1 會回傳 Stephens 修正值，statsmodels 回傳 10^7 模擬表值，\n")
    cat("    兩者在 p 大的區域本來就會差；決策區（p 介於 .01~.10）才是要盯的地方。\n")
  }, error = function(e) cat("  [x] 第 2b 段失敗：", conditionMessage(e), "\n"))
} else {
  cat("\n[x] 缺 a6_probe.csv 或 nortest，本段跳過。\n")
}

# ============================================================================
hr("[3] 變異數同質 —— 類 (C)：本工具只實作 median 版，但 fixture 有兩組")
# ============================================================================
cat("
背景：levene.js 只實作 center = median（Brown-Forsythe，對齊 JASP / car 預設）。
      reference.json 另有一組 levene_mean_spss_default（SPSS 預設的 mean 版），
      但**沒有對應的 adapter**——它從未被 compare.test.js 比對過，只是供人工對照。
      本段用 car::leveneTest 把兩個慣例都跑一次，確認：
        (1) median 版與本工具相符；
        (2) mean 版的 fixture 值本身正確（未來若要實作 SPSS 慣例，這一組就是基準）。
")
cat("expected：\n")
cat("  levene_median（本工具有實作）      ：F = 0.38762994   p = 0.68043872   df1 = 2   df2 = 57\n")
cat("  levene_mean_spss_default（僅供對照）：F = 0.39725811   p = 0.67400692\n\n")

if (has_car) {
  tryCatch({
    g <- factor(dat$group3)
    lm_med <- car::leveneTest(dat$y, g, center = median)
    lm_mean <- car::leveneTest(dat$y, g, center = mean)
    cat("R car::leveneTest(center = median)：\n"); print(lm_med)
    cat("\nR car::leveneTest(center = mean)：\n"); print(lm_mean)
    cat("\n★ 若兩者都相符，代表本工具「只選了兩個合法慣例中的一個」，這要寫進方法文件第 3 節，\n")
    cat("  而不是當成 bug。SPSS 使用者拿報表對照時會對不上，文件必須先說。\n")
  }, error = function(e) cat("  [x] 第 3 段失敗：", conditionMessage(e), "\n"))
}

# ============================================================================
hr("[4] 相關 —— 類 (B)+(C)：Spearman 的精確法 vs t 近似；相關 CI 完全沒有")
# ============================================================================
cat("
背景一（慣例分歧，A5b 的 R58 同型）：
      本工具的 Spearman p 值走 t 近似（rho 代入 Pearson 的 t 公式，df = n-2），
      與 scipy.spearmanr 相同。**但 R 的 cor.test 預設在 n < 1290 且無並列時走精確法（AS 89）**，
      有並列時才退回近似並發警告。這 60 筆有沒有並列、差多少，本段量給你看。

背景二（零基準）：
      本工具**完全沒有提供相關係數的 95% CI**（grep 過，src/ 內無 Fisher z 變換）。
      APA 7 要求報告效果量的 CI，這是一個功能缺口而非錯誤。R 的值印在下面供文件引用。
")
cat("expected（多多快跑 / scipy）：\n")
cat("  Pearson  x1-x2：r   = 0.57006330   p = 1.9898108e-06   n = 60\n")
cat("  Spearman x1-x2：rho = 0.53136982   p = 1.2518247e-05   n = 60\n\n")

tryCatch({
  x1 <- dat$x1; x2 <- dat$x2
  cat("R cor.test(method = 'pearson')：\n"); print(cor.test(x1, x2, method = "pearson"))
  cat("\nR cor.test(method = 'spearman')（預設，n < 1290 無並列時為精確法）：\n")
  print(suppressWarnings(cor.test(x1, x2, method = "spearman")))
  cat("\nR cor.test(method = 'spearman', exact = FALSE)（強制走近似，對照本工具）：\n")
  print(suppressWarnings(cor.test(x1, x2, method = "spearman", exact = FALSE)))
  cat("\n並列檢核：x1 有", sum(duplicated(x1)), "個重複值、x2 有", sum(duplicated(x2)), "個\n")
  cat("  （若皆為 0 ⇒ R 走的是精確法，兩個 p 的差就是「精確 vs 近似」的量）\n")
  cat("\n★ 相關係數的 95% CI（Fisher z，本工具沒有這個功能）：\n")
  ct <- cor.test(x1, x2, method = "pearson")
  cat("  Pearson r 的 95% CI = [", fmt(ct$conf.int[1]), ",", fmt(ct$conf.int[2]), "]\n")
}, error = function(e) cat("  [x] 第 4 段失敗：", conditionMessage(e), "\n"))

# ============================================================================
hr("[5] 迴歸三支 —— 類 (B)：標準化係數、VIF、ΔR² 的 F 檢定")
# ============================================================================
cat("
背景：三支迴歸的基準都由 statsmodels.OLS 產生。R 的 lm 是完全獨立的實作，
      而階層迴歸的 ΔR² F 檢定在 fixture 裡是**手算的**
      （generate_reference.py 的 source 欄寫 'statsmodels.OLS (manual ΔF)'）——
      手算基準正是 §0 品質規範點名的高風險類別（與 JS 出自同一次理解）。
      R 的 anova(m1, m2) 是現成的第三方證人。
")
cat("expected：\n")
cat("  simple      ：b0 = 7.07798209  b1 = 0.65673216  se = 0.09023184  t = 7.27827493\n")
cat("                p = 9.9863823e-10  R2 = 0.47735169  adjR2 = 0.46834052  F = 52.97328592\n")
cat("  multiple    ：b0 = 0.97834945  b_x1 = 0.61299129  b_x2 = 0.07938916  b_x3 = 0.04466020\n")
cat("                se_x1 = 0.11037377  t_x1 = 5.55377700  p_x1 = 7.9888126e-07\n")
cat("                R2 = 0.49066857  adjR2 = 0.46338296  F = 17.98268514  pF = 2.6962957e-08\n")
cat("                VIF：x1 = 1.48245386  x2 = 1.48627515  x3 = 1.00333443\n")
cat("  hierarchical：R2_step1 = 0.47735169  R2_step2 = 0.49066857  ΔR2 = 0.01331688\n")
cat("                ★ ΔF = 0.73208250  Δp = 0.48545161   ← fixture 為手算\n\n")

tryCatch({
  m1 <- lm(y ~ x1, data = dat)
  m2 <- lm(y ~ x1 + x2 + x3, data = dat)
  sub("simple：lm(y ~ x1)")
  print(summary(m1))
  sub("multiple：lm(y ~ x1 + x2 + x3)")
  print(summary(m2))
  if (has_car) {
    cat("\nR car::vif(m2)：\n"); print(car::vif(m2))
  }
  sub("hierarchical：anova(m1, m2) —— ★ 對照手算的 ΔF / Δp")
  print(anova(m1, m2))
  cat("\n  R2 step1 =", fmt(summary(m1)$r.squared),
      "   R2 step2 =", fmt(summary(m2)$r.squared),
      "   ΔR2 =", fmt(summary(m2)$r.squared - summary(m1)$r.squared), "\n")
  cat("\n★ 標準化係數（beta）——本工具是否提供、口徑為何，由 AI 對照報表：\n")
  z <- as.data.frame(scale(dat[, c("y", "x1", "x2", "x3")]))
  print(summary(lm(y ~ x1 + x2 + x3, data = z))$coefficients)
}, error = function(e) cat("  [x] 第 5 段失敗：", conditionMessage(e), "\n"))

# ============================================================================
hr("完成")
cat("
請把 out/07_a6_r_audit_out.txt 整份回報給 AI。不需要自己判讀——
每一段都已經把「多多快跑目前的值」印在 R 的輸出旁邊，AI 會逐項判定
「實作錯誤（要修）」或「慣例差異（雙處標註）」。

有任何一段印出 [x] 失敗也沒關係，其他段仍然有效，分批銷帳即可。

★ 最需要盯的是第 [2b] 段：那是 R60（本批的 L4）修正後唯一的獨立證人。
")
sink()
