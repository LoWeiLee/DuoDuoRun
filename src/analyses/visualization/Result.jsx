/**
 * 視覺化 — Result（中欄）
 *
 * 依 type 渲染對應的圖表。
 */
import { useMemo } from 'react'
import { useApp, useAnalysisState } from '../../context/AppContext'
import { runViz } from './compute'
import { ScatterPlot, Histogram, BoxPlot, CorrelationHeatmap } from '../../components/charts'

function Result() {
  const { dataset, lang, t } = useApp()
  const [state] = useAnalysisState()
  const result = useMemo(() => (dataset ? runViz(dataset.rows, state) : null), [dataset, state])
  if (!dataset) return null
  if (result.error) {
    let msg = t.viz.config[result.error] || t.np.config[result.error] || result.error
    return <div className="text-sm text-duo-cocoa-400 leading-relaxed">{msg}</div>
  }

  const labelMap = dataset.labels?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}

  if (result.type === 'scatter') {
    return (
      <div className="bg-white border border-duo-cocoa-100 rounded-md p-4">
        <ScatterPlot
          data={result.data}
          xLabel={labelMap[result.xVar] || result.xVar}
          yLabel={labelMap[result.yVar] || result.yVar}
        />
      </div>
    )
  }
  if (result.type === 'histogram') {
    return (
      <div className="bg-white border border-duo-cocoa-100 rounded-md p-4">
        <Histogram
          bins={result.bins}
          xLabel={labelMap[result.xVar] || result.xVar}
        />
        <p className="text-[11px] text-duo-cocoa-400 mt-2 font-mono">
          n = {result.n}, k = {result.k} bins, width = {result.binWidth.toFixed(2)}
        </p>
      </div>
    )
  }
  if (result.type === 'boxplot') {
    // 把 group name 轉換成中英 label（如 categorical valueLabels 存在）
    const valueLabels = dataset.valueLabels?.[result.groupVar]?.[lang === 'zh-TW' ? 'zh' : 'en'] || {}
    const groupsLabeled = result.groups.map((g) => ({
      ...g,
      name: valueLabels[g.name] || g.name || (labelMap[result.yVar] || result.yVar),
    }))
    return (
      <div className="bg-white border border-duo-cocoa-100 rounded-md p-4">
        <BoxPlot groups={groupsLabeled} yLabel={labelMap[result.yVar] || result.yVar} />
      </div>
    )
  }
  if (result.type === 'heatmap') {
    const labels = result.columns.map((c) => labelMap[c] || c)
    return (
      <div className="bg-white border border-duo-cocoa-100 rounded-md p-4">
        <CorrelationHeatmap matrix={result.matrix} columns={result.columns} labels={labels} />
        <p className="text-[11px] text-duo-cocoa-400 mt-2">
          * p &lt; .05 &nbsp;·&nbsp; ** p &lt; .01 &nbsp;·&nbsp; *** p &lt; .001
        </p>
      </div>
    )
  }
  return null
}

export default Result
