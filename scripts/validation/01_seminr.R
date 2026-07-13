# ============================================================================
# 多多快跑 抽驗腳本 01：seminr
# 對象：PLS 核心（M1 / M4）、product indicator、orthogonalizing、two-stage、
#       HOC 兩階段、PLSpredict
# 輸出：out/01_seminr_out.txt（把整份內容回報給 AI 即可）
# ----------------------------------------------------------------------------
# 資料：data/main.csv（n=60，與 tests/fixtures/datasets.json:main 同一批）
# 模型與多多快跑 tests/generate_reference.py 完全一致：
#   M1: F1 =~ i1+i2+i3 ; F2 =~ i4+i5+i6 ; F1 -> F2                （皆 Mode A 反映型）
#   M4: F1 -> F2 ; F1 -> C ; F2 -> C ; F2 -> Y
#       C =~ cond1+cond2+cond3 ; Y =~ y（單指標）
#   調節: X=F1(i1-i3), M=C(cond1-cond3), Y=y（單指標）
#   HOC : G = {F1, F2} 反映型 ; G -> C ; C -> Y
# ============================================================================

if (!requireNamespace("seminr", quietly = TRUE)) install.packages("seminr", repos = "https://cloud.r-project.org")
library(seminr)

dir.create("out", showWarnings = FALSE)
sink("out/01_seminr_out.txt", split = TRUE)
cat("== seminr 版本 ==\n"); print(packageVersion("seminr"))

dat <- read.csv("data/main.csv", stringsAsFactors = FALSE)
cat("\n== 資料檢核（應為 n=60）==\n"); cat("n =", nrow(dat), "\n")

# ---------------------------------------------------------------- M1 核心
cat("\n\n########## [1] M1 核心：F1(i1-i3) -> F2(i4-i6) ##########\n")
mm1 <- constructs(
  composite("F1", multi_items("i", 1:3), weights = mode_A),
  composite("F2", multi_items("i", 4:6), weights = mode_A)
)
sm1 <- relationships(paths(from = "F1", to = "F2"))
m1 <- estimate_pls(data = dat, measurement_model = mm1, structural_model = sm1,
                   inner_weights = path_weighting)
s1 <- summary(m1)
cat("\n-- loadings --\n");  print(round(s1$loadings, 6))
cat("\n-- weights --\n");   print(round(s1$weights, 6))
cat("\n-- paths (含 R2) --\n"); print(round(s1$paths, 6))
cat("\n-- 信效度 (alpha / rhoC / AVE / rhoA) --\n"); print(round(s1$reliability, 6))
cat("\n-- HTMT --\n"); print(round(s1$validity$htmt, 6))
cat("\n-- LV 相關 --\n"); print(round(s1$descriptives$correlations$construct, 6))

# ---------------------------------------------------------------- M4
cat("\n\n########## [2] M4：F1->F2, F1->C, F2->C, F2->Y ##########\n")
mm4 <- constructs(
  composite("F1", multi_items("i", 1:3), weights = mode_A),
  composite("F2", multi_items("i", 4:6), weights = mode_A),
  composite("C",  multi_items("cond", 1:3), weights = mode_A),
  composite("Y",  single_item("y"))
)
sm4 <- relationships(
  paths(from = "F1", to = c("F2", "C")),
  paths(from = "F2", to = c("C", "Y"))
)
m4 <- estimate_pls(data = dat, measurement_model = mm4, structural_model = sm4,
                   inner_weights = path_weighting)
s4 <- summary(m4)
cat("\n-- loadings --\n"); print(round(s4$loadings, 6))
cat("\n-- paths --\n");    print(round(s4$paths, 6))
cat("\n-- 信效度 --\n");   print(round(s4$reliability, 6))
cat("\n-- 總效果（中介抽驗用）--\n"); print(round(s4$total_effects, 6))

# ---------------------------------------------------------------- 調節：PI
cat("\n\n########## [3] 調節 product indicator（Chin et al. 2003）##########\n")
cat("模型：F1 -> Y, C -> Y, F1*C -> Y（Y 為單指標 y）\n")
mm_pi <- constructs(
  composite("F1", multi_items("i", 1:3), weights = mode_A),
  composite("C",  multi_items("cond", 1:3), weights = mode_A),
  composite("Y",  single_item("y")),
  interaction_term(iv = "F1", moderator = "C", method = product_indicator)
)
sm_pi <- relationships(paths(from = c("F1", "C", "F1*C"), to = "Y"))
m_pi <- estimate_pls(data = dat, measurement_model = mm_pi, structural_model = sm_pi,
                     inner_weights = path_weighting)
cat("\n-- paths --\n"); print(round(summary(m_pi)$paths, 6))

# ---------------------------------------------------------------- 調節：orthogonal
cat("\n\n########## [4] 調節 orthogonalizing（Little et al. 2006）##########\n")
mm_or <- constructs(
  composite("F1", multi_items("i", 1:3), weights = mode_A),
  composite("C",  multi_items("cond", 1:3), weights = mode_A),
  composite("Y",  single_item("y")),
  interaction_term(iv = "F1", moderator = "C", method = orthogonal)
)
m_or <- estimate_pls(data = dat, measurement_model = mm_or, structural_model = sm_pi,
                     inner_weights = path_weighting)
cat("\n-- paths --\n"); print(round(summary(m_or)$paths, 6))

# ---------------------------------------------------------------- 調節：two-stage
cat("\n\n########## [5] 調節 two-stage（seminr 版；係數為標準化量尺）##########\n")
cat("註：多多快跑預設回報 SmartPLS 4 慣例的『未標準化交互項係數』，\n")
cat("    對照本節請用多多快跑的 path_int_Y_std（標準化值）。\n")
mm_ts <- constructs(
  composite("F1", multi_items("i", 1:3), weights = mode_A),
  composite("C",  multi_items("cond", 1:3), weights = mode_A),
  composite("Y",  single_item("y")),
  interaction_term(iv = "F1", moderator = "C", method = two_stage)
)
m_ts <- estimate_pls(data = dat, measurement_model = mm_ts, structural_model = sm_pi,
                     inner_weights = path_weighting)
cat("\n-- paths --\n"); print(round(summary(m_ts)$paths, 6))

# ---------------------------------------------------------------- HOC 兩階段
cat("\n\n########## [6] HOC 兩階段：G = {F1, F2} -> C -> Y ##########\n")
mm_hoc <- constructs(
  composite("F1", multi_items("i", 1:3), weights = mode_A),
  composite("F2", multi_items("i", 4:6), weights = mode_A),
  composite("C",  multi_items("cond", 1:3), weights = mode_A),
  composite("Y",  single_item("y")),
  higher_composite("G", dimensions = c("F1", "F2"),
                   method = two_stage, weights = mode_A)
)
sm_hoc <- relationships(paths(from = "G", to = "C"), paths(from = "C", to = "Y"))
m_hoc <- estimate_pls(data = dat, measurement_model = mm_hoc, structural_model = sm_hoc,
                      inner_weights = path_weighting)
s_hoc <- summary(m_hoc)
cat("\n-- HOC loadings（G 對 F1/F2 分數）--\n"); print(round(s_hoc$loadings, 6))
cat("\n-- paths --\n"); print(round(s_hoc$paths, 6))

# ---------------------------------------------------------------- PLSpredict
cat("\n\n########## [7] PLSpredict（M4；k=10 folds、1 rep）##########\n")
cat("註：fold 指派為隨機，數字不會與多多快跑逐位相同；看『量級與 PLS vs LM 的方向』是否一致。\n")
set.seed(123)
pred4 <- predict_pls(model = m4, technique = predict_DA, noFolds = 10, reps = 1)
sp <- summary(pred4)
cat("\n-- PLS 預測誤差 --\n"); print(round(sp$PLS_out_of_sample, 6))
cat("\n-- LM 基準 --\n");      print(round(sp$LM_out_of_sample, 6))

cat("\n\n== 完成。請把 out/01_seminr_out.txt 全文回報 ==\n")
sink()
