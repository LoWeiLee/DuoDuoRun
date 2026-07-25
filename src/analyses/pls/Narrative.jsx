/**
 * PLS-SEM — Narrative（報告模式右欄）
 *
 * 用共用 NarrativeBlock 同時顯示中英 APA 敘述（各帶複製鈕）：
 *   1. 方法（scheme / PLSc）與 bootstrap 設定（重抽數、CI 類型）
 *   2. 測量模型：反映型信效度（α / CR / AVE 範圍 + HTMT 最大值）＋
 *      形成型（權重檢定 + 外部 VIF 最大值）
 *   3. 模型適配（估計模型 SRMR）與 blindfolding Q²（開啟時）
 *   4. 結構模型路徑檢定（β, t, p, 95% CI）與 R²
 *   5. W5／W6：MGA、PLSpredict＋CVPAT、IPMA／cIPMA、CTA、copula、FIMIX、POS
 *
 * 句子組裝在 ./apaNarrative.js（純函式、可測），本檔只負責取結果與呈現。
 * ★ 檔名刻意不叫 narrative.js：Windows／macOS 的檔案系統不分大小寫，
 *   `./Narrative` 會與 `./narrative` 相撞，導致 import 解析到錯的檔（2026-07-25 實際踩過）。
 */
import { useApp, useAnalysisState } from '../../context/AppContext'
import NarrativeBlock from '../../components/NarrativeBlock'
import { usePLSResult } from './usePLSResult'
import { getStrings } from '../../i18n'
import { buildNarrative } from './apaNarrative'

function Narrative() {
  const { dataset, t } = useApp()
  const [rawState] = useAnalysisState()
  const committed = rawState?.committed || null

  const { status, result: res } = usePLSResult(dataset, committed)

  if (!dataset) return null
  if (!committed) {
    return (
      <div className="text-sm text-duo-cocoa-400 leading-relaxed">{t.pls.result.runFirst}</div>
    )
  }
  if (status === 'running' || !res) {
    return (
      <div className="text-sm text-duo-cocoa-400 leading-relaxed">
        {t.pls.result.computingShort}
      </div>
    )
  }
  if (res.error) {
    return (
      <div className="text-sm text-duo-cocoa-400 leading-relaxed">{res.message || res.error}</div>
    )
  }

  const zhText = buildNarrative(res, 'zh-TW')
  const enText = buildNarrative(res, 'en')
  const zhStrings = getStrings('zh-TW')
  const enStrings = getStrings('en')

  return (
    <div>
      <NarrativeBlock
        heading="中文（APA）"
        text={zhText}
        copyLabel={{ copy: zhStrings.common.copy, copied: zhStrings.common.copied }}
        copyHint={zhStrings.pls.apa.copyHint}
      />
      <NarrativeBlock
        heading="English (APA)"
        text={enText}
        copyLabel={{ copy: enStrings.common.copy, copied: enStrings.common.copied }}
        copyHint={enStrings.pls.apa.copyHint}
      />
    </div>
  )
}

export default Narrative
