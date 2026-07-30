# ============================================================================
# 多多快跑 抽驗腳本 09：R 側交叉驗證（2026-07-30，階段 A / A6b）
#
# 為什麼要跑這一支：A6b 六支全部是 tier A，基準由 Python（statsmodels / pingouin /
#   sklearn）產生。R 在這一批有幾個不可替代的角色：
#
#   (A) ★ **ICC 的六種型別**。psych::ICC 一次回全部六種，而「選錯型別」是 ICC 最常見的
#       誤用。本工具的 icc11/icc21/icc31/icc1k/icc2k/icc3k 六欄是否真的對應到
#       ICC(1,1)/ICC(2,1)/ICC(3,1)/ICC(1,k)/ICC(2,k)/ICC(3,k)，從來沒有實跑核實過。
#   (B) ★ **Ward 的 ward.D vs ward.D2 是兩回事**。sklearn 的 linkage='ward' 對應
#       R 的哪一個？答錯的話整組分群都不同。本工具的基準來自 sklearn，而 R 是唯一
#       能分辨這兩者的地方。
#   (C) **Cronbach α 的標準化與未標準化**。psych::alpha 兩個都給，本工具只實作一種。
#   (D) **加權 Kappa**（linear / quadratic）與 **邏輯迴歸的三種 pseudo-R²**。
#   (E) **MANOVA 的四種多變量統計量**：base R 的 summary(..., test=) 一次一種。
#
# 輸出：out/09_a6b_r_audit_out.txt（整份回報給 AI 即可，不必自己判讀）
# 資料：data/main.csv（n=60，與 tests/fixtures/datasets.json:main 同一批固定種子）
#
# 每一段都先印 expected（多多快跑目前的值），再印 R 的值。
# ============================================================================

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
sink("out/09_a6b_r_audit_out.txt", split = TRUE)

cat("=================================================================\n")
cat(" 多多快跑 R 側交叉驗證 09（階段 A / A6b，2026-07-30）\n")
cat(" ", R.version.string, "\n")
cat("=================================================================\n")

cat("\n-- 套件準備 --\n")
has_psych <- need("psych")   # ICC 六型別、alpha、cohen.kappa（07 號已裝）
has_pROC  <- need("pROC")    # AUC

dat <- read.csv("data/main.csv", stringsAsFactors = FALSE)
cat("\n資料檢核：main.csv n =", nrow(dat), "（應為 60）\n")

hr <- function(t) cat("\n\n##################################################\n#", t,
                      "\n##################################################\n")
fmt <- function(x, d = 8) formatC(x, format = "f", digits = d)

# ============================================================================
hr("[1] ICC 六種型別 —— ★ 本腳本最重要的一段")
# ============================================================================
cat("
背景：ICC 有六種型別（1/2/3 型 × 單測/平均），選錯是 ICC 最常見的誤用。
      本工具的六個欄位命名為 icc11/icc21/icc31/icc1k/icc2k/icc3k，
      基準由 pingouin.intraclass_corr 產生。★ 但「本工具的 icc21 是不是真的
      對應 psych 的 ICC2」這件事**從未實跑核實過**——欄位名稱是一種斷言。
      psych::ICC 一次回全部六種，是最直接的證人。

expected（多多快跑 reference.json / icc，評分者 = cond1, cond2, cond3）：
  icc11 = 0.80480977   icc21 = 0.80453619   icc31 = 0.80228717
  icc1k = 0.89184997   icc2k = 0.89168197   icc3k = 0.89029893
")
if (has_psych) {
  tryCatch({
    ratings <- dat[, c("cond1", "cond2", "cond3")]
    res <- psych::ICC(ratings)
    cat("\nR psych::ICC（完整輸出）：\n"); print(res)
    cat("\n判讀提示給 AI：psych 的 type 欄依序為 ICC1/ICC2/ICC3/ICC1k/ICC2k/ICC3k，\n")
    cat("  請逐一對回 expected 的六個值，確認命名對應正確。\n")
  }, error = function(e) cat("  [x] 第 1 段失敗：", conditionMessage(e), "\n"))
}

# ============================================================================
hr("[2] Cronbach α —— 標準化 vs 未標準化")
# ============================================================================
cat("
背景：本工具有兩組基準：cronbach_alpha_6items（i1..i6）與 cronbach_alpha_f1（i1..i3），
      都由 pingouin.cronbach_alpha 產生。psych::alpha 同時給
      raw_alpha（未標準化，原始分數共變數）與 std.alpha（標準化，相關矩陣）。
      ★ 本工具算的是哪一個？這決定了使用者拿 SPSS 報表對照時對不對得上。

expected（多多快跑）：
  cronbach_alpha_6items（i1..i6）= 0.73364165
  cronbach_alpha_f1   （i1..i3）= 0.76349046
")
if (has_psych) {
  tryCatch({
    cat("\nR psych::alpha(i1..i6)：\n")
    print(psych::alpha(dat[, c("i1","i2","i3","i4","i5","i6")], check.keys = FALSE)$total)
    cat("\nR psych::alpha(i1..i3)：\n")
    print(psych::alpha(dat[, c("i1","i2","i3")], check.keys = FALSE)$total)
    cat("\n★ 對回 expected：看 raw_alpha 與 std.alpha 哪一個對得上。\n")
  }, error = function(e) cat("  [x] 第 2 段失敗：", conditionMessage(e), "\n"))
}

# ============================================================================
hr("[3] Cohen's Kappa —— 未加權與兩種加權")
# ============================================================================
cat("
背景：本工具報三個值（未加權、linear、quadratic），基準由 sklearn.cohen_kappa_score 產生。
      psych::cohen.kappa 一次給 unweighted 與 weighted（預設 quadratic），
      並附信賴區間——★ 本工具的 seKappa 與 CI **零第三方對照**。

expected（多多快跑，rater1 vs rater2）：
  kappa（未加權）  = 0.47944172
  kappaLinear      = 0.65566714
  kappaQuadratic   = 0.80187960
")
if (has_psych) {
  tryCatch({
    ck <- psych::cohen.kappa(cbind(dat$rater1, dat$rater2))
    cat("\nR psych::cohen.kappa（預設 quadratic 加權）：\n"); print(ck)
    cat("\n★ 注意：psych 的 weighted kappa 預設用 quadratic 權重。\n")
    cat("  linear 版需另外指定 w，若 R 端沒有直接給，AI 會以 confusion matrix 自行核算。\n")
    cat("\n交叉表（供 AI 自行複算 linear 權重）：\n")
    print(table(dat$rater1, dat$rater2))
  }, error = function(e) cat("  [x] 第 3 段失敗：", conditionMessage(e), "\n"))
}

# ============================================================================
hr("[4] 邏輯迴歸 —— 係數、三種 pseudo-R2、AUC")
# ============================================================================
cat("
背景：基準由 statsmodels.Logit 產生。★ 三個 pseudo-R² 的定義各家不同
      （McFadden、Cox-Snell、Nagelkerke），而本工具只報 McFadden 與 Nagelkerke。
      R 的 glm 不直接給 pseudo-R²，本段印出 deviance 與 logLik 讓 AI 自行核算。
      ★ 另：p_x1 這一欄的容差目前放寬到 1e-5，本段要判斷那是實質差異還是遺留。

expected（多多快跑 / statsmodels.Logit，ybin ~ x1 + male）：
  intercept = -1.98004848   b_x1 = 0.04228318   b_male = 0.52498188
  se_x1 = 0.03525673   z_x1 = 1.19929373   p_x1 = 0.23041375
  llNull = -40.38070003   ll = -39.08259402
  lrStat = 2.59621202   lrP = 0.27304846
  mcFadden = 0.03214669   nagelkerke = 0.05724736   auc = 0.61342593
")
tryCatch({
  dat$male <- as.integer(dat$group2 == "M")
  g <- glm(ybin ~ x1 + male, data = dat, family = binomial())
  cat("\nR glm(family = binomial)：\n"); print(summary(g))
  cat("\n  logLik(model) =", fmt(as.numeric(logLik(g))), "\n")
  g0 <- glm(ybin ~ 1, data = dat, family = binomial())
  cat("  logLik(null)  =", fmt(as.numeric(logLik(g0))), "\n")
  cat("  null deviance =", fmt(g$null.deviance), "   residual deviance =", fmt(g$deviance), "\n")
  cat("  McFadden 手算 = 1 - ll/llNull =",
      fmt(1 - as.numeric(logLik(g)) / as.numeric(logLik(g0))), "\n")
  if (has_pROC) {
    a <- pROC::auc(pROC::roc(dat$ybin, fitted(g), quiet = TRUE))
    cat("  pROC::auc     =", fmt(as.numeric(a)), "\n")
  }
}, error = function(e) cat("  [x] 第 4 段失敗：", conditionMessage(e), "\n"))

# ============================================================================
hr("[5] MANOVA —— 四種多變量統計量")
# ============================================================================
cat("
背景：基準由 statsmodels.MANOVA 產生。四種統計量（Wilks / Pillai / Hotelling-Lawley /
      Roy）的 F 近似式各有不同慣例，尤其 Roy 的上界性質常被誤讀。
      ★ 本工具的 hotelling 與 roy 兩欄**只有統計量本身、沒有 F 與 p 的基準**。

expected（多多快跑，group3 為因子，依變項 = x1, x2）：
  wilks = 0.75114549   wilksF = 2.82002875   wilksP = 0.01364906
  pillai = 0.25476069  pillaiF = 2.72486003  pillaiP = 0.01652176
  hotelling = 0.32343712   roy = 0.29695909
")
tryCatch({
  fit <- manova(cbind(x1, x2) ~ factor(group3), data = dat)
  for (tst in c("Wilks", "Pillai", "Hotelling-Lawley", "Roy")) {
    cat("\n---- test =", tst, "----\n")
    print(summary(fit, test = tst))
  }
}, error = function(e) cat("  [x] 第 5 段失敗：", conditionMessage(e), "\n"))

# ============================================================================
hr("[6] 集群 —— ★ ward.D 與 ward.D2 是兩回事")
# ============================================================================
cat("
背景：本工具的 Ward 基準來自 sklearn.AgglomerativeClustering(linkage='ward')，
      而 R 的 hclust 有 **ward.D** 與 **ward.D2** 兩個選項，兩者的結果不同。
      ★ sklearn 的 ward 對應哪一個？這個問題本專案從未回答過，
      而答錯的話整組分群標籤都會不一樣。
      本段對 z 標準化（ddof=1）後的 x1,x2,x3 跑三種，印出各自的分群大小與 WSS。

expected（多多快跑）：
  kmeans k=3：wss = 85.72984895   silhouette = 0.29385738   各群大小（排序）= 14, 21, 25
  ward   k=3：wss = 94.76284469   silhouette = 0.23982551   各群大小（排序）= 17, 18, 25
              elbowWss(k=2..10) 第一個值 = 127.4119226
")
tryCatch({
  X <- scale(dat[, c("x1", "x2", "x3")])   # R 的 scale 用 n-1 分母，與本工具一致
  d <- dist(X)
  for (meth in c("ward.D", "ward.D2")) {
    hc <- hclust(d, method = meth)
    cl <- cutree(hc, k = 3)
    wss <- sum(sapply(split(as.data.frame(X), cl), function(g) {
      cm <- colMeans(g); sum(rowSums((sweep(as.matrix(g), 2, cm))^2))
    }))
    cat("\nhclust(method =", meth, ") k=3：各群大小 =",
        paste(sort(as.numeric(table(cl))), collapse = ", "),
        "  WSS =", fmt(wss), "\n")
  }
  cat("\n  ★ 上面兩行哪一個的 WSS 對上 94.76284469，就是 sklearn 的 ward 對應的那一個。\n")
  set.seed(42)
  km <- kmeans(X, centers = 3, nstart = 50)
  cat("\nkmeans(nstart = 50) k=3：各群大小 =", paste(sort(km$size), collapse = ", "),
      "  WSS =", fmt(sum(km$withinss)), "\n")
  cat("  （k-means 有隨機起點，大小與 WSS 對得上即可，標籤順序不必相同）\n")
  cat("\n  總平方和 TSS =", fmt(sum(scale(X, scale = FALSE)^2)), "（expected 177）\n")
}, error = function(e) cat("  [x] 第 6 段失敗：", conditionMessage(e), "\n"))

hr("完成")
cat("
請把 out/09_a6b_r_audit_out.txt 整份回報給 AI。

★ 最需要盯的兩段：
  [1] ICC 六種型別 —— 確認本工具的欄位命名真的對應到正確的型別
  [6] ward.D vs ward.D2 —— 確認 sklearn 的 ward 對應哪一個
")
sink()
