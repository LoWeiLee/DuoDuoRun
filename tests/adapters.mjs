/**
 * 驗證比對轉接層：reference.json 的每個 key 對應一個 adapter，
 * 呼叫 src/lib/stats 對應函式並回傳「與基準值同名欄位」的物件。
 * 由 compare.test.js（Vitest）與 probe.mjs（除錯）共用。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe as describeStats } from '../src/lib/stats/descriptive.js'
import { independentT, pairedT, oneSampleT } from '../src/lib/stats/ttest.js'
import { pearsonCorr, spearmanRho } from '../src/lib/stats/correlation.js'
import { oneWayANOVA, tukeyHSD } from '../src/lib/stats/anova.js'
import { simpleLinearRegression } from '../src/lib/stats/regression.js'
import { multipleRegression } from '../src/lib/stats/multipleRegression.js'
import { hierarchicalRegression } from '../src/lib/stats/hierarchicalRegression.js'
import { logisticRegression } from '../src/lib/stats/logisticRegression.js'
import { chiSquareIndependence } from '../src/lib/stats/chiSquare.js'
import { fisherExact } from '../src/lib/stats/fisherExact.js'
import { mannWhitneyU, wilcoxonSignedRank, kruskalWallis } from '../src/lib/stats/nonparametric.js'
import { shapiroWilk, kolmogorovSmirnov } from '../src/lib/stats/normality.js'
import { levene } from '../src/lib/stats/levene.js'
import { twoWayANOVA } from '../src/lib/stats/twoWayAnova.js'
import { ancova } from '../src/lib/stats/ancova.js'
import { repeatedAnova } from '../src/lib/stats/repeatedAnova.js'
import { mixedAnova } from '../src/lib/stats/mixedAnova.js'
import { manova } from '../src/lib/stats/manova.js'
import { cronbachAlpha } from '../src/lib/stats/alpha.js'
import { cohenKappa } from '../src/lib/stats/kappa.js'
import { icc } from '../src/lib/stats/icc.js'
import { exploratoryFactorAnalysis } from '../src/lib/stats/efa.js'
import { oneProp, twoProp } from '../src/lib/stats/zProp.js'
import { cfa } from '../src/lib/stats/cfa.js'
import { runPLS, blindfoldPLS } from '../src/lib/stats/pls.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const D = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures/datasets.json'), 'utf8'))
export const REF = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures/reference.json'), 'utf8'))

const main = D.main
const col = (name, rows = main) => rows.map((r) => r[name])
const by = (g, name, gvar = 'group2', rows = main) =>
  rows.filter((r) => r[gvar] === g).map((r) => r[name])
const groups3 = ['A', 'B', 'C'].map((g) => ({ name: g, values: by(g, 'y', 'group3') }))
const items6 = ['i1', 'i2', 'i3', 'i4', 'i5', 'i6']

export const ADAPTERS = {
  descriptive_y() {
    const r = describeStats(col('y'))
    return { n: r.n, mean: r.mean, sd: r.sd, se: r.se, median: r.median,
      min: r.min, max: r.max, skewness: r.skewness, kurtosis: r.kurtosis }
  },
  ttest_independent_welch() {
    const r = independentT(by('M', 'x1'), by('F', 'x1'))
    return { t: r.t, df: r.df, p: r.p, d: r.d, meanDiff: r.meanDiff }
  },
  ttest_paired() {
    const r = pairedT(col('cond1'), col('cond2'))
    return { t: r.t, df: r.df, p: r.p, d: r.d, meanDiff: r.meanDiff }
  },
  ttest_one_sample() {
    const r = oneSampleT(col('y'), 40)
    return { t: r.t, df: r.df, p: r.p, d: r.d }
  },
  pearson_x1_x2() {
    const r = pearsonCorr(col('x1'), col('x2'))
    return { r: r.r, p: r.p, n: r.n }
  },
  spearman_x1_x2() {
    const r = spearmanRho(col('x1'), col('x2'))
    return { rho: r.rho, p: r.p, n: r.n }
  },
  anova_oneway() {
    const r = oneWayANOVA(groups3)
    return { F: r.F, p: r.p, dfBetween: r.dfBetween, dfWithin: r.dfWithin,
      ssBetween: r.ssBetween, ssWithin: r.ssWithin, ssTotal: r.ssTotal,
      eta2: r.eta2, omega2: r.omega2 }
  },
  tukey_hsd() {
    const a = oneWayANOVA(groups3)
    const pairs = tukeyHSD(a.groupStats, a.msWithin, a.dfWithin)
    const find = (x, y) => pairs.find((c) => (c.a === x && c.b === y) || (c.a === y && c.b === x))
    return { p_AB: find('A', 'B').p, p_AC: find('A', 'C').p, p_BC: find('B', 'C').p }
  },
  regression_simple() {
    const r = simpleLinearRegression(col('x1'), col('y'))
    return { intercept: r.intercept.b, slope: r.slope.b, seSlope: r.slope.se,
      tSlope: r.slope.t, pSlope: r.slope.p,
      r2: r.fit.r2, adjR2: r.fit.adjR2, F: r.anova.F, pF: r.anova.p }
  },
  regression_multiple() {
    const X = main.map((r) => [r.x1, r.x2, r.x3])
    const r = multipleRegression(X, col('y'), ['x1', 'x2', 'x3'])
    const c = Object.fromEntries(r.coefficients.map((q) => [q.name, q]))
    return { intercept: r.intercept.b,
      b_x1: c.x1.b, b_x2: c.x2.b, b_x3: c.x3.b,
      se_x1: c.x1.se, t_x1: c.x1.t, p_x1: c.x1.p,
      r2: r.fit.r2, adjR2: r.fit.adjR2, F: r.anova.F, pF: r.anova.p,
      vif_x1: c.x1.vif, vif_x2: c.x2.vif, vif_x3: c.x3.vif }
  },
  regression_hierarchical() {
    const r = hierarchicalRegression(main, 'y', [['x1'], ['x2', 'x3']])
    const s1 = r.steps[0], s2 = r.steps[1]
    return { r2_step1: s1.R2, r2_step2: s2.R2, deltaR2: s2.deltaR2,
      deltaF: s2.deltaF, deltaP: s2.deltaP }
  },
  logistic_regression() {
    const X = main.map((r) => [r.x1, r.group2 === 'M' ? 1 : 0])
    const r = logisticRegression(X, col('ybin'), ['x1', 'male'])
    const c = Object.fromEntries(r.coefficients.map((q) => [q.name, q]))
    return { intercept: r.intercept.b,
      b_x1: c.x1.b, b_male: c.male.b,
      se_x1: c.x1.se, z_x1: c.x1.z, p_x1: c.x1.p,
      llNull: r.fit.llNull, ll: r.fit.ll, lrStat: r.fit.lrStat, lrP: r.fit.lrP,
      mcFadden: r.fit.mcFadden, nagelkerke: r.fit.nagelkerke, auc: r.roc.auc }
  },
  chisquare_2x2() {
    const r = chiSquareIndependence(main, 'catR', 'catC')
    return { chi2: r.chi2, p: r.p, df: r.df, chi2Yates: r.chi2Yates,
      pYates: r.pYates, cramerV: r.cramerV }
  },
  fisher_exact() {
    const r = fisherExact(main, 'catR', 'catC', 'Yes', 'High')
    return { p: r.p, oddsRatio: r.or }
  },
  // U 的慣例：scipy 報第一組的 U1 = R1 − n1(n1+1)/2；JS 報 min(U1,U2)（SPSS 慣例）。
  // 兩者可互換（U1 + U2 = n1·n2），這裡換算成 scipy 慣例比對。
  mann_whitney() {
    const r = mannWhitneyU(by('M', 'x1'), by('F', 'x1'))
    return { U: r.R1 - (30 * 31) / 2, p: r.p }
  },
  mann_whitney_small() {
    const r = mannWhitneyU(by('A', 'v', 'g', D.small), by('B', 'v', 'g', D.small))
    return { U: r.R1 - (4 * 5) / 2, p: r.p }
  },
  mann_whitney_ties() {
    const r = mannWhitneyU(by('A', 'v', 'g', D.ties), by('B', 'v', 'g', D.ties))
    return { U: r.R1 - (12 * 13) / 2, p: r.p }
  },
  wilcoxon_signed_rank() {
    const r = wilcoxonSignedRank(col('cond1'), col('cond2'))
    return { T: r.T, p: r.p, z: r.z }
  },
  kruskal_wallis() {
    const r = kruskalWallis(groups3)
    return { H: r.H, p: r.p, df: r.df, epsilon2: r.epsilon2 }
  },
  shapiro_wilk() {
    const r = shapiroWilk(col('y'))
    return { W: r.W, p: r.p }
  },
  ks_lilliefors() {
    const r = kolmogorovSmirnov(col('y'))
    return { D: r.D, p: r.p }
  },
  levene_median() {
    const r = levene(['A', 'B', 'C'].map((g) => by(g, 'y', 'group3')))
    return { F: r.F, p: r.p, df1: r.df1, df2: r.df2 }
  },
  twoway_anova_type3() {
    const r = twoWayANOVA(main, 'y', 'group2', 'group3')
    return { ssA: r.effectA.ss, fA: r.effectA.F, pA: r.effectA.p,
      ssB: r.effectB.ss, fB: r.effectB.F, pB: r.effectB.p,
      ssAB: r.effectAB.ss, fAB: r.effectAB.F, pAB: r.effectAB.p,
      ssError: r.error.ss }
  },
  ancova() {
    const r = ancova(main, 'y', 'group3', ['x1', 'x2'])
    return { fFactor: r.factor.f, pFactor: r.factor.p, ssFactor: r.factor.ss,
      fCov1: r.covariates[0].f, pCov1: r.covariates[0].p }
  },
  repeated_anova() {
    const r = repeatedAnova(main, ['cond1', 'cond2', 'cond3'])
    return { F: r.f, p: r.p, dfNum: r.dfTreat, dfDen: r.dfError,
      ssTreat: r.ssTreat, ssError: r.ssError,
      ggEps: r.gg?.eps, pGG: r.gg?.p, mauchlyW: r.mauchly?.w, mauchlyP: r.mauchly?.p }
  },
  mixed_anova() {
    const r = mixedAnova(main, 'group2', ['cond1', 'cond2', 'cond3'])
    return { fBetween: r.fA, pBetween: r.pA,
      fWithin: r.fB, pWithin: r.pB, fInter: r.fAB, pInter: r.pAB }
  },
  manova() {
    const r = manova(main, 'group3', ['y', 'x1', 'x2'])
    return { wilks: r.wilks.lambda, wilksF: r.wilks.f, wilksP: r.wilks.p,
      pillai: r.pillai.v ?? r.pillai.value ?? r.pillai.trace, pillaiF: r.pillai.f, pillaiP: r.pillai.p,
      hotelling: r.hotellingLawley?.t ?? r.hotellingLawley?.trace ?? r.hotellingLawley?.value,
      roy: r.roy.lambda }
  },
  cronbach_alpha_6items() {
    return { alpha: cronbachAlpha(main, items6).alpha }
  },
  cronbach_alpha_f1() {
    return { alpha: cronbachAlpha(main, ['i1', 'i2', 'i3']).alpha }
  },
  icc() {
    const r = icc(main, ['rater1', 'rater2'])
    const v = Object.fromEntries(r.variants.map((q) => [q.key, q.value]))
    return { icc11: v.icc1_1, icc21: v.icc2_1, icc31: v.icc3_1,
      icc1k: v.icc1_k, icc2k: v.icc2_k, icc3k: v.icc3_k }
  },
  cohen_kappa() {
    return {
      kappa: cohenKappa(main, 'rater1', 'rater2', 'none').kappa,
      kappaLinear: cohenKappa(main, 'rater1', 'rater2', 'linear').kappa,
      kappaQuadratic: cohenKappa(main, 'rater1', 'rater2', 'quadratic').kappa,
    }
  },
  zprop_one() {
    const r = oneProp(main, 'ybin', '1', 0.5)
    return { z: r.z, p: r.p, phat: r.phat, wilsonLow: r.ciLow, wilsonHigh: r.ciHigh }
  },
  zprop_two() {
    const r = twoProp(main, 'group2', 'ybin', '1')
    return { z: r.z, p: r.p, p1: r.p1, p2: r.p2 }
  },
  efa_pca_varimax() {
    const r = exploratoryFactorAnalysis(main, items6, { nFactors: 2, rotation: 'varimax' })
    const load = r.rotatedLoadings // p×m
    const absMax = load.map((row) => Math.max(...row.map(Math.abs)))
    return { bartlettChi2: r.bartlett.chi2, bartlettP: r.bartlett.p, kmo: r.kmo.overall,
      eig1: r.eigenvalues[0], eig2: r.eigenvalues[1], eig3: r.eigenvalues[2],
      absLoadingsSorted: absMax.slice().sort((a, b) => a - b),
      communalities: r.communalities.slice().sort((a, b) => a - b) }
  },
  cfa_2factor() {
    const r = cfa(main, [
      { name: 'F1', indicators: ['i1', 'i2', 'i3'] },
      { name: 'F2', indicators: ['i4', 'i5', 'i6'] },
    ])
    return { chi2: r.chi2, df: r.df, cfi: r.fitIndices?.cfi, tli: r.fitIndices?.tli,
      rmsea: r.fitIndices?.rmsea }
  },
  // PLS-SEM（W1）：F1 =~ i1+i2+i3、F2 =~ i4+i5+i6、F1 → F2，path scheme、Mode A。
  // 基準：plspm（逐欄 z-score 後輸入，見 generate_reference.py 的移植怪癖註記）
  // ＋ numpy 手算（rho_A/rho_c/AVE/HTMT/標準化 α）。
  pls_basic() {
    const model = {
      schemaVersion: 1,
      latentVariables: [
        { name: 'F1', indicators: ['i1', 'i2', 'i3'], mode: 'reflective' },
        { name: 'F2', indicators: ['i4', 'i5', 'i6'], mode: 'reflective' },
      ],
      paths: [{ from: 'F1', to: 'F2' }],
    }
    const r = runPLS(main, model)
    if (r.error) throw new Error(`runPLS failed: ${r.error} — ${r.message}`)
    const load = Object.fromEntries(r.outerLoadings.map((q) => [q.indicator, q.loading]))
    const wt = Object.fromEntries(r.outerWeights.map((q) => [q.indicator, q.weight]))
    const rel = Object.fromEntries(r.reliability.map((q) => [q.lv, q]))
    const st = r.structural.find((q) => q.lv === 'F2')
    // cross-loadings 攤平：列 = i1..i6、欄 = F1,F2（row-major，對齊 Python 端）
    const crossLoadings = items6.flatMap((ind) => {
      const row = r.crossLoadings.find((q) => q.indicator === ind)
      return [row.values.F1, row.values.F2]
    })
    return {
      loading_i1: load.i1, loading_i2: load.i2, loading_i3: load.i3,
      loading_i4: load.i4, loading_i5: load.i5, loading_i6: load.i6,
      weight_i1: wt.i1, weight_i2: wt.i2, weight_i3: wt.i3,
      weight_i4: wt.i4, weight_i5: wt.i5, weight_i6: wt.i6,
      path_F1_F2: r.pathCoefficients.find((q) => q.from === 'F1' && q.to === 'F2').coef,
      r2_F2: st.r2, adjR2_F2: st.adjR2,
      f2_F1_F2: st.predictors.find((q) => q.from === 'F1').f2,
      alphaStd_F1: rel.F1.alpha, alphaStd_F2: rel.F2.alpha,
      rhoA_F1: rel.F1.rhoA, rhoA_F2: rel.F2.rhoA,
      rhoC_F1: rel.F1.rhoC, rhoC_F2: rel.F2.rhoC,
      ave_F1: rel.F1.ave, ave_F2: rel.F2.ave,
      sqrtAve_F1: r.fornellLarcker.matrix[0][0], sqrtAve_F2: r.fornellLarcker.matrix[1][1],
      lvCorr_F1F2: r.latentCorrelations.matrix[0][1],
      htmt_F1F2: r.htmt.matrix[0][1],
      crossLoadings,
    }
  },
  // ── PLS-SEM W3 基準（模型/選項見 generate_reference.py 的 W3 區塊註記） ──
  // M4：F1(i1-3)→F2(i4-6)；F1→C、F2→C（C=cond1-3，雙前置）；F2→Y(y 單指標)。
  // 與 Python 端同用 tol=1e-12 收斂，讓比對誤差來自演算法而非收斂殘差。
  pls_scheme_centroid() {
    return plsSchemeAdapter('centroid')
  },
  pls_scheme_factorial() {
    return plsSchemeAdapter('factorial')
  },
  // 形成型（Mode B）：XF(x1,x2,x3) → Y(y)；權重已由引擎縮放至 w'Sw=1（單位變異分數）
  pls_formative() {
    const model = {
      schemaVersion: 1,
      latentVariables: [
        { name: 'XF', indicators: ['x1', 'x2', 'x3'], mode: 'formative' },
        { name: 'Y', indicators: ['y'] },
      ],
      paths: [{ from: 'XF', to: 'Y' }],
    }
    const r = runPLS(main, model, PLS_W3_OPT)
    if (r.error) throw new Error(`runPLS failed: ${r.error} — ${r.message}`)
    const wt = Object.fromEntries(r.outerWeights.map((q) => [q.indicator, q]))
    const ld = Object.fromEntries(r.outerLoadings.map((q) => [q.indicator, q.loading]))
    return {
      weight_x1: wt.x1.weight, weight_x2: wt.x2.weight, weight_x3: wt.x3.weight,
      loading_x1: ld.x1, loading_x2: ld.x2, loading_x3: ld.x3,
      path_XF_Y: r.pathCoefficients[0].coef,
      r2_Y: r.structural[0].r2,
      vif_x1: wt.x1.vif, vif_x2: wt.x2.vif, vif_x3: wt.x3.vif,
    }
  },
  // PLSc（Dijkstra & Henseler 2015）：M4、path scheme、consistent=true
  pls_plsc() {
    const r = runPLS(main, PLS_M4, { ...PLS_W3_OPT, consistent: true })
    if (r.error) throw new Error(`runPLS failed: ${r.error} — ${r.message}`)
    const ld = Object.fromEntries(r.outerLoadings.map((q) => [q.indicator, q.loading]))
    const path = (a, b) => r.pathCoefficients.find((q) => q.from === a && q.to === b).coef
    const r2 = (lv) => r.structural.find((q) => q.lv === lv).r2
    return {
      rhoA_F1: r.plsc.rhoA.F1, rhoA_F2: r.plsc.rhoA.F2, rhoA_C: r.plsc.rhoA.C,
      cloading_i1: ld.i1, cloading_i2: ld.i2, cloading_i3: ld.i3,
      cloading_i4: ld.i4, cloading_i5: ld.i5, cloading_i6: ld.i6,
      cloading_cond1: ld.cond1, cloading_cond2: ld.cond2, cloading_cond3: ld.cond3,
      cloading_y: ld.y,
      corr_F1_F2: r.latentCorrelations.matrix[0][1],
      corr_F2_Y: r.latentCorrelations.matrix[1][3],
      path_F1_F2: path('F1', 'F2'), path_F1_C: path('F1', 'C'),
      path_F2_C: path('F2', 'C'), path_F2_Y: path('F2', 'Y'),
      r2_F2: r2('F2'), r2_C: r2('C'), r2_Y: r2('Y'),
    }
  },
  // Model fit（SRMR / d_ULS / d_G / NFI；composite、path scheme、M4）
  pls_fit() {
    const r = runPLS(main, PLS_M4, PLS_W3_OPT)
    if (r.error) throw new Error(`runPLS failed: ${r.error} — ${r.message}`)
    return {
      srmrSat: r.fit.saturated.srmr, dUlsSat: r.fit.saturated.dUls,
      dGSat: r.fit.saturated.dG, nfiSat: r.fit.saturated.nfi,
      srmrEst: r.fit.estimated.srmr, dUlsEst: r.fit.estimated.dUls,
      dGEst: r.fit.estimated.dG, nfiEst: r.fit.estimated.nfi,
    }
  },
  // Blindfolding Q²（D=7、構念層 cross-validated redundancy、M4）
  pls_q2() {
    const r = blindfoldPLS(main, PLS_M4, PLS_W3_OPT)
    if (r.error) throw new Error(`blindfoldPLS failed: ${r.error} — ${r.message}`)
    const q2 = Object.fromEntries(r.constructs.map((c) => [c.lv, c.q2]))
    return { q2_F2: q2.F2, q2_C: q2.C, q2_Y: q2.Y }
  },

  /* ── PLS-SEM W4 基準（模型/程序見 generate_reference.py 的 W4 區塊註記） ── */
  // 中介：M4 的路徑乘積分解（F1→F2→C 有直接效果；F1→F2→Y 無）
  pls_mediation() {
    const r = plsRun(PLS_M4, PLS_W3_OPT)
    const eff = (a, b) => r.mediation.effects.find((q) => q.from === a && q.to === b)
    const f1c = eff('F1', 'C')
    const f1y = eff('F1', 'Y')
    return {
      indirect_F1_F2_C: f1c.chains.find((c) => c.via.join() === 'F2').coef,
      direct_F1_C: f1c.direct,
      total_F1_C: f1c.total,
      vaf_F1_C: f1c.vaf,
      indirect_F1_F2_Y: f1y.chains.find((c) => c.via.join() === 'F2').coef,
      total_F1_Y: f1y.total,
    }
  },
  // 調節 two-stage：F1×C→Y（C→Y 主效果由引擎自動補），交互項不標準化
  pls_mod_twostage() {
    const model = {
      schemaVersion: 1,
      latentVariables: [
        { name: 'F1', indicators: ['i1', 'i2', 'i3'] },
        { name: 'C', indicators: ['cond1', 'cond2', 'cond3'] },
        { name: 'Y', indicators: ['y'] },
      ],
      interactions: [{ name: 'F1xC', factors: ['F1', 'C'], method: 'two-stage' }],
      paths: [{ from: 'F1', to: 'Y' }, { from: 'F1xC', to: 'Y' }],
    }
    const r = plsRun(model, PLS_W3_OPT)
    const path = (a, b) => r.pathCoefficients.find((q) => q.from === a && q.to === b)
    const int = r.interactions[0]
    const tg = int.targets.find((q) => q.to === 'Y')
    const slope = (lv) => tg.slopes.find((s) => s.level === lv).slope
    const stY = r.structural.find((q) => q.lv === 'Y')
    return {
      path_F1_Y: path('F1', 'Y').coef,
      path_C_Y: path('C', 'Y').coef, // 自動補的主效果
      path_int_Y: path('F1xC', 'Y').coef,
      path_int_Y_std: path('F1xC', 'Y').coefStd,
      sd_product: int.sdProduct,
      r2_Y: stY.r2,
      f2_int: stY.predictors.find((q) => q.from === 'F1xC').f2,
      slope_lo: slope(-1), slope_mid: slope(0), slope_hi: slope(1),
    }
  },
  // 二次效果：F1 的平方項（two-stage 機制）
  pls_quadratic() {
    const model = {
      schemaVersion: 1,
      latentVariables: [
        { name: 'F1', indicators: ['i1', 'i2', 'i3'] },
        { name: 'Y', indicators: ['y'] },
      ],
      interactions: [{ name: 'F1sq', factors: ['F1', 'F1'], method: 'two-stage' }],
      paths: [{ from: 'F1', to: 'Y' }, { from: 'F1sq', to: 'Y' }],
    }
    const r = plsRun(model, PLS_W3_OPT)
    const path = (a, b) => r.pathCoefficients.find((q) => q.from === a && q.to === b)
    const tg = r.interactions[0].targets.find((q) => q.to === 'Y')
    const slope = (lv) => tg.slopes.find((s) => s.level === lv).slope
    return {
      path_F1_Y: path('F1', 'Y').coef,
      path_quad_Y: path('F1sq', 'Y').coef,
      sd_product: r.interactions[0].sdProduct,
      r2_Y: r.structural.find((q) => q.lv === 'Y').r2,
      slope_lo: slope(-1), slope_mid: slope(0), slope_hi: slope(1),
    }
  },
  // 三向交互（含全部兩向項；階層完整規格）
  pls_mod_threeway() {
    const model = {
      schemaVersion: 1,
      latentVariables: [
        { name: 'F1', indicators: ['i1', 'i2', 'i3'] },
        { name: 'C', indicators: ['cond1', 'cond2', 'cond3'] },
        { name: 'F2', indicators: ['i4', 'i5', 'i6'] },
        { name: 'Y', indicators: ['y'] },
      ],
      interactions: [
        { name: 'F1xC', factors: ['F1', 'C'], method: 'two-stage' },
        { name: 'F1xF2', factors: ['F1', 'F2'], method: 'two-stage' },
        { name: 'CxF2', factors: ['C', 'F2'], method: 'two-stage' },
        { name: 'F1xCxF2', factors: ['F1', 'C', 'F2'], method: 'two-stage' },
      ],
      paths: [
        { from: 'F1', to: 'Y' }, { from: 'C', to: 'Y' }, { from: 'F2', to: 'Y' },
        { from: 'F1xC', to: 'Y' }, { from: 'F1xF2', to: 'Y' },
        { from: 'CxF2', to: 'Y' }, { from: 'F1xCxF2', to: 'Y' },
      ],
    }
    const r = plsRun(model, PLS_W3_OPT)
    const path = (a) => r.pathCoefficients.find((q) => q.from === a && q.to === 'Y').coef
    return {
      path_F1_Y: path('F1'), path_C_Y: path('C'), path_F2_Y: path('F2'),
      path_F1xC_Y: path('F1xC'), path_F1xF2_Y: path('F1xF2'),
      path_CxF2_Y: path('CxF2'), path_F1xCxF2_Y: path('F1xCxF2'),
      r2_Y: r.structural.find((q) => q.lv === 'Y').r2,
    }
  },
  // product indicator / orthogonalizing（標準化量尺，對齊 seminr）
  pls_mod_pi() {
    return plsModPIAdapter('product-indicator')
  },
  pls_mod_ortho() {
    return plsModPIAdapter('orthogonal')
  },
  // HOC repeated indicators：G={F1,F2} 反映型、G→C→Y
  pls_hoc_repeated() {
    const r = plsRun(PLS_HOC_MODEL('repeated'), PLS_W3_OPT)
    const ld = Object.fromEntries(
      r.outerLoadings.filter((q) => q.lv === 'G').map((q) => [q.indicator, q.loading]))
    const path = (a, b) => r.pathCoefficients.find((q) => q.from === a && q.to === b).coef
    const r2 = (lv) => r.structural.find((q) => q.lv === lv).r2
    return {
      loading_G_i1: ld.i1, loading_G_i2: ld.i2, loading_G_i3: ld.i3,
      loading_G_i4: ld.i4, loading_G_i5: ld.i5, loading_G_i6: ld.i6,
      path_G_F1: path('G', 'F1'), path_G_F2: path('G', 'F2'),
      path_G_C: path('G', 'C'), path_C_Y: path('C', 'Y'),
      r2_C: r2('C'), r2_Y: r2('Y'),
    }
  },
  pls_hoc_disjoint() {
    return plsHocTwoStageAdapter('disjoint')
  },
  pls_hoc_embedded() {
    return plsHocTwoStageAdapter('two-stage')
  },
}

/* ── PLS W3 共用模型與選項 ── */
const PLS_M4 = {
  schemaVersion: 1,
  latentVariables: [
    { name: 'F1', indicators: ['i1', 'i2', 'i3'] },
    { name: 'F2', indicators: ['i4', 'i5', 'i6'] },
    { name: 'C', indicators: ['cond1', 'cond2', 'cond3'] },
    { name: 'Y', indicators: ['y'] },
  ],
  paths: [
    { from: 'F1', to: 'F2' },
    { from: 'F1', to: 'C' },
    { from: 'F2', to: 'C' },
    { from: 'F2', to: 'Y' },
  ],
}
const PLS_W3_OPT = { tolerance: 1e-12, maxIterations: 2000 }

/* ── PLS W4 共用 ── */
function plsRun(model, opt) {
  const r = runPLS(main, model, opt)
  if (r.error) throw new Error(`runPLS failed: ${r.error} — ${r.message}`)
  return r
}

function plsModPIAdapter(method) {
  const model = {
    schemaVersion: 1,
    latentVariables: [
      { name: 'F1', indicators: ['i1', 'i2', 'i3'] },
      { name: 'C', indicators: ['cond1', 'cond2', 'cond3'] },
      { name: 'Y', indicators: ['y'] },
    ],
    interactions: [{ name: 'F1xC', factors: ['F1', 'C'], method }],
    paths: [{ from: 'F1', to: 'Y' }, { from: 'C', to: 'Y' }, { from: 'F1xC', to: 'Y' }],
  }
  const r = plsRun(model, PLS_W3_OPT)
  const path = (a) => r.pathCoefficients.find((q) => q.from === a && q.to === 'Y').coef
  return {
    path_F1_Y: path('F1'), path_C_Y: path('C'), path_int_Y: path('F1xC'),
    r2_Y: r.structural.find((q) => q.lv === 'Y').r2,
  }
}

function PLS_HOC_MODEL(method) {
  return {
    schemaVersion: 1,
    latentVariables: [
      { name: 'F1', indicators: ['i1', 'i2', 'i3'] },
      { name: 'F2', indicators: ['i4', 'i5', 'i6'] },
      { name: 'C', indicators: ['cond1', 'cond2', 'cond3'] },
      { name: 'Y', indicators: ['y'] },
    ],
    higherOrder: [{ name: 'G', components: ['F1', 'F2'], mode: 'reflective', method }],
    paths: [{ from: 'G', to: 'C' }, { from: 'C', to: 'Y' }],
  }
}

function plsHocTwoStageAdapter(method) {
  const r = plsRun(PLS_HOC_MODEL(method), PLS_W3_OPT)
  const ld = Object.fromEntries(
    r.outerLoadings.filter((q) => q.lv === 'G').map((q) => [q.indicator, q.loading]))
  const path = (a, b) => r.pathCoefficients.find((q) => q.from === a && q.to === b).coef
  const r2 = (lv) => r.structural.find((q) => q.lv === lv).r2
  return {
    loading_G_sF1: ld.F1_score, loading_G_sF2: ld.F2_score,
    path_G_C: path('G', 'C'), path_C_Y: path('C', 'Y'),
    r2_C: r2('C'), r2_Y: r2('Y'),
  }
}

function plsSchemeAdapter(scheme) {
  const r = runPLS(main, PLS_M4, { ...PLS_W3_OPT, scheme })
  if (r.error) throw new Error(`runPLS failed: ${r.error} — ${r.message}`)
  const ld = Object.fromEntries(r.outerLoadings.map((q) => [q.indicator, q.loading]))
  const path = (a, b) => r.pathCoefficients.find((q) => q.from === a && q.to === b).coef
  const r2 = (lv) => r.structural.find((q) => q.lv === lv).r2
  return {
    loading_i1: ld.i1, loading_i2: ld.i2, loading_i3: ld.i3,
    loading_i4: ld.i4, loading_i5: ld.i5, loading_i6: ld.i6,
    loading_cond1: ld.cond1, loading_cond2: ld.cond2, loading_cond3: ld.cond3,
    loading_y: ld.y,
    path_F1_F2: path('F1', 'F2'), path_F1_C: path('F1', 'C'),
    path_F2_C: path('F2', 'C'), path_F2_Y: path('F2', 'Y'),
    r2_F2: r2('F2'), r2_C: r2('C'), r2_Y: r2('Y'),
  }
}
