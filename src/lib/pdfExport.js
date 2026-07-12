/**
 * PDF 匯出工具
 *
 * 對外 API：
 *   exportToPdf({ targetEl, headerData })
 *
 *   targetEl   — DOM 節點，要被截圖的內容（通常是 MainContent）
 *   headerData — { datasetZh, datasetEn, analysisZh, analysisEn, filename }
 *
 * 流程：
 *   1. 動態 import jspdf 與 html2canvas（避免初載入體積過大）
 *   2. 依目標元素高度動態決定 html2canvas scale，避免超過瀏覽器 canvas 上限
 *      （Safari 約 4096-8192px、Chrome 16384px），長報告自動降階
 *   3. html2canvas 截圖目標元素
 *   4. 動態建立 bilingual header DOM（含中文）並截圖（用 html2canvas 處理中文，避免 jsPDF 內建字體不支援中文）
 *   5. A4 直式、自動分頁；每頁附 header 與 footer
 *   6. 檔名：duoduorun-{filename}-{YYYY-MM-DD}.pdf
 *   7. 失敗時自動降 scale=1 重試一次
 */

const PAGE = { width: 210, height: 297 } // A4 mm
const MARGIN = 12
const HEADER_H_MM = 18
const FOOTER_H_MM = 8

// 各瀏覽器的 canvas 高度上限（保守估計）
const SAFARI_MAX_CANVAS = 4096
const CHROME_MAX_CANVAS = 16384

// 多多官方網址（PDF footer / metadata 用）
const SITE_URL = 'https://loweilee.github.io/DuoDuoRun/'

function isSafari() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR/.test(ua)
}

/** 依目標元素高度動態決定 scale，避免 canvas 超過瀏覽器上限 */
function computeSafeScale(targetEl) {
  const limit = isSafari() ? SAFARI_MAX_CANVAS : CHROME_MAX_CANVAS
  const baseHeight = targetEl.offsetHeight || 600
  // 預留 buffer（用 limit 的 95%）
  const cap = limit * 0.95 / baseHeight
  // 桌面預設想要 2x（高 DPI 清晰），但不超過 cap，最低 1x
  const safari = isSafari() ? 1.5 : 2
  return Math.max(1, Math.min(safari, cap))
}

function isoDate() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 在 document.body 建立離屏的 header DOM，回傳元素引用 */
function buildHeaderDom({ datasetZh, datasetEn, analysisZh, analysisEn }) {
  const div = document.createElement('div')
  div.style.cssText = [
    'position:fixed',
    'top:0',
    'left:-99999px',
    'width:1100px',
    'background:white',
    'padding:14px 20px',
    'font-family:system-ui,-apple-system,Segoe UI,Microsoft JhengHei,PingFang TC,sans-serif',
  ].join(';')
  div.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e8d8c0;padding-bottom:10px;">
      <div>
        <div style="font-size:18px;font-weight:600;color:#2b1d14;">多多快跑 / DuoDuoRun</div>
        <div style="font-size:11px;color:#8f6d4f;margin-top:2px;letter-spacing:0.15em;">純前端統計分析工具</div>
      </div>
      <div style="text-align:right;font-size:11px;color:#5a432a;line-height:1.6;">
        <div><span style="color:#8f6d4f;">資料集：</span>${datasetZh} <span style="color:#a98257;">/</span> ${datasetEn}</div>
        <div><span style="color:#8f6d4f;">分析：</span>${analysisZh} <span style="color:#a98257;">/</span> ${analysisEn}</div>
        <div style="color:#a98257;font-size:10px;margin-top:2px;">${new Date().toLocaleString('zh-TW')}</div>
      </div>
    </div>
  `
  document.body.appendChild(div)
  return div
}

export async function exportToPdf({ targetEl, headerData }) {
  if (!targetEl) throw new Error('exportToPdf: targetEl is required')

  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ])

  const headerDom = buildHeaderDom(headerData)
  const initialScale = computeSafeScale(targetEl)

  /** 用指定 scale 截圖；若失敗（記憶體/上限），降一階重試 */
  async function captureWithFallback(el, opts, scale) {
    try {
      return await html2canvas(el, { ...opts, scale })
    } catch (e) {
      if (scale > 1) {
        // 重試：降到 1
        return await html2canvas(el, { ...opts, scale: 1 })
      }
      throw e
    }
  }

  let bodyCanvas, headerCanvas
  try {
    bodyCanvas = await captureWithFallback(
      targetEl,
      {
        backgroundColor: '#fbeed8', // duo-cream-100
        useCORS: true,
        logging: false,
      },
      initialScale
    )
    headerCanvas = await captureWithFallback(
      headerDom,
      { backgroundColor: '#ffffff', logging: false },
      initialScale
    )
  } finally {
    document.body.removeChild(headerDom)
  }

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // PDF metadata
  pdf.setProperties({
    title: `多多快跑 ${headerData.analysisZh || ''} / ${headerData.analysisEn || ''}`,
    subject: `${headerData.datasetZh || ''} / ${headerData.datasetEn || ''}`,
    author: 'DuoDuoRun (duoduorun)',
    creator: SITE_URL,
    keywords: 'statistics, duoduorun, 多多快跑',
  })

  const contentW = PAGE.width - 2 * MARGIN
  const contentH = PAGE.height - 2 * MARGIN - HEADER_H_MM - FOOTER_H_MM

  // header image to mm
  const headerImg = headerCanvas.toDataURL('image/png', 0.92)
  const headerScale = contentW / headerCanvas.width
  const headerScaledH = headerCanvas.height * headerScale

  // body image
  const pxToMmBody = contentW / bodyCanvas.width
  const pageContentHeightPx = contentH / pxToMmBody
  const totalPages = Math.max(1, Math.ceil(bodyCanvas.height / pageContentHeightPx))

  const drawHeaderFooter = (pageIdx) => {
    pdf.addImage(
      headerImg,
      'PNG',
      MARGIN,
      MARGIN,
      contentW,
      headerScaledH
    )
    pdf.setFontSize(8)
    pdf.setTextColor(143, 109, 79) // duo-cocoa-400 ish
    pdf.text(
      `${pageIdx + 1} / ${totalPages}`,
      PAGE.width / 2,
      PAGE.height - 5,
      { align: 'center' }
    )
    pdf.text(
      SITE_URL,
      PAGE.width - MARGIN,
      PAGE.height - 5,
      { align: 'right' }
    )
  }

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    if (pageIdx > 0) pdf.addPage()
    drawHeaderFooter(pageIdx)

    const sliceY = pageIdx * pageContentHeightPx
    const sliceH = Math.min(pageContentHeightPx, bodyCanvas.height - sliceY)

    const slice = document.createElement('canvas')
    slice.width = bodyCanvas.width
    slice.height = sliceH
    slice.getContext('2d').drawImage(bodyCanvas, 0, -sliceY)
    const sliceData = slice.toDataURL('image/png', 0.92)

    pdf.addImage(
      sliceData,
      'PNG',
      MARGIN,
      MARGIN + headerScaledH + 4,
      contentW,
      sliceH * pxToMmBody
    )
  }

  pdf.save(`duoduorun-${headerData.filename}-${isoDate()}.pdf`)
}
