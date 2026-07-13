/**
 * 示範資料集統一入口
 *
 * 對外提供：
 *   getDataset(id) → { id, rows, labels, valueLabels?, scaleVars? }
 *
 *   id          — 對應 src/config/analyses.js 的 DEMO_DATASETS
 *   rows        — 物件陣列（每列一筆資料）
 *   labels      — { zh: {col: '中文名'}, en: {col: 'EN name'} }
 *   valueLabels — categorical 欄位的值對照（選填）
 *   scaleVars   — α 分析的預設量表題組（選填）
 */
import { EMPLOYEE_DATA, EMPLOYEE_LABELS, EMPLOYEE_SCALE_VARS } from './employee'
import { INTERVENTION_DATA, INTERVENTION_LABELS, INTERVENTION_VALUE_LABELS } from './intervention'
import { MULTIGROUP_DATA, MULTIGROUP_LABELS, MULTIGROUP_VALUE_LABELS } from './multigroup'
import { CATEGORICAL_DATA, CATEGORICAL_LABELS, CATEGORICAL_VALUE_LABELS } from './categorical'
import { FACTORIAL_DATA, FACTORIAL_LABELS, FACTORIAL_VALUE_LABELS } from './factorial'

const REGISTRY = {
  employee: {
    id: 'employee',
    rows: EMPLOYEE_DATA,
    labels: EMPLOYEE_LABELS,
    scaleVars: EMPLOYEE_SCALE_VARS,
  },
  intervention: {
    id: 'intervention',
    rows: INTERVENTION_DATA,
    labels: INTERVENTION_LABELS,
    valueLabels: INTERVENTION_VALUE_LABELS,
  },
  multigroup: {
    id: 'multigroup',
    rows: MULTIGROUP_DATA,
    labels: MULTIGROUP_LABELS,
    valueLabels: MULTIGROUP_VALUE_LABELS,
  },
  factorial: {
    id: 'factorial',
    rows: FACTORIAL_DATA,
    labels: FACTORIAL_LABELS,
    valueLabels: FACTORIAL_VALUE_LABELS,
  },
  categorical: {
    id: 'categorical',
    rows: CATEGORICAL_DATA,
    labels: CATEGORICAL_LABELS,
    valueLabels: CATEGORICAL_VALUE_LABELS,
  },
}

export function getDataset(id) {
  return REGISTRY[id] || null
}
