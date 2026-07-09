/**
 * 分析方法選單結構
 *
 * 結構：
 *   ANALYSIS_GROUPS = [{ id, i18nKey, items: [{ id, i18nKey, priority }] }]
 *
 *   id        — 唯一識別碼，用於 URL hash、AppContext 的 activeAnalysis
 *   i18nKey   — 對應 i18n 檔內的 sidebar.* 鍵名
 *   priority  — 1（第一優先，Step 3 上線）
 *               2（第二優先）
 *               3（第三優先）
 *               用於 PR-2a 顯示「Step 3 上線」徽章與否
 *
 * 將來 Step 3 開始接統計引擎後，會在每個 item 加上 component 欄位指向實際分析元件。
 */
export const ANALYSIS_GROUPS = [
  {
    id: 'descriptive',
    i18nKey: 'descriptive',
    items: [
      { id: 'desc-stats',     i18nKey: 'descStats',     priority: 1 },
      { id: 'normality',      i18nKey: 'normality',     priority: 2 },
      { id: 'visualization',  i18nKey: 'visualization', priority: 2 },
    ],
  },
  {
    id: 'inferential',
    i18nKey: 'inferential',
    items: [
      { id: 't-test',          i18nKey: 'tTest',           priority: 1 },
      { id: 'one-way-anova',   i18nKey: 'oneWayAnova',     priority: 1 },
      { id: 'two-way-anova',   i18nKey: 'twoWayAnova',     priority: 3 },
      // priority 3 in spec; implemented in PR-6a
      { id: 'chi-square',      i18nKey: 'chiSquare',       priority: 2 },
      { id: 'nonparametric',   i18nKey: 'nonparametric',   priority: 2 },
      { id: 'z-prop',          i18nKey: 'zProp',           priority: 2 },
      { id: 'fisher-exact',    i18nKey: 'fisherExact',     priority: 1 },
      { id: 'ancova',          i18nKey: 'ancova',          priority: 1 },
      { id: 'repeated-anova',  i18nKey: 'repAnova',        priority: 1 },
      { id: 'mixed-anova',     i18nKey: 'mixedAnova',      priority: 1 },
    ],
  },
  {
    id: 'regression',
    i18nKey: 'regression',
    items: [
      { id: 'correlation',           i18nKey: 'correlation',          priority: 1 },
      { id: 'simple-regression',     i18nKey: 'simpleRegression',     priority: 1 },
      { id: 'multiple-regression',   i18nKey: 'multipleRegression',   priority: 2 },
      { id: 'logistic-regression',   i18nKey: 'logisticRegression',   priority: 3 },
      { id: 'hierarchical-regression', i18nKey: 'hierReg',            priority: 1 },
    ],
  },
  {
    id: 'scale',
    i18nKey: 'scale',
    items: [
      { id: 'cronbach-alpha', i18nKey: 'cronbachAlpha', priority: 1 },
      { id: 'efa',            i18nKey: 'efa',           priority: 3 },
      { id: 'kappa',          i18nKey: 'kappa',         priority: 1 },
      { id: 'icc',            i18nKey: 'icc',           priority: 1 },
      { id: 'cfa',            i18nKey: 'cfa',           priority: 2 },
    ],
  },
  {
    id: 'multivariate',
    i18nKey: 'multivariate',
    items: [
      { id: 'manova',          i18nKey: 'manova',          priority: 2 },
      { id: 'lda',             i18nKey: 'lda',             priority: 2 },
      { id: 'cluster',         i18nKey: 'cluster',         priority: 2 },
    ],
  },
  {
    id: 'sem',
    i18nKey: 'sem',
    items: [
      { id: 'pls-sem',         i18nKey: 'plsSem',          priority: 2 },
      { id: 'nca',             i18nKey: 'nca',             priority: 2 },
    ],
  },
]

/**
 * 即將開放的功能（規劃中、尚未實作）。在 Sidebar 以可摺疊群組顯示，
 * 項目灰色不可點擊，純粹給使用者「未來會有什麼」的訊號。
 *
 * 順序：CB-SEM → HLM → 其他依類型分群
 * （PLS-SEM 已於 W1 上線，移入「結構方程模型」群組）
 */
export const COMING_SOON = [
  // 結構方程模型
  { id: 'cb-sem',           i18nKey: 'cbSem' },
  // 多層次模型
  { id: 'hlm',              i18nKey: 'hlm' },
  // 無母數補強
  { id: 'mcnemar',          i18nKey: 'mcnemar' },
  { id: 'friedman',         i18nKey: 'friedman' },
  // 迴歸補強
  { id: 'multinomial-logit', i18nKey: 'multinomialLogit' },
  { id: 'ordinal-logit',    i18nKey: 'ordinalLogit' },
  { id: 'probit',           i18nKey: 'probit' },
  { id: 'poisson',          i18nKey: 'poisson' },
  { id: 'polynomial-reg',   i18nKey: 'polynomialReg' },
  { id: 'cox',              i18nKey: 'cox' },
  // 多變量
  { id: 'cca',              i18nKey: 'cca' },
  // Bayesian
  { id: 'bayes-t',          i18nKey: 'bayesT' },
  { id: 'bayes-anova',      i18nKey: 'bayesAnova' },
  { id: 'bayes-corr',       i18nKey: 'bayesCorr' },
  // 測量學
  { id: 'irt',              i18nKey: 'irt' },
  // 合併分析
  { id: 'meta',             i18nKey: 'meta' },
  // 時間序列
  { id: 'arima',            i18nKey: 'arima' },
]

/**
 * 4 個示範資料集（PR-2b 才會接實際資料解析；PR-2a 只顯示 metadata）
 */
export const DEMO_DATASETS = [
  { id: 'employee',      i18nKey: 'employee',      descKey: 'employeeDesc' },
  { id: 'intervention',  i18nKey: 'intervention',  descKey: 'interventionDesc' },
  { id: 'multigroup',    i18nKey: 'multigroup',    descKey: 'multigroupDesc' },
  { id: 'categorical',   i18nKey: 'categorical',   descKey: 'categoricalDesc' },
]
