# 多多快跑 DuoDuoRun

純前端統計分析工具。所有運算在瀏覽器本地執行，資料不上傳，免安裝、免費，部署於 GitHub Pages。

> 名字來自一隻叫多多的狗。中文習慣講「跑統計」，多多快跑就是請多多快點去跑統計分析。
>
> 目標：讓學生不需購買 SPSS 即可完成常見統計分析，並確保計算結果與商用統計軟體（SPSS、R）一致。

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

## 專案結構

```
duoduorun/
├── .github/workflows/deploy.yml   # GitHub Actions 自動部署
├── public/                        # 靜態資源（favicon 等）
├── reference/                     # 既有原型 statlite.jsx，計算層之後會抽出至 src/lib/stats/
├── src/
│   ├── App.jsx                    # 主元件
│   ├── main.jsx
│   ├── index.css                  # Tailwind directives
│   └── components/
│       └── DuoMascot.jsx          # 多多吉祥物占位元件（idle/running/thinking/celebrating 四種 state）
├── index.html
├── tailwind.config.js             # 內含 duo 命名空間調色盤
├── postcss.config.js
└── vite.config.js
```

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

## 開發里程碑

- [x] **Step 1**：scaffold + GitHub Pages 部署流程
- [x] **Step 1.5**：rebrand 為多多快跑、調色盤落地、吉祥物占位元件
- [ ] **Step 2**：完整 UI 架構（左側導覽列、三欄主內容區、教學/報告模式切換、語言切換、示範資料集載入）
- [ ] **Step 3**：第一優先統計功能（敘述統計、t 檢定、Pearson 相關、單因子 ANOVA、簡單迴歸、Cronbach's α），以及對應的 APA 中英文敘述模板與假設前提檢核
- [ ] **Step 4**：實用功能（一鍵複製、PDF 匯出、資料預覽、分析歷史）
- [ ] **Step 5**：第一優先版本上線；之後進入第二優先（多元迴歸、卡方、無母數、視覺化）與第三優先（雙因子 ANOVA、邏輯斯迴歸、EFA）

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
