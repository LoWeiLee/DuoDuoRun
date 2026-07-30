# ============================================================================
# 多多快跑 抽驗腳本 10：A6b 補跑（2026-07-30）
#
# 為什麼有這一支：09 號的第 [1]（ICC）與第 [5]（MANOVA）兩段**比對無效**——
#   不是工具有問題，是**我的腳本用錯變項**。我照 roadmap 的描述寫，沒有回去看
#   tests/generate_reference.py 實際用的是哪幾欄：
#
#     ICC   ：基準用 **rater1 + rater2**（兩位評分者，長格式），我寫成 cond1~cond3（三位）
#     MANOVA：基準用 **y + x1 + x2 ~ group3**（三個依變項），我寫成 cbind(x1, x2)（兩個）
#
#   ⇒ 09 號那兩段的「不一致」全部是這個原因，工具沒有問題。
#   ★ 這是本專案第二次犯同一型的錯（07 號的 [2b] 段是沒問過 lillie.test 的 n 下限）：
#     **寫驗證腳本時，變項與參數要從 generate_reference.py 抄，不能從文字描述重建。**
#
# 另外三件 09 號沒拿到的：
#   (a) psych 的預設輸出只印 2 位小數，不足以逐值比對 ⇒ 本檔一律印 8 位
#   (b) Cohen's kappa 的 **linear 加權**（psych 預設 quadratic）
#   (c) kappa 的 **標準誤與信賴區間**（本工具零第三方對照）
#
# 輸出：out/10_a6b_rerun_out.txt
# 依賴：psych（07 號已裝）。不需要 pROC。
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
sink("out/10_a6b_rerun_out.txt", split = TRUE)

cat("=================================================================\n")
cat(" 多多快跑 R 側交叉驗證 10（A6b 補跑，2026-07-30）\n")
cat(" ", R.version.string, "\n")
cat("=================================================================\n")

has_psych <- need("psych")
dat <- read.csv("data/main.csv", stringsAsFactors = FALSE)
cat("\n資料檢核：main.csv n =", nrow(dat), "（應為 60）\n")

hr <- function(t) cat("\n\n##################################################\n#", t,
                      "\n##################################################\n")
f8 <- function(x) formatC(x, format = "f", digits = 8)

# ============================================================================
hr("[A] ICC 六種型別 —— ★ 這次用對變項：rater1 + rater2（兩位評分者）")
# ============================================================================
cat("
★ 09 號用了 cond1~cond3（三位評分者），而基準是 rater1 + rater2（兩位）⇒ 那次的不一致是腳本的錯。

expected（多多快跑 reference.json / icc，由 pingouin.intraclass_corr 產生）：
  icc11 = 0.80480977  <- pingouin 的 ICC(1,1)
  icc21 = 0.80453619  <- pingouin 的 ICC(A,1)   ★ A = absolute agreement
  icc31 = 0.80228717  <- pingouin 的 ICC(C,1)   ★ C = consistency
  icc1k = 0.89184997  <- ICC(1,k)
  icc2k = 0.89168197  <- ICC(A,k)
  icc3k = 0.89029893  <- ICC(C,k)

★ 要確認的是**命名對應**：pingouin 的 (A) 是否 = psych 的 ICC2、(C) 是否 = psych 的 ICC3。
  這是 ICC 最常見的誤用來源，而本工具的欄位名目前只是一個未經核實的斷言。
")
if (has_psych) {
  tryCatch({
    ratings <- dat[, c("rater1", "rater2")]
    res <- psych::ICC(ratings)
    cat("\nR psych::ICC（預設輸出，2 位小數）：\n"); print(res)
    cat("\n★ 完整位數（本段的重點）：\n")
    rr <- res$results
    for (i in seq_len(nrow(rr))) {
      cat(sprintf("  %-24s %-6s ICC = %s   F = %s   df1 = %s  df2 = %s   p = %s\n",
                  rownames(rr)[i], as.character(rr$type[i]),
                  f8(rr$ICC[i]), f8(rr$F[i]),
                  formatC(rr$df1[i], format = "d"), formatC(rr$df2[i], format = "d"),
                  formatC(rr$p[i], format = "g", digits = 6)))
    }
    cat("\n  CI 下界／上界：\n")
    for (i in seq_len(nrow(rr))) {
      cat(sprintf("  %-6s [%s, %s]\n", as.character(rr$type[i]),
                  f8(rr$`lower bound`[i]), f8(rr$`upper bound`[i])))
    }
  }, error = function(e) cat("  [x] 第 A 段失敗：", conditionMessage(e), "\n"))
}

# ============================================================================
hr("[B] MANOVA —— ★ 這次用對依變項：y + x1 + x2（三個）")
# ============================================================================
cat("
★ 09 號用了 cbind(x1, x2)（兩個依變項），而基準是 y + x1 + x2 ~ group3（三個）。

expected（多多快跑 / statsmodels.MANOVA）：
  wilks     = 0.75114549   wilksF  = 2.82002875   wilksP  = 0.01364906
  pillai    = 0.25476069   pillaiF = 2.72486003   pillaiP = 0.01652176
  hotelling = 0.32343712   roy     = 0.29695909

★ 本工具的 hotelling 與 roy 只有統計量本身、**沒有 F 與 p 的基準** ⇒ R 的輸出可補這一格。
★ 另注意 Roy：R 與 statsmodels 對 Roy 的 F 近似式慣例不同（上界性質），差異屬預期。
")
tryCatch({
  fit <- manova(cbind(y, x1, x2) ~ factor(group3), data = dat)
  for (tst in c("Wilks", "Pillai", "Hotelling-Lawley", "Roy")) {
    cat("\n---- test =", tst, "----\n")
    s <- summary(fit, test = tst)
    print(s)
    st <- s$stats
    cat("  完整位數：統計量 =", f8(st[1, 2]), "  approx F =", f8(st[1, 3]),
        "  num Df =", st[1, 4], "  den Df =", st[1, 5],
        "  p =", formatC(st[1, 6], format = "g", digits = 8), "\n")
  }
}, error = function(e) cat("  [x] 第 B 段失敗：", conditionMessage(e), "\n"))

# ============================================================================
hr("[C] Cohen's kappa —— linear 加權 ＋ 標準誤與信賴區間（完整位數）")
# ============================================================================
cat("
expected（多多快跑，rater1 vs rater2）：
  kappa（未加權）= 0.47944172
  kappaLinear    = 0.65566714
  kappaQuadratic = 0.80187960
★ 本工具另報 seKappa 與 95% CI，**零第三方對照**——本段補上。
")
if (has_psych) {
  tryCatch({
    x <- cbind(dat$rater1, dat$rater2)
    lv <- sort(unique(c(dat$rater1, dat$rater2)))
    nlv <- length(lv)
    # linear 權重：w[i,j] = 1 - |i-j|/(nlv-1)；psych 的 w 為「權重矩陣」
    wl <- outer(seq_len(nlv), seq_len(nlv), function(i, j) 1 - abs(i - j) / (nlv - 1))
    wq <- outer(seq_len(nlv), seq_len(nlv), function(i, j) 1 - ((i - j) / (nlv - 1))^2)
    ck_q <- psych::cohen.kappa(x, w = wq)
    ck_l <- psych::cohen.kappa(x, w = wl)
    cat("\n未加權 kappa      =", f8(ck_q$kappa), "\n")
    cat("quadratic 加權    =", f8(ck_q$weighted.kappa), "\n")
    cat("linear 加權       =", f8(ck_l$weighted.kappa), "\n")
    cat("\n信賴區間（psych，完整位數）：\n")
    cat("  未加權   [", f8(ck_q$confid[1, 1]), ",", f8(ck_q$confid[1, 3]), "]\n")
    cat("  quadratic[", f8(ck_q$confid[2, 1]), ",", f8(ck_q$confid[2, 3]), "]\n")
    cat("\n  ★ 若 linear 那一行對不上 0.65566714，請把上面的交叉表一併回報，\n")
    cat("    AI 會確認是權重定義的慣例差異還是實作差異。\n")
    cat("\n交叉表：\n"); print(table(dat$rater1, dat$rater2))
  }, error = function(e) cat("  [x] 第 C 段失敗：", conditionMessage(e), "\n"))
}

# ============================================================================
hr("[D] Cronbach alpha 與集群 —— 09 號已對上，本段只補完整位數")
# ============================================================================
cat("
09 號已確認兩件事，本段只是把位數印足以便逐值記錄：
  (1) 本工具的 alpha ＝ psych 的 **raw_alpha（未標準化）**，不是 std.alpha
  (2) sklearn 的 linkage='ward' ＝ R 的 **ward.D2**（WSS 94.76284469 逐值對上），
      而 ward.D 給的是 12/23/25、WSS 93.42952662——兩者確實是不同的演算法
")
if (has_psych) {
  tryCatch({
    a6 <- psych::alpha(dat[, c("i1","i2","i3","i4","i5","i6")], check.keys = FALSE)$total
    a3 <- psych::alpha(dat[, c("i1","i2","i3")], check.keys = FALSE)$total
    cat("\ni1..i6  raw_alpha =", f8(a6$raw_alpha), "   std.alpha =", f8(a6$std.alpha),
        "   （expected 0.73364165）\n")
    cat("i1..i3  raw_alpha =", f8(a3$raw_alpha), "   std.alpha =", f8(a3$std.alpha),
        "   （expected 0.76349046）\n")
  }, error = function(e) cat("  [x] alpha 失敗：", conditionMessage(e), "\n"))
}
tryCatch({
  X <- scale(dat[, c("x1", "x2", "x3")])
  hc2 <- cutree(hclust(dist(X), method = "ward.D2"), k = 3)
  wss2 <- sum(sapply(split(as.data.frame(X), hc2), function(g) {
    cm <- colMeans(g); sum(rowSums((sweep(as.matrix(g), 2, cm))^2))
  }))
  cat("\nward.D2 k=3  WSS =", f8(wss2), "  （expected 94.76284469）\n")
  cat("  各群大小 =", paste(sort(as.numeric(table(hc2))), collapse = ", "), "（expected 17, 18, 25）\n")
  cat("\n★ 分群標籤（ward.D2，供 AI 與 labelsCanonical 逐一比對）：\n")
  cat("  ", paste(hc2, collapse = " "), "\n")
}, error = function(e) cat("  [x] 集群失敗：", conditionMessage(e), "\n"))

hr("完成")
cat("
請把 out/10_a6b_rerun_out.txt 整份回報給 AI。

★ [A] 與 [B] 是 09 號因腳本用錯變項而作廢的兩段，這次用的是
  generate_reference.py 實際使用的欄位（ICC: rater1+rater2；MANOVA: y+x1+x2 ~ group3）。
")
sink()
