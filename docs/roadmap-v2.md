# 多多快跑 主工單 v2（2026-07-13 建立，2026-07-25 最後更新）

**讀者**：後續執行的 AI 與 Kevin。
**定位**：**單一主工單**。專案的所有待辦以本文件為準，其餘文件不放待辦。

---

## ★ 下一個 session 從這裡開始

**目前狀態一句話**：**PLS 已收尾**——P1 殘項（低風險 7 項＋會動統計核心 2 項）全部清完，
調節式中介一併交付；P0 只剩 2 組卡文獻。功能開發（P2）尚未動工。
最近一次本機全套驗收：**1,184 過、6 跳過、13 檔全綠**（2026-07-25，含本輪新增的
2 條調節式中介 jsdom 測試）。

**建議的下一步（依序）**

| 順位 | 工作 | 在哪 | 為什麼是這個順序 |
|---|---|---|---|
| 1 | Wave F1 快贏包（McDonald's ω、Friedman、McNemar、專案檔存取） | §3 | PLS 收乾淨後的第一個功能波，全部 tier A 可達 |
| 2 | Q2 尾巴 2 組（`pls_fimix`、`pls_bca_reference`） | §1 | **卡文獻取得**，拿到 PDF 才能做，不占 session 排程 |

★ PLS 側已無待辦。PLSpredict 重複的口徑已於 2026-07-25 核對定案（結論：不跟隨 seminr，
理由見 `validation-report-v1.md` 第六節）。

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
| `tests/verify_plspredict_reps.R` | 本機 seminr 核對腳本（PLSpredict 重複的彙總口徑）；沙盒無 R 故只能本機跑 | 保留至口徑定案 |

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

**卡外部資源**
- 【Q2】`pls_cta` 的非冗餘 tetrad 選取集：取得 Bollen & Ting (1993) 後覆核
  （現行構造已保證極大獨立，僅個別 tetrad 的 CI 可能隨選取集而異）
- 【Q2】`pls_pos`：取得 Becker et al. (2013) 線上 Appendix B 後覆核目標函數與距離量測；
  若要補足「段別測量權重重估」則屬獨立一波（非殘項，見 §3 需求觸發再排）
- 【Q2】`pls_bca_reference` 加一道 `scipy.stats.bootstrap(method='BCa')` 的獨立抽驗
  （非權威、不能結案，但能提前抓實作錯誤；重生時 assert 化）——此項**不卡文獻，可隨時做**

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

## 版本紀錄

- v2.6（2026-07-25）：**PLS 收尾**。§2.3「會動統計核心」三項全數交付：PLSpredict 多次重複
  （恆等式溯源，不新增基準組）、MGA 的 PLSc 版（盤點發現引擎已通，補測試與揭露）、
  調節式中介（新基準組 `pls_modmed`，對 statsmodels OLS 逐值 assert，verified）。
  reference.json 81 → **82** 組；`MAX_PENDING` 維持 2。
  本機全套驗收 **1,184 過、6 跳過、13 檔全綠**（`pls.test.js` 155 → 170 條）；
  eslint 0；fixture 完整重生逐位元可重現。
  誠實標註一項：index of moderated mediation 的標籤待 Hayes (2015) 原文核定。
  PLSpredict 重複的彙總口徑已於同日核對定案（不跟隨 seminr，見 v2.7）。
  ★ 前置關卡記錄：沙盒無 R 亦無 root，seminr／cSEM 只能在本機跑——這決定了上述兩項的溯源路線。
- v2.7（2026-07-25）：PLSpredict 重複口徑核對定案。**查到 seminr 的 `reps` 不生效**
  （洗牌在重複迴圈外、迴圈內分摺為決定性；本機實測 reps=1 與 reps=10 逐位元相同，
  與原始碼判讀一致），且其意圖採用的「先平均預測值再算指標」口徑有系統性樂觀偏誤
  （模糊分解，沙盒數值驗證 <1e-12）。本工具維持「平均各次指標」，
  依據寫入 JSDoc／UI 警告／provenance／validation-report 四處。
  ★ 給後續的註腳：§0 的「找可執行的第三方實作」不等於「照抄它的數字」——
  第三方也可能有 bug 或採可辯論的口徑，查核的價值在於知道它做了什麼。
- v2.5（2026-07-25）：P1 低風險殘項第二批全數交付（§2.3 七項）＋ `pls_bca_reference`
  的 scipy 獨立抽驗並 assert 化。★ 過程中修正一處錯誤敘述：IPMA 改用量表理論界線
  **同時**改變 performance 與 importance（原宣稱只影響 performance），三處說明已改並留斷言。
  塊內量尺警告門檻由 1.5 校準為 3（1.5 對連續型指標的抽樣變異即誤報）。
  順帶修掉示範模型缺 `mode` 欄位導致「載入示範即顯示設定已變更」的既有缺陷。
  `MAX_PENDING` 維持 2（scipy 非權威，如預期不能結案）。
  本機全套驗收 **1,155 過、6 跳過、13 檔全綠**（含 3 條新增的 W4 畫布測試）；eslint 0 problems。
- v2（2026-07-13）：初版。合併 `pls-sem-w6-workplan-v1`（A–F 已交付）、
  `redteam-audit-workplan-v1`（R1–R5 已交付）、`handoff §6.8/§7`、
  `feature-priority-roadmap-v1`（20 項未做）；新增 §0 品質規範與 P0 公式溯源審計。
- v2.1（2026-07-25）：Session Q2 部分交付。§1 補 Q2 進度表、交付判準算術修正（3 → 4）、
  兩組卡文獻的解除封鎖路徑；§2 補 Q2 產生的三筆品質殘項。
  棘輪 10 → 6；抓到並修正 `pls_cta`（t → z）與 `pls_pos`（ΣSSE → ΣR²）兩處公式偏離。
  完整測試套件本機驗收 1136 過、6 跳過、零失敗。
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
