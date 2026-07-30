# ============================================================================
# 多多快跑 抽驗腳本 05：R 側交叉驗證（2026-07-30，A5b 收尾後）
#
# 為什麼要跑這一支：
#   多多快跑的基準值全部由 Python（scipy / statsmodels / semopy / factor_analyzer
#   / scikit-posthocs）產生。下列項目屬於以下三類之一——
#     (A) 引擎有算、UI 有呈現，但 reference.json 沒有任何一欄對照（零基準）
#     (B) fixture 的值是 generate_reference.py 手算，與 JS 出自同一次理解
#         （＝ roadmap-v2.md §0 品質規範要防的那一類）
#     (C) 方法文件寫了「與 R 的慣例差異」，但那句話從未實跑核實過
#   —— R 是這三類唯一的第二意見。
#
# 輸出：out/05_a5b_r_audit_out.txt（整份回報給 AI 即可，不必自己判讀）
# 資料：data/main.csv（n=60，與 tests/fixtures/datasets.json:main 同一批固定種子）
#       另有兩組小資料直接寫死在本檔（對應 datasets.json 的 small 與 ties）
#
# 每一段都先印 expected（多多快跑目前的值），再印 R 的值，供肉眼快速掃描；
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
sink("out/05_a5b_r_audit_out.txt", split = TRUE)

cat("=================================================================\n")
cat(" 多多快跑 R 側交叉驗證 05（A5b 收尾，2026-07-30）\n")
cat(" ", R.version.string, "\n")
cat("  套件庫：", user_lib, "\n")
cat("=================================================================\n")

cat("\n-- 套件準備 --\n")
has_lavaan  <- need("lavaan")
has_psych   <- need("psych")
has_effsize <- need("effectsize")   # rank_eta_squared / rank_epsilon_squared

dat <- read.csv("data/main.csv", stringsAsFactors = FALSE)
cat("\n資料檢核：main.csv n =", nrow(dat), "（應為 60）\n")

hr <- function(t) cat("\n\n##################################################\n#", t,
                      "\n##################################################\n")
sub <- function(t) cat("\n---- ", t, " ----\n", sep = "")

# ============================================================================
hr("[1] CFA 對 lavaan —— 類 (A)：SRMR 與標準誤目前零第三方對照")
# ============================================================================
cat("
背景：fixture 的 cfa_2factor 由 semopy 產生，但只涵蓋 chi2/df/cfi/tli/rmsea。
      SRMR 與六個 loading 的標準誤（se/z/p）**沒有任何第三方對照**——
      而 se/z/p 決定報表上每個 loading 顯不顯著，會直接進論文。
      另：χ² 慣例差異已知（本工具用 (N−1)·F 的 AMOS/Wishart 慣例，semopy 用 N·F），
      本段要確認 lavaan 站在哪一邊。
")
cat("expected（多多快跑引擎，2026-07-30 實跑）：\n")
cat("  chi2 = 7.104400   df = 8\n")
cat("  cfi = 1.000000（截斷於 1）  tli = 1.022272  rmsea = 0.000000\n")
cat("  ★ srmr = 0.060858            ← 零第三方對照\n")
cat("  rmsea 90% CI = [0.000000, 0.141248]   rmsea p(close) = 0.628082\n")
cat("  標準化負荷 i1..i6 = 0.698107 0.787543 0.665166 0.669424 0.648260 0.690120\n")
cat("  因子相關 F1-F2 = 0.451915\n")
cat("  ★ 未標準化負荷 / 標準誤 / z / p（全部零第三方對照）：\n")
cat("      i1 0.750473 / 0.147094 / 5.1020 / 3.36e-07\n")
cat("      i2 0.872002 / 0.153820 / 5.6690 / 1.44e-08\n")
cat("      i3 0.727537 / 0.149774 / 4.8576 / 1.19e-06\n")
cat("      i4 0.684756 / 0.151074 / 4.5326 / 5.83e-06\n")
cat("      i5 0.655544 / 0.145529 / 4.5046 / 6.65e-06\n")
cat("      i6 0.810608 / 0.169522 / 4.7817 / 1.74e-06\n")

if (has_lavaan) tryCatch({
  library(lavaan)
  mdl <- 'F1 =~ i1 + i2 + i3
          F2 =~ i4 + i5 + i6'
  fit <- lavaan::cfa(mdl, data = dat, std.lv = TRUE)
  sub("lavaan 適配指標")
  print(round(lavaan::fitMeasures(fit,
    c("chisq", "df", "pvalue", "cfi", "tli", "rmsea", "rmsea.ci.lower",
      "rmsea.ci.upper", "rmsea.pvalue", "srmr")), 6))
  sub("lavaan 參數估計（未標準化 est / se / z / p ＋ 標準化 std.all）")
  pe <- lavaan::parameterEstimates(fit, standardized = TRUE)
  print(pe[pe$op %in% c("=~", "~~") & pe$lhs != pe$rhs,
           c("lhs", "op", "rhs", "est", "se", "z", "pvalue", "std.all")], digits = 6)
  sub("★ χ² 慣例確認：lavaan 用 N 還是 N−1")
  cat("  lavaan chisq        =", round(lavaan::fitMeasures(fit, "chisq"), 6), "\n")
  cat("  多多快跑 chi2       = 7.104400   （(N−1)·F 慣例）\n")
  cat("  semopy fixture chi2 = 7.224820   （N·F 慣例）\n")
  cat("  比值 lavaan/多多快跑 =", round(lavaan::fitMeasures(fit, "chisq") / 7.104400478263045, 6), "\n")
  cat("  （比值 ≈ 1.000 表示 lavaan 與本工具同慣例；≈ 60/59 = 1.0169 表示同 semopy）\n")
}, error = function(e) cat("  [x] lavaan 段失敗：", conditionMessage(e), "\n"))

# ============================================================================
hr("[2] EFA 對 psych —— 類 (A)：逐變項 MSA 與 |R| 目前零基準")
# ============================================================================
cat("
背景：fixture 的 efa_pca_varimax 只對照了 KMO 總體值、Bartlett、特徵值與負荷。
      **逐變項 MSA（每個題目的取樣適切性）與相關矩陣行列式 |R| 零基準**，
      而報表會逐題顯示 MSA、使用者據以決定刪哪一題。
")
cat("expected（多多快跑引擎，2026-07-30 實跑）：\n")
cat("  KMO 總體 = 0.730060\n")
cat("  ★ 逐變項 MSA i1..i6 = 0.699319 0.748324 0.757158 0.792030 0.749689 0.639829  ← 零基準\n")
cat("  ★ |R|（相關矩陣行列式） = 0.216064                                          ← 零基準\n")
cat("  Bartlett chi2 = 86.057500  df = 15  p = 5.3615e-12\n")
cat("  特徵值 = 2.601984 1.400895 0.586349 0.533539 0.492564 0.384669\n")
cat("  varimax 轉軸負荷（2 因子）：\n")
cat("      i1  0.843675  0.045393\n")
cat("      i2  0.762055  0.316043\n")
cat("      i3  0.821073  0.048860\n")
cat("      i4  0.296582  0.703401\n")
cat("      i5  0.091280  0.784576\n")
cat("      i6 -0.002473  0.851612\n")
cat("  共同性 = 0.713847 0.680611 0.676549 0.582733 0.623891 0.725248\n")

if (has_psych) tryCatch({
  items <- dat[, c("i1", "i2", "i3", "i4", "i5", "i6")]
  R <- cor(items)
  sub("★ psych::KMO —— 總體與逐變項 MSA")
  k <- psych::KMO(R)
  cat("  Overall MSA =", round(k$MSA, 6), "\n")
  cat("  逐變項 MSA  ="); print(round(k$MSAi, 6))
  sub("★ |R| 相關矩陣行列式")
  cat("  det(R) =", format(det(R), digits = 10), "\n")
  sub("psych::cortest.bartlett")
  b <- psych::cortest.bartlett(R, n = nrow(dat))
  cat("  chisq =", round(b$chisq, 6), "  df =", b$df, "  p =", format(b$p.value, digits = 8), "\n")
  sub("特徵值（base R，與 psych 同源）")
  cat("  ", paste(round(eigen(R)$values, 6), collapse = "  "), "\n")
  sub("psych::principal（主成分 ＋ varimax，2 因子）—— 與本工具同一條路線")
  pc <- psych::principal(items, nfactors = 2, rotate = "varimax")
  print(round(unclass(pc$loadings), 6))
  cat("\n  共同性 h2 ="); print(round(pc$communality, 6))
  cat("\n  ★ 註：psych 的欄序與符號可能與本工具不同（旋轉解的固有不確定性），\n")
  cat("     比對時看「絕對值的集合」與「哪些題目落在同一因子」，不要逐欄硬對。\n")
}, error = function(e) cat("  [x] psych 段失敗：", conditionMessage(e), "\n"))

# ============================================================================
hr("[3] 單因子 ANOVA 對 aov() —— 類 (B)：9 欄中 7 欄是本專案手算")
# ============================================================================
cat("
背景：fixture 的 anova_oneway 由 scipy.f_oneway 產生，而 f_oneway **只回 F 與 p**。
      其餘 7 欄（dfBetween/dfWithin/ssBetween/ssWithin/ssTotal/eta2/omega2）
      是 generate_reference.py 手算的——與 JS 實作出自同一次理解。
      base R 的 aov() 不需安裝任何套件，是最便宜的第二意見。
")
cat("expected（fixture anova_oneway）：\n")
cat("  F = 5.145884   p = 0.008821\n")
cat("  dfBetween = 2   dfWithin = 57\n")
cat("  ★ ssBetween = 503.238107   ssWithin = 2787.137300   ssTotal = 3290.375407  ← 手算\n")
cat("  ★ eta2 = 0.152942   omega2 = 0.121417                                      ← 手算\n")

tryCatch({
  a <- aov(y ~ factor(group3), data = dat)
  sub("aov() 變異數分析表")
  print(summary(a))
  s <- summary(a)[[1]]
  ssb <- s[["Sum Sq"]][1]; ssw <- s[["Sum Sq"]][2]
  dfb <- s[["Df"]][1];     dfw <- s[["Df"]][2]
  msw <- ssw / dfw
  sub("★ 由 aov() 的 SS 導出效果量（本段是 7 欄手算值的第二意見）")
  cat("  ssBetween =", format(ssb, digits = 10), "\n")
  cat("  ssWithin  =", format(ssw, digits = 10), "\n")
  cat("  ssTotal   =", format(ssb + ssw, digits = 10), "\n")
  cat("  eta2   = SSb/SSt              =", format(ssb / (ssb + ssw), digits = 10), "\n")
  cat("  omega2 = (SSb−df_b·MSw)/(SSt+MSw) =",
      format((ssb - dfb * msw) / (ssb + ssw + msw), digits = 10), "\n")
  cat("  ★ omega2 有多種寫法，若與 expected 對不上請把本行數字回報，由 AI 判是慣例或錯誤\n")
}, error = function(e) cat("  [x] aov 段失敗：", conditionMessage(e), "\n"))

# ============================================================================
hr("[4] Tukey HSD 對 R ptukey() —— 類 (C)：註解宣稱對標 R，實際從未對照")
# ============================================================================
cat("
背景：ptukey.js:18 的註解寫「對標 R::ptukey()」，但本專案從未實際跑過 R。
      2026-07-29 的 R50 是階段 A 第二個 L4 真 bug——舊實作在 df >= 100 系統性失準，
      修正後只對過 scipy。R 的 ptukey 是獨立實作（Fortran），是最強的第二意見。
      ptukey() 是 base R，不需安裝任何套件。
")
cat("expected（多多快跑 ptukeyUpper，R50 修正後）：\n")
cat("  q=3.5 k=3 df=57  → 4.2517890501e-02   （tukey_hsd 基準所在的安全點）\n")
cat("  q=3.5 k=3 df=120 → 3.8833375015e-02   ★ 舊實作在這裡印 0.0686（判定翻面）\n")
cat("  q=4.5 k=3 df=999 → 4.2991125276e-03   ★ 舊實作在這裡印 0.786\n")
cat("  q=3.5 k=4 df=100 → 7.0121604983e-02\n")
cat("  q=1.7 k=10 df=200 → 9.7132442153e-01\n")
cat("\nexpected（fixture tukey_hsd，三對比較的 p）：\n")
cat("  p_AB = 0.458320   p_AC = 0.006701   p_BC = 0.127191\n")

tryCatch({
  sub("★ R ptukey()：上尾機率 = 1 − ptukey(q, k, df)")
  grid <- data.frame(q  = c(3.5, 3.5, 4.5, 3.5, 1.7),
                     k  = c(3,   3,   3,   4,   10),
                     df = c(57,  120, 999, 100, 200))
  grid$R_upper <- mapply(function(q, k, d) 1 - ptukey(q, k, d), grid$q, grid$k, grid$df)
  grid$duo <- c(4.2517890501e-2, 3.8833375015e-2, 4.2991125276e-3, 7.0121604983e-2, 9.7132442153e-1)
  grid$rel_diff <- abs(grid$R_upper - grid$duo) / pmax(abs(grid$R_upper), 1e-300)
  print(grid, digits = 10)
  cat("\n  ★ rel_diff 全部 < 1e-6 就代表 R50 的修正與 R 對齊，那句註解才算有證據。\n")
  sub("R TukeyHSD()：三對比較（與 fixture tukey_hsd 對照）")
  print(TukeyHSD(aov(y ~ factor(group3), data = dat)))
}, error = function(e) cat("  [x] ptukey 段失敗：", conditionMessage(e), "\n"))

# ============================================================================
hr("[5] Kruskal-Wallis 效果量對 R —— 類 (B)：A5b 的 R54 / E67")
# ============================================================================
cat("
背景：A5b（R54）把效果量欄由 epsilon2 改名為 eta2H 並 floor 到 0，依據是
      rstatix 與 effectsize 兩套套件的**官方文件**。但數值本身仍是
      generate_reference.py 依定義自算，沒有第三方產生方（E67）。
      本段是把「公式歸屬已核實」補成「數值也已核實」。
")
cat("expected（fixture kruskal_wallis）：\n")
cat("  H = 9.208852   df = 2   p = 0.010007\n")
cat("  ★ eta2H = (H−k+1)/(N−k) floor 0 = 0.126471   ← 本專案依定義自算\n")
cat("     對照：rank epsilon squared = H/(N−1) = ", format(9.208852459016384 / 59, digits = 8), "\n")
cat("\nexpected（fixture kruskal_dunn，scikit-posthocs）：\n")
cat("  未校正 p  AB/AC/BC = 0.323721 / 0.002895 / 0.046394\n")
cat("  Bonferroni AB/AC/BC = 0.971164 / 0.008686 / 0.139183\n")

tryCatch({
  sub("base R kruskal.test")
  print(kruskal.test(y ~ factor(group3), data = dat))
}, error = function(e) cat("  [x] kruskal.test 失敗：", conditionMessage(e), "\n"))

if (has_effsize) tryCatch({
  sub("★ effectsize：rank_eta_squared（＝本工具的 eta2H）與 rank_epsilon_squared")
  cat("  rank_eta_squared（應對上 0.126471）：\n")
  print(effectsize::rank_eta_squared(y ~ factor(group3), data = dat, ci = NULL))
  cat("\n  rank_epsilon_squared（H/(N−1)，應為另一個數字）：\n")
  print(effectsize::rank_epsilon_squared(y ~ factor(group3), data = dat, ci = NULL))
  cat("\n  ★ 這兩個數字若一個對上 0.126471、另一個明顯不同，就證實 R54 的命名判斷正確。\n")
}, error = function(e) cat("  [x] effectsize 段失敗：", conditionMessage(e), "\n"))

tryCatch({
  sub("Dunn 事後比較（base R 的 pairwise.wilcox.test 為近似對照，非同一方法）")
  cat("  註：R 的 base 沒有 Dunn；A5b 的 kruskal_dunn 基準由 scikit-posthocs 產生，\n")
  cat("      沙盒已對 81 個情境比對過（最大相對差 2.7e-10）。這裡只列 pairwise.wilcox\n")
  cat("      作為「顯著配對集合是否一致」的粗檢，數字本來就不會相同。\n")
  print(pairwise.wilcox.test(dat$y, factor(dat$group3), p.adjust.method = "bonferroni"))
}, error = function(e) cat("  [x] pairwise.wilcox 失敗：", conditionMessage(e), "\n"))

# ============================================================================
hr("[6] A5b 六支的慣例對照 —— 類 (C)：文件寫了「與 R 的差異」但未實跑")
# ============================================================================
cat("
背景：A5b 的六份方法文件都寫了「已知與 SPSS / R 的慣例差異」，其中 R 那一側
      多數是依 R 官方手冊推得、**沒有實跑**。本段一次跑完，把那些句子從
      「依文件推論」升級為「實跑核實」。全部是 base R，不需安裝套件。
")

# --- 6.1 Mann-Whitney
sub("6.1 Mann-Whitney —— 連續性校正與精確法")
cat("expected（多多快跑，全部走常態近似 ＋ 連續性校正）：\n")
cat("  main x1~group2 (n=30/30)  U(scipy 慣例)=494      p = 0.520145\n")
cat("  small (n=4/4)             U=0                    p = 0.030383   精確 p = 0.028571\n")
cat("  ties  (n=12/12)           U=32.5                 p = 0.018117\n")
cat("★ 要看的是：R 預設在 n<50 且無並列時走精確法（correct 參數不生效），\n")
cat("  故 R 的預設 p 與本工具的近似 p 在 small 這組**應該不同**——這正是文件寫的那件事。\n")
tryCatch({
  xM <- dat$x1[dat$group2 == "M"]; xF <- dat$x1[dat$group2 == "F"]
  cat("\n  [main] R 預設：\n");            print(wilcox.test(xM, xF))
  cat("  [main] 強制常態近似＋CC：\n");    print(wilcox.test(xM, xF, exact = FALSE, correct = TRUE))
  cat("  [main] 強制常態近似、不 CC：\n"); print(wilcox.test(xM, xF, exact = FALSE, correct = FALSE))
  sA <- c(3.1, 4.2, 2.8, 5.0); sB <- c(6.3, 7.1, 5.9, 8.2)
  cat("  [small] R 預設（應走精確法）：\n"); print(wilcox.test(sA, sB))
  cat("  [small] 強制近似＋CC：\n");         print(wilcox.test(sA, sB, exact = FALSE, correct = TRUE))
  tA <- c(3, 4, 3, 2, 4, 3, 5, 3, 4, 2, 3, 4); tB <- c(4, 5, 4, 3, 5, 4, 5, 5, 4, 3, 5, 4)
  cat("  [ties] R 預設（有並列，應退回近似並警告）：\n"); print(wilcox.test(tA, tB))
}, error = function(e) cat("  [x] wilcox.test 段失敗：", conditionMessage(e), "\n"))

# --- 6.2 Wilcoxon signed-rank
sub("6.2 Wilcoxon 符號等級 —— 零差值慣例與精確法")
cat("expected（多多快跑）：T = 259   z = −4.825531   p = 1.3963e-06   n = 60（零個零差值）\n")
cat("★ 本工具採 wilcox 慣例（丟棄零差值），與 R 一致；本組資料剛好沒有零差值。\n")
tryCatch({
  cat("\n  R 預設：\n");                 print(wilcox.test(dat$cond1, dat$cond2, paired = TRUE))
  cat("  強制近似＋CC：\n");            print(wilcox.test(dat$cond1, dat$cond2, paired = TRUE,
                                                          exact = FALSE, correct = TRUE))
  cat("  零差值筆數 =", sum(dat$cond1 - dat$cond2 == 0), "\n")
  cat("  ★ 註：R 報的統計量 V 是 W+，本工具報的 T 是 min(W+, W−)，兩者不同不代表錯。\n")
}, error = function(e) cat("  [x] Wilcoxon 段失敗：", conditionMessage(e), "\n"))

# --- 6.3 比例 z 檢定
sub("6.3 比例 z 檢定 —— 連續性校正（文件說 R 預設會套、本工具不套）")
cat("expected（多多快跑，皆不套連續性校正）：\n")
cat("  單樣本 x=36 n=60 p0=0.5   z = 1.549193   p = 0.121335   Wilson CI = [0.473661, 0.714305]\n")
cat("  雙樣本 M vs F (n=30/30)   z = 1.054093   p = 0.291841   p1 = 0.666667  p2 = 0.533333\n")
cat("★ 要看的是：prop.test 預設 correct=TRUE，其 p 應**大於**本工具的 p；\n")
cat("  加 correct=FALSE 後 chi2 = z^2 應與本工具對得上。\n")
tryCatch({
  x <- sum(dat$ybin == 1); n <- nrow(dat)
  cat("\n  [單樣本] R 預設（correct=TRUE）：\n"); print(prop.test(x, n, p = 0.5))
  cat("  [單樣本] correct=FALSE：\n");            print(prop.test(x, n, p = 0.5, correct = FALSE))
  cat("  ★ correct=FALSE 的 X-squared 應 ≈ 1.549193^2 =",
      round(1.5491933384829666^2, 6), "\n")
  xm <- sum(dat$ybin[dat$group2 == "M"] == 1); nm <- sum(dat$group2 == "M")
  xf <- sum(dat$ybin[dat$group2 == "F"] == 1); nf <- sum(dat$group2 == "F")
  cat("\n  [雙樣本] R 預設（correct=TRUE）：\n")
  print(prop.test(c(xm, xf), c(nm, nf)))
  cat("  [雙樣本] correct=FALSE：\n")
  print(prop.test(c(xm, xf), c(nm, nf), correct = FALSE))
  cat("  ★ correct=FALSE 的 X-squared 應 ≈ 1.054093^2 =",
      round(1.0540925533894596^2, 6), "\n")
  cat("\n  [單樣本] Wilson CI 對照（prop.test 的 CI 即 Wilson，預設含校正）：\n")
  cat("    R 含校正 :", paste(round(prop.test(x, n, p = 0.5)$conf.int, 6), collapse = "  "), "\n")
  cat("    R 無校正 :", paste(round(prop.test(x, n, p = 0.5, correct = FALSE)$conf.int, 6), collapse = "  "), "\n")
  cat("    多多快跑 : 0.473661  0.714305   ← 應對上「R 無校正」那一行\n")
}, error = function(e) cat("  [x] prop.test 段失敗：", conditionMessage(e), "\n"))

# --- 6.4 卡方
sub("6.4 卡方 —— Yates 施加範圍、Cramér's V、★ 調整後標準化殘差（E43）")
cat("expected（多多快跑，fixture chisquare_2x2）：\n")
cat("  chi2 = 17.375566   p = 3.0674e-05   df = 1\n")
cat("  chi2Yates = 15.271493   pYates = 9.3111e-05\n")
cat("  cramerV = 0.538138\n")
cat("★ 兩件要看的事：\n")
cat("  (1) R chisq.test 預設 correct=TRUE，2x2 會**直接取代**主值；本工具兩個都報\n")
cat("  (2) ★ E43：本工具的殘差是 Pearson 殘差 (O−E)/sqrt(E)，\n")
cat("      而 R 的 $stdres 是**調整後**標準化殘差（分母另含 (1−R_i/N)(1−C_j/N)）。\n")
cat("      報表用 |z|>=1.96 變色，兩種殘差的門檻意義不同 —— 這裡把兩組數字都印出來對照。\n")
tryCatch({
  tb <- table(factor(dat$catR, levels = c("Yes", "No")),
              factor(dat$catC, levels = c("High", "Low")))
  cat("\n  觀察次數表：\n"); print(tb)
  ct_c <- chisq.test(tb, correct = TRUE)
  ct_n <- chisq.test(tb, correct = FALSE)
  cat("\n  R 預設（correct=TRUE，2x2 直接取代）：\n"); print(ct_c)
  cat("  R correct=FALSE：\n");                        print(ct_n)
  cat("\n  期望次數：\n"); print(round(ct_n$expected, 6))
  cat("\n  ★ Pearson 殘差 $residuals（＝本工具用的那一種）：\n")
  print(round(ct_n$residuals, 6))
  cat("\n  ★ 調整後標準化殘差 $stdres（＝ SPSS 的 Adjusted Standardized Residual）：\n")
  print(round(ct_n$stdres, 6))
  cat("\n  ★ 兩者的 |z| 是否跨過 1.96 的門檻若不同，E43 就從「理論上不同」變成「本資料就已不同」。\n")
  cat("\n  Cramér's V（由未校正 chi2 手算，對照 0.538138）：",
      round(sqrt(as.numeric(ct_n$statistic) / (sum(tb) * (min(dim(tb)) - 1))), 6), "\n")
}, error = function(e) cat("  [x] chisq.test 段失敗：", conditionMessage(e), "\n"))

# --- 6.5 Fisher
sub("6.5 Fisher 精確檢定 —— ★ 勝算比的口徑（本工具無條件 OR vs R 條件 MLE）")
cat("expected（多多快跑，fixture fisher_exact）：\n")
cat("  p = 6.3182e-05\n")
cat("  ★ oddsRatio = 11.666667   ← 這是**無條件（樣本）OR** ad/bc\n")
cat("★ R fisher.test 報的是**條件最大概似 OR**，與本工具不同源：\n")
cat("  預期 p 兩邊對得上、OR 對不上。本段要量的是「差多少」——\n")
cat("  這是 fisher-exact.md §6「尚未驗證」第 2 點，也是該篇最需要對照的一項。\n")
tryCatch({
  tb <- table(factor(dat$catR, levels = c("Yes", "No")),
              factor(dat$catC, levels = c("High", "Low")))
  ft <- fisher.test(tb)
  cat("\n"); print(ft)
  a <- tb[1, 1]; b <- tb[1, 2]; c2 <- tb[2, 1]; d <- tb[2, 2]
  cat("  無條件（樣本）OR = ad/bc =", round((a * d) / (b * c2), 6), "  ← 本工具報這個\n")
  cat("  R 的條件 MLE OR       =", round(as.numeric(ft$estimate), 6), "  ← R 報這個\n")
  cat("  R 的條件精確 CI       =", paste(round(ft$conf.int, 6), collapse = "  "), "\n")
  cat("  ★ 本工具的 Woolf CI 為 log 尺度常態近似，與上一行不可直接比較。\n")
}, error = function(e) cat("  [x] fisher.test 段失敗：", conditionMessage(e), "\n"))

# ============================================================================
hr("完成")
cat("
請把 out/05_a5b_r_audit_out.txt 整份回報給 AI。不需要自己判讀——
每一段都已經把「多多快跑目前的值」印在 R 的輸出旁邊，AI 會逐項判定
「實作錯誤（要修）」或「慣例差異（雙處標註）」。

有任何一段印出 [x] 失敗也沒關係，其他段仍然有效，分批銷帳即可。
")
sink()
