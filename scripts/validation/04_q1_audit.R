# ============================================================================
# 多多快跑 抽驗腳本 04：Q1 公式溯源審計（2026-07-13，Session Q1）
# 對象：
#   [1] pls_formative — Mode B 形成型（seminr mode_B ＋ cSEM <~ 雙證人）
#   [2] pls_ipma      — cSEM doIPMA（含原始碼 dump，供比對權重正規化口徑）
#   [3] lda_group3    — MASS::lda（MASS 隨 R 出貨，免安裝）＋ base R manova Wilks
#   [4] 加值證人      — seminr it_criteria（AIC/BIC）、cSEM predict（Q²predict 量級）
# 輸出：out/04_q1_audit_out.txt（把整份內容回報給 AI 即可）
# 資料：data/main.csv（n=60，與 tests/fixtures/datasets.json:main 同一批）
# 註：每段都印出多多快跑 fixture 的期望值（expected），供肉眼快速對照；
#     詳細判讀（符號慣例、尺度差異）由 AI 收回後處理。
# ============================================================================

if (!requireNamespace("seminr", quietly = TRUE)) install.packages("seminr", repos = "https://cloud.r-project.org")
if (!requireNamespace("cSEM",   quietly = TRUE)) install.packages("cSEM",   repos = "https://cloud.r-project.org")
library(seminr)

dir.create("out", showWarnings = FALSE)
sink("out/04_q1_audit_out.txt", split = TRUE)
cat("== 版本 ==\n")
cat("seminr:", as.character(packageVersion("seminr")), " cSEM:", as.character(packageVersion("cSEM")),
    " MASS:", as.character(packageVersion("MASS")), " R:", R.version.string, "\n")

dat <- read.csv("data/main.csv", stringsAsFactors = FALSE)
cat("\n== 資料檢核（應為 n=60）==\n"); cat("n =", nrow(dat), "\n")

# ---------------------------------------------------------------- [1] 形成型 Mode B
cat("\n\n########## [1] pls_formative：XF(x1,x2,x3 形成型 Mode B) -> Y(y) ##########\n")
cat("expected（多多快跑 fixture，plspm 產）：\n")
cat("  weights  x1/x2/x3 = 0.920643 / 0.113508 / 0.130584\n")
cat("  loadings x1/x2/x3 = 0.986337 / 0.645027 / 0.143363\n")
cat("  path XF->Y = 0.700477   R2_Y = 0.490669\n")
cat("  VIF x1/x2/x3 = 1.482454 / 1.486275 / 1.003334\n\n")

res1 <- tryCatch({
  mm_f <- constructs(
    composite("XF", c("x1", "x2", "x3"), weights = mode_B),
    composite("Y", single_item("y"))
  )
  sm_f <- relationships(paths(from = "XF", to = "Y"))
  m_f <- estimate_pls(data = dat, measurement_model = mm_f, structural_model = sm_f,
                      inner_weights = path_weighting)
  s_f <- summary(m_f)
  cat("-- seminr weights --\n");  print(round(s_f$weights, 6))
  cat("\n-- seminr loadings --\n"); print(round(s_f$loadings, 6))
  cat("\n-- seminr paths（含 R2）--\n"); print(round(s_f$paths, 6))
  cat("\n-- seminr VIF（形成型指標共線性）--\n"); print(s_f$validity$vif_items)
  TRUE
}, error = function(e) { cat("[1] seminr 段錯誤：", conditionMessage(e), "\n"); FALSE })

cat("\n---- [1b] cSEM 版（XF <~ x1+x2+x3；plain PLS，不解衰減）----\n")
res1b <- tryCatch({
  library(cSEM)
  mod_f <- "
    XF <~ x1 + x2 + x3
    Ye =~ y
    Ye ~ XF
  "
  out_f <- csem(.data = dat[, c("x1", "x2", "x3", "y")], .model = mod_f,
                .disattenuate = FALSE, .PLS_weight_scheme_inner = "path",
                .tolerance = 1e-10)
  sf <- summarize(out_f)
  cat("-- cSEM weights --\n");       print(sf$estimates$Weight_estimates)
  cat("\n-- cSEM loadings --\n");   print(sf$estimates$Loading_estimates)
  cat("\n-- cSEM path --\n");       print(sf$estimates$Path_estimates)
  cat("\n-- cSEM R2 --\n");         tryCatch(print(assess(out_f, .quality_criterion = "r2")), error = function(e) cat("assess r2 失敗（非關鍵）\n"))
  TRUE
}, error = function(e) { cat("[1b] cSEM 段錯誤：", conditionMessage(e), "\n"); FALSE })

# ---------------------------------------------------------------- [2] IPMA（cSEM doIPMA）
cat("\n\n########## [2] pls_ipma：M4、目標 C（cSEM doIPMA）##########\n")
cat("expected（多多快跑 fixture，Ringle & Sarstedt 2016 程序：指標 0-100 重標定、\n")
cat("非標準化權重正規化 Σw̃=1、performance=0-100 分數平均、importance=對 C 的非標準化總效果）：\n")
cat("  perf F1/F2/C = 53.394174 / 48.658965 / 54.542249\n")
cat("  非標準化路徑 F1->F2 / F1->C / F2->C = 0.322393 / -0.163084 / -0.209366\n")
cat("  importance F1/F2 = -0.230582 / -0.209366\n")
cat("  指標層（i1）：importance = -0.057692  performance = 52.916667\n\n")

res2 <- tryCatch({
  library(cSEM)
  mod4 <- "
    F1 =~ i1 + i2 + i3
    F2 =~ i4 + i5 + i6
    C  =~ cond1 + cond2 + cond3
    Y  =~ y
    F2 ~ F1
    C  ~ F1 + F2
    Y  ~ F2
  "
  out4 <- csem(.data = dat[, c("i1","i2","i3","i4","i5","i6","cond1","cond2","cond3","y")],
               .model = mod4, .disattenuate = FALSE,
               .PLS_weight_scheme_inner = "path", .tolerance = 1e-10)
  cat("-- doIPMA 的參數簽章 --\n"); print(args(cSEM::doIPMA))
  ipma <- cSEM::doIPMA(out4)
  cat("\n-- doIPMA 回傳結構 --\n"); print(names(ipma)); str(ipma, max.level = 2)
  cat("\n-- 構念層 importance / performance --\n")
  tryCatch(print(ipma$Construct), error = function(e) print(ipma))
  cat("\n-- 指標層 --\n")
  tryCatch(print(ipma$Indicator), error = function(e) cat("（無指標層輸出）\n"))
  TRUE
}, error = function(e) { cat("[2] doIPMA 段錯誤：", conditionMessage(e), "\n"); FALSE })

cat("\n---- [2b] doIPMA 原始碼 dump（供 AI 核對權重正規化口徑）----\n")
tryCatch({
  src <- deparse(getFromNamespace("doIPMA", "cSEM"))
  cat(src, sep = "\n")
}, error = function(e) cat("原始碼 dump 失敗：", conditionMessage(e), "\n"))

# ---------------------------------------------------------------- [3] LDA（MASS）
cat("\n\n########## [3] lda_group3：group3 ~ x1+x2+x3（MASS::lda）##########\n")
cat("expected（多多快跑 fixture，SPSS 慣例）：\n")
cat("  eigenvalues = 0.05378047 / 0.00630048\n")
cat("  canonical corr = 0.225911 / 0.079127\n")
cat("  Wilks Λ = 0.943023 / 0.993739   Bartlett χ² = 3.285232 / 0.351720（df 6 / 2）\n")
cat("  未標準化係數（fn1: x1,x2,x3；fn2: x1,x2,x3）=\n")
cat("    -0.090887 / 0.099743 / 0.046781 ； 0.049077 / 0.093564 / -0.013418\n")
cat("  標準化係數（fn1）= -0.723571 / 0.754252 / 0.717626\n")
cat("  structure matrix（fn1，組內合併相關）= -0.274692 / 0.364920 / 0.732972\n")
cat("  組重心（fn1: g1,g2,g3）= 0.239776 / -0.072357 / -0.302967\n")
cat("  再代入分類正確率 = 0.416667\n\n")

res3 <- tryCatch({
  ld <- MASS::lda(group3 ~ x1 + x2 + x3, data = dat)
  cat("-- MASS::lda scaling（線性判別係數；MASS 慣例：組內合併變異數=1）--\n")
  print(round(ld$scaling, 6))
  cat("\n-- svd（組間/組內 SD 比；svd^2*? 與特徵值的關係由 AI 換算）--\n")
  print(round(ld$svd, 6))
  cat("   proportion of trace：\n"); print(round(ld$svd^2 / sum(ld$svd^2), 6))

  # 組內合併共變異數與 SD（供標準化係數換算）
  gs <- split(dat[, c("x1", "x2", "x3")], dat$group3)
  Ng <- length(gs); N <- nrow(dat)
  Sp <- Reduce(`+`, lapply(gs, function(g) cov(g) * (nrow(g) - 1))) / (N - Ng)
  cat("\n-- pooled within-group SD --\n"); print(round(sqrt(diag(Sp)), 6))
  cat("\n-- 標準化係數（= scaling × pooled SD）--\n")
  print(round(ld$scaling * sqrt(diag(Sp)), 6))

  # 判別分數、組重心、structure matrix（組內合併相關）
  sc <- predict(ld)$x
  cat("\n-- 組重心（各組判別分數平均）--\n")
  cen <- aggregate(sc, list(group = dat$group3), mean)
  cen[, -1] <- round(cen[, -1], 6)
  print(cen)
  Xc <- as.matrix(dat[, c("x1", "x2", "x3")])
  Xw <- do.call(rbind, lapply(split(as.data.frame(cbind(Xc, sc)), dat$group3),
                              function(g) scale(g, scale = FALSE)))
  cat("\n-- structure matrix（pooled within-group 相關）--\n")
  print(round(cor(Xw[, 1:3], Xw[, 4:ncol(Xw)]), 6))

  # Wilks（base R manova）
  cat("\n-- manova Wilks --\n")
  print(summary(manova(cbind(x1, x2, x3) ~ group3, data = dat), test = "Wilks"))

  # 再代入分類
  cat("\n-- 再代入分類表 --\n")
  tb <- table(actual = dat$group3, predicted = predict(ld)$class)
  print(tb); cat("accuracy =", round(sum(diag(tb)) / sum(tb), 6), "\n")
  TRUE
}, error = function(e) { cat("[3] LDA 段錯誤：", conditionMessage(e), "\n"); FALSE })

# ---------------------------------------------------------------- [4] 加值證人
cat("\n\n########## [4a] seminr it_criteria（AIC/BIC；M4）##########\n")
cat("expected：AIC F2/C/Y = -4.981483 / -3.758180 / 1.441700\n")
cat("          BIC F2/C/Y = -0.792794 /  2.524853 / 5.630389\n\n")
res4a <- tryCatch({
  mm4 <- constructs(
    composite("F1", multi_items("i", 1:3)),
    composite("F2", multi_items("i", 4:6)),
    composite("C", c("cond1", "cond2", "cond3")),
    composite("Y", single_item("y"))
  )
  sm4 <- relationships(
    paths(from = "F1", to = c("F2", "C")),
    paths(from = "F2", to = c("C", "Y"))
  )
  m4 <- estimate_pls(data = dat, measurement_model = mm4, structural_model = sm4,
                     inner_weights = path_weighting)
  s4 <- summary(m4)
  if (!is.null(s4$it_criteria)) print(s4$it_criteria) else cat("（此版 seminr summary 無 it_criteria 欄位）\n")
  TRUE
}, error = function(e) { cat("[4a] 段錯誤：", conditionMessage(e), "\n"); FALSE })

cat("\n########## [4b] cSEM predict（Q²predict 量級；fold 隨機、不逐值比）##########\n")
cat("expected 量級（多多快跑固定 fold）：Q²p_pls i4/i5/i6 ≈ 0.102 / 0.035 / 0.003；y ≈ -0.013\n\n")
res4b <- tryCatch({
  library(cSEM)
  mod4 <- "
    F1 =~ i1 + i2 + i3
    F2 =~ i4 + i5 + i6
    C  =~ cond1 + cond2 + cond3
    Y  =~ y
    F2 ~ F1
    C  ~ F1 + F2
    Y  ~ F2
  "
  out4 <- csem(.data = dat[, c("i1","i2","i3","i4","i5","i6","cond1","cond2","cond3","y")],
               .model = mod4, .disattenuate = FALSE,
               .PLS_weight_scheme_inner = "path", .tolerance = 1e-10)
  set.seed(123)
  pr <- predict(out4, .benchmark = "lm", .cv_folds = 10, .r = 1)
  print(pr)
  TRUE
}, error = function(e) { cat("[4b] 段錯誤：", conditionMessage(e), "\n"); FALSE })

cat("\n\n== 完成。請把 out/04_q1_audit_out.txt 全文回報 ==\n")
sink()
