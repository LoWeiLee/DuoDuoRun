/**
 * PLS-SEM — APA 敘述句組裝（純函式，無 UI 依賴）
 *
 * ★ 檔名不可改為 narrative.js：Windows／macOS 檔案系統不分大小寫，會與同目錄的
 *   Narrative.jsx 相撞，使 `import Narrative from './Narrative'` 解析到本檔（無 default
 *   export）→ 元件變 undefined。2026-07-25 由 ui.smoke 在 Kevin 本機抓到。
 *
 * 2026-07-25（P1）：自 Narrative.jsx 抽出。抽出的理由有二——
 *   (1) 對齊架構不變量 1「邏輯與 UI 解耦」；
 *   (2) 讓敘述句可由 node 環境的行為測試直接驗證（jsdom 在沙盒跑不動）。
 *
 * 涵蓋：方法與 bootstrap 設定、測量模型、適配與 Q²、結構路徑與 R²、
 * 調節（含二次）、中介、MGA、PLSpredict＋CVPAT、IPMA、cIPMA、
 * CTA-PLS、Gaussian copula、FIMIX-PLS、PLS-POS。
 *
 * 撰寫原則：句子只重述報表已呈現的判讀，不引入新的統計主張；
 * 每一項方法的界線（恆等性前提、非常態前提、EN 門檻、POS 不可選段數、
 * NCA 的 d≥.1 且 p<.05 等）都必須進入句子，避免使用者複製後過度宣稱。
 */
import { fmtNum, fillTemplate } from '../../lib/format'
import { plspredictVerdict } from '../../lib/stats/pls'
import { getStrings } from '../../i18n'

function rangeStr(values) {
  const finite = values.filter((v) => Number.isFinite(v))
  if (finite.length === 0) return '—'
  const min = Math.min(...finite)
  const max = Math.max(...finite)
  const lo = fmtNum(min, 2)
  const hi = fmtNum(max, 2)
  return lo === hi ? lo : `${lo}–${hi}`
}

function pStr(p, lang) {
  if (!Number.isFinite(p)) return lang === 'en' ? 'p = n/a' : 'p 無法估計'
  if (p < 0.001) return 'p < .001'
  const s = p.toFixed(3)
  return `p = ${s.startsWith('0') ? s.slice(1) : s}`
}

export function buildNarrative(res, lang) {
  const t = getStrings(lang)
  const a = t.pls.apa
  const { estimate, bootstrap, q2, mga, micom, predict, ipma, cta, copula, fimix, pos } = res
  const bootOk = Boolean(bootstrap && !bootstrap.error)

  const schemeName = a.schemeNames[estimate.meta.scheme] || estimate.meta.scheme
  const plscClause = estimate.meta.consistent ? a.plscClause : ''

  // 缺失值處理與抽樣權重的揭露（2026-07-26 階段 A 紅隊 R12）。
  // 未揭露時 N 會被誤讀為「資料沒有缺失」，加權估計也不會出現在方法陳述裡。
  const meta = estimate.meta
  let dataClause = ''
  if (meta.missing === 'pairwise') {
    dataClause = a.dataPairwise
  } else if (meta.missing === 'mean') {
    dataClause = a.dataMean
  } else if (Number.isFinite(meta.nDropped) && meta.nDropped > 0) {
    dataClause = fillTemplate(a.dataCasewise, { nDropped: meta.nDropped, nRows: meta.nRows })
  }
  const weightClause = meta.weighted ? a.dataWeighted : ''

  const parts = []
  parts.push(
    bootOk
      ? fillTemplate(a.intro, {
          n: estimate.meta.n,
          nValid: bootstrap.nValid,
          scheme: schemeName,
          plsc: plscClause,
          ciType: a.ciNames[bootstrap.ciType] || bootstrap.ciType,
          data: dataClause,
          weighted: weightClause,
        })
      : fillTemplate(a.introNoBoot, {
          n: estimate.meta.n, scheme: schemeName, plsc: plscClause,
          data: dataClause, weighted: weightClause,
        })
  )

  // 測量模型（反映型多指標構念；單指標與形成型另計）
  const kByLv = new Map()
  for (const q of estimate.outerLoadings) kByLv.set(q.lv, (kByLv.get(q.lv) || 0) + 1)
  const multi = estimate.reliability.filter(
    (q) => q.mode !== 'formative' && (kByLv.get(q.lv) || 0) >= 2)
  if (multi.length > 0) {
    const measOk = multi.every((q) => q.rhoC >= 0.7 && q.ave >= 0.5)
    parts.push(
      fillTemplate(a.measurement, {
        alphaRange: rangeStr(multi.map((q) => q.alpha)),
        crRange: rangeStr(multi.map((q) => q.rhoC)),
        aveRange: rangeStr(multi.map((q) => q.ave)),
        measVerdict: measOk ? a.measOk : a.measBad,
      })
    )
  }

  // 形成型構念：權重檢定 + 外部 VIF
  const lvModes = estimate.lvModes || {}
  const formativeLvs = Object.keys(lvModes).filter((lv) => lvModes[lv] === 'formative')
  if (formativeLvs.length > 0) {
    const vifs = estimate.outerWeights
      .filter((q) => lvModes[q.lv] === 'formative' && Number.isFinite(q.vif))
      .map((q) => q.vif)
    parts.push(
      fillTemplate(a.formative, {
        lvs: formativeLvs.join(lang === 'en' ? ', ' : '、'),
        vifMax: vifs.length > 0 ? fmtNum(Math.max(...vifs), 2) : '—',
      })
    )
  }

  // HTMT（有可計算的配對才寫）
  const htmtValues = []
  for (const row of estimate.htmt.matrix) {
    for (const v of row) if (v !== null && Number.isFinite(v)) htmtValues.push(v)
  }
  if (htmtValues.length > 0) {
    const htmtMax = Math.max(...htmtValues)
    parts.push(
      fillTemplate(a.htmt, {
        htmtMax: fmtNum(htmtMax, 2),
        htmtVerdict: htmtMax < 0.85 ? a.htmtOk : a.htmtBad,
      })
    )
  }

  // 模型適配（估計模型 SRMR）
  if (estimate.fit && Number.isFinite(estimate.fit.estimated?.srmr)) {
    const srmr = estimate.fit.estimated.srmr
    parts.push(
      fillTemplate(a.fit, {
        srmr: fmtNum(srmr, 3),
        fitVerdict: srmr < 0.08 ? a.fitOk : a.fitBad,
      })
    )
  }

  // Q²（開啟且成功時）
  if (q2 && !q2.error && Array.isArray(q2.constructs) && q2.constructs.length > 0) {
    const vals = q2.constructs.map((c) => c.q2).filter((v) => Number.isFinite(v))
    if (vals.length > 0) {
      parts.push(
        fillTemplate(a.q2, {
          d: q2.omissionDistance,
          q2Range: rangeStr(vals),
          q2Verdict: vals.every((v) => v > 0) ? a.q2Ok : a.q2Bad,
        })
      )
    }
  }

  // 結構模型
  const sep = lang === 'en' ? '; ' : '；'
  const period = lang === 'en' ? '.' : '。'
  let pathSentences
  if (bootOk) {
    pathSentences = bootstrap.paths.map((q) =>
      fillTemplate(a.path, {
        from: q.from,
        to: q.to,
        beta: fmtNum(q.original, 2),
        t: fmtNum(q.t, 2),
        pStr: pStr(q.p, lang),
        lo: fmtNum(q.ciLower, 2),
        hi: fmtNum(q.ciUpper, 2),
        sig: Number.isFinite(q.p) && q.p < 0.05 ? a.sigYes : a.sigNo,
      })
    )
  } else {
    pathSentences = estimate.pathCoefficients.map((q) =>
      fillTemplate(a.pathNoBoot, { from: q.from, to: q.to, beta: fmtNum(q.coef, 2) })
    )
  }
  const r2Sentences = estimate.structural.map((q) =>
    fillTemplate(a.r2, { lv: q.lv, r2: fmtNum(q.r2, 2) })
  )
  parts.push(a.structuralIntro + pathSentences.join(sep) + period)
  parts.push(r2Sentences.join(sep) + period)

  // 調節（W4）：交互效果與 simple slopes（推論需要 bootstrap）
  if (bootOk && Array.isArray(estimate.interactions) && estimate.interactions.length > 0) {
    const pathBoot = new Map(bootstrap.paths.map((q) => [`${q.from}→${q.to}`, q]))
    for (const it of estimate.interactions) {
      for (const tg of it.targets) {
        const b = pathBoot.get(`${it.name}→${tg.to}`)
        if (!b) continue
        const stat = fillTemplate(a.modStat, {
          t: fmtNum(b.t, 2),
          pStr: pStr(b.p, lang),
          cl: fmtNum(b.ciLower, 2),
          ch: fmtNum(b.ciUpper, 2),
        })
        const sig = Number.isFinite(b.p) && b.p < 0.05 ? a.modSigYes : a.modSigNo
        if (tg.quadratic) {
          parts.push(fillTemplate(a.quadraticSentence, {
            name: it.name, to: tg.to, beta: fmtNum(tg.coef, 2), stat, sig,
          }))
        } else {
          let sentence = fillTemplate(a.moderation, {
            name: it.name,
            method: a.modMethodNames[it.method] || it.method,
            to: tg.to,
            beta: fmtNum(tg.coef, 2),
            stat,
            sig,
          })
          if (Array.isArray(tg.slopes)) {
            const lo = tg.slopes.find((q) => q.level === -1)
            const hi = tg.slopes.find((q) => q.level === 1)
            sentence += fillTemplate(a.moderationSlopes, {
              moderator: tg.moderator,
              iv: tg.iv,
              lo: fmtNum(lo.slope, 2),
              hi: fmtNum(hi.slope, 2),
            })
          } else {
            sentence += period
          }
          parts.push(sentence)
        }
      }
    }
  }

  // 中介（W4）：效果分解與 Zhao et al. (2010) 類型判讀（推論需要 bootstrap）
  if (bootOk && estimate.mediation && Array.isArray(bootstrap.indirectEffects)) {
    const tiMap = new Map((bootstrap.totalIndirectEffects || []).map((q) => [`${q.from}|${q.to}`, q]))
    const dirMap = new Map(bootstrap.paths.map((q) => [`${q.from}|${q.to}`, q]))
    const sentences = estimate.mediation.effects.map((eff) => {
      const key = `${eff.from}|${eff.to}`
      const ti = tiMap.get(key)
      const dir = eff.direct !== null ? dirMap.get(key) : null
      const indirectSig = ti && Number.isFinite(ti.ciLower) && (ti.ciLower > 0 || ti.ciUpper < 0)
      const directSig = dir && Number.isFinite(dir.p) && dir.p < 0.05
      let type
      if (indirectSig && directSig) {
        type = Math.sign(eff.direct) === Math.sign(eff.totalIndirect) ? 'complementary' : 'competitive'
      } else if (indirectSig) type = 'indirectOnly'
      else if (directSig) type = 'directOnly'
      else type = 'none'
      return fillTemplate(a.mediationSentence, {
        from: eff.from,
        to: eff.to,
        total: fmtNum(eff.total, 2),
        direct: eff.direct === null ? a.noDirect : fmtNum(eff.direct, 2),
        indirect: fmtNum(eff.totalIndirect, 2),
        ci: ti ? fillTemplate(a.mediationCi, { lo: fmtNum(ti.ciLower, 2), hi: fmtNum(ti.ciUpper, 2) }) : '',
        vaf: eff.vaf === null ? '' : fillTemplate(a.mediationVaf, { vaf: `${fmtNum(eff.vaf * 100, 1)}%` }),
        type: fillTemplate(a.mediationType, { type: a.medTypes[type] }),
      })
    })
    parts.push(a.mediationIntro + sentences.join(sep) + period)
  }

  // 調節式中介（條件間接效果）：推論同樣需要 bootstrap。
  // 句子只報「顯著／不顯著」與區間，不宣稱「調節式中介成立」——後者需要斜率的推論，
  // 而斜率這個量的原始定義（Hayes 2015）本工具未取得原文，故句尾一律附上標籤保留說明。
  if (bootOk && estimate.moderatedMediation && Array.isArray(bootstrap.conditionalIndirect)) {
    const ciMap = new Map(bootstrap.conditionalIndirect.map((q) => [`${q.x}|${q.m}|${q.y}`, q]))
    const sentences = estimate.moderatedMediation.effects.map((eff) => {
      const b = ciMap.get(`${eff.x}|${eff.m}|${eff.y}`)
      const at = (lv) => {
        const c0 = eff.conditional.find((q) => q.level === lv)
        const bl = b ? b.levels.find((q) => q.level === lv) : null
        const sig = bl && Number.isFinite(bl.ciLower) && (bl.ciLower > 0 || bl.ciUpper < 0)
        return fillTemplate(a.modmedLevel, {
          level: lv === 0 ? a.modmedAtMean : fillTemplate(a.modmedAtSd, { s: lv > 0 ? '+1' : '−1' }),
          est: fmtNum(c0.indirect, 2),
          ci: bl ? fillTemplate(a.mediationCi, { lo: fmtNum(bl.ciLower, 2), hi: fmtNum(bl.ciUpper, 2) }) : '',
          verdict: sig ? a.modmedSig : a.modmedNs,
        })
      }
      const slopeClause = (eff.slopeOverW !== null && b && b.slopeOverW)
        ? fillTemplate(a.modmedSlopeClause, {
          est: fmtNum(eff.slopeOverW, 2),
          ci: fillTemplate(a.mediationCi, {
            lo: fmtNum(b.slopeOverW.ciLower, 2), hi: fmtNum(b.slopeOverW.ciUpper, 2),
          }),
        })
        : a.modmedBothClause
      return fillTemplate(a.modmedSentence, {
        x: eff.x, m: eff.m, y: eff.y,
        w: eff.moderatorA && eff.moderatorB
          ? `${eff.moderatorA} / ${eff.moderatorB}`
          : (eff.moderatorA || eff.moderatorB),
        levels: [at(-1), at(0), at(1)].join('、'),
        slope: slopeClause,
      })
    })
    parts.push(a.modmedIntro + sentences.join(sep) + period + a.modmedTail)
  }

  // ── W5／W6 敘述句（2026-07-25 P1 補齊）────────────────────────────────
  // 這些區塊各自獨立於 bootstrap：MGA 有自己的 permutation、PLSpredict 走交叉驗證、
  // IPMA／cIPMA／CTA／copula／FIMIX／POS 各有自己的推論程序。
  // 一律先檢查 !x.error 再取值，錯誤時整段略過（不輸出半成品句子）。

  // MICOM（測量恆等性）——2026-07-29 階段 A / A3a 紅隊 R29。
  // MGA 敘述句的結尾要求讀者檢視 MICOM，先前卻沒有任何 MICOM 句子，句子指向自己不報的東西。
  // 判定與 UI 表格同一套規則：step 2 看 c ≥ 5% 分位、step 3 看差異是否落在 permutation 95% CI 內。
  if (micom && !micom.error && Array.isArray(micom.constructs) && micom.constructs.length > 0) {
    const [mg1, mg2] = micom.groups
    const inCi = (d, lo, hi) => Number.isFinite(d) && d >= lo && d <= hi
    const step2 = micom.constructs.map((q) => q.c >= q.cQuantile5)
    const step3 = micom.constructs.map((q) => inCi(q.mean.diff, q.mean.ciLower, q.mean.ciUpper)
      && inCi(q.variance.diff, q.variance.ciLower, q.variance.ciUpper))
    let verdict
    if (!step2.every(Boolean)) verdict = a.micomNone
    else if (step3.every(Boolean)) verdict = a.micomFull
    else verdict = a.micomPartial
    const items = micom.constructs.map((q, i) => fillTemplate(a.micomConstruct, {
      lv: q.lv,
      c: fmtNum(q.c, 3),
      q5: fmtNum(q.cQuantile5, 3),
      cP: pStr(q.cP, lang),
      mDiff: fmtNum(q.mean.diff, 3),
      mLo: fmtNum(q.mean.ciLower, 3),
      mHi: fmtNum(q.mean.ciUpper, 3),
      vDiff: fmtNum(q.variance.diff, 3),
      vLo: fmtNum(q.variance.ciLower, 3),
      vHi: fmtNum(q.variance.ciUpper, 3),
      step2: step2[i] ? a.micomStep2Yes : a.micomStep2No,
      step3: step3[i] ? a.micomStep3Yes : a.micomStep3No,
    }))
    parts.push(
      fillTemplate(a.micomIntro, {
        g1: mg1, n1: micom.n1, g2: mg2, n2: micom.n2, np: micom.nPermValid,
      })
      + items.join(sep) + fillTemplate(a.micomTail, { micomVerdict: verdict })
    )
  }

  // MGA（多群組分析）
  if (mga && !mga.error && Array.isArray(mga.paths) && mga.paths.length > 0) {
    const [g1, g2] = mga.groups
    const items = mga.paths.map((q) => fillTemplate(a.mgaPath, {
      from: q.from, to: q.to, g1, g2,
      b1: fmtNum(q.group1.coef, 2),
      b2: fmtNum(q.group2.coef, 2),
      diff: fmtNum(q.diff, 2),
      pStr: pStr(q.permutation.p, lang),
      sig: Number.isFinite(q.permutation.p) && q.permutation.p < 0.05 ? a.mgaSigYes : a.mgaSigNo,
    }))
    parts.push(
      fillTemplate(a.mgaIntro, { g1, n1: mga.n1, g2, n2: mga.n2, np: mga.nPermValid })
      + items.join(sep) + a.mgaTail
    )
  }

  // PLSpredict ＋ CVPAT
  if (predict && !predict.error && Array.isArray(predict.indicators) && predict.indicators.length > 0) {
    const inds = predict.indicators
    // 2026-07-29 階段 A / A3b 紅隊 R32：改用引擎回傳的 Shmueli et al. (2019) 四級判讀。
    // 先前這裡自己算三級（把「多數」與「少數」合併成 predSome），與說明文字寫的四級不符；
    // 現在判準只有引擎一份，UI 表格與敘述句讀同一個 verdict，不會再各算各的。
    const nQ2ok = Number.isFinite(predict.nQ2ok)
      ? predict.nQ2ok
      : inds.filter((q) => Number.isFinite(q.q2predict) && q.q2predict > 0).length
    const nBeatLm = Number.isFinite(predict.nBeatLm)
      ? predict.nBeatLm
      : inds.filter((q) => Number.isFinite(q.rmse) && Number.isFinite(q.lm?.rmse)
        && q.rmse < q.lm.rmse).length
    const v = predict.verdict || plspredictVerdict(inds)
    const verdict = a.predVerdictSentence[v] || ''
    parts.push(fillTemplate(a.predictIntro, {
      k: predict.k, nInd: inds.length, nQ2ok, nBeatLm, predVerdict: verdict,
    }) + a.predVerdictCaveat)
    if (predict.cvpat && predict.cvpat.vsIA && predict.cvpat.vsLM) {
      parts.push(fillTemplate(a.predictCvpat, {
        dIA: fmtNum(predict.cvpat.vsIA.dBar, 3),
        tIA: fmtNum(predict.cvpat.vsIA.t, 2),
        pIA: pStr(predict.cvpat.vsIA.p, lang),
        dLM: fmtNum(predict.cvpat.vsLM.dBar, 3),
        tLM: fmtNum(predict.cvpat.vsLM.t, 2),
        pLM: pStr(predict.cvpat.vsLM.p, lang),
      }))
    }
  }

  // IPMA（＋ cIPMA 若有）
  if (ipma && !ipma.error && Array.isArray(ipma.constructs) && ipma.constructs.length > 0) {
    const items = ipma.constructs.map((q) => fillTemplate(a.ipmaItem, {
      lv: q.lv, imp: fmtNum(q.importance, 2), perf: fmtNum(q.performance, 1),
    }))
    parts.push(
      fillTemplate(a.ipmaIntro, {
        target: ipma.target, targetPerf: fmtNum(ipma.targetPerformance, 1),
      }) + items.join(sep) + a.ipmaTail
    )
    const conds = ipma.cipma?.conditions
    if (Array.isArray(conds) && conds.length > 0) {
      const cItems = conds.map((q) => fillTemplate(a.cipmaItem, {
        lv: q.lv, d: fmtNum(q.effectSizeCE, 3), pStr: pStr(q.p, lang),
        verdict: q.necessary ? a.cipmaNecessaryYes : a.cipmaNecessaryNo,
      }))
      parts.push(
        fillTemplate(a.cipmaIntro, { target: ipma.target })
        + cItems.join(sep) + a.cipmaTail
      )
    }
  }

  // CTA-PLS
  if (cta && !cta.error && Array.isArray(cta.blocks) && cta.blocks.length > 0) {
    const items = cta.blocks.map((b) => fillTemplate(a.ctaItem, {
      lv: b.lv, nTetrads: b.nTetrads, alpha: fmtNum(b.alphaAdjusted, 4),
      verdict: b.verdict === 'formative' ? a.ctaVerdictFormative : a.ctaVerdictReflective,
    }))
    parts.push(a.ctaIntro + items.join(sep) + a.ctaTail)
  }

  // Gaussian copula 內生性檢查
  if (copula && !copula.error && Array.isArray(copula.equations) && copula.equations.length > 0) {
    // ★ 判準與報表共用同一份：percentile CI 是否含 0（引擎的 endogeneitySignal）。
    // 不可改用 p < .05——兩者在 bootstrap 分布偏斜時會給出相反結論（A3c R33-b）。
    let nSig = 0
    for (const eq of copula.equations) {
      for (const m of eq.models || []) {
        if (m.singular) continue
        if (m.endogeneitySignal) nSig++
      }
    }
    const normalLvs = (copula.normality || []).filter((q) => !q.nonNormal).map((q) => q.lv)
    parts.push(
      fillTemplate(a.copulaIntro, { b: copula.nBootstrap })
      + (nSig > 0 ? fillTemplate(a.copulaSigYes, { n: nSig }) : a.copulaSigNo)
      + (normalLvs.length > 0
        ? fillTemplate(a.copulaGateWarn, { lvs: normalLvs.join('、') })
        : a.copulaGateOk)
    )
  }

  // FIMIX-PLS
  if (fimix && !fimix.error && Array.isArray(fimix.segments) && fimix.segments.length > 0) {
    const shares = fimix.segments.map((sg) => fmtNum(sg.share, 3)).join(' / ')
    const en = fimix.criteria?.en
    let tail
    if (Number.isFinite(en)) {
      tail = fillTemplate(a.fimixEn, {
        en: fmtNum(en, 3), enVerdict: en >= 0.5 ? a.fimixEnOk : a.fimixEnBad,
      })
    } else {
      tail = a.fimixNoEn
    }
    parts.push(
      fillTemplate(a.fimixIntro, {
        k: fimix.segments.length, lnl: fmtNum(fimix.lnL, 2), n: fimix.n, shares,
      }) + tail + a.fimixTail
    )
  }

  // PLS-POS
  if (pos && !pos.error && Array.isArray(pos.segments) && pos.segments.length > 0) {
    parts.push(
      fillTemplate(a.posIntro, {
        k: pos.segments.length,
        sizes: pos.segments.map((sg) => sg.size).join(' / '),
        r2g: fmtNum(pos.global?.r2, 2),
        r2s: fmtNum(pos.r2Overall, 2),
      }) + a.posTail
    )
  }

  return parts.join(lang === 'en' ? ' ' : '').trim()
}
