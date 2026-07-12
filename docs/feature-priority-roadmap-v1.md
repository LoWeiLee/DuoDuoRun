# 多多快跑 待上線統計功能優先序路徑書 v1（2026-07-12）

**讀者**：Opus 4.8（執行者）與 Kevin。
**定位**：彙整所有「規劃中、尚未上線」的統計功能，依**社會科學研究常用度**排出開發優先序。
排序為判斷性結論（依據下列四準則），Kevin 可裁決調整；調整只動順序不動單項規格。

**與既有規劃的邊界**：PLS-SEM W6 收尾走 `pls-sem-w6-workplan-v1.md`；
CB-SEM 走 `cb-sem-design-plan-v1.md`（spike-first）。兩者不在本文件排序，
但在 §3 時間軸中標注其相對位置。

## 1. 母體清單與排序準則

清單來源三處：
(a) `src/config/analyses.js` COMING_SOON 16 項（側欄已對使用者預告）；
(b) `optimization-roadmap-v1.md`／`handoff-roadmap-v1.md` §7 產品 backlog；
(c) 本次紅隊增補 5 項——**迴歸式調節／中介（PROCESS 對標）、McDonald's ω、
統計檢定力與樣本數計算（G*Power 對標）、負二項迴歸、ROC/AUC**（常用度高但
不在任何既有清單）。

排序準則（權重由高至低）：
1. **常用度**：台灣社科（公行／管理／教育）學位論文與 TSSCI 論文的使用頻率
2. **受眾契合**：多多快跑定位是中文問卷型研究者，量表流程相關功能加權
3. **實作成本與複用**：能吃既有引擎（迴歸、bootstrap Worker、EFA/CFA）者加分
4. **基準可得性**：沙盒 statsmodels／pingouin／scikit-learn／semopy 可直接產基準者加分

## 2. 優先序總表

### Tier 1：極高常用度（問卷論文剛需，先做）

| 序 | 功能 | 理由與依據 | 成本 | 基準 |
|---|---|---|---|---|
| 1 | 效果量＋95% CI 全面補齊（跨模組橫切） | APA 7 剛需；backlog 原第 1 位 | 中 | pingouin＋手算 |
| 2 | 資料前處理模組（反向計分、量表加總、變數計算、缺失策略、離群檢查） | 問卷流程每篇必經；目前使用者要先在 Excel 做完 | 中 | 確定性轉換，手算 |
| 3 | 迴歸式調節／中介（PROCESS 對標：Model 1、4、7、8、14；bootstrap 間接效果、簡單斜率） | 社科論文最常用進階法之一；現只能走 PLS 或手動階層迴歸【紅隊增補】 | 中高 | statsmodels＋固定 draws bootstrap；Kevin 本機 R PROCESS 抽驗 |
| 4 | McDonald's ω（含 ω_h） | 期刊漸要求取代 α；吃既有 CFA/EFA 引擎，成本低【紅隊增補】 | 低 | semopy／R psych 抽驗 |
| 5 | 統計檢定力與樣本數計算（t／ANOVA／相關／迴歸／χ²） | 每本學位論文研究設計章都要；G*Power 對標【紅隊增補】 | 中 | statsmodels.stats.power |

### Tier 2：高常用度

| 序 | 功能 | 理由 | 成本 | 基準 |
|---|---|---|---|---|
| 6 | APA 三線表輸出 .docx | 論文使用者最痛；先做迴歸／ANOVA／PLS 三類 | 中 | 格式對標 APA 7 |
| 7 | Friedman＋McNemar（無母數補強） | 重複量數／配對類別的標準選項；成本低、快贏 | 低 | scipy／statsmodels |
| 8 | ordinal logit（比例勝算）＋ multinomial logit | 李克特單題／類別依變數常見 | 中 | statsmodels OrderedModel／MNLogit |
| 9 | HLM（隨機截距／斜率、ICC、組平減） | 教育與管理巢套資料常用；COMING_SOON 承諾第 2 位 | 高 | statsmodels MixedLM；Kevin 本機 lme4 |
| 10 | 專案檔本地保存／載入 | 非統計功能但黏著度關鍵；模型 JSON 已 schemaVersion 化 | 低 | round-trip 測試 |

（CB-SEM 常用度屬本 tier 前段，時程依其設計書 spike 結果，不在此重複排序。）

### Tier 3：中常用度（需求出現再排）

| 序 | 功能 | 備註 |
|---|---|---|
| 11 | Poisson＋負二項迴歸 | 計數依變數；負二項為紅隊增補（過度離散時的實際預設） |
| 12 | meta-analysis（固定／隨機效果、森林圖、I²） | 系統性回顧成長中；獨立資料格式 |
| 13 | polynomial regression | 曲線關係；PLS 端二次效果已有，OLS 端補齊 |
| 14 | ROC／AUC＋最適切點 | 診斷／預測研究；教育測驗偶用【紅隊增補】 |
| 15 | probit | 與 logistic 高度重疊，經濟學慣例；低成本可與 8 併做 |
| 16 | CCA（典型相關） | 社科使用率持續下降；EFA/迴歸多可替代 |

### Tier 4：低常用度（明確往後放；COMING_SOON 已承諾者不撤但降序）

| 序 | 功能 | 備註 |
|---|---|---|
| 17 | IRT（Rasch／2PL） | 測量專門領域；基準可用 R mirt（Kevin 本機） |
| 18 | ARIMA | 時間序列在受眾中少見；公行政策時序偶用 |
| 19 | Bayesian 三支（bayes-t／anova／corr） | JASP 特色功能，實際論文使用率低；BF 計算另需數值積分基建 |
| 20 | Cox 存活分析 | 社科罕用；醫護受眾出現再評 |

## 3. 建議開發波次（每波 = 1–2 session，沿 fixture-first 紀律）

- **Wave F1（快贏包）**：ω ＋ Friedman ＋ McNemar ＋ 專案檔保存（#4、7、10）
- **Wave F2**：效果量＋CI 橫切補齊（#1；逐模組過，工作量大但機械性高）
- **Wave F3**：資料前處理模組（#2）
- **Wave F4**：PROCESS 式調節／中介（#3；複用 PLS 的 bootstrap Worker 協定）
- **Wave F5**：檢定力計算（#5）＋ docx 輸出第一版（#6）
- **Wave F6**：GLM 家族打包：ordinal／multinomial／probit／Poisson／負二項（#8、11、15）
- **Wave F7**：HLM（#9；高成本，獨立波）
- Tier 3 其餘與 Tier 4 不排時程，需求觸發再入波；CB-SEM spike 可穿插於 F2–F4 之間

執行協議沿用：每波先在 `tests/generate_reference.py` 產基準 → adapter → 紅燈 → 實作
→ 六件套＋i18n → 文件三件套；COMING_SOON 側欄同步從灰色轉正式入口，不留死入口。

## 4. 決策點（Kevin 裁決後 Opus 開工）

1. 紅隊增補 5 項是否進入正式 roadmap（建議：全進，PROCESS 與檢定力尤其關鍵）
2. Tier 4 是否從 COMING_SOON 側欄撤下以免過度承諾（建議：保留但註記「長期」）
3. Wave F2 效果量橫切與紅隊計畫 R1–R4（`redteam-audit-workplan-v1.md`）的先後
   （建議：R1 正確性防線先行，其餘穿插）

## 版本紀錄

- v1（2026-07-12）：初版（Fable 5 產出，供 Opus 4.8 執行）。
