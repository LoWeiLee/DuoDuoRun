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
}
