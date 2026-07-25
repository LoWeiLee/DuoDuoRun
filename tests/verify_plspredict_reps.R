#!/usr/bin/env Rscript
# ============================================================================
# PLSpredict「多次重複」彙總口徑核對（seminr）
#
# 要回答的問題只有一個：
#   重複 R 次 k-fold 之後，seminr 是
#     (A) 平均各次的指標（RMSE / MAE / Q²predict）——本工具目前的作法，或
#     (B) 彙總各次的預測值再算一次指標？
#   兩者不等價。本工具在確認之前，於 UI、JSDoc 與 provenance 都明示採用 (A)。
#
# 為什麼沙盒做不到：Cowork 沙盒沒有 R、也沒有 root 可安裝，seminr 只能在本機跑。
#
# ★ 本腳本刻意寫成「自我診斷式」：先把 seminr 的實際 API（函式參數、回傳物件結構）
#   印出來並寫進 JSON，再用**實際存在的參數**去呼叫。每一步都包 tryCatch，
#   任何一步失敗都不中斷，仍會把已蒐集到的資訊寫出來。
#   理由：撰寫者（AI）在沙盒沒有 R 可測，若腳本一失敗就中止，會變成一輪一輪猜參數，
#   每猜一次都要 Kevin 跑一次。寧可一次收集齊。
#
# ── 2026-07-25 這支腳本已完成它的任務，保留供日後重驗 ──────────────────────
# 當時的結論（詳見 docs/validation-report-v1.md 第六節）：
#   (1) seminr 2.5.0 的 reps **實際不生效**——洗牌 order <- sample(...) 寫在重複迴圈之外，
#       迴圈內 prediction_matrices() 的分摺 cut(seq(1,n), breaks=noFolds) 是決定性的，
#       所以每次重複用完全相同的分割。本機實測 reps=1 與 reps=10 逐位元相同，與原始碼一致。
#   (2) seminr 意圖採用的是 (B)，但 (B) 有系統性樂觀偏誤（模糊分解），
#       故本工具維持 (A)，不跟隨。
# 日後若 seminr 修正了 reps（把洗牌移進迴圈內），重跑本腳本即可重驗。
#
# 產出：tests/fixtures/seminr_predict_reps.json（把它連同終端輸出貼回對話即可）
# ============================================================================

options(warn = 1)

# ── 個人套件庫（本機的系統 library 通常不可寫，不先建這個 install.packages 會靜默失敗）──
user_lib <- Sys.getenv("R_LIBS_USER")
if (user_lib == "" || is.na(user_lib)) {
  user_lib <- file.path(path.expand("~"), "R", "win-library",
                        paste(R.version$major, substr(R.version$minor, 1, 1), sep = "."))
}
if (!dir.exists(user_lib)) dir.create(user_lib, recursive = TRUE, showWarnings = FALSE)
.libPaths(c(user_lib, .libPaths()))
cat("套件庫：", .libPaths()[1], "\n")

for (pkg in c("seminr", "jsonlite")) {
  if (!requireNamespace(pkg, quietly = TRUE)) {
    cat("安裝", pkg, "（第一次會花幾分鐘）……\n")
    install.packages(pkg, lib = user_lib, repos = "https://cloud.r-project.org")
  }
}
suppressPackageStartupMessages({ library(seminr); library(jsonlite) })

out <- list(
  seminr_version = as.character(packageVersion("seminr")),
  R_version = R.version.string
)

`%||%` <- function(a, b) if (is.null(a)) b else a
try_of <- function(expr) tryCatch(expr, error = function(e) paste("ERROR:", conditionMessage(e)))
fml <- function(f) try_of(paste(names(formals(f)), collapse = ", "))

# ── 0. API 自我診斷（無論後面成不成功都先寫下來）──────────────────────────
out$api <- list(
  estimate_pls = fml(seminr::estimate_pls),
  predict_pls  = fml(seminr::predict_pls),
  exported     = try_of(sort(getNamespaceExports("seminr")))
)
cat("\n=== seminr API ===\n")
cat("estimate_pls(", out$api$estimate_pls, ")\n")
cat("predict_pls (", out$api$predict_pls, ")\n")

# ── 1. 資料：與本專案 fixture 同一份 ──────────────────────────────────────
here <- tryCatch(dirname(normalizePath(sys.frame(1)$ofile)), error = function(e) getwd())
fx <- file.path(here, "fixtures", "datasets.json")
if (!file.exists(fx)) fx <- file.path(getwd(), "tests", "fixtures", "datasets.json")
stopifnot(file.exists(fx))
dat <- as.data.frame(fromJSON(fx)$main)
out$n <- nrow(dat)
cat("\n資料列數：", nrow(dat), "\n")

# ── 2. 模型：與 tests/adapters.mjs 的 pls_predict 同一組（M4）─────────────
mm <- constructs(
  composite("F1", multi_items("i", 1:3), weights = mode_A),
  composite("F2", multi_items("i", 4:6), weights = mode_A),
  composite("C",  multi_items("cond", 1:3), weights = mode_A),
  composite("Y",  single_item("y"))
)
sm <- relationships(
  paths(from = "F1", to = c("F2", "C")),
  paths(from = "F2", to = c("C", "Y"))
)

# 只傳「這個版本真的有」的參數；內模型加權預設就是 path weighting，沒有就不傳。
est_args <- list(data = dat, measurement_model = mm, structural_model = sm)
est_formals <- names(formals(seminr::estimate_pls))
if ("inner_weights" %in% est_formals && exists("path_weighting")) {
  est_args$inner_weights <- get("path_weighting")
}
out$estimate_args_used <- names(est_args)
fit <- try_of(do.call(seminr::estimate_pls, est_args))
if (is.character(fit)) {
  out$fit_error <- fit
  cat("\n[x] estimate_pls 失敗：", fit, "\n")
}

# ── 3. 關鍵比較：reps = 1 vs reps = 10，同一個 k ──────────────────────────
K <- 5
pred_formals <- names(formals(seminr::predict_pls))
out$predict_formals <- pred_formals

run_pred <- function(reps) {
  a <- list(model = fit, noFolds = K)
  if ("technique" %in% pred_formals && exists("predict_DA")) a$technique <- get("predict_DA")
  if ("reps" %in% pred_formals) a$reps <- reps
  set.seed(20260725)
  try_of(do.call(seminr::predict_pls, a))
}

# 把物件「攤平」成可診斷的結構：名稱、維度、以及所有看起來像指標表的矩陣
describe <- function(p) {
  if (is.character(p)) return(list(error = p))
  s <- try_of(summary(p))
  grab_mat <- function(x) {
    if (is.null(x)) return(NULL)
    m <- try_of(as.matrix(x))
    if (is.character(m)) return(NULL)
    list(dim = dim(m), rownames = rownames(m), colnames = colnames(m),
         values = try_of(round(m, 10)))
  }
  list(
    object_names = names(p),
    dims = try_of(lapply(p, function(x) if (is.null(dim(x))) length(x) else dim(x))),
    summary_names = if (is.character(s)) s else names(s),
    summary_tables = if (is.character(s)) NULL else lapply(s, grab_mat)
  )
}

if (!is.character(fit)) {
  p1  <- run_pred(1)
  p10 <- run_pred(10)
  out$reps1  <- describe(p1)
  out$reps10 <- describe(p10)

  cat("\n=== reps = 1：summary 內的表 ===\n")
  print(out$reps1$summary_names)
  cat("\n=== reps = 10：summary 內的表 ===\n")
  print(out$reps10$summary_names)
  cat("\np1 物件欄位 ：", paste(out$reps1$object_names, collapse = ", "), "\n")
  cat("p10 物件欄位：", paste(out$reps10$object_names, collapse = ", "), "\n")

  # 直接把兩者的 RMSE 表印出來對照（欄位名依版本而異，全部印）
  for (tag in c("reps1", "reps10")) {
    tabs <- out[[tag]]$summary_tables
    if (is.null(tabs)) next
    cat("\n--- ", tag, " 的數值表 ---\n", sep = "")
    for (nm in names(tabs)) {
      t <- tabs[[nm]]
      if (is.null(t) || is.null(t$values) || is.character(t$values)) next
      cat("[", nm, "] dim=", paste(t$dim, collapse = "x"), "\n", sep = "")
      print(t$values)
    }
  }
}

dest <- file.path(dirname(fx), "seminr_predict_reps.json")
write(toJSON(out, auto_unbox = TRUE, digits = 12, pretty = TRUE, null = "null"), dest)
cat("\n已寫出：", dest, "\n")
cat("把終端輸出與這個 json 貼回對話即可（json 較完整，優先貼它）。\n")
