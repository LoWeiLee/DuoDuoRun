/**
 * 二因子實驗設計資料集（2 × 3 完全交叉）
 *
 * 用途：雙因子 ANOVA（主效果 A、主效果 B、A×B 交互作用）與 ANCOVA。
 *
 * 2026-07-13 紅隊 R5 新增。原本內建的四個資料集**沒有任何一個同時具備
 * 兩個類別因子 ＋ 一個連續依變項**，導致 twoWayAnova 沒有示範設定、
 * 也就無法進入全模組 UI 煙霧測試的涵蓋範圍——而它其實藏著與 ANCOVA
 * 完全相同的 `error` 欄位撞名 bug（見 docs/validation-report-v1.md）。
 *
 * 90 筆：teaching_mode（2 水準）× feedback_type（3 水準），每格 15 人。
 *
 * 變數：
 *   id             編號
 *   teaching_mode  教學型態：online / inperson
 *   feedback_type  回饋方式：none / written / oral
 *   pretest        前測分數（連續共變項，供 ANCOVA 用）
 *   posttest       後測分數（依變項）
 *
 * 設計（三個效果都刻意做成可偵測，讓示範看得到東西）：
 *   - 主效果 A（teaching_mode）：inperson 比 online 高約 4 分
 *   - 主效果 B（feedback_type）：none < written < oral，跨距約 6 分
 *   - 交互作用 A×B：口頭回饋在實體課特別有效（+9），線上課則幾乎沒加成（+0）
 *     → 交互作用項應達顯著，這正是雙因子 ANOVA 的教學重點
 *   - pretest 與 posttest 中度正相關（r ≈ .5），適合當 ANCOVA 的共變項
 *
 * 含 2 筆遺漏值（posttest），示範 listwise deletion。
 */
import { mulberry32, gaussian } from './prng.js'

function generate() {
  const rng = mulberry32(2026)
  const data = []
  let id = 1

  // 主效果與交互作用的真值（單位：分）
  const MODE_EFFECT = { online: 0, inperson: 4 }
  const FEEDBACK_EFFECT = { none: 0, written: 3, oral: 6 }
  // 交互作用：口頭回饋 × 實體課 額外 +5（其餘格為 0）
  const INTERACTION = (mode, fb) => (mode === 'inperson' && fb === 'oral' ? 9 : 0)

  const BASE = 62
  const SD = 6

  for (const mode of ['online', 'inperson']) {
    for (const fb of ['none', 'written', 'oral']) {
      for (let i = 0; i < 15; i++) {
        const pretest = Math.round(58 + gaussian(rng) * 8)
        // posttest 部分由 pretest 帶動（共變項效果 ≈ 0.45），其餘為處理效果 + 誤差
        const mu =
          BASE +
          0.45 * (pretest - 58) +
          MODE_EFFECT[mode] +
          FEEDBACK_EFFECT[fb] +
          INTERACTION(mode, fb)
        const posttest = Math.round(mu + gaussian(rng) * SD)
        data.push({
          id: id++,
          teaching_mode: mode,
          feedback_type: fb,
          pretest: Math.max(30, Math.min(100, pretest)),
          posttest: Math.max(30, Math.min(100, posttest)),
        })
      }
    }
  }

  // 遺漏值：示範 listwise deletion（各落在不同的格，避免掏空某一格）
  data[12].posttest = null
  data[71].posttest = null

  return data
}

export const FACTORIAL_DATA = generate()

export const FACTORIAL_LABELS = {
  zh: {
    id: '編號',
    teaching_mode: '教學型態',
    feedback_type: '回饋方式',
    pretest: '前測分數',
    posttest: '後測分數',
  },
  en: {
    id: 'ID',
    teaching_mode: 'Teaching mode',
    feedback_type: 'Feedback type',
    pretest: 'Pre-test score',
    posttest: 'Post-test score',
  },
}

export const FACTORIAL_VALUE_LABELS = {
  teaching_mode: {
    zh: { online: '線上課', inperson: '實體課' },
    en: { online: 'Online', inperson: 'In person' },
  },
  feedback_type: {
    zh: { none: '無回饋', written: '書面回饋', oral: '口頭回饋' },
    en: { none: 'No feedback', written: 'Written', oral: 'Oral' },
  },
}
