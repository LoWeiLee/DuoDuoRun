# 多多快跑 主工單 v2（2026-07-13 建立，2026-07-25 最後更新）

**讀者**：後續執行的 AI 與 Kevin。
**定位**：**單一主工單**。專案的所有待辦以本文件為準，其餘文件不放待辦。

---

## ★ 下一個 session 從這裡開始

**目前狀態一句話**：PLS 的**功能面已收尾**（P1 殘項全清、三項會動統計核心的都交付），
但**溯源面沒有全部結案**——82 組基準中 2 組 pending、4 組 verified 但帶明文保留，全在 PLS 側。
功能開發（階段 B）尚未動工。
最近一次本機全套驗收：**1,237 過、6 跳過、13 檔全綠**（2026-07-26，階段 A / A2 收尾後）。

**★ 現在的下一步：階段 A 的 A3**（Kevin 2026-07-25 裁決；2026-07-26 開工）。
**A1 與 A2 皆已全數交付（各 10 / 10，共 20 份方法文件）**，模板規格定案。
紅隊累計 **23 項（R2–R23）全部處置完畢**——A1 的 R2–R12、A2 的 R13–R23 皆已修或已記錄。
唯一未結案的是「bootstrap 的 $p$ 值口徑未對 seminr 核對」，卡本機 R。
基準組 82 → **83**。下一步接 **A3：PLS 進階分析（W5／W6）**（10 個方法群）。
不要跳過它直接做 Wave F1——階段 A 的目的正是先確認「已經做好的東西是否可信」，
再往上疊新功能。

---

## ★ 階段總覽（Kevin 2026-07-25 裁決）

| 階段 | 內容 | 詳細規格 | 狀態 |
|---|---|---|---|
| **A** | **方法文件與紅隊盤點**——為每個已上線的統計方法產出一份文件（說明／用途／公式／文獻／對照狀態），同時逐項紅隊檢核 | **§6** | **← 現在做這個** |
| B | 功能波 Wave F1–F8 | §3 | 未動工 |
| C | CB-SEM | §4 | 暫緩，啟動前提已滿足，待重新裁決 |
| D | COMING_SOON 側欄收斂 | §7 | 未動工（與 B 交錯進行） |
| — | P0 溯源尾巴（2 組 pending ＋ 3 項覆核） | §1、§2.3 | **卡文獻取得**，不占 session 排程 |
| — | 休眠與復工規格 | §8 | 環境重建已寫好；狀態快照待階段 A 收尾填 |

**階段 A 的定位（Kevin 原話）**：「這是一份盤點、一個負責任的檢查，也是一個我能確定
多多快跑背後到底是否可信的重要工作。」——所以它**不是補文件的雜務**，
產出文件只是副產品，真正的交付是**把散落在 provenance 欄位裡的保留系統性攤開檢查一遍**。

★ **時程與在場狀況（2026-07-25 確認，這決定了交接火力該對準哪裡）**：
- **階段 A：Kevin 全程參與**，與執行者一起做。所以 L3／L4 是**當場問**，不是累積等待。
- **階段 A 完成後專案休眠**，Kevin 的時間轉去寫 paper。
- **階段 B 最早 2026 年 9 月底才啟動**，接手者會是對本輪對話毫無記憶的 AI。

⇒ 真正的交接負擔**不在階段 A，在階段 A 之後**。休眠前的收尾規格見 **§8「休眠與復工」**，
該節必須在階段 A 收尾時填完才算階段 A 結案（已列入 §6.7 判準）。

★ PLS 側已無**功能**待辦。PLSpredict 重複的口徑已於 2026-07-25 核對定案
（結論：不跟隨 seminr，理由見 `validation-report-v1.md` 第六節）。

**開工前必讀**：本文件 §0（品質規範，最高位階）＋ `handoff-roadmap-v1.md` §2（架構不變量）
與 §3（沙盒作業手冊）。

**環境提醒（踩過的坑）**
- 沙盒是 **Linux**、Kevin 的機器是 **Windows**：新檔名不得與同目錄既有檔僅差大小寫
  （2026-07-25 因 `narrative.js` vs `Narrative.jsx` 實際炸過，詳見 validation-report）。
- 五個 `ui.*.test.jsx` 用 jsdom，**沙盒跑不動**，動到 `src/analyses/**` 或 `src/i18n/**`
  一定要請 Kevin 本機雙擊 `跑UI測試.bat` 補驗——上述 bug 就是這樣抓到的。
- `.bat` 被 `.gitignore` 擋（Kevin 2026-07-25 裁決維持），重新 clone 就會消失；
  叫 Kevin 雙擊前先確認檔案還在，不見就直接重建。
- 文件行尾**不一致**：`cb-sem-design-plan-v1.md` 是 LF，其餘 .md 是 CRLF。
  改檔前先驗，不要整檔轉換（會讓 diff 變成全檔改動）。

---

## 文件清單（2026-07-25 盤點）

| 檔案 | 定位 | 處置 |
|---|---|---|
| `roadmap-v2.md` | 單一主工單（本檔） | 保留 |
| `formula-provenance.md` | 溯源登記規範；`provenance.test.js` 的失敗訊息硬編此路徑 | 保留 |
| `validation-report-v1.md` | 活的驗證紀錄，本身即溯源證據 | 保留 |
| `pls-model-schema.md` | 模型 JSON 規格；`pls.js` 的執行期錯誤訊息會指向它 | 保留 |
| `handoff-roadmap-v1.md` | §2 架構不變量／§3 沙盒手冊仍有效；`provenance.json` 以其 §6.6–6.7 為 authority | 保留 |
| `w0-engine-spike-report.md` | `tests/pls.test.js` 的 bootstrap SE 容差帶以它為出處 | 保留 |
| `cb-sem-design-plan-v1.md` | CB-SEM 未來波次的設計稿（§4 暫緩中） | 保留 |
| `mockups/mockup-d-final-hybrid.html` | UI 設計權威，`CLAUDE.md` 與 5 個元件引用 | 保留 |
| `pls-sem-roadmap-v1.md` | W0–W6 波次史，全數交付；純歷史 | 保留（Kevin 2026-07-25 裁決保留開發史） |
| `tests/verify_plspredict_reps.R` | 本機 seminr 核對腳本；**口徑已於 2026-07-25 定案**（不跟隨 seminr） | 保留，供日後 seminr 修正 `reps` 後重驗 |
| `docs/methods/`（階段 A 產出） | 每個統計方法一份文件＋索引；對外公開，從 README 連結 | 階段 A 建立，見 §6 |

**2026-07-25 已刪除（Kevin 確認）**：`mockups/mockup-a-dark-tech.html`、
`mockups/mockup-b-light-saas.html`、`mockups/mockup-c-brand-warm.html`
（選案階段淘汰稿，repo 內零引用）、`code-review-2026-05-13.md`
（第四階段殘項經查核只剩 2 項，已搬入 §2.3）。

---

## 0. ★ 品質規範（2026-07-13 新增，最高位階，凌駕本文件所有排序）

**背景**：2026-07-13 的 R 抽驗（seminr / cSEM / R NCA）暴露一個結構性缺陷——
`reference.json` 有 29 組基準的「黃金標準」是 numpy 手算，**與 JS 實作出自同一個作者對論文的
同一次理解**。兩邊編碼同一個猜測，`compare.test.js` 只能抓到「兩邊抄不一致」，
抓不到「公式本身讀錯」。當天找到的四個 bug **全部落在手算基準**；對照第三方實作的
52 組，一個都沒出事。

**規範**（完整版見 `docs/formula-provenance.md`）：

新增任何統計方法，順序**不可顛倒**：

1. 先找**可執行的第三方實作**（沙盒 pip 裝得到，或 Kevin 本機 R 跑得動）
2. 找不到才回到**原始論文並記下方程式編號**
3. 兩者都做不到 → **不做這個方法**，或明確標為「無法驗證」並在 UI 警告
4. **然後**才寫 `generate_reference.py` 的基準與引擎實作
5. 同時在 `tests/fixtures/provenance.json` 登記溯源

**權威來源依方法族而異**——「查 SPSS/JASP」不是通則：

| 方法族 | 權威 |
|---|---|
| 基礎統計 | R／scipy／statsmodels；SPSS 與 JASP 有分歧時**兩邊都記** |
| PLS-SEM | SmartPLS 4 ＋ Hair／Henseler／Ringle／Sarstedt 原始論文；開源代理 **seminr**（Hair 團隊）、**cSEM**（Henseler 團隊） |
| CB-SEM | lavaan／Mplus |
| NCA | Dul 的 R `NCA` 套件 |
| EFA／CFA | factor_analyzer／semopy；R `psych`／`lavaan` 為第二道 |

**執行機制**：`tests/provenance.test.js` 硬擋。未登記的新方法 → 紅燈；
待審計數量增加 → 紅燈。`MAX_PENDING` 是**只能往下調的棘輪**（起始 15）。
規範靠自律，而 2026-07-13 已證明自律會失效。

---

## 1. P0：公式溯源審計（15 組，3 批）

**Kevin 已裁決：29 組全查、不分級。** 盤點後真正待審計 15 組
（10 組已由 2026-07-13 R 抽驗核對、4 組為純輸入型 fixture）。

正確性是地基。這一項排在所有新功能之前。

### Session Q1：批次 1（6 組）——【2026-07-13 執行，接近完成】

`pls_formative` ✅、`pls_q2` ✅、`pls_predict` Q²predict 定義 ✅、`pls_ipma` ✅、
`pls_itcriteria` ✅、`pls_gof` ✅、盤點覆核新收的 `lda_group3` ✅（2026-07-14，
MASS::lda 全項逐值含分類表）。**Session Q1 已結案。**

**原工單兩處誤判已修正**（詳見 formula-provenance §6）：
- seminr 沒有 `blindfold()`——blindfolding 在世第三方不存在（SmartPLS 4 已移除），
  `pls_q2` 走程序文獻路線結案；
- cSEM 有 `doIPMA`（原工單漏查），`pls_ipma` 以原始碼逐式＋數值複算結案。

**交付判準修正**：原「MAX_PENDING 降至 9」算術有誤——`pls_predict` 本就 verified，
批次 1 只銷 5 筆 pending；加上覆核的 lda_group3 進（+1）出（−1），
Q1 的正確落點是 **10**——已於 2026-07-14 達成。`npm test` 全綠 ✅。
下一步：Session Q2（批次 2 六組，回論文記方程式編號）。

### Session Q2：批次 2 —— 無主流實作，回到論文方程式編號（6 組）——【執行中】

`pls_cta` ✅、`pls_copula` ✅、`pls_fimix` ⬜、`pls_pos` ✅、`pls_cipma` ✅、`pls_bca_reference` ⬜

做法：逐組回到原始論文，**記下方程式編號**寫進 provenance 的 `authority`。
重點查核各自的已知風險點（見 `formula-provenance.md` §4 批次 2 表）。
無法用第三方驗證者，`verification` 必須寫明替代的交叉驗證方式
（如 FIMIX 的「模擬還原＋EM 單調性＋JS↔numpy 逐值」三重策略）。

**交付判準修正**：原「`MAX_PENDING` 降至 3」為算術誤植——批次 2 恰 6 組，10 − 6 = **4**；
批次 3 實為 4 組（`pls_pairwise_wpls`、`pls_quadratic`、`pls_mod_threeway`、`pls_hoc_embedded`）
→ 4 − 4 = 0，與 Q3 判準相容。

**進度（2026-07-25）：Q2 部分交付，未結案。** 4 組 verified，`MAX_PENDING` 10 → **6**。

剩 2 組**卡在文獻取得**（非技術問題，開放存取管道已窮盡，Kevin 的機構訂閱亦未涵蓋，
2026-07-25 確認取不到）：

| 組 | 缺的文獻 | 待核的風險點 | 現行替代驗證 |
|---|---|---|---|
| `pls_fimix` | Hahn, Johnson, Herrmann & Huber (2002), SBR 54(3), 243-269；Sarstedt, Becker, Ringle & Schwaiger (2011), SBR 63(1), 34-62 | 參數計數 N_k、EN 正規化分母、是否含截距 | 模擬還原＋EM 單調性＋JS↔numpy 逐值（三重，已通過） |
| `pls_bca_reference` | Efron & Tibshirani (1993)《An Introduction to the Bootstrap》§14.3（原始出處 Efron 1987, JASA 82(397)） | z₀ 的並列／端點夾擠、a 的 jackknife 估計式與分母指數 | 固定 draws＋jackknife 注入、JS↔numpy 六欄逐值（已通過） |

★ **這兩組的替代驗證都只鎖得住「JS 與 numpy 一致」，鎖不住「公式讀錯」**——正是 §0 規範
點名的結構缺陷。Q2 抓到的兩個 bug（見下）證明了這個區別是實質的，因此**不接受以替代驗證
充當結案**，維持 pending 直到取得原文。

**解除封鎖的可行路徑（依成本排序）**：
1. 館際互借／文獻傳遞（Kevin 的機構圖書館），三篇都適用，通常 1–3 個工作天
2. Efron & Tibshirani 該書為統計系標準教科書，實體館藏取得第 14 章即可
3. ~~`pls_bca_reference` 的非權威獨立抽驗~~ **已於 2026-07-25 完成**：改用
   `scipy.stats._resampling._bca_interval`（可注入既有 draws，比 `scipy.stats.bootstrap`
   更適合逐值比對），z₀／a／alpha 上下界四個量機器精度內全中（最大差 1.7e−18），
   並升為 `generate_reference.py` 的重生時 assert（容差 1e-12）。
   **如預期不能結案**（scipy 是同一族公式的另一次編碼，非權威），`MAX_PENDING` 維持 2；
   且並列（ties）慣例的差異未被此抽驗涵蓋（本批資料無並列），仍待原文核定
4. 寫信向作者索取（Ringle／Sarstedt 團隊對 PLS 社群索取一向回覆）

**Session Q2 剩餘工作**：上述 2 組銷帳後 `MAX_PENDING` 6 → **4**，Q2 才算結案。

★ **本輪的實質產出是兩處公式偏離的修正**（詳見 `validation-report-v1.md` Session Q2 節「一之二」）：

`pls_cta` 的 CI 臨界值誤用 Student t（原文 Eq. 2 為常態 z）；`pls_pos` 的目標函數誤用
ΣSSE（原文為 ΣR²，兩者不等價，改正後段別還原率 0.837 → 0.857）。
這證實了 §0 的判斷——手算基準的自我一致性檢查抓不到公式誤讀，只有回原文能抓到。

**Q2 順帶產生的兩筆待辦（不擋 Q2 結案，記入 §2 品質殘項）**：
- `pls_cta` 的**非冗餘 tetrad 選取集**代數在 Bollen & Ting (1993), Sociological Methodology 23
  （亦未取得）。本工具的構造已以 Jacobian 秩 assert 保證極大獨立、omnibus 判讀等價，
  但個別 tetrad 的 CI 會隨選取集而異——取得該文後應覆核。
- `pls_pos` 的完整演算法（目標函數是否另含加權、距離量測定義）在 Becker et al. (2013)
  線上補充 **Appendix B**（未取得）。本工具已明示為結構模型層簡化版。

### Session Q3：批次 3 —— 補登記與補驗（4 組）——【2026-07-25 全數交付】

`pls_pairwise_wpls` ✅、`pls_quadratic` ✅、`pls_mod_threeway` ✅、`pls_hoc_embedded` ✅

**原工單誤植兩處，已修**：(a) 標題寫「3 組」但實際列出 4 個方法（`pls_quadratic` 與
`pls_mod_threeway` 是兩組獨立 fixture，非一組）；(b) 交付判準「`MAX_PENDING` 降至 0」
建立在 Q2 已降到 4 的前提上，Q2 因文獻未取得只降到 6 → 本 session 的正確落點是 **2**。

| 組 | 路線 | 證據 |
|---|---|---|
| `pls_pairwise_wpls` | **沙盒第三方（最強）** | pairwise-complete 相關 vs `pandas.DataFrame.corr()`（預設即 pairwise）差 3.886e-16；加權相關 vs `statsmodels DescrStatsW` 差 4.441e-16、vs `numpy.cov(aweights, ddof=0)` 差 2.220e-16。**三道已升為重生時 assert**（容差 1e-12），不再是一次性抽驗。另註：相關為尺度不變量，ddof 取 0 或 1 得同一相關矩陣（實測 <1e-15），無慣例分歧風險 |
| `pls_hoc_embedded` | 權威文獻逐點＋第一階段有第三方錨 | Becker et al. (2023), IJCHM 35(1) accepted MS pp. 15-16（OA）逐點核對四項口徑全中；**引用補正**：方法源出 Ringle, Sarstedt & Straub (2012)，Sarstedt et al. (2019)／Becker et al. (2023) 為程序指引。第一階段即 `pls_hoc_repeated`，已有對 plspm 的重生時 assert <1e-6 |
| `pls_quadratic` | 官方文件逐點＋機制同源 | SmartPLS 4「Nonlinear Relationships」：二次效果「is like a self-moderation」、走 two-stage、第一階段取**主效果模型（不含二次項）**的 LV 分數、平方為第二階段指標——三項全中。**並在 `pls.js` 查核第一階段確實排除全部交互／二次項**（`estimateStage(curPaths)` 在 `intPaths` 併入前執行） |
| `pls_mod_threeway` | 權威文獻逐字＋機制同源 | Becker et al. (2023) guidance 表逐字：「As with two-way interactions, researchers should draw on the two-stage approach… The resulting product should not be standardized, and the researchers should estimate and interpret the unstandardized coefficient.」＋階層完整規格（3 主效果＋3 兩向＋1 三向，Aiken & West 1991） |

**誠實標註的殘餘限制**：`pls_quadratic`／`pls_mod_threeway`／`pls_hoc_embedded` 三組
**沒有專屬的第三方數值對照**（SmartPLS 4 授權過期、seminr 無 quadratic／三向／embedded 支援）。
它們的保證來自「權威文獻逐字或逐點 ＋ 機制與已對 seminr 的 `pls_mod_twostage`／`pls_hoc_disjoint`
同一條程式路徑 ＋ 規格完整性查核」三者疊加，已寫入各自的 provenance `verification`。

**Session Q3 交付判準（修正後）**：批次 3 四組全部 verified、`MAX_PENDING` 降至 **2**
（＝Q2 卡文獻的 `pls_fimix`、`pls_bca_reference`）。✅ 2026-07-25 達成。

### P0 現況（2026-07-25）

`MAX_PENDING` **15 → 2**。剩餘 2 組全部卡在文獻取得，無技術障礙——
取得 Hahn (2002)／Sarstedt et al. (2011)／Efron & Tibshirani (1993) §14.3 後即可降至 **0**，
P0 公式溯源審計全數結案。解除封鎖路徑見 §1 Session Q2 節。

---

## 2. P1：品質殘項打包

來自 `redteam-audit-workplan` 與 `handoff §6.8` 的殘項。**原估「1 session 低成本清帳」是誤判**——
清單有九類、其中數項會動到統計核心，實際需要 2–3 個 session。2026-07-25 已完成第一批。

### 2.1 已完成

- ✅ **MGA／PLSpredict／IPMA 的 APA Narrative 敘述句**（2026-07-25）。
  **實際缺口是 8 項不是 3 項**——原清單寫於 W5 時期，W6 新增的 CTA、Gaussian copula、
  FIMIX、PLS-POS、cIPMA 同樣沒有敘述句。本次一次補齊 8 項（中英各一份）。
  同時把句子組裝自 `Narrative.jsx` 抽成純函式模組 `src/analyses/pls/apaNarrative.js`
  （對齊架構不變量 1；並讓它能在 node 環境測試——jsdom 在沙盒跑不動）。
  新增 `tests/pls.narrative.test.js` 11 項行為測試。

### 2.2 已確認不需要做（工單過期，經 2026-07-25 查核）

- ~~既有 59 個 eslint 問題清理~~ → **已歸零**。`npx eslint src tests` 目前 0 problems。
- ~~`deploy.yml` 加 lint step~~ → **已存在**，2026-07-13 紅隊 R4 就補上了（連 `npm test` 一起）。
- ~~刪 `reference/statlite.jsx`~~ → **Kevin 2026-07-25 裁決保留，本條刪除**。
  理由：它不是可安全刪除的 dead code——`descriptive.js`、`pvalue.js`、`ttest.js`
  三個檔的檔頭都以它為溯源出處（「從 reference/statlite.jsx 抽出，已對標 SPSS」）；
  且 `eslint.config.js` 已用 `globalIgnores(['dist', 'reference'])` 排除它，
  原本「它讓 lint 破表」的刪除理由已不成立。在剛建立完溯源鏈的專案裡刪掉一份被引用的
  溯源出處，代價不對稱。

### 2.3 待辦（依成本與風險分層）

**不動統計核心（低風險）—— 2026-07-25 第二批全數交付 ✅**
（詳見 `validation-report-v1.md`「P1 品質殘項 第二批」）
- ✅ IPMA 量表理論界線的 UI 設定（`scaleMin`/`scaleMax`；未設定時逐值等同原行為）
- ✅ IPMA 塊內指標量尺不一時的 UI 警告（觀察全距比值 ≥ 3；門檻校準理由見程式碼註解）
- ✅ blindfolding Q² 的 UI legacy 註記
- ✅ W4 canvas 顯示層（交互項／HOC 節點、HOC↔成分與因子→交互項虛線、引擎自動補的
  主效果路徑、W4 模型改讀 `stage1` 取指標 loading）
- ✅ 示範資料集開啟 Q²／PLSpredict／IPMA＋cIPMA／CTA-PLS；順帶修掉示範模型缺 `mode`
  導致「載入示範即顯示設定已變更」的既有缺陷
- ✅ 刪 `src/App.css`（零 import 死碼）
- ✅ README 補里程碑段落；順帶更新過期的防線規模數字（74 → 81、743 → 1,155）
- ~~OG meta／PDF metadata／多 sheet 警告／i18n placeholder~~ 先前已完成

★ 本批的實質產出是**修正一處錯誤敘述**：原以為改用理論界線「只影響 performance」，
寫成測試斷言後當場紅燈——importance 也會變（兩種界線產生的合成分數不是同一條線性變換）。
三處說明已改，並留下斷言鎖住。

★ 遺留：W4 與 W5／W6 互斥（所有 W5／W6 方法都 `rejectW4`），單一 `ANALYSIS_DEMOS`
條目只能二選一。示範選了 W5／W6，W4 畫布改以 `ui.smoke` 內的合成 state 直接測
（3 條新測試，**沙盒未執行過**，需本機補驗）。

**會動統計核心（需 fixture 與重生）—— 2026-07-25 全數交付 ✅**
（詳見 `validation-report-v1.md`「PLS 收尾」節）
- ✅ **PLSpredict 多次重複**（UI 1／5／10，預設仍為 1）。溯源走「沙盒可驗的恆等式」而非新基準組
  （Kevin 裁決）：reps=1 逐值等同原行為、reps=R 的指標層逐值等於 R 次單跑的算術平均（實測差 0）。
  CVPAT 另立規則：先平均逐案損失再檢定一次，不平均 t 或 p。
  ✅ **彙總口徑已核對定案（2026-07-25）：不跟隨 seminr**。查到兩件事：
  (1) seminr 的 `reps` **實際不生效**——洗牌寫在重複迴圈外、迴圈內分摺是決定性的，
  本機實測 reps=1 與 reps=10 逐位元相同，與原始碼一致（兩條獨立證據）；
  (2) 它意圖採用的「先平均預測值再算指標」口徑有系統性樂觀偏誤，
  差額＝各次預測值之間的變異（集成效果，非樣本外表現）。
  本工具維持「平均各次指標」，依據寫入 JSDoc／UI 警告／provenance 三處。
- ✅ **MGA 的 PLSc 版**。盤點發現引擎層**本來就通**（consistent 隨 baseOpts 傳進 runPLS／
  bootstrapPLS／每一次 permutation），實際缺口是沒有測試鎖住、UI 沒揭露。已補 3 條測試
  （關鍵一條測 bootstrap SE 與 permutation 分布同樣改變，擋的是日後把 consistent 濾掉造成的
  「點估計校正、推論未校正」靜默混用）、結果加 `consistent` 標記與 rho_A 解讀警告。不新增基準組。
- ✅ **moderated mediation（條件間接效果）**。新基準組 `pls_modmed`，status = verified：
  第二階段兩條方程對 **statsmodels OLS** 逐值 assert（1e-10，重生時執行）＋第一階段沿用已對
  plspm assert 的 two-stage 路徑＋合成層代數斷言三層疊加。
  ⚠ **命名保留**：斜率 a3·b1 在文獻上稱 index of moderated mediation（Hayes 2015, MBR 50(1)），
  **原文未取得**，故以描述性名稱回報並在 UI／敘述句／provenance 三處標註，未實作該文的檢定程序。

**卡外部資源（全部是「取得文獻才能做」，不占 session 排程）**

這張表是 P0／P1 的**完整**未結案清單，與 §1 的 2 組 pending 合看即為全貌。
階段 A 的紅隊若又發現新的「查不到出處」項目，一律補進這張表。

| # | 項目 | 缺的文獻 | 現況與影響 |
|---|---|---|---|
| 1 | `pls_fimix` 溯源（**pending**） | Hahn et al. (2002) SBR 54(3), 243-269；Sarstedt et al. (2011) SBR 63(1), 34-62 | 待核參數計數 N_k、EN 正規化分母、是否含截距。現行替代驗證＝模擬還原＋EM 單調性＋JS↔numpy 逐值 |
| 2 | `pls_bca_reference` 溯源（**pending**） | Efron & Tibshirani (1993) §14.3；Efron (1987) JASA 82(397) | 待核 z₀ 的並列／端點夾擠慣例、a 的 jackknife 估計式。已對 scipy `_bca_interval` 逐值 assert（非權威，不能結案） |
| 3 | `pls_cta` 非冗餘 tetrad 選取集 | Bollen & Ting (1993) Sociological Methodology 23 | 現行構造已以 Jacobian 秩 assert 保證極大獨立、omnibus 判讀等價；僅**個別 tetrad 的 CI** 可能隨選取集而異 |
| 4 | `pls_pos` 完整演算法 | Becker et al. (2013) 線上補充 Appendix B | 待核目標函數是否另含加權、距離量測定義。本工具已明示為結構模型層簡化版 |
| 5 | `pls_modmed` 的術語標籤 | Hayes (2015) *Multivariate Behavioral Research* 50(1), 1-22 | 數值不受影響（合成層有代數斷言、迴歸層對 statsmodels assert）。待核的是「index of moderated mediation」這個**名稱**與其原始檢定程序；在此之前工具以描述性名稱回報並在 UI／敘述句／provenance 三處標註 |

~~`pls_bca_reference` 的 scipy 獨立抽驗~~ **已於 2026-07-25 完成並升為重生時 assert**
（四個量機器精度內全中，最大差 1.7e−18）。如預期不能結案，`MAX_PENDING` 維持 2。

**解除封鎖的可行路徑（依成本排序）**：館際互借／文獻傳遞（1–3 個工作天，五項都適用）→
Efron & Tibshirani 為統計系標準教科書，實體館藏取第 14 章即可 →
寫信向作者索取（Ringle／Sarstedt 團隊對 PLS 社群索取一向回覆）。

---

## 3. P2 起：待上線統計功能（20 項，波次化）

排序準則（權重由高至低）：台灣社科（公行／管理／教育）學位論文與 TSSCI 的**使用頻率** →
**受眾契合**（中文問卷型研究者，量表流程加權）→ **實作成本與複用** → **基準可得性**。

> **每一波都受 §0 的品質規範約束**：先查權威來源 → 再寫基準與實作 → 同步登記 provenance。
> 「基準」欄位若寫不出可執行的第三方實作，該項就必須回到論文方程式編號，否則不做。

### Wave F1：快贏包（低成本、高頻）
| 功能 | 權威來源 | tier |
|---|---|---|
| McDonald's ω（含 ω_h） | R `psych::omega`（Kevin 本機）／semopy | A 可達 |
| Friedman 檢定 | scipy `friedmanchisquare` | A |
| McNemar 檢定 | statsmodels `mcnemar` | A |
| 專案檔本地保存／載入 | 非統計功能（round-trip 測試） | — |

### Wave F2：效果量＋95% CI 全面補齊（APA 7 剛需，跨模組橫切）
權威：pingouin（`compute_effsize`／`compute_esci`）；**無 pingouin 對應者須回論文**。
工作量大但機械性高。

### Wave F3：資料前處理模組
反向計分、量表加總、變數計算、缺失策略明示、離群值檢查。
確定性轉換，基準為手算但**公式無爭議**（tier B 但可快速 verified）。

### Wave F4：迴歸式調節／中介（PROCESS 對標：Model 1、4、7、8、14）
權威：Hayes (2022) PROCESS 手冊的 Model 編號與方程式；**Kevin 本機 R `processR`／SPSS PROCESS 抽驗**。
bootstrap 間接效果、簡單斜率。複用 PLS 的 bootstrap Worker 協定。
★ 這一項的慣例分歧最多（中心化、CI 類型、簡單斜率的取值點），**必須先抽驗再實作**。

### Wave F5：統計檢定力與樣本數計算（G*Power 對標）
權威：statsmodels `stats.power`；**G*Power 為第二道**（Kevin 本機可裝）。

### Wave F6：docx 輸出第一版（APA 三線表）
先做迴歸／ANOVA／PLS 三類。格式對標 APA 7。

### Wave F7：GLM 家族打包
ordinal logit／multinomial logit／probit／Poisson／負二項。
權威：statsmodels（`OrderedModel`／`MNLogit`／`Probit`／`Poisson`／`NegativeBinomial`）——全部 tier A 可達。

### Wave F8：HLM（隨機截距／斜率、ICC、組平減）
權威：statsmodels `MixedLM`；**Kevin 本機 `lme4` 為第二道**（估計法 REML/ML 的分歧必查）。
高成本、獨立波。

### 需求觸發再排（不排時程）
meta-analysis、polynomial regression、ROC/AUC、CCA、IRT、ARIMA、Bayesian 三支、Cox。

**COMING_SOON 側欄**（34 項）：每波上線後同步從灰色轉正式入口，不留死入口。
長期不做的（Bayesian／ARIMA／Cox／IRT）建議加註「長期」標記，避免過度承諾。

---

## 4. CB-SEM（Kevin 裁決：暫緩）

`cb-sem-design-plan-v1.md` 保留不動。已定案的兩個決策點：

- **量尺設定**：固定首負荷，對齊 lavaan（cfa.js 不動）
- **啟動順序**：PLS 收尾完成後再啟動 —— **PLS W6 已於 2026-07-13 全數交付，此前提已滿足**

未決：CFA 模組去留（建議並列）、Wave C4 範圍（建議 spike 報告後再議）。

★ **CB-SEM 的 spike 也受 §0 規範約束**：lavaan 是權威，semopy 是沙盒代理，
gate 判準第 3 條「Kevin 本機 lavaan 抽驗」正是 tier A 的要求。

---

## 5. 執行紀律（沿用，不重述）

沙盒限制、fixture-first 紅綠流程、架構不變量七條、git 流程
→ `handoff-roadmap-v1.md` §2–§3。

**唯一新增的硬約束**：§0 的公式溯源規範與 `provenance.test.js` 棘輪。

---

## 6. 階段 A：方法文件與紅隊盤點【現在做這個】

**Kevin 三項裁決（2026-07-25）**：粒度＝**可報告的統計方法**（不是側欄模組）；
紅隊處置＝**分級**（偵錯當場修、改公式候裁決）；讀者＝**對外公開**，學生與審稿人都看得懂。

### 6.1 為什麼要做，以及它不是什麼

**不是**「補說明文件」的雜務。真正的交付是：把目前散落在 `provenance.json` 三個欄位
（`authority`／`note`／`verification`）裡的保留，**系統性攤開檢查一遍**，
並產出使用者與審稿人看得到的憑據。

現況的數字（2026-07-25 實測）說明了為什麼值得做：

| | 數量 | 意義 |
|---|---|---|
| tier A | 48 組 | 基準值直接來自可執行的第三方（scipy／statsmodels／pingouin／sklearn／factor_analyzer／semopy／plspm）。風險低 |
| tier B | **30 組** | **沒有直接的第三方數值來源**，靠「權威文獻逐點 ＋ 機制同源 ＋ 代數斷言」撐住。**26 組在 PLS**。紅隊的主戰場 |
| tier I | 4 組 | 純輸入型 fixture（注入的 permutation／bootstrap 索引），exempt |
| pending | 2 組 | 卡文獻，見 §2.3 表 |
| verified 但帶明文保留 | 4 組 | `pls_cta`／`pls_hoc_embedded`／`pls_pos`／`pls_modmed` |

★ **排序原則：tier B 先做、tier A 後做。** 理由與 §0 同源——tier A 的數字有第三方擋著，
tier B 只有「作者對文獻的理解」擋著，而 2026-07-13 與 Session Q2 各抓到一批 bug，
**全部落在沒有第三方對照的那一側**。

### 6.2 產出規格

**位置**：`docs/methods/<method-id>.md`，一個方法一份；`docs/methods/README.md` 為索引
（同時是「28 個側欄模組 → 方法」的對照表）。完成後從專案 README 連結。

**`<method-id>` 命名**：小寫、連字號、與 `reference.json` 的鍵名對得起來
（例：`pls-ipma.md` 對 `pls_ipma`；`mann-whitney.md` 對 `mann_whitney`＋`_small`＋`_ties` 三組）。

**固定模板（八節，不可增刪節次，沒有內容的節寫「不適用」並說明為什麼）**：

```markdown
# <方法中文名>（English name）

## 1. 這個方法在回答什麼問題
一段白話。不預設讀者懂這個方法。

## 2. 什麼時候該用、什麼時候不該用
含「常見誤用」。這一節是寫給學生看的。

## 3. 公式與定義
符號表 → 公式 → 逐項說明。
★ 有慣例分歧的地方**必須列出本工具採哪一個、為什麼**（例：Levene 的 center、
  Mann-Whitney 的 U 慣例、CFA 的 χ² 分母、IPMA 的重標定界線）。

## 4. 假設前提與本工具的檢核方式
每個前提對應到 assumptionChecker 的哪一項；違反時工具怎麼警告。

## 5. 參考文獻
分兩欄：**方法出處**（誰提出的）與**程序指引**（怎麼做、怎麼判讀）。
★ 未取得原文者一律標【原文未取得】，不以記憶充當引用。

## 6. 對照與驗證狀態
- 基準組：`reference.json` 的哪幾組（列鍵名）
- tier / status：引 `provenance.json`
- 對照過的第三方：scipy／statsmodels／pingouin／sklearn／factor_analyzer／semopy／
  plspm／R（Kevin 本機）／SmartPLS——**沒對照過就寫沒有**
- 已知與 SPSS／JASP／SmartPLS／R 的慣例差異及其影響
- ★ **尚未驗證的部分**（誠實列出，這一節不准留白）

## 7. 報表欄位對照
UI 上每一個數字 → 對應第 3 節的哪一條公式。防止出現「沒人說得清這欄是什麼」的欄位。

## 8. 紅隊檢核紀錄
日期、執行者、查了哪幾項（對 6.3 的清單逐條）、結論、開出的待辦編號。
```

### 6.3 紅隊檢查表（每份文件都要逐條跑，結果寫進第 8 節）

1. **公式 vs 程式碼**：文件寫的公式與 `src/lib/stats/*.js` 的實作逐項對得起來？（記檔名與行號區間）
2. **authority 是否真的支持該公式**：provenance 的 authority 欄若寫了論文與方程式編號，
   該編號是否真的對應這條公式？有沒有「以記憶充當引用」？
3. **文獻真實性**：每一筆引用是否真實存在、卷期頁碼可查？未取得原文者是否已標註？
4. **報表可追溯**：UI 呈現的每個數字都能追到公式嗎？有沒有孤兒欄位？
5. **假設前提**：檢核項與方法相符嗎？違反時的警告文字誠實嗎（會不會過度嚇人或過度輕描淡寫）？
6. **慣例分歧**：與 SPSS／JASP／R／SmartPLS 的已知差異都寫出來了嗎？
7. **邊界條件**：n 小、零變異、完全共線、缺失值、並列（ties）、單指標構念——
   程式碼有處理嗎？測試有覆蓋嗎？沒有的話開待辦。
8. **APA 敘述句**：有沒有過度宣稱？前提與限制有沒有進句子？

### 6.4 紅隊處置分級（Kevin 裁決：分級處理）

| 級 | 範圍 | 處置 |
|---|---|---|
| **L1** 文件層 | 錯字、引用格式、註解與程式碼不符 | **當場修**，不必問 |
| **L2** 呈現層 | UI 文字誤導、缺慣例說明、警告不夠明確、敘述句過度宣稱 | **當場修**，交付時列出改了什麼 |
| **L3** 數值層 | 公式口徑、預設值改變、需要重生 fixture | **當場問 Kevin**（他全程參與階段 A）。裁決後才動手——因為會動 fixture 與既有數字 |
| **L4** 真 bug | 數字算錯 | **立刻停止該批**，回報並優先修；比照 Session Q2 的 `pls_cta`／`pls_pos` 處理 |

L3／L4 一律同步記入本節 6.6 的「紅隊待辦」表（含 Kevin 的裁決），不要只寫在 validation-report 裡。
★ **不要累積 L3 等最後一次問**：A1–A3 的 PLS 內容彼此引用，A2 若帶著未定的假設往前走，
到 A3 才發現口徑要改，前面兩批的文件就得重寫。當場定案，成本最低。

### 6.5 批次表（＝進度追蹤，做完打勾）

一批約一個 session。**tier B 優先**，故 PLS 排在前面。

**A1 — PLS 測量與估計核心（tier B 密集）** ✅ **完成（10 / 10，2026-07-26）**
`pls-basic`、`pls-formative`、`pls-plsc`、`pls-reliability-validity`、`pls-fit`、`pls-gof`、
`pls-bootstrap`、`pls-bca`、`pls-q2`、`pls-pairwise-wpls`——十份文件與索引見 `docs/methods/`。
專案 README 已開「方法可靠度文件」一節連進去（§6.7 判準 3 達成）。
★ **本批抓到一個 L4 真 bug**（R6：PLSc × pairwise／WPLS 走錯相關矩陣，rho_A 低估 0.09–0.15、
路徑高估約 18%），已修並新增基準組 `pls_plsc_pw` ＋ 結構性 assert。基準組 82 → **83**。
★ 模板已定案：照 `pls-basic.md` 的規格展開。每份文件都做了「依文件第 3 節的文字規格獨立重寫」
（10 組全部通過，最大差 7.2e−8 至逐位元相同）——這是唯一能證明「文件寫的公式就是產生基準值的公式」的做法。
`pls_basic`（三種 scheme）、`pls_formative`、`pls_plsc`、信效度（α／rho_A／CR／AVE／
Fornell-Larcker／HTMT）、`pls_fit`＋`pls_gof`、bootstrap（percentile／`pls_bca_reference`）、
`pls_q2`、`pls_pairwise_wpls`

**A2 — PLS 調節／高階／中介（tier B 密集）** ✅ **完成（10 / 10，2026-07-26）**
`pls-mediation`、`pls-moderation-twostage`、`pls-moderation-product-indicator`、
`pls-moderation-orthogonal`、`pls-quadratic`、`pls-moderation-threeway`、
`pls-hoc-repeated`、`pls-hoc-disjoint`、`pls-hoc-embedded`、`pls-moderated-mediation`。
十組獨立重寫全數通過（最大差 4.4e−16）。紅隊開出 11 項，8 項已修／已記錄、3 項待裁決。
★ 本批最重要的一項是 **R13：A1 自己引入的假陽性**（交互構念的乘積指標被誤判為「反向題未反向計分」）——
說明「加警告」也需要跨情境驗證，不能只在原始情境測過就算數。

**A3 — PLS 進階分析（W5／W6，tier B 密集）** 🔄 **已開工（0 / 10 交付，3 組已完成獨立重寫驗證）**
★ **A3 的規模明顯大於前兩批**：基準欄位數 A1 約 120、A2 約 80，**A3 超過 350**
（`pls_fimix` 71 欄、`pls_cta` 50 欄、`pls_predict` 49 欄、`pls_pos` 39 欄、`pls_copula` 30 欄），
且含 EM 迭代（FIMIX）、爬山法（POS）、k-fold 交叉驗證（PLSpredict）、bootstrap tetrad（CTA）
等需要完整重寫演算法的項目。建議**單獨一個 session 執行**，不與其他工作混排。

2026-07-26 已完成的獨立重寫驗證（可直接沿用，不需重跑）：

| 組 | 欄位 | 最大絕對差 |
|---|---|---|
| `pls_mga_formulas` | 11 | 2.78e−17 |
| `pls_mga_perm` | 3（含 40 組 permDiffs 逐值） | 3.33e−16 |
| `pls_itcriteria` | 12 | **0.0** |

待驗證：`pls_micom`、`pls_predict`、`pls_ipma`、`pls_cipma`、`pls_cta`、`pls_copula`、
`pls_fimix`、`pls_pos`（後四組需重寫 bootstrap tetrad／copula 迴圈／EM／爬山法）。

★ **`pls_fimix` 維持 pending**：Kevin 2026-07-26 再次確認 Hahn et al. (2002) 與 
Sarstedt et al. (2011) 仍取不到，A3 的文件將據實標註「取得管道已窮盡」，不以替代驗證充當結案。
`pls_mga_formulas`＋`pls_mga_perm`、`pls_micom`、`pls_predict`（含多次重複）、
`pls_itcriteria`、`pls_ipma`、`pls_cipma`、`pls_cta`、`pls_copula`、`pls_fimix`、`pls_pos`

**A4 — 其餘 tier B ＋ 慣例分歧多者** ⬜
`nca_ce_fdh`、`nca_cr_fdh`、`nca_bottleneck`、`lda_group3`、CFA（`cfa_2factor`／
`cfa_2factor_loadings`／`cfa_noncentral_chi2`／`cfa_rmsea_ci`，χ² 慣例與 RMSEA CI 是重點）、
EFA（`efa_pca_none`／`efa_pca_varimax`／`efa_pca_varimax_k3`）

**A5 — 推論統計與無母數（tier A）** ⬜
三種 t 檢定、`anova_oneway`＋`tukey_hsd`、`twoway_anova_type3`、`ancova`、`repeated_anova`、
`mixed_anova`、`chisquare_2x2`、`fisher_exact`、`zprop_one`＋`zprop_two`、
Mann-Whitney（三組）、`wilcoxon_signed_rank`、`kruskal_wallis`（含 Dunn）

**A6 — 敘述／相關／迴歸／量表／多變量（tier A）** ⬜
`descriptive_y`、`shapiro_wilk`、`ks_lilliefors`、Levene（兩慣例）、資料視覺化、
`pearson_x1_x2`、`spearman_x1_x2`、`regression_simple`／`_multiple`／`_hierarchical`、
`logistic_regression`、Cronbach's α（兩組）、`icc`、`cohen_kappa`、`manova`、
集群（`cluster_kmeans_k3`／`cluster_ward_k3`）

> 合計約 60 份文件。批次內順序不拘；**跨批不要跳著做**，
> 因為 A1–A3 的 PLS 內容彼此引用（例如 A2 的 two-stage 會引 A1 的估計核心）。

### 6.6 紅隊待辦（L3／L4，執行中累積；空表示目前沒有）

| # | 批次 | 方法 | 級別 | 問題 | 處置 | Kevin 裁決 |
|---|---|---|---|---|---|---|
| R2 | A1 | `pls_basic`／`pls_plsc` | L1＋L3 | rho_A 的引用出處誤植為《Psychometrika》80(2) 式 12（5 處）。查核：Dijkstra & Henseler (2015) 只有 CSDA 81, 10-23 與 MISQ 39(2), 297-316 兩篇，無 Psychometrika 該篇；seminr 自家文件引 MISQ 39(2)。式號無法核實（原文未取得） | 改為 MISQ 39(2), 297-316、刪除式號並標「待原文核定」；`reference.json` 的 `pls_plsc` source 字串經完整重生更新 | ✅ 核定並已執行（2026-07-26）。重生後 diff 僅該一行，82 組數值與 `datasets.json` 逐位元相同 |
| R3 | A1 | `pls_basic`（HTMT） | L3 | 兩個區塊的區塊內平均相關**都為負**時，分母的幾何平均為實數 → HTMT 輸出一個「< .85 通過」的數值。沙盒實測（每構念一題未反向計分）：HTMT = 0.083 綠燈、三個 loading 全綠、零警告 | monoMean ≤ 0 時回傳 `null`（與其他不合格配對一致）＋引擎層警告 | ✅ 核定並已執行。`pls.js:956–958` 守衛、新增 4 條行為測試；既有 fixture 無此情境，數值零變動 |
| R4 | A1 | `pls_basic`（負荷量） | L2 | 區塊內正負混雜的負荷量不觸發任何警告（`loadingStatus` 取絕對值）。符號不確定性是**整個構念**翻轉，區塊內混雜是資料錯誤，不是符號不確定性 | 引擎層加警告，指名構念與「反向題未事先反向計分」 | ✅ 核定並已執行。`pls.js:1792–1808` |
| R5 | A1 | `pls_basic`（APA 敘述句） | L2 | 敘述句未載明 α 為**標準化 α**（相關矩陣版），讀者拿 SPSS 報表（原始分數 α）對照會對不上 | 中英敘述句各補一處 | ✅ 核定並已執行。`zh-TW.js:3301`、`en.js:3243`。★ 動到 `src/i18n/**` → 需 Kevin 本機補跑 jsdom |
| **R6** | A1 | `pls_plsc` | **L4** | ★ **真 bug**：`plscAdjust` 從欄位重算區塊相關矩陣，pairwise／WPLS 下欄位是補值（NaN→0）或未加權的 → rho_A、c²、一致 loadings、反衰減後構念相關全錯。實測 rho_A 低估 0.09–0.15（**跨過 .70 判準**）、path 0.4252 誤為 0.5026（高估 18%）。可達性：兩者皆 UI 選項、無守衛、無警告 | 改走 `spec.corrMatrix`；新增基準組 `pls_plsc_pw` ＋ 重生時**結構性 assert**（PLSc 的 S 必等於迭代所用的 R）＋ 5 條行為測試 | ✅ 核定並已執行（2026-07-26）。完整資料逐位元不變（`pls_plsc` 零回歸） |
| R7 | A1 | `pls_formative` | L2 | Mode B 區塊奇異時錯誤訊息（`estimation-failed`）方向正確但**未指名構念與指標** | Kevin 裁決採「在 `estimateStage` 做前置檢查」：進迭代前逐區塊驗反矩陣，失敗回專屬錯誤碼 `formative-block-singular` 並指名構念與全部指標；**不動 `estimateCoreFromCorr` 的回傳契約** | ✅ 核定並已執行（2026-07-26）。`pls.js:1451–1467`，＋2 條行為測試 |
| R8 | A1 | `pls_fit` | L1 | SRMR 的分母慣例（$p(p+1)/2$ vs $p(p-1)/2$）與 NFI 的虛無模型定義**從未書面化**。實算：改分母後飽和 SRMR 0.0976 → 0.1079，**跨過 .10 紅燈** | 寫入 `pls-fit.md` §3.4 與第 6 節（含「反推而非原文核定」的誠實標註） | ✅ 已補（L1 當場修） |
| R9 | A1 | `pls_gof` | L1 | communality 的兩種平均方式在「反映型區塊等寬」時同值，M4 恰好等寬 → **此慣例未被基準覆蓋** | 書面記錄；不為一個不建議使用的指標新增 fixture | ✅ 已記錄 |
| R10 | A1 | `pls-bootstrap` | L2 | ★ **原判讀有誤**：實查 UI 後發現 `nValid / nRequested` 早已顯示在路徑表設定行與統計卡。真正缺的是**比例偏高時沒有警示**，也沒說明 $df=B'-1$ 隨之改變 | 剔除比例 > 5% 時顯示警告（含剔除數／百分比／有效重抽數／df／可能成因）；數量的常態顯示維持原樣 | ✅ 核定並已執行。`Result.jsx` 的 `bootstrapHighSkip`，i18n 中英各一 |
| R11 | A1 | `pls_pairwise_wpls` | L1 | `pw_minPairs`／`pw_minEig` 兩欄在 adapters 直接從 fixture 讀回 → `compare.test.js` 比的是「fixture vs fixture」，59 欄實際只有 57 欄被覆蓋 | 書面記錄；真正覆蓋需引擎回傳診斷欄位（功能變更，不屬階段 A） | ✅ 已記錄 |
| R12 | A1 | `pls_pairwise_wpls` | L2 | APA 敘述句未揭露**缺失值處理方式**與**是否使用抽樣權重**。pairwise 下 N 是未剔除的列數，讀者會以為沒有缺失值 | `intro`／`introNoBoot` 加 `{data}`／`{weighted}` 兩個插槽，四種情境（完整／casewise 有剔除／pairwise／WPLS）中英各一；WPLS 片語含「推論仍以未加權重抽建立」。引擎 `meta` 新增 `weighted` 欄位 | ✅ 核定並已執行。`apaNarrative.js`＋`pls.js:1888`，＋6 條敘述句測試 |
| — | A1 | `pls-bootstrap` | — | bootstrap 的 $p$ 值口徑（$t$ 分布、$df=B'-1$）**未對 seminr／SmartPLS 核對** | 需本機 R 抽驗 | ⬜ **卡本機資源**，併入 §2.3 清單 |
| **R13** | A2 | `pls_mod_pi`／`pls_mod_ortho` | **L2** | ★ **A1 自己引入的假陽性**：A1 的 R4 警告在交互構念上誤報。乘積指標的 loading 正負混雜是正常性質（實測 9 個 loading 中有一個 −0.047），卻每次都跳「常見原因為反向題未事先反向計分」 | `reportFromStage` 的資料品質警訊迴圈排除交互構念（`ctx.interactionLVs`） | ✅ 已修（L2 當場修）＋3 條測試，含「一般構念的未反向計分仍須被抓到」 |
| R14 | A2 | `pls_mod_pi` | L2 | 交互構念進信效度表並亮紅燈（實測 AVE = 0.286、rho_A = 0.419），但乘積指標的收斂效度門檻本來就不適用 | 信效度表對交互構念單列、照列數字但不判紅綠、不計入列首燈號，名稱後標「（交互構念）」 | ✅ 核定並已執行（2026-07-26） |
| R15 | A2 | `pls_hoc_repeated`／`pls_gof` | L3 | repeated HOC 下 model fit 因矩陣奇異不計算（有警告），**但 GoF 照算**，且 communality 把重複掛載的指標算兩次（實測 **0.472 vs 同資料非 HOC 的 0.258**） | `fit === null` 時 GoF 一併回 `null` | ✅ 核定並已執行＋2 條測試 |
| R16 | A2 | `pls_mediation` | L2 | VAF 會跑出 $[0,1]$（實測直接與間接反號時 **−222%**）；無 direct path 時恆為 100%（模型設定的套套邏輯） | 兩種情形下 VAF 欄顯示「—」＋滑鼠提示說明原因；引擎回傳值不變 | ✅ 核定並已執行＋1 條測試 |
| R17 | A2 | 三種調節法 | L1 | 同資料同規格下交互係數為 **+0.147／−0.195／+0.335**，**連正負號都不同**（量尺可換算，符號不同是方法差異） | 書面記錄；提醒「方法選擇應在看結果之前由理論決定」屬教學文字，併入未來 Notes 修訂 | ✅ 已記錄 |
| R18 | A2 | `pls_quadratic` | L1 | 二次項的正負 ≠ 曲線走向（實測 $b_q=+0.051$ 但三個水準斜率為 −0.226／−0.123／−0.021，全段皆負） | 寫入 §2 常見誤用；工具本來就同時回報條件斜率，資訊是齊的 | ✅ 已記錄 |
| R20 | A2 | `pls_hoc_disjoint` | L1 | HOC→HOC 的路徑改寫（笛卡兒積展開）分支**未被基準覆蓋**（基準模型只有一個 HOC） | 書面記錄；HOC 功能擴充時應優先補該情境的基準 | ✅ 已記錄 |
| R23 | A2 | `pls_modmed` | L1 | 同一個交互項產生兩筆條件間接效果（X↔W 對稱），數值正確但可能造成困惑 | 書面記錄；要區分理論上的自變數需使用者宣告，屬功能擴充 | ✅ 已記錄 |
| **R19** | A2 | `pls_mod_threeway` | L2 | **三向交互的階層完整性不檢核**。只宣告三向項而不宣告 3 個兩向項時照跑照出數字，而該係數**無法解釋**（吸收了本該由兩向項承擔的變異），報表完全看不出來 | `buildPlan` 檢查相異因子數 ≥ 3 的交互項，逐一比對其全部二元子集；缺少時**指名缺了哪幾個**並警告，不擋 | ✅ 核定並已執行（2026-07-26）。`pls.js:1373–1396`＋3 條測試（含「二次效果不得誤觸發」） |
| **R21** | A2 | `pls_hoc_embedded` | L2 | embedded 法在模型語法中的值是 `'two-stage'`；寫 `'embedded'` 會被擋，訊息雖列出三個合法值但**沒說明「你要的 embedded 就是 two-stage」** | 驗證器接受 `'embedded'` 並正規化為 `'two-stage'`，錯誤訊息一併列出別名 | ✅ 核定並已執行。`pls.js:311–316`＋2 條測試（兩種寫法逐值等價） |
| **R22** | A2 | `pls_modmed` | L2 | 不符範圍限制（非兩步鏈／非 two-stage 交互／調節變數在鏈上）時 `moderatedMediation` **靜默為 null**，UI 無表也無訊息，使用者以為功能不支援 | 依情形分兩種訊息：沒有可用交互項時**指名實際估計法**；有可用交互項時列出三個可能原因 | ✅ 核定並已執行。`pls.js:2281–2300`＋2 條測試 |

### 6.7 完成判準（全部達成才算階段 A 結案）

1. 每個方法都有 `docs/methods/<id>.md`，八節齊全，第 6 節「尚未驗證的部分」不留白
2. `docs/methods/README.md` 索引完成，且涵蓋 28 個側欄模組 → 方法的對照
3. 專案 README 有連結進去
4. 6.6 的 L3／L4 待辦**全部有 Kevin 裁決或已修**
5. ★ **新增一支防漂移測試**（比照 `provenance.test.js` 的硬擋精神）：
   檢查 `reference.json` 的每一組基準都被至少一份 `docs/methods/*.md` 的第 6 節引用；
   缺的就紅燈。這樣日後新增方法忘記寫文件會被擋下來，而不是靠自律。
   建議檔名 `tests/docs.coverage.test.js`
6. 全套測試綠燈（沙盒 8 檔 ＋ Kevin 本機 jsdom 5 檔）
7. ★ **§8「休眠與復工」填完**——專案接著要休眠到 9 月底，這一條沒做完等於沒交接

### 6.8 給執行者的提醒

- ★ **凡涉及「使用者實際會看到什麼」的檢查項（錯誤訊息、警告文字、燈號），一律必須實跑，
  不接受讀碼推論。** A1 的 R7 就是讀碼推出「錯誤訊息歸因錯誤」，實測後證明推論本身是錯的
  （實際訊息正確，只是沒指名構念）。成本很低，一段 node 腳本即可。
- ★ **行號重驗要用「內容錨定法」，不要用「分段位移法」。** A2 踩過的坑：位移規則會讓
  **範圍引用的起點被單一引用的規則二次替換**（`1930–1951` 先產生，接著 `1930→1939` 又改掉起點）。
  正確做法是對每處引用印出當前檔案的實際內容與文件語境，逐條比對後用佔位符一次性替換。
- ★ **每批交付前必須跑一次行號重驗，且要放在所有程式碼修改之後。** A1 十份文件共 238 處
  `pls.js` 行號引用；修完該批的 L3／L4 後 `pls.js` 增加 16 行，當場失效 94 處。
  做法：對每處引用取出當前檔案的實際內容，比對是否仍指向預期片段，不符者用錨定字串重新定位。
- ★ **「獨立重寫」的措辭要精確**：執行者在寫第 3 節時已讀過程式碼，所以**不是盲重寫**。
  準確說法是「依文件第 3 節的文字規格重寫，過程中不回頭參照程式碼」——驗的是**文件的文字
  是否構成充分且正確的規格**。它抓文件↔實作的漂移，抓不到「對原文的理解本身有誤」。
- ★ **注意「組合未被基準覆蓋」這一類死角。** A1 的 L4（R6）不是公式讀錯，而是
  「PLSc × pairwise／WPLS」這個組合沒有任何基準組。`provenance.test.js` 的棘輪只管
  「每個方法有沒有登記」，管不到「方法之間的組合有沒有被驗證」。寫第 6 節時要主動問：
  **這個方法會和哪些選項併用？那些組合有基準嗎？**
- **不要邊寫文件邊重構程式碼**。紅隊發現的 L3 要停下來等裁決，這是 6.4 的規定，
  不是保守——動 fixture 會讓「文件說的」與「測試鎖的」在同一個 session 內互相追著跑。
- **第 6 節「尚未驗證的部分」是這批文件的靈魂**。如果每份都寫「已完整驗證」，
  這批文件就沒有價值——現況明明有 30 組 tier B。誠實標註才是 Kevin 要的東西。
- **Kevin 全程在場**：L3／L4 當場問，問完就定案往下走。這比累積清單快，也避免後批返工。
- **每批交付時同步更新 6.5 的勾選與 6.6 的待辦表**——休眠兩個月後，這兩張表就是唯一的進度真相。

---

## 7. 階段 D：COMING_SOON 側欄收斂

`src/config/analyses.js` 的 `COMING_SOON`（34 項）目前是純訊號，沒有入口。兩件事要做：

1. **每波上線後同步轉正式入口**，不留死入口。這一項與階段 B 交錯進行：
   Wave F1 上線 → 把 ω／Friedman／McNemar 從灰色移進正式群組；依此類推。
2. **長期不做的加註「長期」標記**（Bayesian 三支／ARIMA／Cox／IRT），避免過度承諾。
   使用者看到「即將開放」會有時間預期，看到「長期規劃」不會。

判準：階段 B 每一波交付時，同步檢查 `COMING_SOON` 有沒有該移除的項目；
`analyses.js` 與 §3 波次表不得脫節。

---

## 8. 休眠與復工（階段 A 收尾時必須填完）

**適用時機**：階段 A 完成後專案休眠，Kevin 轉去寫 paper，**階段 B 最早 2026 年 9 月底啟動**。
接手者將是對本輪對話毫無記憶的 AI。本節是它的冷啟動入口。

### 8.1 復工第一件事（照順序做，不要跳）

1. 讀本檔 §0（品質規範，最高位階）→ §8.2（環境重建）→ §8.4（休眠當下的狀態快照）
2. 讀 `docs/methods/README.md`——階段 A 產出的方法索引，**這是理解這個專案在做什麼最快的入口**，
   比讀程式碼快得多
3. 讀 `handoff-roadmap-v1.md` §2（架構不變量七條）與 §3（沙盒作業手冊）
4. 請 Kevin 在 GitHub Desktop 對 DuoDuoRun 按 Fetch／Pull，再開始動檔
5. 跑一次基準線驗收（見 §8.3），確認休眠期間沒有東西壞掉，再開始新工作

### 8.2 環境重建（沙盒每次都是乾淨的，這些會消失）

**Python 套件**——`tests/generate_reference.py` 要完整執行需要六個套件，沙盒預設只有 numpy／pandas：

```
pip install scipy statsmodels scikit-learn pingouin factor_analyzer semopy plspm --break-system-packages
```

裝完 `python3 tests/generate_reference.py` 可完整重生，且輸出逐位元可重現
（2026-07-25 實測；重生會同時覆寫 `reference.json` 與 `datasets.json`，
**跑之前先備份再 diff**，確認只有預期中的差異）。

**`.bat` 檔會不見**——`.gitignore` 擋 `*.bat`（Kevin 2026-07-25 裁決維持），重新 clone 後
`跑UI測試.bat`、`只跑UI煙霧測試.bat`、`安裝相依套件.bat`、`跑seminr核對.bat` 全都不存在。
叫 Kevin 雙擊前**先確認檔案還在**，不見就直接重建（內容很短，重建比找回快）。

**R 只在 Kevin 本機**——沙盒沒有 R，也拿不到 root（apt 需要 dpkg lock、sudo 被
no-new-privileges 擋）。凡是需要 seminr／cSEM／lavaan／psych／processR 的溯源，
只能產出 R 腳本請 Kevin 本機跑。既有範例：`tests/verify_plspredict_reps.R`
（自我診斷式寫法，值得照抄——沙盒無法測 R，腳本一失敗就中止會變成一輪一輪猜參數）。
Kevin 本機的 R 不在 PATH 上，`.bat` 要自己去登錄檔與常見安裝路徑找 `Rscript.exe`。
另外他的系統 library 不可寫，R 腳本必須先建 `R_LIBS_USER` 個人套件庫。

**jsdom 測試沙盒跑不動**——五個 `ui.*.test.jsx` 在沙盒會掛住到 timeout。
動到 `src/analyses/**`、`src/i18n/**` 或任何元件，一定要請 Kevin 本機補驗。
這不是形式：2026-07-25 的 `narrative.js` vs `Narrative.jsx` 大小寫撞名 bug，
沙盒 990 項全綠，就是本機的 `ui.smoke` 抓到的。

**`vite build` 在沙盒會失敗**——`lightningcss` 缺 Linux 原生檔（node_modules 是 Windows 端裝的）。
這是環境問題不是程式碼問題；只要看到 `transforming...✓ N modules transformed` 就代表 import 全部解析成功。

### 8.3 復工基準線驗收（確認休眠期間沒壞）

| 檢查 | 指令 | 休眠當下的預期值 |
|---|---|---|
| 沙盒 node 測試（8 檔） | `npx vitest run tests/compare.test.js tests/errorCodes.test.js tests/i18n.test.js tests/nca.test.js tests/pls.narrative.test.js tests/pls.test.js tests/provenance.test.js tests/a11y.guard.test.js` | 【階段 A 收尾時填】 |
| lint | `npx eslint src tests` | 0 problems |
| fixture 重生可重現 | 備份 → `python3 tests/generate_reference.py` → diff | 逐位元相同 |
| 本機全套（Kevin） | 雙擊 `跑UI測試.bat` | 【階段 A 收尾時填】 |

對不上就**先查清楚為什麼**再往下做——休眠期間唯一會變的是外部套件版本，
數字對不上通常代表某個第三方套件改了預設值，那本身就是要記進 validation-report 的事。

### 8.4 休眠當下的狀態快照【階段 A 收尾時填】

- 階段 A 完成日期：
- `reference.json` 組數 / provenance 狀態分布（verified / exempt / pending）：
- `MAX_PENDING` 當時值：
- 階段 A 紅隊開出的 L3／L4 項目與 Kevin 裁決結果（或指向 §6.6）：
- 階段 A 期間發現但**刻意不處理**的事項，及不處理的理由：
- 復工後建議的第一批工作（§3 Wave F1 的具體切法）：

### 8.5 給復工執行者的三句話

1. **這個專案的價值在「可驗證」而不是「功能多」**。§0 的溯源規範凌駕所有排序，
   `provenance.test.js` 的 `MAX_PENDING` 是只能往下調的棘輪——新增方法不能以 pending 落地。
2. **tier B 是風險所在**。休眠當下 82 組基準有 30 組 tier B（沒有第三方數值對照）。
   歷來抓到的 bug 全部落在這一側。新增方法時，先問「有沒有可執行的第三方」，沒有就回論文記方程式編號。
3. **第三方實作不等於可照抄的數字**。2026-07-25 查到 seminr 的 `predict_pls(reps=)` 根本不生效，
   且其彙總口徑有系統性樂觀偏誤——查核的價值在於**知道它做了什麼**，然後自己判斷。

---

## 版本紀錄
- v2.9（2026-07-25）：修正 v2.8 的一個前提錯誤。原以為 Kevin 在階段 A 期間不在場，
  實際是**他全程參與階段 A，休眠發生在階段 A 之後**（階段 B 最早 2026-09 底）。
  影響兩處並已改：§6.4 的 L3（數值層）處置由「累積清單等裁決」改為「當場問」
  （理由：A1–A3 的 PLS 內容彼此引用，帶著未定假設往前走會導致後批返工）；
  §6.8 的「不在場時」條款作廢。
  ★ 更重要的是交接火力對準了錯的地方——真正的交接負擔在階段 A **之後**。
  新增 **§8「休眠與復工」**：8.2 環境重建（沙盒要 pip 裝哪七個套件、`.bat` 會消失、
  R 只在本機且不在 PATH、jsdom 沙盒跑不動、`vite build` 的 lightningcss 假失敗）
  與 8.5 三句話已寫死；8.3 基準線數字與 8.4 狀態快照留給階段 A 收尾填，
  並列入 §6.7 完成判準第 7 條——沒填完不算階段 A 結案。
- v2.8（2026-07-25）：**階段化重整**。Kevin 裁決把後續工作切成 A→B→C→D 四階段並寫入本檔：
  A＝方法文件與紅隊盤點（新增 §6，**現在做這個**）、B＝Wave F1–F8（§3）、C＝CB-SEM（§4）、
  D＝COMING_SOON 收斂（新增 §7）。階段 A 的三項規格由 Kevin 當場裁決：
  粒度＝可報告的統計方法（約 60 份，非 28 個側欄模組）、紅隊處置＝分級
  （L1/L2 當場修、L3/L4 停下來候裁決）、讀者＝對外公開。
  §6 刻意寫成「Kevin 不在場也能執行」的規格（他將在階段 A 後暫停）：
  批次表可接續、八節模板固定、八條紅隊檢查表、完成判準含一支防漂移測試
  （`docs.coverage.test.js`，比照 provenance 棘輪擋住「新增方法忘了寫文件」）。
  同時修掉三處工單失準：§2.3 卡外部資源清單漏標 bca scipy 抽驗已完成、
  `verify_plspredict_reps.R` 的處置過期、`pls_modmed` 的 Hayes 標籤未列入卡文獻清單
  （現已整併為一張 5 列的完整表）。版本紀錄改為倒序。
  ★ 一個要記住的數字：82 組基準裡 tier B 有 **30 組**（26 組在 PLS），
  那是沒有第三方數值對照、只靠文獻理解撐住的部分——階段 A 的排序因此是 tier B 優先。
- v2.7（2026-07-25）：PLSpredict 重複口徑核對定案。**查到 seminr 的 `reps` 不生效**
  （洗牌在重複迴圈外、迴圈內分摺為決定性；本機實測 reps=1 與 reps=10 逐位元相同，
  與原始碼判讀一致），且其意圖採用的「先平均預測值再算指標」口徑有系統性樂觀偏誤
  （模糊分解，沙盒數值驗證 <1e-12）。本工具維持「平均各次指標」，
  依據寫入 JSDoc／UI 警告／provenance／validation-report 四處。
  ★ 給後續的註腳：§0 的「找可執行的第三方實作」不等於「照抄它的數字」——
  第三方也可能有 bug 或採可辯論的口徑，查核的價值在於知道它做了什麼。
- v2.6（2026-07-25）：**PLS 收尾**。§2.3「會動統計核心」三項全數交付：PLSpredict 多次重複
  （恆等式溯源，不新增基準組）、MGA 的 PLSc 版（盤點發現引擎已通，補測試與揭露）、
  調節式中介（新基準組 `pls_modmed`，對 statsmodels OLS 逐值 assert，verified）。
  reference.json 81 → **82** 組；`MAX_PENDING` 維持 2。
  本機全套驗收 **1,184 過、6 跳過、13 檔全綠**（`pls.test.js` 155 → 170 條）；
  eslint 0；fixture 完整重生逐位元可重現。
  誠實標註一項：index of moderated mediation 的標籤待 Hayes (2015) 原文核定。
  PLSpredict 重複的彙總口徑已於同日核對定案（不跟隨 seminr，見 v2.7）。
  ★ 前置關卡記錄：沙盒無 R 亦無 root，seminr／cSEM 只能在本機跑——這決定了上述兩項的溯源路線。
- v2.5（2026-07-25）：P1 低風險殘項第二批全數交付（§2.3 七項）＋ `pls_bca_reference`
  的 scipy 獨立抽驗並 assert 化。★ 過程中修正一處錯誤敘述：IPMA 改用量表理論界線
  **同時**改變 performance 與 importance（原宣稱只影響 performance），三處說明已改並留斷言。
  塊內量尺警告門檻由 1.5 校準為 3（1.5 對連續型指標的抽樣變異即誤報）。
  順帶修掉示範模型缺 `mode` 欄位導致「載入示範即顯示設定已變更」的既有缺陷。
  `MAX_PENDING` 維持 2（scipy 非權威，如預期不能結案）。
  本機全套驗收 **1,155 過、6 跳過、13 檔全綠**（含 3 條新增的 W4 畫布測試）；eslint 0 problems。
- v2.4（2026-07-25）：文件盤點與收斂。新增「下一個 session 從這裡開始」與「文件清單」兩節；
  表頭的舊整併紀錄（四份已刪工單、optimization-roadmap 失蹤備註）已完成階段性任務，一併移除。
  修正兩處失效參照（`cb-sem-design-plan-v1.md` 引已刪的 w6-workplan、`pls-model-schema.md`
  引 `pls-sem-roadmap-v1.md`）。`code-review-2026-05-13.md` 第四階段殘項逐項查核，
  5 項只剩 2 項（App.css 死碼、README 里程碑），已搬入 §2.3。
  Kevin 確認後刪除 4 檔：3 份選案淘汰的 mockup ＋ `code-review-2026-05-13.md`；
  `pls-sem-roadmap-v1.md` 經裁決**保留**（保留開發史）。
- v2.3（2026-07-25）：P1 第一批交付——APA 敘述句補齊 8 項（原工單寫 3 項為 W5 時期的過期盤點）、
  句子組裝抽成 `apaNarrative.js` 純函式模組並補 11 項行為測試。§2 全面改寫：
  移除兩條已完成的過期項（59 個 eslint 已歸零、deploy.yml lint step 已存在）、
  記錄 `statlite.jsx` 保留裁決與理由、待辦依「是否動統計核心」分層、
  修正「1 session 低成本清帳」的原始誤判。
- v2.2（2026-07-25）：Session Q3 全數交付。批次 3 四組 verified，`MAX_PENDING` 6 → **2**；
  `pls_pairwise_wpls` 取得三道沙盒第三方對照並升為重生時 assert；`pls_hoc_embedded` 引用補正
  （方法源出 Ringle et al. 2012）。修正原工單兩處誤植（批次 3 是 4 組非 3 組；Q3 判準 0 → 2）。
  P0 只剩 Q2 卡文獻的兩組。
- v2.1（2026-07-25）：Session Q2 部分交付。§1 補 Q2 進度表、交付判準算術修正（3 → 4）、
  兩組卡文獻的解除封鎖路徑；§2 補 Q2 產生的三筆品質殘項。
  棘輪 10 → 6；抓到並修正 `pls_cta`（t → z）與 `pls_pos`（ΣSSE → ΣR²）兩處公式偏離。
  完整測試套件本機驗收 1136 過、6 跳過、零失敗。
- v2（2026-07-13）：初版。合併 `pls-sem-w6-workplan-v1`（A–F 已交付）、
  `redteam-audit-workplan-v1`（R1–R5 已交付）、`handoff §6.8/§7`、
  `feature-priority-roadmap-v1`（20 項未做）；新增 §0 品質規範與 P0 公式溯源審計。
