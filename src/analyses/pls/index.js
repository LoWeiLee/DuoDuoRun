/**
 * PLS-SEM — 模組入口
 *
 * 對外提供：{ Config, Result, Notes, Narrative }
 * 由 src/analyses/registry.js 統一註冊到 'pls-sem' id。
 */
import Config from './Config'
import Result from './Result'
import Notes from './Notes'
import Narrative from './Narrative'

export default { Config, Result, Notes, Narrative }
