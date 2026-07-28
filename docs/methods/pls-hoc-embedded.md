# 高階構念：embedded two-stage 法

> 方法代號 `pls_hoc_embedded`｜基準組 `reference.json → pls_hoc_embedded`（6 欄）｜溯源 tier **B** / verified
> ★ 模型語法接受 **`'two-stage'`** 與 **`'embedded'`** 兩種寫法（等價）——見 §3.4
> 最後更新：2026-07-26（階段 A / A2）

---

## 1. 這個方法在回答什麼問題

高階構念的背景見 `pls-hoc-repeated.md` §1。本文件說明 **embedded two-stage**：

1. **第一階段**：跑一個 **repeated indicators 模型**（HOC 掛全部 LOC 指標），取出**全部構念**的分數
2. **第二階段**：HOC 以 LOC 分數為指標；**所有非階層構念也改成以第一階段分數為單指標**

與 disjoint 的差別就在最後那句：disjoint 讓其他構念保留原始指標，embedded 把**整個模型**
都換成分數層。

## 2. 什麼時候該用、什麼時候不該用

**該用**

- 要與採用此法的既有文獻對照
- 模型很大、想在第二階段大幅簡化

**不該用（★ 官方明確建議改用 disjoint）**

Becker et al. (2023) 明確建議優先用 **disjoint** two-stage，理由是：
embedded 的非階層構念在第二階段被換成單指標分數，
**失去在指標層跑 PLSpredict／CVPAT 的能力**。

其他限制：

- 第二階段全是單指標構念 ⇒ 沒有測量模型可看、沒有 fit
- 第一階段是 repeated indicators 模型 ⇒ 繼承其指標數不均的偏誤

**常見誤用**

1. **以為 embedded 比 disjoint「更完整」。** 名稱容易誤導；官方立場相反。
2. ~~在模型語法裡寫 `method: 'embedded'` 會被擋~~ **2026-07-26 起已接受該別名**（§3.4）。

## 3. 公式與定義

### 3.1 第一階段：repeated indicators 模型

與 `pls-hoc-repeated.md` §3.1 完全相同的展開（HOC 區塊 = 全部 LOC 指標、加內部路徑）。

→ `src/lib/stats/pls.js:1602–1604`（呼叫 `hocExpandModel`，並以 `allowShared = true` 放寬驗證）

★ **溯源上的重要性**：第一階段就是 `pls_hoc_repeated`，而該組有**對 plspm 的重生時 assert <1e−6**。
所以 embedded 的**輸入分數是第三方錨定的**，不是純手算。

### 3.2 第二階段：全構念分數化

| 構念類型 | 第二階段的指標 |
|---|---|
| HOC | 各成分 LOC 的第一階段分數 |
| **其他（非階層）構念** | **自己的第一階段分數（單指標）** |

→ `pls.js:1609–1628`（HOC 於 `1582–1586`；非成分構念走 `1592–1595` 的「分數單指標」分支）

對照：disjoint 走的是 `1589–1591` 的「保留原始指標」分支。
**兩法的差別在程式碼裡只有這一個 if/else。**

### 3.3 權威文獻的四項口徑（Session Q3 逐點核對）

Becker et al. (2023) accepted MS pp. 15–16 逐句界定，本工具四項全中：

| # | 原文要求 | 本工具 |
|---|---|---|
| 1 | 第一階段以 repeated indicators 建模整個高階構念 | ✓ `pls.js:1603` |
| 2 | 第二階段 HOC 指標 = 第一階段 LOC 分數 | ✓ `pls.js:1613–1614` |
| 3 | 第二階段**全部非階層構念改為以第一階段分數為單指標** | ✓ `pls.js:1623–1625` |
| 4 | 反映型 HOC 用 Mode A、scheme 用 path | ✓ 沿用 `plan.scheme` |

### 3.4 模型語法的命名（`'embedded'` 為別名）

驗證器接受 **`'repeated'`／`'two-stage'`／`'disjoint'`**，
並自 2026-07-26 起接受 **`'embedded'`** 作為 `'two-stage'` 的別名（正規化後兩者完全等價）。

→ `pls.js:311–316`

背景：文獻、程式碼註解、`meta.stages` 的說明文字與本批文件都稱它 **embedded two-stage**，
但原本的語法值只接受 `'two-stage'`，使用者照文件寫 `'embedded'` 會撞牆。詳見 §8 R21。

## 4. 假設前提與本工具的檢核方式

| 前提 | 本工具怎麼檢核 | 違反時的行為 | 位置 |
|---|---|---|---|
| `method` 值合法 | 驗證器白名單（含 `'embedded'` 別名） | **硬擋**，訊息列出合法值與別名（實測確認） | `pls.js:311–316` |
| 至少 2 個成分 LOC | 驗證器 | **硬擋** | `pls.js:291` |
| 第一階段可收斂（含重複掛載） | `estimateStage`（`allowShared = true`） | 回傳該階段錯誤 | `pls.js:1604`、`1576` |
| 第二階段不報 fit | `skipFit` | fit 與 GoF 皆 `null` | `pls.js:1909` |
| 不與 PLSc 併用 | 建模階段 | **硬擋** | `pls.js:1354–1359` |
| **第一階段的指標數不均偏誤** | ✗ **不檢核**（繼承自 repeated） | 無警告 | — |
| **PLSpredict 能力的喪失** | ✗ **不提示** | 無警告（見 §2） | — |

## 5. 參考文獻

| 文獻 | 角色 | 取得狀態 |
|---|---|---|
| Ringle, C. M., Sarstedt, M., & Straub, D. W. (2012). A critical look at the use of PLS-SEM in *MIS Quarterly*. *MIS Quarterly*, 36(1), iii–xiv. | **方法出處** | 【原文未取得】 |
| Becker, J.-M., Cheah, J.-H., Gholamzade, R., Ringle, C. M., & Sarstedt, M. (2023). *IJCHM*, 35(1), 321–346，accepted MS pp. 15–16 | **程序指引**（§3.3 的四項口徑逐句來源） | **accepted MS 可取用** |
| Sarstedt, M., Hair, J. F., Cheah, J.-H., Becker, J.-M., & Ringle, C. M. (2019). How to specify, estimate, and validate higher-order constructs in PLS-SEM. *Australasian Marketing Journal*, 27(3), 197–211. | **程序指引** | 【原文未取得】 |

★ **一則引用修正的紀錄（Session Q3）**：本組原 authority 僅標「Sarstedt et al. 2019」。
依 Becker et al. (2023) 的說明，embedded two-stage 的**方法出處是 Ringle, Sarstedt & Straub (2012)**，
Sarstedt et al. (2019) 與 Becker et al. (2023) 是程序指引——已補正。
這類「方法出處 vs 程序指引」的區分正是本批文件第 5 節分兩欄的理由。

## 6. 對照與驗證狀態

**基準組**：`reference.json → pls_hoc_embedded`（6 欄）

**tier / status**：tier **B** / **verified**

| 道 | 內容 |
|---|---|
| 1 | 對 Becker et al. (2023) accepted MS pp. 15–16 **逐點核對四項口徑**（§3.3），全中 |
| 2 | **第一階段有第三方錨**：第一階段即 `pls_hoc_repeated`，該組有對 plspm 的重生時 assert <1e−6 |
| 3 | JS↔numpy 逐值（`compare.test.js`） |
| 4 | **新增（2026-07-26）**：本文件的獨立重寫，6 欄比對**最大絕對差 2.2e−16** |

| 第三方 | 涵蓋 | 結果 |
|---|---|---|
| plspm | **第一階段**（repeated 模型） | 重生時 assert <1e−6 |
| seminr／SmartPLS 4 | 第二階段 | **都沒有對照過** |

### ★ 尚未驗證的部分

1. **第二階段沒有任何第三方數值對照。** 保證來自「權威文獻逐點 ＋ 第一階段有第三方錨 ＋
   第二階段是分數層 OLS（無慣例爭議）」三者疊加。
2. **兩篇方法出處／程序指引原文未取得**（Ringle et al. 2012、Sarstedt et al. 2019）。
   §3.3 的四項口徑對的是 Becker et al. (2023) 的**轉述**，不是原始方法論文。
3. ~~命名不一致未修~~ **已於 2026-07-26 加別名**（§3.4、§8 R21）。
   **仍未做的**：`'embedded'` 與 `'two-stage'` 在報表上不區分（`meta.stages` 一律顯示
   「embedded two-stage」），使用者寫 `'two-stage'` 時看到 embedded 字樣可能困惑。
4. **繼承 repeated indicators 的指標數不均偏誤**，工具不警告。
5. **「失去指標層 PLSpredict 能力」這個官方建議理由，工具完全不提示**——
   使用者選了 embedded 之後若嘗試跑 PLSpredict，會被 `rejectW4` 擋下，
   但訊息不會說明「這是 embedded 法的固有限制，改用 disjoint 可以避免」。

## 7. 報表欄位對照

| UI 欄位 | 對應公式 | 程式碼 |
|---|---|---|
| HOC 的 loading（LOC 分數對 HOC） | 3.2 | `pls.js:1612–1616` |
| 其他構念的單指標 loading（恆為 1） | 3.2 | `pls.js:1623–1625` |
| 結構路徑 | 3.2 | `pls.js:1629` |
| 第一階段量測子報表（repeated 模型） | 3.1 | `report.stage1` |
| 階段說明文字 | 3.1／3.2 | `pls.js:1630–1632` |

**孤兒欄位檢查**：第二階段全部指標名為 `{構念}_score`。未發現孤兒欄位。

## 8. 紅隊檢核紀錄

**日期** 2026-07-26　**執行者** Claude（Cowork）＋ Kevin　**批次** 階段 A / A2

| # | 檢查項 | 結果 |
|---|---|---|
| 1 | 公式 vs 程式碼逐式核對 | **通過**（獨立重寫 2.2e−16） |
| 2 | authority 是否支持該公式 | **通過**——authority 逐句引用 accepted MS 的原文界定，且有引用修正紀錄（方法出處 vs 程序指引） |
| 3 | 文獻真實性 | Becker et al. 可取用；另兩篇未取得，已標註 |
| 4 | 報表可追溯 | **通過** |
| 5 | 假設前提 | **通過**（五道守衛）；2 項不提示已列入第 6 節 |
| 6 | 慣例分歧 | **通過** |
| 7 | 邊界條件 | ★ **發現 1 項命名不一致並已修**（R21） |
| 8 | APA 敘述句 | **通過** |

### R1（通過）獨立重寫

依第 3 節文字規格以 numpy 重寫（第一階段 repeated 模型取 F1／F2／C／Y 分數；
第二階段 G=[sF1,sF2]、C 與 Y 各為分數單指標），6 欄比對**最大絕對差 2.2e−16**。

### R21（L2，已修）embedded 法在模型語法中叫 `'two-stage'`

**實測**：

```
method: 'embedded'  → invalid-model | 高階構念「G」的 method 必須是 'repeated'、
                       'two-stage' 或 'disjoint'，收到「embedded」
method: 'two-stage' → 正常執行，meta.stages 顯示「高階構念（embedded two-stage）：…」
```

程式碼註解、`meta.stages` 的說明文字、provenance 與本批文件都稱它 **embedded**，
但**模型語法的值是 `two-stage`**。使用者照文件寫 `'embedded'` 會撞牆，
而錯誤訊息雖然列出了三個合法值，**沒有說明「你要的 embedded 就是 two-stage」**。

**處置（Kevin 2026-07-26 核定：加別名，已執行）**：驗證器接受 `'embedded'` 並正規化為 `'two-stage'`，
錯誤訊息一併列出別名。→ `pls.js:311–316`（正規化）、`pls.js:326`（多 HOC 一致性的訊息）。

修正後的實測：

```
method: 'embedded'  → 正常執行，G→C = −0.3452（與 'two-stage' 逐值相同）
method: 'bogus'     → 高階構念「G」的 method 必須是 'repeated'、'two-stage'（別名 'embedded'）
                       或 'disjoint'，收到「bogus」
```

新增 2 條行為測試：兩種寫法**逐值等價**（`toBeCloseTo(..., 12)`）且 `meta.stages` 相同；
壞值的錯誤訊息含 `'embedded'`。

### 待辦編號

本組開出 **R21（L2，已修）**。

---

*本文件為階段 A 產出。方法索引見 [`README.md`](README.md)。*
