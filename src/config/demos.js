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
 *   工作滿意度 (q1 工作環境, q2 同事關係, q3 主管溝通)
 *     → 整體滿意 (q5) → 工作績效 (performance_score)
 * 簡單中介鏈，示範測量模型（多指標構念）與兩條結構路徑。
 * committed 直接附上（載入示範即出結果，不需再按「執行分析」）；
 * draft 快照的 JSON 需與 Config buildModel() 的輸出逐鍵一致，否則會誤報「設定已變更」。
 */
const PLS_DEMO_LVS = [
  { name: '工作滿意度', indicators: ['q1', 'q2', 'q3'] },
  { name: '整體滿意', indicators: ['q5'] },
  { name: '工作績效', indicators: ['performance_score'] },
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
      configErrors: [],
      committed: {
        model: PLS_DEMO_MODEL,
        bootstrapN: 1000,
        draft: { model: PLS_DEMO_MODEL, bootstrapN: 1000 },
      },
    },
  },
}

export function getDemo(analysisId) {
  return ANALYSIS_DEMOS[analysisId] || null
}
