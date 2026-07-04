# W0 引擎選型 Spike 報告：WebR + seminr/lavaan 路線可行性（2026-07-04）

本報告是 `pls-sem-roadmap-v1.md` 開工前的 W0 spike，驗證「WebR（R 編譯成
WebAssembly）+ seminr/lavaan」作為 PLS-SEM 引擎的可行性，並與既有手寫 JS
路線比較，產出 go/no-go 決策依據。所有實驗在 Cowork 沙盒（Node v22.22.3、
Python 3.10、白名單制網路）執行。

**一句話結論：PLS-SEM 路線圖（W1–W5）維持手寫 JS；WebR 技術上可行
（Node 端核心 978ms 啟動、npm 套件自帶 wasm、可自架），但套件二進位在沙盒
全數被網路白名單擋死、首載體積 20MB+、且 seminr 也覆蓋不了 SmartPLS 4 全面，
不值得為 PLS-SEM 引入；WebR 保留為 W6 CB-SEM spike 的優先候選引擎。**

---

## 一、逐步結果

### Step 1：npm install webr — 成功

| 項目 | 結果 |
|---|---|
| 安裝 | 成功，`webr@0.6.0`，耗時 20.6s |
| 套件體積 | 52MB（`dist/R.wasm` 18MB + `dist/vfs/` 26MB + JS 膠水） |
| 關鍵發現 | **npm 套件自帶完整 R wasm 核心與 base R 檔案系統**，Node 端初始化完全不需要外連 CDN |

自帶套件清單：base、compiler、datasets、grDevices、graphics、grid、methods、
parallel、splines、stats、stats4、tcltk、tools、utils、webr。
（即 base R + 標準庫，**不含**任何 CRAN 套件。）

### Step 2：Node 端初始化 webR — 成功，非常快

| 項目 | 耗時 |
|---|---|
| `new WebR()` → `init()` | **978ms** |
| R 版本 | R 4.6.0 (2026-04-24) |
| `mean(rnorm(1e5))` 求值 | 26ms |
| 整個 Node 腳本 wall time | 2.9s |

啟動速度對桌面/CI 完全可接受；瀏覽器端會多網路下載時間（見 Step 6）。

### Step 3：`webr::install('seminr'/'lavaan')` — 被網路白名單硬擋

`installPackages(['seminr'])` 313ms 內失敗：
`download from 'https://repo.r-wasm.org/bin/emscripten/contrib/4.6/PACKAGES' failed`。

系統性連通測試（curl，000 = 連線層直接失敗）：

| 網域 | 狀態 | 意義 |
|---|---|---|
| repo.r-wasm.org | **擋** | webR 官方 wasm 套件倉庫 |
| cran.r-universe.dev | **擋** | r-universe wasm 二進位（替代倉庫） |
| cdn.jsdelivr.net | **擋** | webR/Pyodide 預設 CDN |
| cran.r-project.org / cloud.r-project.org | **擋** | 連源碼安裝路線也封死 |
| raw.githubusercontent.com / api.github.com / codeload.github.com | **擋** | 無法從 GitHub 抓檔 |
| release-assets.githubusercontent.com | **擋** | GitHub Releases 資產（Pyodide 完整發行版所在） |
| *.github.io | **擋** | GitHub Pages（自架倉庫在沙盒也到不了） |
| registry.npmjs.org | 通 | **唯一能進沙盒的 wasm 資產通道** |
| pypi.org / files.pythonhosted.org | 通 | Python 純套件通道 |
| github.com（HTML） | 通 | 只有主站頁面，抓不了檔案 |

**結論性發現：沙盒對「wasm 套件二進位」的所有已知發布通道全面封鎖，唯二例外
是 npm 與 PyPI。** 這意味著：若引入 webR/Pyodide 引擎，日常開發與 `npm test`
要在本沙盒跑，**wasm 套件資產必須 vendor 進 repo**（由 Kevin 在 Windows 本機
一次性下載後放入 `C:\duoduorun`，掛載自然同步進沙盒），不能依賴執行期下載。
webR 核心本身走 npm 已解決；缺口只在 seminr/lavaan 及其依賴的 `.tgz` 二進位。

### Step 4：seminr PLS 模型 — 沙盒無法執行，改用替代路線驗證演算法

seminr 拿不到 wasm 二進位（上表），依 spike 規則轉替代方案：
**plspm（Python 版，PyPI 開放）在原生 CPython 跑同一模型**，驗證演算法層與
數值合理性（plspm 是 R plspm 的官方移植，基本 PLS 演算法與 seminr 同構）。

模型：main 資料集（N=60），F1 =~ i1+i2+i3、F2 =~ i4+i5+i6（皆反映型 Mode A）、
F1 → F2，path weighting scheme，標準化資料。

| 項目 | 數值 |
|---|---|
| 模型估計耗時 | **0.073s** |
| Bootstrap 500 次耗時 | **18.1s**（原生 CPython！） |
| 峰值記憶體（maxRSS） | 166MB |

主要結果：

| 統計量 | 數值 |
|---|---|
| 路徑係數 F1→F2 | **0.356**（boot mean 0.408，SE 0.079，95% CI [0.262, 0.566]，t=4.52） |
| Loadings F1 | i1=0.776、i2=0.906、i3=0.759 |
| Loadings F2 | i4=0.836、i5=0.740、i6=0.795 |
| R²(F2) | 0.127 |
| Bootstrap loading CI（例） | i2 [0.776, 0.969]、i5 [0.261, 0.894] |

數值全部落在合理範圍，測量模型與結構模型行為正常。
**警訊：plspm 的 bootstrap 500 次在原生 CPython 就要 18 秒**（純 Python 迴圈實作），
搬進 Pyodide（wasm）預估 2–5 倍慢 → 40–90 秒，使用者體驗不可接受。
這對 Pyodide+plspm 路線是實質扣分；相同工作量的手寫 JS bootstrap
（N=60、6 指標、500 reps）以既有模組經驗估 <1 秒。

### Step 5：lavaan CFA — 沙盒無法執行，semopy 替代驗證通過（完全吻合）

lavaan wasm 同樣被擋。改用 semopy 2.3.11（PyPI）跑 2 因子 CFA，
對照 `tests/fixtures/reference.json` 的 `cfa_2factor`：

| 統計量 | reference.json | semopy 本次 | 差異 |
|---|---|---|---|
| chi2 | 7.224820 | 7.224820 | 2.7e-14 |
| df | 8 | 8 | 0 |
| CFI | 1.010076 | 1.010076 | 2.2e-16 |
| TLI | 1.018893 | 1.018893 | 6.7e-16 |
| RMSEA | 0 | 0 | 0 |

估計耗時 0.018s。chi2=7.22 即題目預期的「N 慣例」值（reference.json 本來就以
semopy(ML) 產生，故為同源複驗：確認環境、資料管線與基準檔一致無誤，
而非跨引擎交叉驗證；跨引擎驗證需 lavaan，見待辦）。

### Step 6：資產體積評估

實測 + 估算（標注者需在無白名單環境複核）：

| 資產 | 體積 | 來源 |
|---|---|---|
| webR 核心（npm dist，未壓縮） | **44MB**（R.wasm 18MB + base R vfs 26MB） | 實測 |
| 同上經 gzip/brotli 傳輸 | 估 15–20MB | 估算，需實測 |
| seminr wasm 依賴樹 | 估 2–4MB（純 R 套件） | 估算（沙盒不可達） |
| lavaan wasm 依賴樹 | 估 6–10MB（lavaan + MASS/mnormt/pbivnorm/quadprog/numDeriv，含 Fortran 編譯二進位） | 估算（沙盒不可達） |
| **webR 全套首載** | **估 25–35MB（壓縮後）** | — |
| Pyodide 核心（npm，未壓縮） | 14MB（init 1.78s） | 實測 |
| Pyodide + numpy/pandas/scipy wheels | 另需約 40MB+ | 估算（CDN 被擋無法實測） |

佐證：r-universe 已為 38,677/41,086 個 R 套件建好 wasm 二進位
（seminr、lavaan 均為活躍 CRAN 套件，屬於已建置範圍；lavaan 的 Fortran 依賴
webR 工具鏈可編譯）。自架方式官方支援：`rwasm` 套件可把指定套件打包成
CRAN-like 靜態目錄或 `library.data` 檔案系統映像，放 GitHub Pages/`public/` 即可。

### Step 7：替代路線快測（Pyodide）

- `npm install pyodide`（314.0.2）：1.7s，核心 14MB。
- Node 端 `loadPyodide()`：**1,778ms**，Python 3.14.2 可用。
- `loadPackage('numpy')`：失敗——嘗試從 cdn.jsdelivr.net 下載（被擋）。
  與 webR 同樣結論：核心走 npm 可離線，科學計算套件必須自架/vendor。
- 演算法層已由 Step 4/5 的 CPython 快測代驗：plspm 可算但 bootstrap 太慢，
  semopy 數值精確。

---

## 二、三路線比較

| 維度 | 手寫 JS（現行） | WebR + seminr/lavaan | Pyodide + plspm/semopy |
|---|---|---|---|
| 首載新增體積 | ~0 | 估 25–35MB（壓縮） | 估 40–60MB（壓縮） |
| 啟動耗時（載入後） | 0 | ~1s（Node 實測 978ms；瀏覽器另加下載） | ~1.8s |
| PLS 估計正確性 | 需自行實作+對基準驗證 | seminr = 業界基準之一，天然對齊 | plspm 演算法正確（本次驗證） |
| Bootstrap 500 效能 | 估 <1s（小資料、TypedArray） | 未實測；R 向量化實作，wasm 下估數秒–十數秒 | **原生已 18s，wasm 估 40–90s，不可接受** |
| SmartPLS 4 覆蓋 | 全部自寫（W1–W6 工作量大但可控） | seminr 只覆蓋部分（PLSc/HTMT/boot 有；MICOM、PLSpredict/CVPAT、FIMIX、IPMA 仍要自寫 R 膠水）＝工作從 JS 平移到 R，沒省掉 | plspm 只有最基本 PLS，覆蓋最差 |
| CB-SEM/CFA 能力 | 手寫 ML 估計難度高（W6 議題） | **lavaan = 金標準，這是 webR 的殺手級價值** | semopy 數值佳（本次 1e-14 吻合）但生態/口碑遜於 lavaan |
| 沙盒開發/CI | 完全可行（現行 180+ 斷言） | 核心可行（npm）；**套件須 vendor 進 repo 才能在沙盒測** | 同左，且 wheels 更大 |
| 部署（GitHub Pages） | 無特殊需求 | 可自架；**Pages 無法設 COOP/COEP header → 無 SharedArrayBuffer，須用 ServiceWorker/PostMessage channel，效能再打折** | 同左 |
| 與現有架構一致性 | 完全一致（模型 JSON in→結果 JSON out） | 需 R↔JS 序列化層、Worker 包裝、載入 UX，複雜度陡增 | 同左 |

## 三、建議：回手寫 JS（PLS-SEM）；WebR 留作 W6 CB-SEM 候選

**PLS-SEM（W1–W5）：no-go WebR，維持手寫 JS。** 理由：
1. PLS 演算法（外/內部估計迭代 + bootstrap）數學上輕量，資料規模小
   （N 數百、指標數十），JS 手寫效能與體積全面優勢；
2. seminr 不能免除 SmartPLS 4 對齊的自寫工作量，只是把膠水從 JS 換成 R，
   還倒賠 25–35MB 首載與 Worker/序列化複雜度；
3. 沙盒白名單使 webR 套件資產必須 vendor 進 repo，日常開發摩擦大；
4. 數值驗證管線不受影響：基準值可由 host 端 R（seminr/cSEM）或沙盒內
   plspm/semopy 產生，沿用 `generate_reference.py → fixtures → Vitest`。

**CB-SEM（W6 spike 承諾）：WebR + lavaan 為第一候選，本次已排除主要技術風險。**
Node 端核心 978ms 啟動、npm 自帶 wasm、自架有官方工具（rwasm）支援；
剩餘風險是資產體積實測與 Pages 無 COOP/COEP 的通道效能，屬工程題非可行性題。
Pyodide + semopy 為第二候選（數值已驗證精確，但沙盒同樣拿不到 wheels）。

**Pyodide + plspm：no-go**（bootstrap 效能硬傷 + 覆蓋面最窄）。

## 四、若未來 go WebR（CB-SEM 擴充）的瀏覽器端整合待辦

1. **資產自架**：在無白名單環境（Kevin Windows 本機或 GitHub Actions）用
   `rwasm::add_pkg(c('lavaan'))` 打包 wasm 套件庫，實測體積，產出放入
   `public/webr-repo/`（vendor 進 repo，同時解決沙盒測試與 Pages 部署）。
2. **通道選型**：GitHub Pages 設不了 COOP/COEP → 不能用 SharedArrayBuffer
   channel；實測 ServiceWorker channel vs PostMessage channel 的延遲差。
3. **Worker 包裝**：webR 已在 worker 內跑 R，但需自建 API 層——
   模型 JSON in → 結果 JSON out（與路線圖引擎介面一致）、bootstrap 進度回報、
   逾時/取消、錯誤翻譯（R error → 中文使用者訊息）。
4. **載入 UX**：25–35MB 首載需進度條、分段載入（核心先行、lavaan lazy）、
   Cache API/IndexedDB 快取與版本失效策略。
5. **數值驗證**：lavaan 輸出接入 reference.json 流程，與既有手寫 CFA 模組
   跨引擎交叉比對（真正的跨引擎驗證，補足本次 semopy 同源複驗的不足）。
6. **記憶體與行動端**：wasm heap 上限與 iOS Safari 限制實測（本次 Node 端
   plspm 峰值 166MB 供參）。
7. **沙盒 CI**：確認 vendored 套件庫在 Node/Vitest 下可用
   （`webr::mount` 本地 library image，不走網路）。

---

*實驗環境：Cowork 沙盒 Linux、Node v22.22.3、npm 10.9.8、Python 3.10.12、
webr@0.6.0、pyodide@314.0.2、plspm（PyPI）、semopy 2.3.11。*
*所有「估算」項目需在無網路白名單環境複核後更新本文件（v2）。*
