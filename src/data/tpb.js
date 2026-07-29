/**
 * TPB 公務人員生成式 AI 使用行為資料集
 *
 * 用途：PLS-SEM 示範（TPB 五構面完整模型）、信度 α、EFA／CFA、
 *       相關／迴歸（構面題項）、t 檢定與 ANOVA（基本資料變數）、NCA。
 *
 * 200 筆資料，含 3 筆遺漏值（att3、beh2、pbc2 各 1）。
 * 題本見 docs/tpb-questionnaire.md（docx 版同名）。
 *
 * 構面與題項（Likert 1-5）：
 *   att1-att4  態度（Attitude）
 *   sn1-sn3    主觀規範（Subjective Norm）
 *   pbc1-pbc4  知覺行為控制（Perceived Behavioral Control）
 *   bi1-bi3    行為意圖（Behavioral Intention）
 *   beh1-beh3  行為（Behavior，過去一個月使用頻率）
 *
 * 基本資料：
 *   gender     性別（男／女）
 *   grade      官等（委任／薦任／簡任）
 *   rank       職等 1-14，與官等邏輯一致（委任 1-5、薦任 6-9、簡任 10-14）
 *   seniority  公務年資四段，與官等正相關
 *   supervisor 是否為主管（簡任多數、薦任高職等部分、委任極少）
 *
 * 資料生成設計（2026-07-29，經 src/lib/stats 引擎實測驗證）：
 *   潛在結構：ATT、SN、PBC → BI；BI、PBC → BEH（TPB 經典五路徑）。
 *   「數位親近性」潛在變數隨年資遞減 → 年資與各構面呈輕微負相關（真實感設計）。
 *   實測特徵（bootstrap 500 次）：
 *     α = .77-.84（各構面）；AVE 全 > .5；HTMT 最大 .68（區辨效度過關）
 *     五條路徑全顯著：ATT→BI β≈.42、SN→BI β≈.26、PBC→BI β≈.32、
 *     BI→BEH β≈.43、PBC→BEH β≈.21（p 最大 .003）；R²(BI)≈.48、R²(BEH)≈.33
 */
import { mulberry32, gaussian, clampInt, randInt } from './prng.js'

function generate() {
  const rng = mulberry32(2026)
  const data = []

  for (let i = 1; i <= 200; i++) {
    // ── 基本資料 ──
    const gU = rng()
    const grade = gU < 0.25 ? '委任' : gU < 0.80 ? '薦任' : '簡任'
    const rank = grade === '委任' ? randInt(rng, 1, 5)
      : grade === '薦任' ? randInt(rng, 6, 9)
      : randInt(rng, 10, 14)
    // 年資與官等正相關
    const sBase = grade === '委任' ? 0.9 : grade === '薦任' ? 1.5 : 2.3
    const sIdx = clampInt(sBase + gaussian(rng) * 0.9, 0, 3)
    const seniority = ['10年以下', '11-20年', '21-29年', '30年以上'][sIdx]
    // 主管比例依官等／職等遞增
    const supP = grade === '簡任' ? 0.75 : grade === '薦任' ? (rank >= 8 ? 0.35 : 0.08) : 0.02
    const supervisor = rng() < supP ? '是' : '否'
    const gender = rng() < 0.52 ? '男' : '女'

    // ── 潛在變數（近似單位變異數） ──
    const T = gaussian(rng) - 0.30 * (sIdx - 1.5) // 數位親近性：年資越高越低
    const O = gaussian(rng)                       // 組織氛圍
    const ATT = 0.50 * T + 0.15 * O + 0.80 * gaussian(rng)
    const SN = 0.20 * T + 0.60 * O + 0.72 * gaussian(rng)
    const PBC = 0.60 * T + 0.72 * gaussian(rng)
    const BI = 0.42 * ATT + 0.24 * SN + 0.30 * PBC + 0.52 * gaussian(rng)
    const BEH = 0.52 * BI + 0.22 * PBC + 0.60 * gaussian(rng)

    const item = (L, center, noise) => clampInt(center + 0.72 * L + noise * gaussian(rng), 1, 5)

    data.push({
      id: i, gender, grade, rank, seniority, supervisor,
      att1: item(ATT, 3.4, 0.50), att2: item(ATT, 3.3, 0.50),
      att3: item(ATT, 3.2, 0.55), att4: item(ATT, 3.4, 0.45),
      sn1: item(SN, 3.0, 0.45), sn2: item(SN, 3.1, 0.42), sn3: item(SN, 3.2, 0.45),
      pbc1: item(PBC, 3.3, 0.50), pbc2: item(PBC, 3.1, 0.60),
      pbc3: item(PBC, 3.2, 0.50), pbc4: item(PBC, 3.3, 0.55),
      bi1: item(BI, 3.3, 0.42), bi2: item(BI, 3.5, 0.44), bi3: item(BI, 3.1, 0.46),
      beh1: item(BEH, 2.9, 0.55), beh2: item(BEH, 3.1, 0.50), beh3: item(BEH, 3.0, 0.45),
    })
  }

  // 故意製造遺漏值供「遺漏值處理」功能展示
  data[17].att3 = null
  data[88].beh2 = null
  data[140].pbc2 = null

  return data
}

export const TPB_DATA = generate()

/** 變數標籤（用於 VariableList 顯示） */
export const TPB_LABELS = {
  zh: {
    id: '編號',
    gender: '性別',
    grade: '官等',
    rank: '職等',
    seniority: '公務年資',
    supervisor: '是否主管',
    att1: '態度1 AI有幫助',
    att2: '態度2 提升品質',
    att3: '態度3 明智做法',
    att4: '態度4 整體正面',
    sn1: '規範1 重要他人',
    sn2: '規範2 同事支持',
    sn3: '規範3 機關鼓勵',
    bi1: '意圖1 三個月內',
    bi2: '意圖2 願意嘗試',
    bi3: '意圖3 推薦同事',
    pbc1: '控制1 有能力操作',
    pbc2: '控制2 自己決定',
    pbc3: '控制3 知識技能',
    pbc4: '控制4 使用容易',
    beh1: '行為1 草擬文稿',
    beh2: '行為2 蒐整資料',
    beh3: '行為3 整體頻率',
  },
  en: {
    id: 'ID',
    gender: 'Gender',
    grade: 'Civil service grade',
    rank: 'Rank (1-14)',
    seniority: 'Seniority',
    supervisor: 'Supervisor',
    att1: 'ATT1 AI is helpful',
    att2: 'ATT2 Improves quality',
    att3: 'ATT3 Wise practice',
    att4: 'ATT4 Overall positive',
    sn1: 'SN1 Important others',
    sn2: 'SN2 Peer support',
    sn3: 'SN3 Agency encourages',
    bi1: 'BI1 Within 3 months',
    bi2: 'BI2 Willing to try',
    bi3: 'BI3 Recommend',
    pbc1: 'PBC1 Able to operate',
    pbc2: 'PBC2 Own decision',
    pbc3: 'PBC3 Knowledge & skills',
    pbc4: 'PBC4 Easy to use',
    beh1: 'BEH1 Drafting documents',
    beh2: 'BEH2 Gathering data',
    beh3: 'BEH3 Overall frequency',
  },
}

/** 類別變數值標籤 */
export const TPB_VALUE_LABELS = {
  gender: {
    zh: { 男: '男', 女: '女' },
    en: { 男: 'Male', 女: 'Female' },
  },
  grade: {
    zh: { 委任: '委任', 薦任: '薦任', 簡任: '簡任' },
    en: { 委任: 'Delegated (weiren)', 薦任: 'Recommended (jianren)', 簡任: 'Selected (jenren)' },
  },
  seniority: {
    zh: { '10年以下': '10 年以下', '11-20年': '11–20 年', '21-29年': '21–29 年', '30年以上': '30 年以上' },
    en: { '10年以下': '≤10 years', '11-20年': '11–20 years', '21-29年': '21–29 years', '30年以上': '≥30 years' },
  },
  supervisor: {
    zh: { 是: '是', 否: '否' },
    en: { 是: 'Yes', 否: 'No' },
  },
}

/** α 分析的預設量表題組（態度構面） */
export const TPB_SCALE_VARS = ['att1', 'att2', 'att3', 'att4']
