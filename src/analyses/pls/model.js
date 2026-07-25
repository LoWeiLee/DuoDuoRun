/**
 * PLS-SEM — 表單／畫布共用的模型小工具（純函式，無 React 相依）。
 *
 * 存在理由：Config.jsx（表單，source of truth）與 Canvas.jsx（顯示層）都需要
 * 用同一套規則把 UI 草稿的交互項／高階構念轉成「模型內的構念名」。
 * 兩邊各留一份會漂移——W4 的互動項在畫布上完全不出現，根因之一就是
 * 畫布沒有 Config 的 intName 規則、認不得 `A×B` 這個構念名。
 */

/** 交互項顯示名（同時是模型內的構念名）：A×B（×C） */
export function intName(q) {
  return q.c ? `${q.a}×${q.b}×${q.c}` : `${q.a}×${q.b}`
}

/** UI 草稿 → 有效交互項（兩個因子都選了才算） */
export function validInteractions(ints) {
  return (ints || []).filter((q) => q && q.a && q.b)
}

/** UI 草稿 → 有效高階構念（有名字且至少兩個成分） */
export function validHigherOrder(hocs) {
  return (hocs || []).filter(
    (h) => h && (h.name || '').trim() !== '' && Array.isArray(h.components) && h.components.length >= 2
  )
}
