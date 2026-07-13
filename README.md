# 多多快跑 DuoDuoRun

純前端統計分析工具。所有運算在瀏覽器本地執行，資料不上傳，免安裝、免費，部署於 GitHub Pages。

> 名字來自一隻叫多多的狗。中文習慣講「跑統計」，多多快跑就是請多多快點去跑統計分析。
>
> 目標：讓學生不需購買 SPSS 即可完成常見統計分析，並確保計算結果與商用統計軟體（SPSS、R）一致。

### 直接開始使用：**<https://loweilee.github.io/DuoDuoRun/>**

打開網頁就能用。不需註冊、不需下載、不需付費。上傳你的 CSV 或 Excel 檔（或直接載入內建的示範資料集試玩），選一個分析方法，就會跑出結果與 APA 格式的中英文敘述。

---

## 支援的分析方法

目前提供 **28 種分析**，涵蓋社會科學論文常用的絕大多數方法：

| 類別 | 分析方法 |
| --- | --- |
| **敘述統計** | 基本敘述統計、常態性檢定、資料視覺化 |
| **推論統計** | t 檢定、單因子 ANOVA、雙因子 ANOVA、ANCOVA 共變數分析、重複量數 ANOVA、Mixed ANOVA（被試間×被試內）、卡方檢定、無母數檢定、z 檢定（比例）、Fisher 精確檢定 |
| **相關與迴歸** | 相關分析、簡單迴歸、多元迴歸、階層迴歸、邏輯斯迴歸 |
| **量表分析** | Cronbach's α、探索性因素分析（EFA）、驗證性因素分析（CFA）、Cohen's Kappa、ICC 組內相關係數 |
| **多變量分析** | MANOVA 多變量變異數分析、判別分析（LDA）、集群分析 |
| **結構方程模型** | PLS-SEM、NCA 必要條件分析 |

分析結果除了統計量之外，會視方法一併附上 **假設前提檢核**（如常態性、變異數同質性，違反時明確警示）、**效果量**，以及可直接貼進論文的 **APA 格式敘述**（中英文皆有）。結果支援一鍵複製與 PDF 匯出。

### 結果正確性

統計核心為純 JavaScript 自行實作，並與黃金標準（SPSS／R 同底層演算法的 scipy、statsmodels、pingouin、scikit-learn、factor_analyzer、semopy、plspm 等）逐欄位比對，比對已固化為常設回歸測試。

目前的防線規模：

| | |
|---|---|
| 基準方法組數 | **74**（`tests/fixtures/reference.json`，每組附出處與容差理由） |
| 回歸測試 | **743 過、6 記錄性跳過**（`npm test`；含統計層、i18n 對稱性、UI 行為） |
| CI 把關 | 每次 push 跑 lint ＋ 全測試 ＋ build，任一失敗即擋下部署 |

完整比對結果、已知的慣例差異（例如 Levene 檢定的 center 預設、Mann-Whitney 的 U 值慣例、CFA 的 χ² 分母慣例）與其影響評估，公開於 **[`docs/validation-report-v1.md`](docs/validation-report-v1.md)**——**包含我們自己找到並修掉的錯誤**（例如 2026-07-13 修正的 LDA 標準化係數定義、CFA 的 RMSEA 信賴區間、k-means 手肘圖的區域最佳解問題）。

正確性是這個工具存在的前提，因此驗證過程與已知限制一律公開，不做選擇性呈現。使用前請一併閱讀下方的[免責聲明](#免責聲明)。

### 即將開放

規劃中、尚未實作（介面上會以灰色項目顯示）：CB-SEM、HLM 多層次模型、McNemar 檢定、Friedman 檢定、多項／順序邏輯斯迴歸、Probit 迴歸、Poisson 迴歸、多項式迴歸、Cox 比例風險（生存分析）、典型相關分析、Bayesian t 檢定／ANOVA／相關、項目反應理論（IRT）、統合分析（Meta-analysis）、ARIMA 時間序列。

---

## 技術堆疊

- **框架**：React 19 + Vite 8
- **樣式**：Tailwind CSS v3，配色取自多多照片的暖色系（`duo-cream` / `duo-amber` / `duo-cocoa` / `duo-denim`，定義在 `tailwind.config.js`）
- **統計計算**：純 JavaScript 自行實作（不依賴外部統計函式庫，p-value 使用 regularized incomplete beta function，方法參照 *Numerical Recipes*）
- **檔案解析**：Papa Parse（CSV）、SheetJS（XLSX）
- **PDF 匯出**：jsPDF + html2canvas
- **托管**：GitHub Pages（透過 GitHub Actions 自動部署）

## 本地開發

```bash
npm install
npm run dev
```

預設於 http://localhost:5173 啟動，因為設定了 `base: '/DuoDuoRun/'`，本地開發網址會是 http://localhost:5173/DuoDuoRun/

## 部署流程

只要 push 到 `main` 分支，GitHub Actions 會自動：

1. 安裝相依套件（`npm ci`）
2. 執行 `vite build`（產出至 `dist/`）
3. 上傳 artifact 至 GitHub Pages

部署網址：https://loweilee.github.io/DuoDuoRun/

## 專案結構（給想貢獻的人）

```
duoduorun/
├── .github/workflows/deploy.yml   # GitHub Actions 自動部署至 Pages
├── docs/                          # 驗證報告、PLS 模型 schema、設計稿
├── public/                        # 靜態資源與 4 個示範資料集（CSV）
├── tests/                         # Vitest：與 Python 黃金標準的數值比對
│   ├── generate_reference.py      #   產生基準值
│   └── compare.test.js            #   逐欄位斷言
├── src/
│   ├── analyses/                  # 每個分析一個資料夾（28 個）
│   │   ├── ttest/                 #   六件套：index / compute / Config / Result / Narrative / Notes
│   │   └── registry.js            #   分析 id → 模組的註冊表
│   ├── lib/
│   │   ├── stats/                 #   統計核心（純 JS，不依賴外部統計函式庫）
│   │   ├── assumptionChecker.js   #   假設前提檢核
│   │   ├── fileParser.js          #   CSV / XLSX 解析
│   │   └── pdfExport.js
│   ├── config/analyses.js         # 側欄選單結構與「即將開放」清單
│   ├── i18n/{zh-TW,en}.js         # 中英文字串
│   └── components/                # UI 元件（含 DuoMascot 吉祥物）
└── tailwind.config.js             # duo 命名空間調色盤
```

**新增一個分析方法**：在 `src/analyses/<id>/` 建立六件套 → 於 `registry.js` 註冊 → 於 `config/analyses.js` 加進側欄 → 於 `i18n/` 補中英字串。統計核心有任何改動，請務必跑 `npm test`。

## 視覺識別

調色盤取自多多的照片：

| Token | 用途 | 取色來源 |
| --- | --- | --- |
| `duo-cream-100` (#fbeed8) | 預設背景 | — |
| `duo-amber-500` (#d97e2a) | 主品牌色 | 多多的主毛色 |
| `duo-cocoa-700` (#3f2d1f) | 主文字色 | 多多的耳朵與鼻吻 |
| `duo-denim-400` (#5e7a91) | 副色／邊框 | 多多的牛仔背心 |
| `duo-tongue` (#f4a8a8) | 警示／前提違反 | 多多的舌頭 |
| `duo-leaf` (#6a9a5a) | 結果通過／成功 | 照片背景植被 |

完整 ramp（50–900）見 `tailwind.config.js`。

## 吉祥物使用方式

```jsx
import DuoMascot from './components/DuoMascot'

<DuoMascot state="idle" size={48} />
<DuoMascot state="running" size={64} />     // 計算中
<DuoMascot state="thinking" size={48} />    // 假設前提檢核
<DuoMascot state="celebrating" size={64} /> // 結果通過
```

目前是純 SVG 幾何圖形的占位實作。將來換成插畫師的真插畫時，只要替換 `DuoMascot.jsx` 內部的 SVG 路徑，所有用到此元件的地方都不必改。

## 隱私

所有資料解析、統計運算、結果產出，全部在瀏覽器本地執行。**沒有任何資料會上傳到外部伺服器**。本工具不呼叫任何 API、不收集任何使用者資訊。

由於本專案原始碼完全公開，上述宣稱可以被任何人檢視驗證——這正是本工具開源的主要理由。

## 免責聲明

**使用本工具前請詳閱。**

- **統計結果請自行驗證。** 本工具的計算核心已與 SPSS、R 進行數值比對（見 [`docs/validation-report-v1.md`](docs/validation-report-v1.md) 與 `tests/`），但比對涵蓋的是既定的測試情境，**不保證在所有資料型態、極端值、遺漏值樣態或邊界條件下都與商用軟體完全一致**。用於學位論文、期刊投稿或任何正式研究產出前，請以另一套軟體交叉驗證關鍵數值。
- **方法選用與結果解讀的責任在使用者。** 本工具會提示假設前提檢核，但無法代替使用者判斷「這個分析方法是否適合我的研究設計」。工具跑得出數字，不代表那個數字有意義。本工具不構成統計諮詢或學術指導。
- **無任何形式的擔保。** 依 MIT 授權條款，本軟體以「現狀」（AS IS）提供，不附帶任何明示或默示之擔保。作者不對使用本工具所導致的任何損失、錯誤結論或後果負責。
- **發現錯誤請回報。** 若你發現計算結果與 SPSS／R 有出入，歡迎至 [Issues](https://github.com/LoWeiLee/DuoDuoRun/issues) 提出，請盡量附上可重現的資料與步驟。這是本工具改善正確性最重要的途徑。

## 授權

本專案採 [MIT 授權](LICENSE)。

你可以自由使用、修改、散布本軟體，包含商業用途，唯需在副本中保留原始的著作權聲明與授權條款。軟體以「現狀」提供，不附帶任何擔保（詳見上方免責聲明）。
