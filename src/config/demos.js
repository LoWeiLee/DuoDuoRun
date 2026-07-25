/**
 * 各分析的「載入示範」設定（dataset + settings）
 *
 * 結構：
 *   ANALYSIS_DEMOS[analysisId] = { dataset: 'employee'|'intervention'|'multigroup'|'categorical', settings: {...} }
 *
 * 沒有列在這裡的分析 = 沒有 demo，按鈕會隱藏。
 *
 * 設定值請參考各 analysis 的 Config DEFAULT 結構。
 */

/**
 * PLS-SEM 示範模型（employee 資料集的 Likert 題項）：
 *   工作滿意度 (q1 工作環境, q2 同事關係, q3 主管溝通, q4 薪資福利)
 *     → 整體滿意 (q5) → 工作績效 (performance_score)
 * 簡單中介鏈，示範測量模型（多指標構念）與兩條結構路徑。
 * committed 直接附上（載入示範即出結果，不需再按「執行分析」）；
 * draft 快照的 JSON 需與 Config buildModel() 的輸出逐鍵一致，否則會誤報「設定已變更」。
 *
 * 2026-07-25 兩處修正／擴充：
 * (a) latentVariables 補 `mode: 'reflective'`——buildModel() 一律輸出 mode 欄位，
 *     舊的示範模型沒有這個鍵，draftSignature 比對必然不相等，載入示範後
 *     一定顯示「設定已變更」。這是示範設定本身的缺陷，不是使用者改了什麼。
 * (b) 開啟一組 W5／W6 開關。原示範一個都沒開，等於 ui.smoke 對 Q² 表、IPMA、
 *     cIPMA、PLSpredict、CTA-PLS 五個結果區塊完全沒有涵蓋——這些區塊只要有一個
 *     欄位取到 undefined 就是白畫面，而煙霧測試看不到。
 *     選開的是「不需要額外 permutation／EM 迭代」的一組（Q² / PLSpredict k=5 /
 *     IPMA＋cIPMA / CTA-PLS），MGA・MICOM（permutation 重）與 FIMIX・PLS-POS
 *     （EM／爬山法重）刻意不開：示範要秒出，煙霧測試也不該因此變慢。
 *     CTA-PLS 需要 4 個以上指標的構念 → 工作滿意度補入 q4。
 */
const PLS_DEMO_LVS = [
  { name: '工作滿意度', indicators: ['q1', 'q2', 'q3', 'q4'], mode: 'reflective' },
  { name: '整體滿意', indicators: ['q5'], mode: 'reflective' },
  { name: '工作績效', indicators: ['performance_score'], mode: 'reflective' },
]
const PLS_DEMO_PATHS = [
  { from: '工作滿意度', to: '整體滿意' },
  { from: '整體滿意', to: '工作績效' },
]
const PLS_DEMO_MODEL = {
  schemaVersion: 1,
  latentVariables: PLS_DEMO_LVS,
  paths: PLS_DEMO_PATHS,
}
// 鍵序必須與 Config.jsx 的 options 物件字面量一致（draftSignature 走 JSON.stringify 比對）
const PLS_DEMO_OPTIONS = {
  scheme: 'path',
  consistent: false,
  ciType: 'percentile',
  q2: true,
  w5: {
    predict: true,
    k: 5,
    ipma: true,
    target: '工作績效',
    cipma: true,
    cta: true,
  },
}

export const ANALYSIS_DEMOS = {
  // ── 敘述統計 ─────────────────────────
  'desc-stats': {
    dataset: 'employee',
    settings: { selectedVars: ['tenure_years', 'q1', 'q5', 'performance_score'] },
  },
  'normality': {
    dataset: 'employee',
    settings: { selectedVars: ['performance_score', 'q5'] },
  },
  'visualization': {
    dataset: 'employee',
    settings: { type: 'scatter', xVar: 'q5', yVar: 'performance_score', groupVar: null, multiVars: [] },
  },

  // ── 推論統計 ─────────────────────────
  't-test': {
    dataset: 'intervention',
    settings: { type: 'independent', depVar: 'post_score', groupVar: 'group', var1: null, var2: null, mu0: 0 },
  },
  'one-way-anova': {
    dataset: 'multigroup',
    settings: { depVar: 'exam_score', factor: 'teaching_method' },
  },
  'chi-square': {
    dataset: 'categorical',
    settings: { type: 'independence', rowVar: 'gender', colVar: 'preferred_format', gofVar: null, expectedProps: null },
  },
  'nonparametric': {
    dataset: 'intervention',
    settings: { type: 'mw', depVar: 'post_score', groupVar: 'group', var1: null, var2: null, dunnPostHoc: false },
  },
  'z-prop': {
    dataset: 'categorical',
    settings: { type: 'two', groupVar: 'gender', valueVar: 'preferred_format', successLevel: 'online', var1: null, p0: 0.5 },
  },
  'fisher-exact': {
    dataset: 'categorical',
    settings: { rowVar: 'gender', colVar: 'preferred_format', successRow: 'female', successCol: 'online' },
  },
  'ancova': {
    dataset: 'employee',
    settings: { yVar: 'performance_score', factorVar: 'department', covariateVars: ['tenure_years'] },
  },
  // 2026-07-13 紅隊 R5 新增。two-way-anova 原本沒有示範設定——內建的四個資料集
  // 都缺「兩個類別因子 ＋ 一個連續依變項」的組合——因此也逃過了全模組 UI 煙霧測試，
  // 而它其實藏著與 ANCOVA 相同的 error 欄位撞名 bug（白畫面）。factorial 資料集補上這個缺口。
  // 三個效果都刻意做成顯著：主效果 A（F=15.4）、主效果 B（F=17.3）、交互作用（F=5.4）。
  'two-way-anova': {
    dataset: 'factorial',
    settings: { depVar: 'posttest', factorA: 'teaching_mode', factorB: 'feedback_type' },
  },
  'repeated-anova': {
    dataset: 'intervention',
    settings: { conditionVars: ['pre_score', 'post_score'] },
  },
  'mixed-anova': {
    dataset: 'intervention',
    settings: { betweenVar: 'group', conditionVars: ['pre_score', 'post_score'] },
  },

  // ── 相關與迴歸 ───────────────────────
  'correlation': {
    dataset: 'employee',
    settings: { selectedVars: ['tenure_years', 'q1', 'q5', 'performance_score'], method: 'pearson' },
  },
  'simple-regression': {
    dataset: 'employee',
    settings: { xVar: 'q5', yVar: 'performance_score' },
  },
  'multiple-regression': {
    dataset: 'employee',
    settings: { yVar: 'performance_score', xVars: ['tenure_years', 'q1', 'q5'] },
  },
  'hierarchical-regression': {
    dataset: 'employee',
    settings: {
      yVar: 'performance_score',
      blocks: [['tenure_years'], ['q1', 'q5']],
    },
  },

  // ── 量表分析 ─────────────────────────
  'cronbach-alpha': {
    dataset: 'employee',
    settings: { selectedVars: ['q1', 'q2', 'q3', 'q4', 'q5'] },
  },
  'efa': {
    dataset: 'employee',
    settings: { selectedVars: ['q1', 'q2', 'q3', 'q4', 'q5'], nFactors: 2, rotation: 'varimax' },
  },
  'icc': {
    dataset: 'employee',
    settings: { raterVars: ['q1', 'q2', 'q3', 'q5'] },
  },
  'cfa': {
    dataset: 'employee',
    settings: {
      factors: [
        { name: '滿意度', indicators: ['q1', 'q2', 'q3'] },
        { name: '薪資績效', indicators: ['q4', 'q5'] },
      ],
    },
  },

  // ── 多變量分析 ───────────────────────
  'manova': {
    dataset: 'employee',
    settings: { factorVar: 'department', dvVars: ['q5', 'performance_score'] },
  },
  'lda': {
    dataset: 'employee',
    settings: { groupVar: 'department', predictors: ['tenure_years', 'q1', 'q5', 'performance_score'] },
  },
  'cluster': {
    dataset: 'employee',
    settings: {
      vars: ['tenure_years', 'q1', 'q5', 'performance_score'],
      method: 'kmeans',
      k: 3,
      standardize: true,
    },
  },

  // ── 結構方程模型 ─────────────────────
  'pls-sem': {
    dataset: 'employee',
    settings: {
      lvs: PLS_DEMO_LVS,
      paths: PLS_DEMO_PATHS,
      bootstrapN: 1000,
      q2: PLS_DEMO_OPTIONS.q2,
      w5: PLS_DEMO_OPTIONS.w5,
      configErrors: [],
      committed: {
        model: PLS_DEMO_MODEL,
        bootstrapN: 1000,
        options: PLS_DEMO_OPTIONS,
        draft: { model: PLS_DEMO_MODEL, bootstrapN: 1000, options: PLS_DEMO_OPTIONS },
      },
    },
  },

  // ── 必要條件分析 ─────────────────────
  // 年資（條件）是否為高績效的必要條件？（employee 資料集）
  'nca': {
    dataset: 'employee',
    settings: { xVar: 'tenure_years', yVar: 'performance_score' },
  },
}

export function getDemo(analysisId) {
  return ANALYSIS_DEMOS[analysisId] || null
}
