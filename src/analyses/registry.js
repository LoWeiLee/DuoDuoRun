/**
 * Analysis registry — 將分析 id 映射到 { Config, Result, Notes, Narrative } 元件模組。
 *
 * 加入新分析的步驟：
 *   1. 建立 src/analyses/<id>/ 目錄與 Config/Result/Notes/Narrative.jsx
 *   2. 在 src/analyses/<id>/index.js export default { Config, Result, Notes, Narrative }
 *   3. 在這個檔案 import 並註冊
 *
 * MainContent 透過 getAnalysisModule(activeAnalysis) 找到對應模組後 render。
 */
import descriptive from './descriptive'
import normality from './normality'
import visualization from './visualization'
import ttest from './ttest'
import correlation from './correlation'
import simpleRegression from './simpleRegression'
import oneWayAnova from './oneWayAnova'
import twoWayAnova from './twoWayAnova'
import cronbachAlpha from './cronbachAlpha'
import multipleRegression from './multipleRegression'
import logisticRegression from './logisticRegression'
import chiSquare from './chiSquare'
import nonparametric from './nonparametric'
import efa from './efa'
import zProp from './zProp'
import fisherExact from './fisherExact'
import kappa from './kappa'
import hierarchicalRegression from './hierarchicalRegression'
import ancova from './ancova'
import icc from './icc'
import repeatedAnova from './repeatedAnova'
import mixedAnova from './mixedAnova'
import manova from './manova'
import lda from './lda'
import cluster from './cluster'
import cfa from './cfa'
import pls from './pls'
import nca from './nca'

const REGISTRY = {
  'desc-stats':         descriptive,
  'normality':          normality,
  'visualization':      visualization,
  't-test':             ttest,
  'correlation':        correlation,
  'simple-regression':  simpleRegression,
  'multiple-regression': multipleRegression,
  'logistic-regression': logisticRegression,
  'one-way-anova':      oneWayAnova,
  'two-way-anova':      twoWayAnova,
  'cronbach-alpha':     cronbachAlpha,
  'chi-square':         chiSquare,
  'nonparametric':      nonparametric,
  'efa':                efa,
  'z-prop':             zProp,
  'fisher-exact':       fisherExact,
  'kappa':              kappa,
  'hierarchical-regression': hierarchicalRegression,
  'ancova':             ancova,
  'icc':                icc,
  'repeated-anova':     repeatedAnova,
  'mixed-anova':        mixedAnova,
  'manova':             manova,
  'lda':                lda,
  'cluster':            cluster,
  'cfa':                cfa,
  'pls-sem':            pls,
  'nca':                nca,
}

export function getAnalysisModule(id) {
  return REGISTRY[id] || null
}

export function isAnalysisImplemented(id) {
  return id in REGISTRY
}
