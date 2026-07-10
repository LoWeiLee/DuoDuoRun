/**
 * 繁體中文（台灣）字串對照表
 *
 * 命名空間：
 *   app.*       — 整體應用層級的字串（標題、副標題等）
 *   toolbar.*   — 頂部工具列
 *   sidebar.*   — 左側導覽列
 *   panels.*    — 三欄主內容區
 *   modes.*     — 教學模式 / 報告模式
 *   datasets.*  — 示範資料集名稱
 *   common.*    — 通用按鈕、提示
 */
export default {
  app: {
    title: '多多快跑',
    subtitle: 'DUODUORUN',
    tagline: '純前端統計分析工具，瀏覽器即可使用，免安裝、隱私不外流',
  },
  home: {
    heroTagline: '不會跑統計，就請多多幫你跑，雖然他會給你一個白眼，但你也會得到正確答案。',
    byAuthor: 'by 李洛維',
    authorUrl: 'https://qqamp.github.io/homepage/',
    cards: {
      purpose: {
        title: '用途',
        body:
          '為臺灣社會科學師生量身打造的統計分析工具。' +
          '涵蓋敘述統計、t 檢定、ANOVA、相關／迴歸、卡方、無母數、Cronbach\'s α、EFA 等 14 項常用方法，' +
          '所有運算結果都對齊 SPSS / JASP，並同時提供繁中與英文 APA 格式敘述以便撰寫論文。',
      },
      author: {
        title: '開發',
        body:
          '開發者：李洛維助理教授\n' +
          '所屬單位：臺灣警察專科學校海洋巡防科\n' +
          '研究領域：生成式AI與智慧政府、數位治理、資料治理、演算法偏誤與課責、科技法與數位人權、社會科學量化研究',
      },
      privacy: {
        title: '隱私聲明',
        body:
          '所有資料解析、統計運算、結果產出全部在您的瀏覽器本地執行。' +
          '本工具不呼叫任何 API、不收集任何使用者資訊，' +
          '上傳的檔案永遠不會離開您的電腦。',
      },
      citation: {
        title: '學術引用（尚未開放）',
        intro: '若本工具對您的論文有所助益，請以下列格式引用：',
        apaLabel: 'APA',
        bibtexLabel: 'BibTeX',
        apa:
          '李洛維（2026）。多多快跑：純前端統計分析工具（版本 1.0）[電腦軟體]。' +
          'https://qqamp.github.io/duoduorun/',
        bibtex:
          '@software{lee2026duoduorun,\n' +
          '  author  = {Lee, Lo-Wei},\n' +
          '  title   = {{DuoDuoRun}: A pure-frontend statistical analysis tool},\n' +
          '  year    = {2026},\n' +
          '  version = {1.0},\n' +
          '  url     = {https://qqamp.github.io/duoduorun/}\n' +
          '}',
        copy: '複製',
        copied: '已複製',
      },
    },
    footerPrefix: '本專案目前為測試版，尚未正式開放，問題回報與功能建議請至：',
    footerEmail: 'serpent910@gmail.com',
  },
  helper: {
    fabTitle: '不知道用什麼分析？',
    fabHint: '多多陪你選',
    fabBubble: '需要幫忙挑分析嗎？',
    intro: '嗨，我是多多。回答幾個問題，我幫你找最合適的分析方法 ✨',
    backBtn: '上一題',
    restartBtn: '重新開始',
    closeBtn: '關閉',
    recTitle: '推薦分析（點擊直接跳到該分析）',
    recNote: '※ 多個推薦時依適配度排序；可依研究脈絡自行選擇。',
    q: {
      start: '你目前想做的事偏向哪一類？',
      describe: '你想從什麼角度認識資料？',
      compareDv: '你比較的依變項（DV）型別是？',
      compareN: '你要比較幾組？',
      compareTwoDesign: '兩組是獨立還是配對？',
      compareManyDesign: '比較的設計是？',
      relate: '你的研究問題是？',
      scale: '你想評估什麼？',
      classify: '你想做哪一類分析？',
    },
    opt: {
      describe: '描述資料現況（看分布、平均、標準差等）',
      compare: '比較不同組別的差異',
      relate: '研究兩個或多個變項間的關係',
      scale: '評估量表 / 評分者的信效度',
      classify: '分類、降維、分群',
      summary: '看 N、平均、標準差等基本統計',
      visualize: '畫散布圖、直方圖、盒鬚圖',
      normality: '檢查資料是否常態分布',
      continuous: '連續（如分數、年齡、薪資）',
      categorical: '類別（如性別、偏好、是否通過）',
      nonnormal: '連續但偏態嚴重 / 樣本太小',
      oneVsFixed: '與一個固定值比（例：均值是否等於 70 分）',
      twoGroups: '2 組',
      threePlus: '3 組以上',
      independent: '兩組是不同人',
      paired: '同一群人在兩個情境（如前測 vs 後測）',
      between: '不同群組各做一次（被試間）',
      within: '同一群人多次測量（被試內）',
      mixed: '一個被試間因子 × 一個被試內因子',
      covariate: '比較組別但要控制其他連續變項',
      multiDv: '同時看多個 DV 是否有差',
      corr: '單純看兩變項的相關強度',
      simpleReg: '一個 X 預測連續 Y',
      multiReg: '多個 X 同時預測連續 Y',
      logisticReg: '多個 X 預測二元 Y（是/否、通過/未通過）',
      hierReg: '依理論分階段投入 X，看每階段的增量解釋力',
      reliability: '量表的內部一致性（α）',
      explore: '探索資料背後有幾個因子',
      confirm: '驗證預先設定的因子結構',
      agreementCat: '兩位評分者類別判斷的一致性',
      agreementCont: '多位評分者連續分數的一致性',
      lda: '已知類別，想找線性組合區分各組（含分類）',
      cluster: '未知類別，想自動把樣本分群',
    },
  },
  toolbar: {
    selectDataset: '選擇示範資料集',
    uploadData: '上傳資料',
    uploadHint: '支援 .csv / .xlsx / .xls；資料只在你的瀏覽器解析，不會上傳到伺服器',
    uploadingFile: '解析中…',
    uploadSuccess: '已載入 {n} 筆 × {k} 欄',
    uploadError: '上傳失敗：{msg}',
    uploadedLabel: '已上傳：{name}',
    uploadedGroupLabel: '使用者上傳',
    demoGroupLabel: '示範資料集',
    unsupportedFormat: '不支援的檔案格式：.{ext}（只支援 csv / xlsx / xls）',
    fileTooLarge: '檔案太大（{actual} MB），上限 {max} MB；請先在 Excel 中縮減資料或拆檔',
    decodedAsBig5: '偵測為 Big5 編碼並已自動轉換；若仍有亂碼，建議用 Excel 另存為 UTF-8 CSV 或直接用 .xlsx',
    encodingSuspect: '檔案編碼可能不是 UTF-8 也不是 Big5，欄名與類別值可能仍有亂碼；建議改用 .xlsx 上傳',
    ignoredSheets: '工作表「{used}」已載入；以下工作表未載入：{list}（多多目前只讀取第一張）',
    largeRowCount: '資料列數較多（{n} 筆），運算可能稍慢',
    warningsLabel: '提醒',
    export: '匯出報告',
    runsLocally: '本地運算',
    language: '語言',
    mode: '模式',
  },
  sidebar: {
    descriptive: '敘述統計',
    inferential: '推論統計',
    regression: '相關與迴歸',
    scale: '量表分析',
    multivariate: '多變量分析',
    sem: '結構方程模型',
    comingSoon: '即將開放功能',
    comingSoonHint: '規劃中，敬請期待',
    cbSem: 'CB-SEM 結構方程模型',
    plsSem: 'PLS-SEM',
    nca: 'NCA 必要條件分析',
    hlm: 'HLM 多層次模型',
    mcnemar: 'McNemar 檢定',
    friedman: 'Friedman 檢定',
    multinomialLogit: '多項邏輯斯迴歸',
    ordinalLogit: '順序邏輯斯迴歸',
    probit: 'Probit 迴歸',
    poisson: 'Poisson 迴歸',
    polynomialReg: '多項式迴歸',
    cox: 'Cox 比例風險（生存分析）',
    cca: '典型相關分析',
    bayesT: 'Bayesian t 檢定',
    bayesAnova: 'Bayesian ANOVA',
    bayesCorr: 'Bayesian 相關',
    irt: '項目反應理論 IRT',
    meta: '統合分析（Meta-analysis）',
    arima: 'ARIMA 時間序列',
    descStats: '基本敘述統計',
    normality: '常態性檢定',
    visualization: '資料視覺化',
    tTest: 't 檢定',
    oneWayAnova: '單因子 ANOVA',
    twoWayAnova: '雙因子 ANOVA',
    chiSquare: '卡方檢定',
    nonparametric: '無母數檢定',
    correlation: '相關分析',
    simpleRegression: '簡單迴歸',
    multipleRegression: '多元迴歸',
    logisticRegression: '邏輯斯迴歸',
    cronbachAlpha: "Cronbach's α",
    efa: '探索性因素分析',
    zProp: 'z 檢定（比例）',
    fisherExact: 'Fisher 精確檢定',
    kappa: "Cohen's Kappa（評分者一致性）",
    hierReg: '階層迴歸',
    ancova: 'ANCOVA 共變數分析',
    icc: 'ICC 組內相關係數',
    repAnova: '重複量數 ANOVA',
    mixedAnova: 'Mixed ANOVA（被試間×被試內）',
    manova: 'MANOVA 多變量變異數分析',
    lda: '判別分析（LDA）',
    cluster: '集群分析',
    cfa: 'CFA 驗證性因素分析',
  },
  panels: {
    configTitle: '分析設定',
    configEmpty: '請從左側選擇分析方法',
    configNoDataset: '先在右上角載入資料集',
    loadDemo: '載入示範設定',
    loadDemoHint: '一鍵載入適合此分析的示範資料與變數設定',
    demoLoaded: '已載入示範',
    copyTablesBtn: '複製表格',
    copyTablesHint: '把本頁所有結果表格複製為 Tab 分隔文字，貼到 Excel / Google Sheets 自動分欄',
    copiedTables: '已複製 {n} 張表',
    copyEmpty: '本頁尚無可複製的表格',
    assumpTitle: '假設前提概覽',
    assumpHint: '快速檢視「資料是否適合此分析」— 點開可看細節',
    assumpExpand: '展開細節',
    assumpCollapse: '收合',
    assumpStatus: { ok: '通過', warn: '注意', fail: '違反', info: '資訊', skip: '無法檢查' },
    assumpEmpty: '此分析未提供自動假設前提檢查',
    assumpChecks: {
      sampleSize: '有效樣本量',
      sampleSizeDetail: 'Listwise 後 N = {n}',
      sampleSizeDetailGroups: 'Listwise 後 N = {n}（{k} 組）',
      sampleSizeDetailRatio: 'N = {n}；預測變項 p = {p}（建議 N ≥ {recommended}，10 倍法則）',
      normality: '常態性（Shapiro-Wilk）',
      normalityGroup: '常態性 — {group} 組',
      normalityVar: '常態性 — {var}',
      normalityDiff: '差值常態性（前 − 後）',
      normalityDetail: 'n = {n}, W = {w}, p = {p}',
      varianceHomogeneity: '變異數同質（Levene）',
      leveneDetail: 'F({df1}, {df2}) = {f}, p = {p}',
      tooFewForNormality: '樣本太少（< 3）無法檢測',
      tooFewForLevene: '組數或樣本不足以檢測',
    },
    variablesTitle: '變數列表',
    resultTitle: '統計結果',
    resultEmpty: '此分析將於 Step 3 上線',
    resultNoDataset: '請先在右上角載入示範資料集',
    explainTitle: '方法說明',
    explainEmpty: '選擇分析方法後，此處顯示用途、前提假設、核心公式',
    explainTeaching: '此處將顯示分析方法的用途說明、前提假設、核心公式（教學模式）',
    explainReport: '此處將顯示 APA 格式的結果敘述（中文版 + 英文版）',
    previewTitle: '資料預覽',
    previewSubtitle: '顯示前 20 筆 — 共 {n} 筆 × {k} 個變數',
  },
  varTypes: {
    continuous: '連續',
    ordinal: '順序',
    categorical: '類別',
    unknown: '未知',
  },
  variables: {
    missing: '遺漏 {n}',
    distinct: '{n} 個不同值',
    noMissing: '無遺漏',
    transformed: '轉換',
    addTransform: '新增轉換',
    transformsTitle: '已建立的轉換',
    noTransforms: '尚未建立任何轉換',
  },
  viz: {
    title: '資料視覺化',
    types: {
      scatter: '散佈圖',
      histogram: '直方圖',
      boxplot: '盒鬚圖',
      heatmap: '相關矩陣熱圖',
    },
    typeHint: {
      scatter: '兩變數的線性關係，可選 X 與 Y；自動加上迴歸線',
      histogram: '單變數的次數分布；用 Freedman-Diaconis 規則自動分箱',
      boxplot: '單變數的中位數、四分位距與離群值；可分組',
      heatmap: '多變數兩兩相關矩陣，正相關 amber、負相關 denim',
    },
    config: {
      typeLabel: '圖型',
      xLabel: 'X 變數',
      yLabel: 'Y 變數',
      pickX: '請選 X',
      pickY: '請選 Y',
      groupVar: '分組變項（可選）',
      groupVarHint: '若選定類別變項，盒鬚圖會分組顯示',
      none: '不分組',
      multiVarsTitle: '選擇變數',
      multiVarsHint: '至少 2 個（熱圖）或 1 個（直方圖）',
      needAtLeastOne: '請選擇至少 1 個變數',
      needAtLeastTwo: '請選擇至少 2 個變數',
      regressionLine: '加上迴歸線',
    },
    notes: {
      purposeTitle: '用途',
      purpose:
        '視覺化是統計分析的「先看一眼」工具。\n' +
        '- 散佈圖：判斷兩變數是否線性、是否有離群值、是否有非線性關係\n' +
        '- 直方圖：判斷分布形狀（是否常態、偏態、雙峰）\n' +
        '- 盒鬚圖：比較多組的中央趨勢與離散；快速辨識離群值\n' +
        '- 熱圖：在多變數情境一眼看出相關結構',
      tipsTitle: '解讀提示',
      tips:
        '散佈圖：\n' +
        '- 點分布越接近一條直線 → 線性相關越強\n' +
        '- 點散得開但有方向感 → 弱線性相關\n' +
        '- 曲線形狀 → Pearson r 不適用，考慮 Spearman 或非線性模型\n\n' +
        '直方圖：\n' +
        '- 對稱單峰 → 接近常態\n' +
        '- 右尾長 → 右偏（如收入、反應時間）\n' +
        '- 雙峰 → 樣本可能混合兩個族群\n\n' +
        '盒鬚圖：\n' +
        '- 中位線在盒中位置偏離 → 偏態\n' +
        '- 鬚位不對稱 → 偏態\n' +
        '- 離群點散佈 → 極端值需檢視\n\n' +
        '熱圖：\n' +
        '- amber 越深 → 正相關越強；denim 越深 → 負相關越強\n' +
        '- 對角線是自相關（永遠 = 1）',
    },
  },
  norm: {
    title: '常態性檢定',
    selectVarsTitle: '選擇要檢定的變數',
    selectVarsHint: '勾選下方數值變數（連續或順序），會同時跑 Shapiro-Wilk 與 Kolmogorov-Smirnov',
    needAtLeastOne: '請至少勾選一個變數',
    cols: {
      variable: '變數',
      n: 'n',
      sw_w: 'SW W',
      sw_p: 'SW p',
      ks_d: 'KS D',
      ks_p: 'KS p',
      verdict: '判讀',
    },
    verdict: {
      normal: '近似常態',
      nonNormal: '違反常態',
      mixed: '結果不一致',
    },
    notes: {
      purposeTitle: '用途',
      purpose:
        '檢定樣本是否來自常態分布母體。\n常見用途：在執行 t 檢定／ANOVA／迴歸前，檢核「殘差或變數呈常態」的前提；違反時考慮無母數替代或變數轉換。',
      assumpTitle: '前提',
      assumptions:
        '1. 觀察值獨立\n2. 至少順序測量尺度\n3. 兩種檢定都對極小樣本（n < 20）檢定力不足，建議搭配 Q-Q 圖／直方圖視覺判讀',
      compareTitle: '兩種檢定的差別',
      compare:
        'Shapiro-Wilk（W）：對偏度敏感，n ≤ 50 一般檢定力較強；可至 n = 5000（Royston 1992）。\n' +
        'Kolmogorov-Smirnov（D，Lilliefors 修正）：對中央偏離敏感，傳統 KS 用樣本平均/SD 當參數須做 Lilliefors 修正才不過於保守，本工具已自動修正。\n\n' +
        '實務建議：\n' +
        '- 兩個都跑、都不顯著 → 常態假設站得住\n' +
        '- 只有 SW 顯著 → 偏度問題；考慮取對數或 Box-Cox\n' +
        '- 只有 KS 顯著 → 中央偏離（如雙峰）；視覺檢視\n' +
        '- n 很大 (> 300) → 兩個檢定都會「過於敏感」對輕微偏離也顯著，此時應該以 Q-Q 圖與偏峰度為主要判讀依據',
      formulasTitle: '核心公式',
      formulaSW: 'W = (Σa_i · x_(i))² / Σ(x_i − M̄)²',
      formulaKS: 'D = max |F_emp(x) − Φ((x − M̄) / SD)|',
      readingTitle: '怎麼讀',
      reading:
        'p < .05 → 拒絕「樣本來自常態母體」；p ≥ .05 → 不能拒絕（不等於「證明常態」）。\n\n' +
        '搭配偏度／峰度與 Q-Q 圖（待視覺化模組上線）一起判讀，比僅看 p 值穩健。',
    },
    apa: {
      sentence:
        '常態性檢定結果 — {var}：Shapiro-Wilk W = {w}, p = {pSW}；Kolmogorov-Smirnov（Lilliefors 修正）D = {d}, p = {pKS}（n = {n}）。',
      copyHint: '一鍵複製 APA 敘述',
    },
    interp: {
      header: '解讀',
      line: '{var}：{verdict}（SW: W = {w}, p = {pSW}；KS: D = {d}, p = {pKS}）',
    },
  },
  np: {
    title: '無母數檢定',
    types: {
      mw: 'Mann-Whitney U（獨立兩組）',
      wilcoxon: 'Wilcoxon Signed-Rank（配對）',
      kw: 'Kruskal-Wallis（三組以上）',
    },
    typeHint: {
      mw: '兩組獨立樣本秩和檢定；對應 t 檢定，但不要求常態',
      wilcoxon: '配對樣本秩和檢定；對應配對 t 檢定，但不要求差值常態',
      kw: '三組以上獨立樣本秩和 ANOVA；對應單因子 ANOVA，但不要求常態',
    },
    config: {
      typeLabel: '檢定型別',
      depVar: '依變項（連續或順序）',
      groupVar: '分組變項（剛好 2 組）',
      groupVarKW: '分組變項（≥ 3 組）',
      var1: '變項 1',
      var2: '變項 2',
      pickDep: '請選依變項',
      pickGroup: '請選分組變項',
      pickVar1: '請選變項 1',
      pickVar2: '請選變項 2',
      groupVarBadGroups: '此變項有 {k} 組，需要剛好 2 組',
      factorBadGroups: '此變項有 {k} 組，需要至少 3 組',
      showDunn: '顯示事後比較（Dunn）',
      dunnHint: 'KW 顯著時，用 Dunn 檢定做兩兩比較，並以 Bonferroni 校正多重檢定誤差',
    },
    result: {
      statsTitle: '檢定統計量',
      groupRanksTitle: '各組秩和',
      groupCol: '組別',
      cols: {
        u: 'U', u1: 'U₁', u2: 'U₂', wpos: 'W⁺', wneg: 'W⁻', t: 'T',
        h: 'H', df: 'df', z: 'z', p: 'p', n: 'n', meanRank: '平均秩', sumRank: '秩和',
        eps2: 'ε²', r: 'r（效果量）',
        pair: '配對組', meanRankA: '平均秩 A', meanRankB: '平均秩 B',
        diffRank: '|Δ平均秩|', zDunn: 'z', pRaw: '原始 p', pAdj: '校正 p（Bonferroni）',
      },
      tieNote: '結果含並列校正',
      droppedNote: '已剔除 {n} 對 D = 0',
      continuityNote: 'p 值已套用 ±0.5 連續性校正（與 SPSS / R wilcox.test 預設一致）',
      smallSampleNote: '樣本量小（n < 10），常態近似的精度有限；建議搭配實際效果量與描述統計判讀',
      allZeroDiffsNote: '所有配對差皆為 0，兩變數完全相同（p = 1）',
      effect: {
        small: '小', medium: '中', large: '大',
      },
      kwSigPosthoc:
        '整體 H 顯著時，建議用 Dunn 檢定做事後兩兩比較（可勾選左側「顯示事後比較（Dunn）」啟用）',
      dunnTitle: 'Dunn 事後比較（Bonferroni 校正）',
      dunnEmpty: '無可比較之配對',
    },
    notes: {
      purposeTitle: '用途',
      purposeMW:
        'Mann-Whitney U（亦稱 Wilcoxon rank-sum）檢定兩組獨立樣本的中位數位置是否不同。\n適用情境：' +
        '\n- 樣本不呈常態分布' +
        '\n- 順序量表資料（Likert）' +
        '\n- 樣本量小（n < 30）且常態性可疑',
      purposeWil:
        'Wilcoxon Signed-Rank 檢定兩個配對樣本的差值中位數是否為零。\n適用情境：' +
        '\n- 配對 t 檢定的差值不呈常態' +
        '\n- 順序量表的前後測比較',
      purposeKW:
        'Kruskal-Wallis H 檢定三組以上獨立樣本的位置參數是否不同。\n適用情境：' +
        '\n- 各組不呈常態分布' +
        '\n- 各組變異數明顯不等' +
        '\n- 順序量表的多組比較',
      assumpTitle: '前提假設',
      assumptionsMW:
        '1. 兩組獨立\n2. 兩組分布形狀類似（檢定中位數差異需此）\n3. 至少順序測量尺度',
      assumptionsWil: '1. 配對之間獨立\n2. 差值的分布對稱（檢定中位數差異需此）',
      assumptionsKW:
        '1. 各組獨立\n2. 各組分布形狀類似（檢定中位數差異需此）\n3. 至少順序測量尺度',
      formulasTitle: '核心公式',
      formulaMWU: 'U₁ = R₁ − n₁(n₁+1)/2，U₂ = n₁n₂ − U₁，U = min(U₁, U₂)',
      formulaMWZ: 'z = (U₁ − μ) / σ，含並列校正；p = 2(1 − Φ(|z|))',
      formulaWil: 'W⁺ = Σ rank(|D|) where D > 0；T = min(W⁺, W⁻)',
      formulaWilZ:
        'z = (W⁺ − n(n+1)/4) / √((n(n+1)(2n+1) − Σ(t³−t)/2)/24)',
      formulaKW:
        'H = (12/(N(N+1))) Σ(R_i² / n_i) − 3(N+1)，並列校正後 / (1 − Σ(t³−t)/(N³−N))',
      formulaKWdf: 'df = k − 1；p 從 χ²(df) 右尾',
      formulaEffMW: '效果量 r = |z| / √N',
      formulaEffKW: '效果量 ε² = (H − k + 1) / (N − k)',
      readingTitle: '怎麼讀',
      reading:
        '1. p < .05 → 拒絕 H₀（兩組／多組分布位置相同）\n' +
        '2. 效果量 r：< 0.1 微弱、< 0.3 小、< 0.5 中、≥ 0.5 大\n' +
        '3. KW 顯著後建議跑 Dunn 兩兩事後比較\n\n' +
        '與 t / ANOVA 的選用：\n' +
        '- 樣本量小、常態性可疑、有極端值或順序量表 → 無母數\n' +
        '- 樣本量大且常態性 OK → t / ANOVA 通常更具檢定力',
      dunnNote:
        'Dunn 事後比較：當 KW 整體檢定顯著時，用以辨識「哪幾組之間」存在差異。\n' +
        '統計量：對每對組別計算 z = (R̄_i − R̄_j) / SE，其中 SE 採全資料 pooled rank 的變異並含並列校正；' +
        '由常態分布求得原始 p。\n' +
        '多重檢定校正：對 m = k(k−1)/2 個比較數套用 Bonferroni（p_adj = min(1, p × m)）；' +
        '較保守、family-wise error 控制嚴格。\n' +
        '判讀：以「校正後 p」為主，校正 p < .05 視為該對差異顯著。',
    },
    apa: {
      mw:
        'Mann-Whitney U 檢定結果顯示，{g1Name} 與 {g2Name} 之間的{depLabel}{sigWord}差異，U = {u}, z = {z}, p = {pStr}，效果量 r = {r}（{effect}）。',
      wilcoxon:
        'Wilcoxon Signed-Rank 檢定結果顯示，{var1Name} 與 {var2Name} 之間{sigWord}差異，T = {t}, z = {z}, p = {pStr}, n = {n}（剔除 {nDropped} 對 D = 0），效果量 r = {r}（{effect}）。',
      kw:
        'Kruskal-Wallis H 檢定結果顯示，{factor} 對 {depLabel} 的影響{sigWord}，H({df}, N = {n}) = {h}, p = {pStr}，ε² = {eps2}。',
      sigYes: '達顯著',
      sigNo: '未達顯著',
      copyHint: '一鍵複製 APA 敘述',
    },
    narrative: {
      dunnLine:
        '事後採用 Dunn 兩兩比較並以 Bonferroni 校正多重檢定誤差（m = {m}）。校正後 p < .05 之顯著配對為：{sigPairs}。',
      dunnNoSig: '無顯著配對',
    },
    interp: {
      header: '解讀',
      mw:
        '結論：{g1Name}（平均秩 = {mr1}）與 {g2Name}（平均秩 = {mr2}）的{depLabel}{sigWord}差異（U = {u}, z = {z}, p = {pStr}）。' +
        '\n效果量 r = {r}，屬於{effect}效果量。',
      wilcoxon:
        '結論：{var1Name} 與 {var2Name} 之間的差異{sigWord}（W⁺ = {wpos}, W⁻ = {wneg}, T = {t}, z = {z}, p = {pStr}, n = {n}）。' +
        '\n效果量 r = {r}，屬於{effect}效果量。',
      kw:
        '結論：{factor} 對 {depLabel} 的影響{sigWord}（H({df}, N = {n}) = {h}, p = {pStr}）。' +
        '\nε² = {eps2}。',
      kwPosthoc: '注意：H 顯著後，建議跑 Dunn 兩兩事後比較。',
      sigYes: '達顯著',
      sigNo: '未達顯著',
    },
  },
  ancova: {
    title: 'ANCOVA 共變數分析',
    config: {
      yLabel: '依變項 Y（連續）',
      pickY: '請選依變項',
      factorLabel: '因子（類別變項）',
      pickFactor: '請選因子',
      factorHint: '需為類別型變數，至少 2 個層級',
      covLabel: '共變項（≥ 1，連續）',
      covHint: '勾選下方數值變項作為共變項；不可包含依變項',
    },
    errors: {
      pickDep: '請選擇依變項',
      pickFactor: '請選擇因子',
      pickCov: '請至少勾選 1 個共變項',
      covIsY: '依變項不可同時為共變項',
      covIsFactor: '因子不可同時為共變項',
      factorBadGroups: '因子目前僅有 {k} 組，至少需要 2 組',
      tooFewN: '有效樣本數不足以估計（需 N > k + p + 1）',
      'singular-matrix': "設計矩陣共線性過高，無法求解（X'X 不可逆）",
      'length-mismatch': '資料長度不一致',
    },
    result: {
      homoTitle: '斜率同質性檢定',
      homoLabel: 'Factor × Covariate 交互項',
      homoOk: '通過',
      homoViolated: '違反',
      homoNotComputable: '樣本數或變項組合不足以檢定（如 N − k − p − 交互項數 ≤ 0）。',
      homoViolationWarn:
        '警告：斜率同質性假設違反（交互項 p < .05）— 不同因子層級下，共變項對依變項的關係不同，此時 ANCOVA 的調整平均可能誤導，建議改用 moderation 模型或分組分析。',
      tableTitle: 'ANCOVA 表（Type-III 調整 SS）',
      rawMeansTitle: '原始平均（未調整）',
      adjMeansTitle: '調整後平均（LS Means）',
      adjMeansHint: '調整後平均：將共變項固定於樣本總平均值後的預測值；95% CI 以 ±1.96·SE 計算（大樣本近似）。',
      cols: {
        source: '變異來源', ss: 'SS', df: 'df', ms: 'MS', f: 'F', p: 'p',
        partialEta2: 'partial η²', error: '誤差', total: '總和',
        level: '層級', mean: '平均', adjMean: '調整後平均', se: 'SE', ci95: '95% CI',
      },
      effectInterp: { small: '小效果', medium: '中效果', large: '大效果' },
    },
    interp: {
      header: '解讀',
      sigYes: '達顯著',
      sigNo: '未達顯著',
      overall:
        '在控制共變項後，因子「{factor}」對依變項「{yLabel}」的主效應 F({df1}, {df2}) = {f}, p = {pStr} → {sigWord}；partial η² = {eta2}（{etaInterp}）。',
      covSection: '各共變項的調整後檢定：',
      covLine: '{name}：F({df1}, {df2}) = {f}, p = {pStr}，partial η² = {eta2} → {sigWord}',
    },
    notes: {
      purposeTitle: '用途',
      purpose:
        'ANCOVA 同時保留 ANOVA（比較組間平均）與迴歸（用連續變項解釋變異）的優點。\n常見情境：\n1. 實驗組 vs 控制組比較依變項時，先排除前測分數 / 年齡 / 智商等共變項影響。\n2. 想知道「在控制 X 變項後，組間差異是否仍存在」。\n3. 提高統計檢定力 — 共變項解釋了部分組內變異，使 MS_error 縮小。',
      assumpTitle: '前提假設',
      assumptions:
        '1. 依變項為連續、共變項為連續、因子為類別\n' +
        '2. 觀察值獨立\n' +
        '3. 殘差呈常態、同質變異\n' +
        '4. 共變項與依變項為線性關係\n' +
        '5. 共變項與因子獨立（共變項不應受實驗操弄影響）\n' +
        '6. ★ 斜率同質性（homogeneity of regression slopes）— 不同因子層級下，共變項對依變項的迴歸斜率相同；違反時 ANCOVA 的調整失準。',
      formulasTitle: '核心公式',
      formulaModel: 'Y = β₀ + Σ β_g · Dummy_g + Σ β_j · Cov_j + ε',
      formulaSSfactor: 'SS_factor = SS_res(reduced: 只含 covariates) − SS_res(full)',
      formulaSScov: 'SS_cov_j = SS_res(去除 cov_j 的模型) − SS_res(full)',
      formulaF: 'F = MS_effect / MS_error；df_factor = k − 1，df_error = N − k − p',
      formulaPartialEta2: 'partial η² = SS_effect / (SS_effect + SS_error)',
      formulaAdjMean:
        '調整後平均_g = β̂₀ + β̂_g + Σ β̂_j · C̄_j（C̄_j 為共變項 j 的總平均）',
      formulaHomo:
        '斜率同質性 F = ((SS_res_full − SS_res_homo) / 交互項數) / (SS_res_homo / df_homo)',
      readingTitle: '怎麼讀',
      reading:
        '1. ★ 先看「斜率同質性檢定」：若違反（p < .05），ANCOVA 的解讀都要打折扣，建議改用其他方法。\n' +
        '2. 看 ANCOVA 表中「因子」的 F 與 p：在控制共變項後，組間差異是否顯著？\n' +
        '3. 看各共變項的 F 與 p：哪些共變項對依變項有顯著影響？\n' +
        '4. 看 partial η²：因子或共變項各自的效果量大小（< .06 小、< .14 中、≥ .14 大）。\n' +
        '5. 看「調整後平均」（LS Means）：這才是 ANCOVA 真正用於組間比較的數值，不是原始平均。\n\n' +
        '常見陷阱：\n' +
        '- 共變項本身受處理變項影響 → 違反「共變項與因子獨立」假設，會抹除真實效果\n' +
        '- 用 ANCOVA 取代隨機分派 → 觀察性研究的 ANCOVA 不能完全消除選擇偏誤\n' +
        '- 忽略斜率同質性 → 直接報告 ANCOVA 結果可能誤導',
    },
    apa: {
      sentence:
        '為檢視在控制 {covList} 後，{factor} 對 {yLabel} 是否仍有顯著差異，本研究進行 ANCOVA（N = {n}）。結果顯示，{factor} 主效應達顯著，F({df1}, {df2}) = {f}, p = {pStr}，partial η² = {eta2}。{covSection}{homoSection}',
      sentenceNs:
        '為檢視在控制 {covList} 後，{factor} 對 {yLabel} 是否仍有顯著差異，本研究進行 ANCOVA（N = {n}）。結果顯示，{factor} 主效應未達顯著，F({df1}, {df2}) = {f}, p = {pStr}，partial η² = {eta2}。{covSection}{homoSection}',
      covOpener: '共變項方面，',
      covLine: '{name}（F({df1}, {df2}) = {f}, p = {pStr}, partial η² = {eta2}）',
      homoOk: ' 斜率同質性檢定 F({df1}, {df2}) = {f}, p = {pStr}，未違反斜率同質性假設。',
      homoBad: ' 斜率同質性檢定 F({df1}, {df2}) = {f}, p = {pStr}，已違反斜率同質性假設，結果應審慎解讀。',
      copyHint: '一鍵複製 APA 敘述',
    },
  },
  icc: {
    title: 'ICC 組內相關係數',
    config: {
      selectRatersTitle: '選擇評分者欄位',
      selectRatersHint: '勾選每位評分者對應的數值欄（每列 = 一位受試者；每欄 = 一位評分者）。建議至少 2 位評分者，3 位以上更穩定。',
    },
    result: {
      summaryTitle: '摘要',
      anovaTitle: 'ANOVA 均方分解',
      variantTitle: 'ICC 六種變體（Shrout & Fleiss, 1979）',
      designNote: '兩因子 ANOVA（受試者 × 評分者，不含交互項）',
      droppedNote: '因遺漏值剔除 {n} 列（listwise deletion）',
      interpRange: '解讀慣例（Koo & Li, 2016）：< .50 不佳、.50–.75 中等、.75–.90 良好、≥ .90 極佳',
      cols: {
        n: '有效樣本', k: '評分者數', design: '設計', source: '變異來源',
        df_short: 'df', ms: 'MS（均方）',
        variant: '變體', description: '說明', icc: 'ICC', ci95: '95% CI',
        f: 'F', df: 'df₁, df₂', p: 'p', interp: '解讀',
      },
      rows: {
        between: '受試者間 (Between-subject, MS_R)',
        raterCol: '評分者間 (Between-rater, MS_C)',
        residual: '殘差 (Residual, MS_E)',
        within: '受試者內 (Within-subject, MS_W)',
      },
      variantLabel: {
        icc1_1: 'ICC(1,1)', icc1_k: 'ICC(1,k)',
        icc2_1: 'ICC(2,1)', icc2_k: 'ICC(2,k)',
        icc3_1: 'ICC(3,1)', icc3_k: 'ICC(3,k)',
      },
      variantDesc: {
        icc1_1: '單因子隨機・單一評分者',
        icc1_k: '單因子隨機・平均評分',
        icc2_1: '雙因子隨機・單一評分者・絕對一致',
        icc2_k: '雙因子隨機・平均評分・絕對一致',
        icc3_1: '雙因子混合・單一評分者・一致性',
        icc3_k: '雙因子混合・平均評分・一致性',
      },
    },
    errors: {
      needAtLeast2Raters: '請至少選擇 2 位評分者欄位',
      needAtLeast3Subjects: '有效樣本數不足（每位評分者皆有資料的受試者需至少 3 位）',
    },
    interp: { poor: '不佳', moderate: '中等', good: '良好', excellent: '極佳' },
    decisionTree: {
      header: '我該報哪一種 ICC？（決策樹）',
      body:
        '步驟 1｜評分者是否每位受試者都由同一組（例如固定 3 位評審），還是每位受試者隨機抽到不同評分者？\n  · 每位受試者隨機配到不同評分者 → ICC(1, *)\n  · 同一組評分者評所有受試者，且該組為母體中的隨機樣本 → ICC(2, *)\n  · 同一組評分者評所有受試者，但只想推論到「這幾位評分者」 → ICC(3, *)\n\n步驟 2｜要報「單一評分者」還是「k 位評分者平均分數」的信度？\n  · 實務只用一位 → ICC(*, 1)\n  · 實務取 k 位平均 → ICC(*, k)\n\n步驟 3（僅 ICC(2, *) vs ICC(3, *)）｜要求「絕對一致」還是「相對一致」？\n  · 在意絕對值（含系統性偏差） → 絕對一致（ICC(2, *)）\n  · 只在意排序 → 一致性（ICC(3, *)）\n\n常見場景：\n  · 多人評同一批受試者、要推論到母體評分者 → ICC(2,1) 或 ICC(2,k)\n  · 同一儀器重複測量、評分者固定不外推 → ICC(3,1) 或 ICC(3,k)\n  · 報告慣例：同時提供值 + 95% CI，並依 Koo & Li (2016) 解讀。',
    },
    notes: {
      purposeTitle: '用途',
      purpose:
        '評估「同一受試者由多位評分者（或多次測量）所得分數的一致性」。\n常見情境：\n1. 多位評審打分（rater agreement）\n2. 同一受試者重複測量（test–retest reliability）\n3. 量表項目間的同質性（Cronbach\'s α 為主流）\n\n關鍵：ICC 不是單一公式，而是 6 種變體（Shrout & Fleiss, 1979）。',
      assumpTitle: '前提假設',
      assumptions:
        '1. 受試者為隨機樣本\n' +
        '2. 兩因子設計下，受試者 × 評分者交互效應假設可忽略\n' +
        '3. 殘差近似常態、等變異\n' +
        '4. ICC(1, *)：每位受試者由不同評分者評\n' +
        '5. ICC(2, *)：同組評分者，且為母體隨機樣本\n' +
        '6. ICC(3, *)：同組評分者，但為固定（不外推）\n' +
        '7. listwise deletion：任一評分者欄缺值即剔除該受試者',
      formulasTitle: '核心公式',
      formulaAnova:
        'MS_R = SS_R / (n−1)；MS_C = SS_C / (k−1)；MS_E = SS_E / ((n−1)(k−1))；MS_W = (SS_C + SS_E) / (n(k−1))',
      formulaIcc1_1: '(MS_R − MS_W) / (MS_R + (k−1)·MS_W)',
      formulaIcc1_k: '(MS_R − MS_W) / MS_R',
      formulaIcc2_1: '(MS_R − MS_E) / (MS_R + (k−1)·MS_E + k·(MS_C − MS_E)/n)',
      formulaIcc2_k: '(MS_R − MS_E) / (MS_R + (MS_C − MS_E)/n)',
      formulaIcc3_1: '(MS_R − MS_E) / (MS_R + (k−1)·MS_E)',
      formulaIcc3_k: '(MS_R − MS_E) / MS_R',
      readingTitle: '怎麼讀',
      reading:
        '1. 先確認研究設計，選對 ICC 變體（見中欄決策樹）。\n' +
        '2. 解讀慣例（Koo & Li, 2016）：< .50 不佳、.50–.75 中等、.75–.90 良好、≥ .90 極佳\n' +
        '3. 報告務必同時呈現 95% CI；單看點估計易高估或低估。\n' +
        '4. F 檢定虛無假設為 ICC = 0，達顯著僅代表信度顯著大於 0、不代表「夠好」。\n' +
        '5. 平均評分（*, k）通常高於單一評分者（*, 1），這是 Spearman-Brown 效應；不要直接互比。\n' +
        '6. ICC 對極端離群值敏感；必要時做 sensitivity analysis。',
    },
    narrative: {
      copyHint: '一鍵複製 APA 敘述',
      sentence:
        '本研究以 ICC 評估「{itemList}」這 {k} 位評分者對 {n} 位受試者所給分數的評分者間信度。' +
        '採 Shrout & Fleiss (1979) 雙因子隨機、絕對一致、單一評分者形式（ICC(2,1)）：' +
        'ICC = {icc}，95% CI {ci}，F({df1}, {df2}) = {f}, p = {pStr}（{interp}信度）。',
    },
  },
  repAnova: {
    title: '重複量數 ANOVA',
    config: {
      selectConditionsTitle: '選擇重複測量條件',
      selectConditionsHint: '勾選同一受試者在不同時點 / 條件下的測量欄位（至少 2 欄；每列代表一位受試者，每欄代表一個重複測量條件）',
    },
    result: {
      summaryTitle: '整體摘要',
      descTitle: '各條件敘述統計',
      mauchlyTitle: 'Mauchly 球形檢定',
      mauchlyLabel: '球形假設',
      mauchlyOk: '球形假設成立',
      mauchlyViolated: '球形假設違反',
      mauchlyNotApplicable: '只有 2 個條件，球形假設自動成立，不需 Mauchly 檢定。',
      anovaTitle: 'RM-ANOVA 表（含球形校正）',
      recOk: 'Mauchly 球形檢定未違反，建議直接報告 Sphericity Assumed 列。',
      recViolated: 'Mauchly 球形檢定 p < .05，球形假設違反。建議報告 Greenhouse-Geisser 校正（保守、最常用）；若 ε_GG > 0.75 也可改用 Huynh-Feldt 校正以提高檢定力。',
      recK2: 'k = 2 時球形假設自動成立，直接報告 Sphericity Assumed 列即可。',
      cols: {
        n: 'n（受試者）', kCond: 'k（條件數）',
        condition: '條件', mean: 'M', sd: 'SD',
        source: '來源', eps: 'ε', ss: 'SS', df: 'df',
        dfTreat: 'df（處理）', dfError: 'df（誤差）',
        ms: 'MS', f: 'F', p: 'p',
        partialEta2: '偏 η²', etaG2: '一般化 η²_G',
      },
      sources: {
        sa: '球形假設成立',
        gg: 'Greenhouse-Geisser',
        hf: 'Huynh-Feldt',
        lb: '下界（Lower-bound）',
        error: '誤差（受試者×條件）',
        bs: '受試者間',
        total: '總和',
      },
      effectInterp: { small: '小', medium: '中', large: '大' },
    },
    errors: {
      needAtLeast2: '請至少勾選 2 個條件欄位',
      tooFewN: '有效樣本太少（listwise 刪除後 n = {n}）',
    },
    interp: {
      header: '解讀',
      sigYes: '達顯著',
      sigNo: '未達顯著',
      overall:
        '本研究在 N = {n} 位受試者的 k = {k} 個重複測量條件上進行 RM-ANOVA。' +
        '依據{sourceName}列，F({df1}, {df2}) = {f}, p = {pStr}，{sigWord}；' +
        '\n效果量：偏 η² = {eta2}（{etaInterp}），一般化 η²_G = {etaG2}。',
      useSA: '※ Mauchly 球形檢定未違反，採用 Sphericity Assumed 列作為主要報告依據。',
      useGG: '※ Mauchly 球形檢定顯著違反球形假設，已自動以 Greenhouse-Geisser 校正後的 df 與 p 為解讀依據。',
      k2Note: '※ k = 2，球形假設自動成立，無需校正。',
    },
    notes: {
      purposeTitle: '用途',
      purpose:
        '比較同一群受試者在 ≥ 2 個重複測量條件（時點 / 處理 / 情境）下的平均數是否有差異。\n' +
        '相較於獨立樣本 ANOVA，本檢定能夠把「個體間差異」單獨抽離（受試者間 SS），讓條件主效應的誤差項變小，檢定力較高。\n' +
        '常見情境：前測 / 後測 / 追蹤；不同實驗條件下的同一群受試者。',
      assumpTitle: '前提假設',
      assumptions:
        '1. 觀察值在受試者層級獨立\n' +
        '2. 各條件的依變項近似常態分布\n' +
        '3. 球形假設（sphericity）：所有條件兩兩差分的變異數相等\n' +
        '   - k = 2 時自動成立\n' +
        '   - k ≥ 3 用 Mauchly 檢定；違反需 Greenhouse-Geisser 或 Huynh-Feldt 校正\n' +
        '4. 寬資料格式：每列 = 一位受試者，每欄 = 一個重複測量條件',
      formulasTitle: '核心公式',
      formulaSStotal: 'SS_總 = Σᵢⱼ (Yᵢⱼ − Ȳ)²；df_總 = nk − 1',
      formulaSSbs: 'SS_受試者間 = k · Σᵢ (Ȳᵢ − Ȳ)²；df = n − 1',
      formulaSStreat: 'SS_處理 = n · Σⱼ (Ȳⱼ − Ȳ)²；df = k − 1',
      formulaSSerror: 'SS_誤差 = SS_受試者內 − SS_處理；df = (n − 1)(k − 1)',
      formulaF: 'F = MS_處理 / MS_誤差',
      formulaPartialEta2: '偏 η² = SS_處理 / (SS_處理 + SS_誤差)',
      formulaEtaG2: '一般化 η²_G = SS_處理 / (SS_處理 + SS_受試者間 + SS_誤差)',
      formulaMauchly:
        "Mauchly W = det(S) / (tr(S)/(k−1))^(k−1)；S 為 (k−1) 個正交對比的樣本共變異矩陣\n" +
        "χ² = −[(n−1) − (2(k−1)² + (k−1) + 2) / (6(k−1))] · ln(W)",
      formulaGG: 'ε_GG = (tr S)² / [(k−1) · tr(S²)]',
      formulaHF: 'ε_HF = min{ 1, [n(k−1)·ε_GG − 2] / [(k−1)·((n−1) − (k−1)·ε_GG)] }',
      formulaLB: 'ε_LB = 1 / (k−1)',
      readingTitle: '怎麼讀',
      reading:
        '1. 先看 Mauchly 球形檢定（k ≥ 3 才有）：p < .05 → 球形假設違反，需要校正。\n' +
        '2. 若球形成立 → 報告 Sphericity Assumed 列。\n' +
        '3. 若球形違反 → 報告 Greenhouse-Geisser 列（最常用）；若 ε_GG > 0.75 也可改用 Huynh-Feldt。\n' +
        '4. F 值在四列都相同；只有 df（與隨之而來的 p）會被 ε 收縮。\n' +
        '5. 效果量同時報告偏 η² 與一般化 η²_G。\n\n' +
        '常見陷阱：\n' +
        '- 球形違反卻報未校正 F → df 高估、p 失真。\n' +
        '- 寬資料格式必須對齊：任一欄缺值即整列剔除。\n' +
        '- 整體 F 顯著只代表至少有兩個條件不同；找哪幾對需另做配對比較。',
    },
    apa: {
      sentence:
        '針對 N = {n} 位受試者在 {k} 個重複測量條件（{condList}）上執行重複量數變異數分析。' +
        '{sphericitySection}' +
        '{correction}下，主效應達顯著，F({df1}, {df2}) = {f}, p = {pStr}，偏 η² = {eta2}，η²_G = {etaG2}。',
      sentenceNs:
        '針對 N = {n} 位受試者在 {k} 個重複測量條件（{condList}）上執行重複量數變異數分析。' +
        '{sphericitySection}' +
        '{correction}下，主效應未達顯著，F({df1}, {df2}) = {f}, p = {pStr}，偏 η² = {eta2}，η²_G = {etaG2}。',
      sphericityOk:
        'Mauchly 球形檢定未違反球形假設（W = {w}，χ²({df}) = {chi2}, p = {pStr}）。',
      sphericityViolated:
        'Mauchly 球形檢定顯示球形假設違反（W = {w}，χ²({df}) = {chi2}, p = {pStr}），故採 Greenhouse-Geisser 校正（ε = {epsGG}）報告。',
      k2Note: '由於僅有 2 個條件，球形假設自動成立，未進行 Mauchly 檢定。',
      saLabel: '在球形假設成立',
      ggLabel: '經 Greenhouse-Geisser 校正',
      copyHint: '一鍵複製 APA 敘述',
    },
  },
  lda: {
    title: 'LDA 線性判別分析',
    config: {
      groupLabel: '分組變項（類別變項，≥ 2 組）',
      pickGroup: '請選分組變項',
      groupHint: '需為類別型變數，至少 2 個層級；其層級即為待分類的目標類別',
      predictorsLabel: '預測變項（≥ 2 個連續變項）',
      predictorsHint: '勾選下方數值變項作為判別函數的預測變項；至少需要 2 個，分組變項不可同時為預測變項',
    },
    errors: {
      pickGroup: '請選擇分組變項',
      pickPredictors: '請至少勾選 2 個預測變項',
      'group-in-predictors': '分組變項不可同時為預測變項',
      groupBadGroups: '分組變項目前僅有 {k} 組，至少需要 2 組',
      tooFewN: '有效樣本數不足（N = {N}，至少需要 N > k + p；目前 k = {k}, p = {p}）',
      singularPooled: '組內共變數矩陣 S_p 不可逆（可能變項共線性過高）；建議移除高度相關的預測變項',
    },
    result: {
      groups: '組', predictors: '個預測變項', functions: '判別函數數', cases: '筆資料',
      functionsTitle: '判別函數總表',
      functionsHint: '可保留的判別函數最多為 min(k − 1, p) 個；Wilks Λ 與 χ² 為「從第 j 個函數起」之累積檢定（達 .05 表示該函數仍承載顯著訊息）。',
      stdCoefTitle: '標準化典型係數（Standardized canonical coefficients）',
      stdCoefHint: '已縮放使 wᵀ S_p w = 1；絕對值較大者代表該預測變項在判別函數中的相對重要性。淡色 < 0.32（弱），中色 0.32–0.55（中），暖色 ≥ 0.55（強）。',
      structureTitle: '結構矩陣（Structure matrix）',
      structureHint: '結構係數 = 預測變項與判別分數之相關。慣例上 |r| ≥ 0.30 視為對該函數有意義；解釋潛在構念時較不受多元共線性干擾，建議優先以結構矩陣命名各函數。',
      centroidsTitle: '群組重心（Group centroids）',
      centroidsHint: '各組組平均投影到判別軸上的值；正負與大小可顯示各組在判別空間中的位置。',
      classifyTitle: '分類結果（Resubstitution）',
      overallAccuracy: '整體分類準確率',
      classifyHint: '對角線（暖色 highlight）為正確分類人次；非對角線為被錯分到他組的人次。注意：本準確率為 resubstitution（用全資料分類自己），會高估真實分類效力，正式報告建議再做 cross-validation。',
      boxMTitle: "Box's M 同質共變數矩陣檢定",
      boxMLabel: '共變數矩陣同質性',
      boxMOk: '通過（p > .001）', boxMViolated: '違反（p ≤ .001）',
      boxMNotApplicable: '無法計算（可能某組樣本太小或共變數矩陣為奇異）。',
      boxMViolatedWarn: "警告：Box's M 顯著（p ≤ .001）— 各組共變數矩陣不同質，違反 LDA 共同 Σ 假設；建議改用二次判別分析（QDA）或謹慎解讀分類結果。",
      cols: {
        function: '函數', eigenvalue: '特徵值 λ', canonicalR: '典型相關 r',
        percent: '% of var', cumulative: 'Cumulative %',
        wilks: "Wilks' Λ", chi2: 'χ²', df: 'df', p: 'p',
        predictor: '預測變項', group: '組別',
        actualBackslashPredicted: '實際 ＼ 預測',
        total: '總和', classAccuracy: '分組準確率',
      },
      accuracyInterp: {
        poor: '低（< 50%）', modest: '中等（50–70%）',
        good: '良好（70–85%）', excellent: '極佳（≥ 85%）',
      },
    },
    interp: {
      header: '解讀', sigYes: '達顯著', sigNo: '未達顯著',
      overall:
        '本研究以 LDA 檢定 {p} 個預測變項是否能有效區分 {group}（k = {k} 組）的成員（N = {n}）。\n' +
        '可萃取 {nFns} 個判別函數，其中第 1 函數的 Wilks Λ = {f1Lambda}, χ²({f1Df}) = {f1Chi2}, p = {f1Pstr} → {sigWord}；典型相關 = {f1CanR}，解釋 {f1PctVar}% 之判別變異。\n' +
        '以線性判別分數對訓練樣本進行 resubstitution 分類，整體準確率 = {accPct}%（{accInterp}）。',
      boxLine: "Box's M：χ²({df}) = {chi2}, p = {pStr} — {verdict}",
      boxOk: '共變數矩陣同質假設通過',
      boxBad: '共變數矩陣同質假設違反，LDA 結果建議謹慎解讀，必要時改採 QDA',
      boxNotApplicable: "Box's M 無法計算（樣本或共變數矩陣條件不足）。",
      sigFollowUp: '判別函數顯著，可進一步以結構矩陣命名各函數背後的潛在構念，並用 group centroids 描述各組在判別空間中的相對位置。',
      nsAdvice: '判別函數未達顯著，預測變項對組別差異的整體區分力有限，不建議據此做分類用途。',
    },
    notes: {
      purposeTitle: '用途',
      purpose:
        'LDA（線性判別分析）同時是「分類工具」與「降維工具」：以多個連續預測變項，找出最能將既有類別分開的線性組合。\n' +
        '常見情境：\n' +
        '1. 以心理量表分數預測診斷分類（如焦慮、憂鬱、混合型）。\n' +
        '2. 以財務指標分類公司（如健康、警示、危機）。\n' +
        '3. MANOVA 顯著後，想進一步看是哪幾個 DV 組合在區分組別。\n\n' +
        '與其他方法的關係：\n' +
        '- 與 MANOVA：數學等價，差別在 LDA 關注「如何把組分開」與「分類」，MANOVA 關注「組別是否影響 DV 向量」。\n' +
        '- 與邏輯斯迴歸：LDA 假設預測變項多元常態 + 共同 Σ；邏輯斯迴歸不需要，當假設成立 LDA 較有效率，假設違反時邏輯斯迴歸更穩健。',
      assumpTitle: '前提假設',
      assumptions:
        '1. 多變量常態（每組內，預測變項向量服從多元常態）\n' +
        "2. 共變數矩陣同質（各組 Σ 相同）→ 用 Box's M 檢定；違反時改用 QDA\n" +
        '3. 觀察值獨立\n' +
        '4. 預測變項為連續尺度且彼此無嚴重共線（否則 W^-1 數值不穩）\n' +
        '5. 樣本量：每組 n_g 應大於 p（建議 n_g ≥ 20 + p）\n' +
        '6. 無嚴重多元離群值',
      formulasTitle: '核心公式',
      formulaW: 'W = Σ_g Σ_i (X_gi − X̄_g)ᵀ (X_gi − X̄_g)　（組內 SSCP）',
      formulaB: 'B = Σ_g n_g · (X̄_g − X̄)ᵀ (X̄_g − X̄)　（組間 SSCP）',
      formulaSp: 'S_p = W / (N − k)　（共同組內共變數）',
      formulaEig: '判別函數 = W⁻¹B 的特徵向量；λᵢ 為對應特徵值',
      formulaCanR: '典型相關 ρᵢ = √(λᵢ / (1 + λᵢ))',
      formulaWilks: "Wilks' Λⱼ = Π_{i≥j} 1 / (1 + λᵢ)； χ² = −(N − 1 − (p+k)/2) · ln(Λⱼ)， df = (p−j+1)(k−j)",
      formulaDelta: 'δ_g(x) = xᵀ S_p⁻¹ μ_g − ½ μ_gᵀ S_p⁻¹ μ_g + log(π_g)；分類至 argmax_g δ_g(x)',
      readingTitle: '怎麼讀',
      reading:
        "1. 先看 Box's M：若違反，LDA 假設不成立，建議改採 QDA 或謹慎解讀。\n" +
        '2. 看判別函數總表的 Wilks Λ：第 1 列為「至少有一個函數承載訊息」的整體檢定。\n' +
        '3. 看典型相關 ρ：> 0.5 視為強。\n' +
        '4. 標準化係數（受多元共線性影響） vs 結構矩陣（較穩定，建議用來命名構念）。\n' +
        '5. group centroids 顯示各組在判別軸上的位置。',
      classifyTitle: '怎麼讀分類表',
      classifyHowTo:
        '1. 對角線 = 正確分類人次。\n' +
        '2. 整體準確率 = 對角線總和 / N。\n' +
        '3. 與隨機分類比較：k 組均勻時，隨機 ≈ 1/k。\n' +
        '4. 注意：本準確率為 resubstitution，會高估真實效力。',
    },
    apa: {
      sentence:
        '本研究以 LDA 檢視 {predictorList} 等 {p} 個預測變項對 {group}（k = {k} 組）成員身分的判別力（N = {n}）。' +
        '萃取 {nFns} 個判別函數；第一個判別函數達顯著，' +
        "Wilks' Λ = {f1Lambda}, χ²({f1Df}) = {f1Chi2}, p = {f1Pstr}，典型相關 = {f1CanR}，解釋 {f1PctVar}% 之判別變異。" +
        '以線性判別分數對訓練樣本分類，整體 resubstitution 準確率為 {accPct}%。{boxSection}',
      sentenceNs:
        '本研究以 LDA 檢視 {predictorList} 等 {p} 個預測變項對 {group}（k = {k} 組）成員身分的判別力（N = {n}）。' +
        '萃取 {nFns} 個判別函數；第一個判別函數未達顯著，' +
        "Wilks' Λ = {f1Lambda}, χ²({f1Df}) = {f1Chi2}, p = {f1Pstr}，典型相關 = {f1CanR}。" +
        '以線性判別分數對訓練樣本分類，整體 resubstitution 準確率為 {accPct}%。{boxSection}',
      boxOk: " Box's M 檢定 χ²({df}) = {chi2}, p = {pStr}，未違反共變數矩陣同質假設。",
      boxBad: " Box's M 檢定 χ²({df}) = {chi2}, p = {pStr}，違反共變數矩陣同質假設。",
      boxNotApplicable: " Box's M 無法計算。",
      copyHint: '一鍵複製 APA 敘述',
    },
  },
  cluster: {
    title: '集群分析',
    config: {
      methodLabel: '方法',
      methods: { kmeans: 'k-means', hierarchical: '階層 Ward' },
      methodHint: {
        kmeans: 'k-means：以 k-means++ 種子 + Lloyd 迭代將樣本分到最近的質心，重啟 10 次取 WSS 最小者。',
        hierarchical: '階層 Ward：以最小變異數準則由下而上聚合，輸出 dendrogram 後切到 k 群。',
      },
      kLabel: '群數 k（2-10）',
      kHint: '建議先看 elbow 曲線：WSS 下降變平緩的轉折點即為合理的 k。',
      standardizeLabel: '標準化變項（z-score）',
      standardizeHint: '勾選後對每個變項減平均、除以標準差再聚類；當變項尺度差距大時建議勾選。',
      varsLabel: '聚類變項（≥ 2 個連續變項）',
      varsHint: '勾選下方數值變項作為聚類維度；至少需要 2 個變項。',
    },
    errors: {
      needAtLeastTwoVars: '請至少勾選 2 個聚類變項',
      kRange: 'k 必須為 2-10 的整數',
      tooFewN: '有效樣本數不足（N = {N}，至少需要 N > k；目前 k = {k}, p = {p}）',
      kTooSmall: 'k 至少需要 2',
      unknownMethod: '未知的聚類方法',
    },
    result: {
      vars: '聚類變項', method: '方法', iterations: '次迭代', notConverged: '未收斂',
      elbowTitle: 'Elbow 曲線（WSS vs. k）',
      elbowHint: 'X 軸為 k，Y 軸為 WSS；找下降明顯趨緩的轉折點即為合理的 k。當前選擇的 k 以暖色高亮。',
      sizesTitle: '各群樣本數',
      centroidsTitle: '群質心 / 變項側 profile',
      centroidsHint: '每格為「群在該變項上的平均（原始尺度）+ 對全樣本的 z-score」。|z| ≥ 1 以暖色強調。',
      qualityTitle: '品質指標',
      qualityHint: 'WSS = 群內離差平方和；BSS/TSS 類似 R²。Silhouette 平均 −1~1，越大越好（≥ .50 強）。',
      dendroTitle: 'Dendrogram（樹狀合併圖）',
      dendroHint: '橫軸為合併步驟，縱軸為 ΔSS。虛線為切到 k 群的位置；最後 k − 1 步以暖色標示。',
      cols: {
        cluster: '群', percent: '%', wss: 'WSS', bss: 'BSS',
        bssRatio: 'BSS / TSS', silhouette: 'Silhouette',
      },
      silhouetteInterp: {
        noStructure: '幾乎無群結構', weak: '弱結構',
        reasonable: '合理結構', strong: '強結構',
      },
    },
    interp: {
      header: '解讀',
      overall:
        '本研究以 {method} 將 N = {n} 筆樣本依 {p} 個變項分為 k = {k} 群。\n' +
        '分群解釋了 BSS/TSS = {bssRatio}% 的總離散，平均 silhouette = {silhouette}（{sInterp}）。',
      recommendation:
        '建議：(1) 觀察 elbow 曲線；(2) 比對群質心 / z-score 表，為每群命名；(3) 若 silhouette < .25，考慮減少 k 或改用其他變項組合或方法（k-means ↔ Ward）。',
    },
    notes: {
      purposeTitle: '用途',
      purpose:
        '集群分析將樣本依多個連續變項自動分為幾個內部相似、群間相異的子群（無監督學習）。\n' +
        '常見情境：顧客分群、受訪者類型化、探索資料是否存在天然分群結構。',
      assumpTitle: '前提假設',
      assumptions:
        '1. 變項為連續尺度。\n' +
        '2. 變項尺度需可比較 — 尺度差距大時務必標準化。\n' +
        '3. 觀察值獨立。\n' +
        '4. k-means 假設群為球形且大小相當。\n' +
        '5. 無嚴重離群值。',
      formulasTitle: '核心公式',
      formulaTSS: 'TSS = Σᵢ ‖xᵢ − x̄‖²',
      formulaWSS: 'WSS = Σ_g Σ_{i∈g} ‖xᵢ − μ_g‖²',
      formulaBSS: 'BSS = Σ_g n_g · ‖μ_g − x̄‖²',
      formulaWard: "Ward ΔSS(I,J) = (n_I · n_J / (n_I + n_J)) · ‖c_I − c_J‖²",
      formulaSil: 's(i) = (b(i) − a(i)) / max(a(i), b(i))',
      readingTitle: '怎麼讀',
      reading:
        '1. 看 elbow 曲線找合理的 k。\n' +
        '2. 看 silhouette：≥ .50 強、.25 ~ .50 弱、< .25 幾乎無結構。\n' +
        '3. 看群質心 / z-score 表為每群命名。\n' +
        '4. 看群大小是否懸殊。\n' +
        '5. 多次比較驗證穩定性。',
      chooseTitle: '兩種方法的取捨',
      chooseMethod:
        'k-means：快、適合大樣本；對球形群表現好；需事前定 k。\n' +
        '階層 Ward：不需事前定 k；對小樣本與探索好；O(N²) 較慢；merge 不可逆。\n' +
        '建議兩種都跑作交叉驗證。',
    },
    apa: {
      sentence:
        '本研究以 {method} 集群分析將 N = {n} 筆樣本依 {varList} 等 {p} 個變項（{stdWord}）分為 k = {k} 群。' +
        '各群樣本數為 {sizesLine}。分群解釋 BSS/TSS = {bssRatio}% 的總離散，平均 silhouette = {silhouette}（{sInterp}）。',
      standardizedYes: '已標準化為 z-score',
      standardizedNo: '未標準化',
      copyHint: '一鍵複製 APA 敘述',
    },
  },
  cfa: {
    title: 'CFA 驗證性因素分析',
    config: {
      factorsTitle: '定義因子結構',
      factorsHint: '為每個因子命名並勾選其指標題（每因子建議 ≥ 3 題、最少 2 題）',
      factorLabel: '因子',
      indicatorsLabel: '指標',
      addFactor: '新增因子',
      removeFactor: '刪除最後因子',
      noIndicatorsLeft: '可用指標已被其他因子佔用',
      simpleStructureNote:
        '本模組採簡單結構：每個指標只裝載一個因子（無交叉負荷量、無相關殘差）。為了識別性，所有因子變異固定為 1.0。',
    },
    errors: {
      'no-factors': '尚未定義任何因子',
      'no-valid-factor': '請至少建立一個有 ≥ 2 個指標的因子',
      'too-few-indicators': '每個因子至少需要 2 個指標',
      'too-few-total-indicators': '所有因子的指標總數至少需要 3 個',
      'duplicate-indicator': '同一個指標不能同時屬於多個因子',
      'need-more-data': '有效樣本數不足以估計模型',
      'underidentified': '模型不可識別（自由參數 > 共變數矩陣的獨立元素數）',
      'sample-cov-not-pd': '樣本共變數矩陣非正定，無法計算 ML 適配函數',
      'optimization-failed': 'ML 估計未收斂；請檢查模型結構與資料',
    },
    result: {
      summaryTitle: '模型摘要',
      fitIndicesTitle: '適配指標',
      loadingsTitle: '因子負荷量',
      factorCorrTitle: '因子相關矩陣',
      residualsTitle: '殘差變異',
      converged: '已收斂',
      notConverged: '未收斂（顯示最後一次估計值，僅供參考）',
      iterStr: '{iter} 次迭代',
      cols: {
        n: 'N', pIndicators: '指標數 (p)', mFactors: '因子數 (m)', df: '自由度 (df)',
        factor: '因子', indicator: '指標',
        lambda: 'λ（未標準化）', lambdaStd: 'λ（標準化）',
        se: 'SE', z: 'z', p: 'p', r2: 'R²',
        theta: 'θ（殘差變異）', rmseaP: 'RMSEA p（close fit）',
      },
      thresholdNote:
        '門檻參考（Hu & Bentler, 1999）：\n' +
        'CFI / TLI ≥ .95 良好、≥ .90 可接受、< .90 不佳\n' +
        'RMSEA ≤ .06 良好、≤ .08 可接受、> .08 不佳\n' +
        'SRMR ≤ .08 良好、> .08 不佳',
      rmseaPNote: 'H₀: RMSEA ≤ .05；p > .05 表示「close fit」假設未被拒絕',
      loadingsNote: '標準化負荷量顏色：< 0.40 偏弱 → 0.40-0.50 普通 → 0.50-0.70 良好 → ≥ 0.70 強',
      factorCorrNote: '對角線固定為 1。\n相關 ≥ 0.85 暗示兩因子可能無法區辨。',
      seUnavailable: 'Hessian 反矩陣失敗，標準誤無法估計；僅顯示點估計值。',
    },
    fitInterp: { good: '良好', acceptable: '可接受', poor: '不佳' },
    notes: {
      purposeTitle: '用途',
      purpose:
        '驗證性因素分析（CFA）用來檢驗事先設定的因子結構是否與資料相符。\n' +
        '回答：(1) 因子—指標歸屬與資料的共變數結構吻合嗎？(2) 每個指標的負荷量夠強？(3) 模型整體適配如何？\n\n' +
        '與 EFA 差異：EFA 是探索；CFA 是驗證預先設定的結構。',
      assumpTitle: '前提假設',
      assumptions:
        '1. 多元常態分布（ML 估計的前提）\n' +
        '2. 簡單結構：每個指標只裝載一個因子（本模組設定）\n' +
        '3. 殘差不相關（本模組設定）\n' +
        '4. 樣本量充分：建議 N ≥ 200，或 N / 自由參數 ≥ 5\n' +
        '5. 模型可識別：自由度 ≥ 0',
      formulasTitle: '核心公式',
      formulaModel: '模型：Σ(θ) = Λ Φ Λᵀ + Θ',
      formulaFitFn: 'F_ML(θ) = log|Σ(θ)| + tr(S Σ(θ)⁻¹) − log|S| − p',
      formulaChi2: 'χ² = (N − 1) · F_min',
      formulaCfi: 'CFI = 1 − max(χ² − df, 0) / max(χ²_null − df_null, 0)',
      formulaTli: 'TLI = (χ²_null/df_null − χ²/df) / (χ²_null/df_null − 1)',
      formulaRmsea: 'RMSEA = √(max(χ² − df, 0) / (df · (N−1)))',
      formulaSrmr: 'SRMR = √(2 · Σ ((sᵢⱼ − σᵢⱼ) / √(sᵢᵢ sⱼⱼ))² / (p(p+1)))',
      formulaDf: 'df = p(p+1)/2 − t；t = p + m(m−1)/2 + p',
      thresholdsTitle: '適配指標的判讀門檻',
      thresholds:
        'CFI / TLI：≥ .95 良好、≥ .90 可接受、< .90 不佳\n' +
        'RMSEA：≤ .06 良好、≤ .08 可接受、> .10 不佳\n' +
        'SRMR：≤ .08 良好\n' +
        'χ²：對大樣本過於敏感；以 CFI/TLI/RMSEA/SRMR 為主',
      readingTitle: '怎麼讀',
      reading:
        '1. 先看「是否收斂」\n' +
        '2. 看 CFI / TLI / RMSEA / SRMR 整體適配\n' +
        '3. 看「標準化負荷量」是否 ≥ 0.50\n' +
        '4. 看「R²」每個指標 ≥ 0.30\n' +
        '5. 看「因子相關」是否 ≤ 0.85',
    },
    apa: {
      sentence:
        '本研究以驗證性因素分析（CFA, ML 估計）檢驗 {m} 因子結構（{factorList}），共 {p} 個指標、N = {n}。' +
        '模型適配如下：χ²({df}) = {chi2}, p = {pStr}；CFI = {cfi}；TLI = {tli}；RMSEA = {rmsea}（90% CI {rmseaCi}）；SRMR = {srmr}。' +
        '整體而言，模型適配程度為「{overall}」。',
      copyHint: '一鍵複製 APA 敘述',
    },
    interp: {
      header: '解讀',
      summary:
        'N = {n}，{p} 個指標分屬 {m} 個因子；df = {df}。\n' +
        'χ²({df}) = {chi2}, p = {pStr}；CFI = {cfi}；TLI = {tli}；\n' +
        'RMSEA = {rmsea}，90% CI {rmseaCi}；SRMR = {srmr}。\n' +
        '整體適配：{overall}。',
    },
  },
  mixedAnova: {
    title: 'Mixed ANOVA（被試間×被試內）',
    config: {
      betweenVar: '被試間因子',
      pickBetween: '選擇被試間因子（categorical, ≥ 2 組）',
      betweenHint: '每位受試者只屬於其中一組（例如：實驗組／控制組、男／女）',
      selectConditionsTitle: '被試內因子（重複測量條件）',
      selectConditionsHint: '勾選同一受試者在不同時點 / 條件下的測量欄位（至少 2 欄；每列代表一位受試者，每欄代表一個重複測量水準）',
    },
    result: {
      summaryTitle: '整體摘要',
      descTitle: '描述統計（被試間 × 被試內）',
      mauchlyTitle: 'Mauchly 球形檢定（被試內因子）',
      mauchlyLabel: '球形假設',
      mauchlyOk: '球形假設成立',
      mauchlyViolated: '球形假設違反',
      mauchlyNotApplicable: '被試內因子只有 2 個水準，球形假設自動成立，不需 Mauchly 檢定。',
      anovaTitle: 'Mixed ANOVA 表（含球形校正）',
      recOk: 'Mauchly 球形檢定未違反，被試內主效應與交互作用均建議報告 Sphericity Assumed 列。',
      recViolated: 'Mauchly 球形檢定 p < .05，球形假設違反。被試內主效應與交互作用建議報告 Greenhouse-Geisser 校正（保守、最常用）；若 ε_GG > 0.75 也可改用 Huynh-Feldt 校正。被試間主效應不受球形假設影響，照原 df 報告即可。',
      recK2: '被試內因子只有 2 個水準，球形假設自動成立，被試內與交互作用直接報告 Sphericity Assumed 列即可。',
      cols: {
        n: '總 N', aGroups: 'a（組數）', bConditions: 'b（條件數）',
        group: '組別', condition: '條件', mean: 'M', sd: 'SD',
        source: '來源', eps: 'ε', ss: 'SS', df: 'df',
        dfTreat: 'df（效應）', dfError: 'df（誤差）',
        ms: 'MS', f: 'F', p: 'p',
        partialEta2: '偏 η²', fAB: 'F (A×B)',
      },
      sections: {
        between: '── 被試間 ──',
        within: '── 被試內 ──',
      },
      sources: {
        effectA: 'A（被試間主效應）',
        subjWithinA: 'Subjects within A（誤差）',
        effectB: 'B（被試內主效應）',
        effectAB: 'A × B（交互作用）',
        errorWithin: 'Error（被試內誤差）',
        sa: '球形假設成立',
        gg: 'Greenhouse-Geisser',
        hf: 'Huynh-Feldt',
        total: '總和',
      },
      effectInterp: { small: '小', medium: '中', large: '大' },
    },
    errors: {
      pickBetween: '請先選擇被試間因子',
      needAtLeast2: '請至少勾選 2 個被試內條件欄位',
      needAtLeast2Groups: '被試間因子必須至少有 2 組',
      tooFewN: '有效樣本太少（listwise 刪除後 N = {n}）',
      tooFewPerGroup: '部分組別的人數不足（每組至少需 2 人）',
    },
    interp: {
      header: '解讀',
      sigYes: '達顯著',
      sigNo: '未達顯著',
      summary:
        '本研究在 N = {n} 位受試者上執行混合設計變異數分析（被試間 a = {a} 組 × 被試內 b = {b} 個條件）。' +
        '\n• 被試間主效應（{factorA}）：F({df1A}, {df2A}) = {fA}, p = {pA}，{sigA}；偏 η² = {peA}（{effectAStr}）。' +
        '\n• 被試內主效應：F({df1B}, {df2B}) = {fB}, p = {pB}，{sigB}；偏 η² = {peB}（{effectBStr}）。' +
        '\n• 交互作用（A × B）：F({df1AB}, {df2AB}) = {fAB}, p = {pAB}，{sigAB}；偏 η² = {peAB}（{effectABStr}）。',
      useSA: '※ Mauchly 球形檢定未違反，被試內與交互作用採 Sphericity Assumed 列作為解讀依據。',
      useGG: '※ Mauchly 球形檢定顯著違反，被試內主效應與交互作用已自動以 Greenhouse-Geisser 校正後的 df 與 p 為解讀依據。',
      k2Note: '※ 被試內 b = 2，球形假設自動成立，無需校正。',
      interactionWarn: '交互作用顯著時，建議優先解讀「在各組內被試內因子的單純主效應」與「在各條件下被試間的單純主效應」，而非直接解讀兩個主效應。',
    },
    notes: {
      purposeTitle: '用途',
      purpose:
        '同時包含「被試間因子」與「被試內因子」的混合設計：每位受試者只屬於被試間因子的一個水準，但會在被試內因子的所有水準上重複測量。\n' +
        '常見情境：實驗組 vs. 控制組各自的「前測 / 後測 / 追蹤」軌跡；不同部門的同一群員工在多個時點的態度。\n' +
        '能同時檢驗：(1) 組間差異是否存在；(2) 條件間（時點間）差異是否存在；(3) 兩者交互作用 — 即「組間差異是否隨時間而變化」。',
      assumpTitle: '前提假設',
      assumptions:
        '1. 受試者間獨立（不同人之間互不影響）\n' +
        '2. 各組內、各條件下的依變項近似常態分布\n' +
        '3. 變異數同質性（被試間因子的各組變異相近）\n' +
        '4. 球形假設（被試內因子的對比變異數相等）\n' +
        '   - b = 2 時自動成立\n' +
        '   - b ≥ 3 用 Mauchly 檢定；違反需 Greenhouse-Geisser 或 Huynh-Feldt 校正\n' +
        '5. 寬資料格式：每列 = 一位受試者；被試間欄為類別變項；被試內為 ≥ 2 個重複測量欄。',
      formulasTitle: '核心公式',
      formulaSStotal: 'SS_總 = Σ_g Σ_i Σ_j (Y_gij − Ȳ)²；df_總 = Nb − 1',
      formulaSSA: 'SS_A = b · Σ_g n_g · (Ȳ_g.. − Ȳ)²；df = a − 1',
      formulaSSsubj: 'SS_subjects(A) = b · Σ_g Σ_i (Ȳ_gi. − Ȳ_g..)²；df = N − a   ← A 的誤差項',
      formulaSSB: 'SS_B = N · Σ_j (Ȳ_..j − Ȳ)²；df = b − 1',
      formulaSSAB: 'SS_AB = Σ_g n_g · Σ_j (Ȳ_g.j − Ȳ_g.. − Ȳ_..j + Ȳ)²；df = (a−1)(b−1)',
      formulaSSerror: 'SS_error(within) = SS_within − SS_B − SS_AB；df = (b−1)(N−a)   ← B 與 AB 的誤差項',
      formulaFA: 'F_A = MS_A / MS_subjects(A)；df = (a−1, N−a)',
      formulaFB: 'F_B = MS_B / MS_error(within)；df = (b−1, (b−1)(N−a))',
      formulaFAB: 'F_AB = MS_AB / MS_error(within)；df = ((a−1)(b−1), (b−1)(N−a))',
      formulaPartialEta2: '偏 η²_effect = SS_effect / (SS_effect + SS_對應誤差)',
      formulaMauchly:
        "Mauchly W = det(S) / (tr(S)/(b−1))^(b−1)；S 為 a 組合併的組內 (b−1) 維對比共變異矩陣\n" +
        "χ² = −[ν − (2(b−1)² + (b−1) + 2) / (6(b−1))] · ln(W)；ν = N − a",
      formulaGG: 'ε_GG = (tr S)² / [(b−1) · tr(S²)]',
      formulaHF: 'ε_HF = min{ 1, [(N−a)(b−1)·ε_GG − 2] / [(b−1)·((N−a−1) − (b−1)·ε_GG)] }',
      formulaLB: 'ε_LB = 1 / (b−1)',
      readingTitle: '怎麼讀',
      reading:
        '1. 先看 A × B 交互作用：若顯著，主效應的解釋必須收斂為「在某條件下的組間差異」「在某組內的條件差異」這類單純主效應。\n' +
        '2. 被試間 A 的 F 用 MS_subjects(A) 當分母，球形假設不影響它，照原 df 報告即可。\n' +
        '3. 被試內 B 與交互作用 AB 共用 MS_error(within) 當分母，會受球形假設影響：\n' +
        '   - Mauchly 不顯著 → Sphericity Assumed 列\n' +
        '   - Mauchly 顯著 → Greenhouse-Geisser 列（最常用），ε_GG > 0.75 時也可採 Huynh-Feldt\n' +
        '4. F 值在 SA / GG / HF 三列相同；只有 df（與隨之而來的 p）會被 ε 收縮。\n' +
        '5. 效果量採偏 η²；A 的分母 SS 是 SS_subjects(A)，B 與 AB 的分母 SS 是 SS_error(within)。\n\n' +
        '常見陷阱：\n' +
        '- 把 A 的 F 也用 MS_error(within) 當分母 → 錯誤；A 的誤差項是 SS_subjects(A)。\n' +
        "- 球形違反卻直接報未校正的 B、AB → df 高估、p 失真。\n" +
        "- 各組人數差距過大時，建議檢查 Box's M 等變異數同質性檢定。",
    },
    apa: {
      sentence:
        '針對 N = {n} 位受試者執行混合設計變異數分析，被試間因子為 {factorA}（a = {a} 組），被試內因子為 b = {b} 個條件（{condList}）。' +
        '{sphericitySection}' +
        '被試間主效應 {factorA} 的 F({df1A}, {df2A}) = {fA}, p = {pA}，偏 η² = {peA}，{sigA}；' +
        '在{correction}下，被試內主效應 F({df1B}, {df2B}) = {fB}, p = {pB}，偏 η² = {peB}，{sigB}；' +
        '交互作用（{factorA} × 條件）F({df1AB}, {df2AB}) = {fAB}, p = {pAB}，偏 η² = {peAB}，{sigAB}。',
      sphericityOk:
        'Mauchly 球形檢定未違反球形假設（W = {w}，χ²({df}) = {chi2}, p = {pStr}）。',
      sphericityViolated:
        'Mauchly 球形檢定顯示球形假設違反（W = {w}，χ²({df}) = {chi2}, p = {pStr}），故被試內主效應與交互作用採 Greenhouse-Geisser 校正（ε = {epsGG}）報告。',
      k2Note: '由於被試內因子僅 2 個水準，球形假設自動成立，未進行 Mauchly 檢定。',
      saLabel: '球形假設成立',
      ggLabel: '經 Greenhouse-Geisser 校正',
      sigYes: '達顯著',
      sigNo: '未達顯著',
      copyHint: '一鍵複製 APA 敘述',
    },
  },
  manova: {
    title: 'MANOVA 多變量變異數分析',
    config: {
      factorLabel: '因子（類別變項，≥ 2 組）',
      pickFactor: '請選因子',
      factorHint: '需為類別型變數，至少 2 個層級',
      dvLabel: '依變項（≥ 2 個連續變項）',
      dvHint: '勾選下方數值變項作為依變項；至少需要 2 個 DV，因子不可同時為 DV',
    },
    errors: {
      pickFactor: '請選擇因子',
      pickDVs: '請至少勾選 2 個依變項',
      'factor-in-dvs': '因子不可同時為依變項',
      factorBadGroups: '因子目前僅有 {k} 組，至少需要 2 組',
      tooFewN: '有效樣本數不足（N = {N}，至少需要 N > k + p；目前 k = {k}, p = {p}）',
      'singular-matrix': "資料共線性過高，E + H 不可逆",
      'length-mismatch': '資料長度不一致',
    },
    result: {
      groups: '組',
      dvs: '個 DV',
      descTitle: '各組敘述統計（M (SD)）',
      descHint: '每格顯示「平均 (標準差)」，列為組、欄為各依變項。',
      boxMTitle: "Box's M 同質共變數矩陣檢定",
      boxMLabel: '共變數矩陣同質性',
      boxMOk: '通過（p > .001）',
      boxMViolated: '違反（p ≤ .001）',
      boxMNotApplicable: '無法計算（可能某組樣本太小或共變數矩陣為奇異）。',
      boxMViolatedWarn:
        "警告：Box's M 顯著（p ≤ .001）— 不同組的共變數矩陣不同質，建議優先報告 Pillai's V（對共變數矩陣異質最穩健）；Wilks 與 Hotelling-Lawley 在此情境下可能膨脹型 I 錯誤。",
      multTitle: '多變量檢定',
      tests: {
        wilks: "Wilks' Λ",
        pillai: "Pillai's V",
        hotellingLawley: 'Hotelling-Lawley T',
        roy: "Roy's Largest Root",
      },
      upperBound: '上界',
      cols: {
        test: '檢定', statistic: '統計量', f: 'F approx',
        df1: 'df₁', df2: 'df₂', p: 'p', partialEta2: 'partial η²',
        group: '組', idx: '序', eigenvalue: '特徵值 λᵢ',
        contribution: 'λ/(1+λ)',
      },
      effectInterp: { small: '小效果', medium: '中效果', large: '大效果' },
      eigenTitle: 'E⁻¹·H 特徵值',
      eigenHint: "λ/(1+λ) 為各特徵根對 Pillai's V 的貢獻；Roy's 統計量採用最大者。",
      recommendation:
        "Pillai's V 對假設違反（特別是共變數矩陣不同質、樣本不平衡）最穩健；Wilks' Λ 為慣例首選；當 Box's M 違反時建議改報 Pillai。Roy's Largest Root 為上界，宜搭配其他統計量呈現。",
    },
    interp: {
      header: '解讀',
      sigYes: '達顯著',
      sigNo: '未達顯著',
      overall:
        '本研究以 MANOVA 檢定 {factor}（k = {k} 組）對 {p} 個依變項組成的多變量向量是否有差異（N = {n}）。\n' +
        "Wilks' Λ = {wilks}, F({wDf1}, {wDf2}) = {wF}, p = {wPstr} → {sigWord}；partial η² = {wEta2}（{wEtaInterp}）。\n" +
        "Pillai's V = {pillai}, F = {pF}, p = {pPstr}；partial η² = {pEta2}（{pEtaInterp}）。",
      boxLine: "Box's M：χ²({df}) = {chi2}, p = {pStr} — {verdict}",
      boxOk: '共變數矩陣同質假設通過',
      boxBad: "共變數矩陣同質假設違反，建議優先報告 Pillai's V",
      boxNotApplicable: "Box's M 無法計算（樣本或共變數矩陣條件不足）。",
      sigFollowUp:
        '整體多變量效應顯著，後續可逐一對每個 DV 跑單變量 ANOVA（建議搭配 Bonferroni 校正 α 水準）以辨識是哪些 DV 驅動差異。',
      nsAdvice: '整體多變量效應未達顯著，依慣例不建議再追單變量檢定。',
    },
    notes: {
      purposeTitle: '用途',
      purpose:
        'MANOVA 用於檢定一個類別因子對「多個連續依變項組成的向量」是否造成差異。\n' +
        '常見情境：\n' +
        '1. 比較不同教學法對 [閱讀、寫作、數學] 三項表現的整體差異。\n' +
        '2. 不同部門員工在 [工作滿意度、組織承諾、離職意圖] 的差異。\n' +
        '3. 想避免對每個 DV 跑單變量 ANOVA 造成的型 I 錯誤膨脹。\n\n' +
        '優點：考慮 DV 之間的相關，捕捉到單變量 ANOVA 看不到的多變量模式。',
      assumpTitle: '前提假設',
      assumptions:
        '1. 多變量常態（每組內，DV 向量服從多元常態）\n' +
        "2. 共變數矩陣同質（各組的 Σ 相同）→ 用 Box's M 檢定\n" +
        '3. 觀察值獨立\n' +
        '4. DV 為連續尺度（區間或比率）\n' +
        '5. 樣本量：每組 n_g 應大於 DV 數 p（建議 n_g ≥ 20+p）\n' +
        '6. 無嚴重多元離群值（Mahalanobis distance 檢視）',
      formulasTitle: '核心公式',
      formulaH: 'H = Σ_g n_g · (Ȳ_g − Ȳ)ᵀ (Ȳ_g − Ȳ)　（組間 SSCP）',
      formulaE: 'E = Σ_g Σ_i (Y_gi − Ȳ_g)ᵀ (Y_gi − Ȳ_g)　（組內 SSCP）',
      formulaWilks: "Wilks' Λ = det(E) / det(E + H)",
      formulaPillai: "Pillai's V = trace((E+H)⁻¹·H) = Σ λᵢ/(1+λᵢ)",
      formulaHL: 'Hotelling-Lawley T = trace(E⁻¹·H) = Σ λᵢ',
      formulaRoy: "Roy's Largest Root = max λᵢ（λᵢ 為 E⁻¹H 的特徵值）",
      formulaBoxM:
        "Box's M = (N−k)·ln|S_p| − Σ_g (n_g−1)·ln|S_g|；χ² = (1−c1)·M，df = (k−1)·p·(p+1)/2",
      readingTitle: '怎麼讀',
      reading:
        "1. 先看 Box's M：若違反（p ≤ .001），改報 Pillai's V。\n" +
        '2. 看四個多變量統計量是否一致顯著：Wilks、Pillai、Hotelling-Lawley、Roy。\n' +
        '   · 結論一致 → 訊號穩定。\n' +
        '   · 不一致時，優先採用 Pillai（最穩健）。\n' +
        '3. 看 partial η²（Pillai = V/s；Wilks = 1 − Λ^(1/s)）：< .06 小、< .14 中、≥ .14 大。\n' +
        '4. 多變量顯著後，再對每個 DV 跑單變量 ANOVA + 適當的多重比較校正（如 Bonferroni）追蹤具體驅動者。\n' +
        "5. Roy's Largest Root 是「上界」— 不適合單獨報告，搭配其他統計量呈現。\n\n" +
        '常見陷阱：\n' +
        '- DV 之間幾乎完全相關 → MANOVA 與其中一個 ANOVA 結果幾乎相同，多變量無增益。\n' +
        '- DV 之間完全無關 → 多變量檢定力反而下降，不如逐一 ANOVA + Bonferroni。\n' +
        '- 樣本不平衡 + 共變數矩陣異質 → 必用 Pillai。',
    },
    apa: {
      sentence:
        '本研究進行單因子 MANOVA，以檢視 {factor}（k = {k} 組）對 {dvList} 等 {p} 個依變項所組成多變量向量的影響（N = {n}）。' +
        "結果顯示多變量主效應達顯著，Wilks' Λ = {lambda}, F({wDf1}, {wDf2}) = {wF}, p = {wPstr}，partial η² = {wEta2}。" +
        '{pillaiSection}{boxSection}',
      sentenceNs:
        '本研究進行單因子 MANOVA，以檢視 {factor}（k = {k} 組）對 {dvList} 等 {p} 個依變項所組成多變量向量的影響（N = {n}）。' +
        "結果顯示多變量主效應未達顯著，Wilks' Λ = {lambda}, F({wDf1}, {wDf2}) = {wF}, p = {wPstr}，partial η² = {wEta2}。" +
        '{pillaiSection}{boxSection}',
      pillaiLine:
        " 同時報告 Pillai's V = {v}, F({df1}, {df2}) = {f}, p = {pStr}，partial η² = {eta2}。",
      boxOk:
        " Box's M 檢定 χ²({df}) = {chi2}, p = {pStr}，未違反共變數矩陣同質假設。",
      boxBad:
        " Box's M 檢定 χ²({df}) = {chi2}, p = {pStr}，違反共變數矩陣同質假設，故以 Pillai's V 為主要解讀依據。",
      boxNotApplicable: " Box's M 無法計算（樣本或共變數矩陣條件不足）。",
      copyHint: '一鍵複製 APA 敘述',
    },
  },
  kappa: {
    title: "Cohen's Kappa（評分者一致性）",
    weightings: {
      none: '不加權',
      linear: '線性加權',
      quadratic: '二次加權',
    },
    weightingHint: {
      none: "只看完全一致；類別之間視為無順序（標準 Cohen's κ）",
      linear: '依 |i − j|/(k − 1) 線性懲罰；適合有序類別',
      quadratic: '依 ((i − j)/(k − 1))² 平方懲罰；接近 ICC，適合有序類別',
    },
    config: {
      rater1Var: '評分者 1（變數）',
      rater2Var: '評分者 2（變數）',
      pickRater1: '請選評分者 1 的類別變數',
      pickRater2: '請選評分者 2 的類別變數',
      raterHint: '需為類別型變數；兩位 rater 的層級會取交集後分析',
      weightingLabel: '加權方式',
    },
    result: {
      tableTitle: 'k×k 一致性列聯表',
      tableHint: '對角線（暖色 highlight）為兩位評分者一致的次數；k = {k}',
      statsTitle: 'κ 檢定統計量',
      variantsTitle: '三種加權對照',
      variantsHint: '★ 為目前選擇的加權方式；linear / quadratic 僅在類別有順序時適用',
      cols: {
        rater1Backslash2: '評分者 1 ＼ 2',
        total: '總和',
        po: 'Po',
        pe: 'Pe',
        kappa: 'κ',
        se: 'SE',
        ci95: '95% CI',
        z: 'z',
        p: 'p',
        weighting: '加權',
        interp: '解讀',
      },
    },
    errors: {
      pickRater1: '請選擇評分者 1 的類別變數',
      pickRater2: '請選擇評分者 2 的類別變數',
      sameVar: '兩位評分者的變數不可相同',
      needTwoLevels: '兩位評分者的共同層級不足 2 個，無法計算 κ',
      noData: '沒有可用的成對觀察值',
      undefinedKappa: '邊際分布完全傾斜或單一類別佔滿，1 − Pe = 0，κ 在數學上未定義；建議檢查資料分布',
    },
    interp: {
      header: '解讀',
      sigYes: '達顯著',
      sigNo: '未達顯著',
      levels: {
        poor: '極差（< 0）',
        slight: '微弱（0.0–0.2）',
        fair: '尚可（0.2–0.4）',
        moderate: '中度（0.4–0.6）',
        substantial: '良好（0.6–0.8）',
        almostPerfect: '幾近完美（0.8–1.0）',
        undefined: '未定義',
      },
      overall:
        '在 N = {n} 對成對評分（k = {k} 個共同類別）中，' +
        '觀察一致 Po = {po}、隨機一致 Pe = {pe}，' +
        '{weighting} κ = {kappa}（95% CI [{ciLow}, {ciHigh}]）。\n' +
        'z = {z}, p = {pStr} → {sigWord}。\n' +
        '依 Landis & Koch (1977) 標準屬於：{level}。',
    },
    notes: {
      q1: '什麼時候用？',
      a1:
        '當兩位評分者各自將同一批個案歸入相同的類別系統，要評估「兩人的判斷一致到什麼程度」時使用。\n' +
        '常見情境：質性編碼信度、診斷一致性、人工標註資料品質檢核、雙盲評審意見一致性。',
      q2: '前提假設',
      a2:
        '1. 每個個案被獨立評分兩次（同一批個案、相同類別系統）\n' +
        '2. 兩位 rater 使用「相同的類別集合」——本工具會自動取兩變數的層級交集\n' +
        '3. 觀察值彼此獨立\n' +
        '4. 加權版（linear / quadratic）需類別「有順序」（如 1/2/3 級嚴重度）；無順序類別請用不加權。',
      q3: '核心公式',
      a3:
        'Po = Σ 對角線次數 / N\n' +
        'Pe = Σᵢ (rowᵢ/N)(colᵢ/N)\n' +
        'κ  = (Po − Pe) / (1 − Pe)\n' +
        '加權 κ：用權重矩陣 w_{ij} 重新定義 Po_w 與 Pe_w\n' +
        '  linear：    w_{ij} = 1 − |i−j|/(k−1)\n' +
        '  quadratic： w_{ij} = 1 − ((i−j)/(k−1))²\n' +
        'H₀ 變異數：Var(κ) = Pe / (N(1 − Pe))，z = κ / √Var\n' +
        '95% CI 用 asymptotic SE：Var = Po(1 − Po) / (N(1 − Pe)²)',
      q4: '怎麼讀',
      a4:
        '1. 看 κ 值：依 Landis & Koch (1977)：< 0 極差、0.0–0.2 微弱、0.2–0.4 尚可、0.4–0.6 中度、0.6–0.8 良好、0.8–1.0 幾近完美\n' +
        '2. 看 95% CI：CI 下限若已落在「中度」以上，信度較有保障\n' +
        '3. p 值是檢定 κ ≠ 0；但即使顯著，κ 太低仍代表一致性不夠，重點是 κ 的「大小」而非單純的顯著性\n' +
        '4. 若邊際分布極度不平衡（kappa paradox），κ 可能被低估；此時建議同時報告 Po 與檢視 confusion 表',
    },
    narrative: {
      copyHint: '一鍵複製 APA 敘述',
      overall:
        "採用 Cohen's Kappa（{weighting}）評估兩位評分者在 k = {k} 個類別上的一致性。" +
        '在 N = {n} 對成對評分中，觀察一致 Po = {po}、隨機一致 Pe = {pe}，' +
        'κ = {kappa}（95% CI [{ciLow}, {ciHigh}]），z = {z}, p = {pStr}。' +
        '依 Landis & Koch (1977) 標準屬於「{level}」。',
    },
  },
  hierReg: {
    title: '階層迴歸',
    config: {
      yLabel: '依變項 Y',
      pickY: '請選依變項',
      blocksLabel: '預測變項區塊（依進入順序）',
      hint: '每個區塊累積加入前面所有區塊的變項；典型用法：第 1 區為控制變項、第 2 區起為理論關注變項',
      addBlock: '+ 新增區塊',
      removeBlock: '− 刪除最後區塊',
      blockTitle: '區塊 {n}',
      varsUnit: '個變項',
      pickYFirst: '請先選依變項',
      noMoreVars: '已沒有可用的數值變項（前面區塊已用完）',
    },
    result: {
      stepTitle: '步驟摘要（每一步累積加入區塊變項後的整體模型）',
      coefTitle: '最終步驟係數表（包含所有區塊的變項）',
      nNote: '所有步驟皆使用相同 N = {n}（對 Y 與全部預測變項做 listwise deletion）',
      cols: {
        step: '步驟', added: '本步加入', r2: 'R²', adjR2: 'Adj. R²',
        f: 'F', df: 'df₁, df₂', p: 'p',
        deltaR2: 'ΔR²', deltaF: 'ΔF', deltaDf: 'Δdf₁, Δdf₂', deltaP: 'Δp',
        predictor: '預測項', b: 'b', se: 'SE', beta: 'β', t: 't', vif: 'VIF',
        intercept: '常數項',
      },
    },
    errors: {
      pickY: '請選擇依變項',
      needBlock: '至少需要 1 個區塊',
      emptyBlock: '每個區塊至少需要 1 個預測變項',
      dupPredictor: '同一個變項不可重複出現在多個區塊',
      yInX: '依變項不可同時為預測變項',
      tooFewN: '有效樣本數不足（需 n > 變項數 + 1）',
      'singular-matrix': "預測變項共線性過高，無法估計（X'X 不可逆）",
      'length-mismatch': '資料長度不一致',
      'need->=1-predictor': '至少需要 1 個預測變項',
      'need-n>k+1': '樣本數需大於預測變項數 + 1',
    },
    interp: {
      header: '解讀',
      sigYes: '達顯著',
      sigNo: '未達顯著',
      overall:
        '本次階層迴歸共執行 {k} 個步驟（N = {n}）。最終步驟整體模型 F({df1}, {df2}) = {fFinal}, p = {pFinal}，' +
        'R² = {r2Final}，調整後 R² = {adjR2Final}。',
      deltaSection: '各步驟貢獻：',
      singleStepNote: '只有一個步驟，無 ΔR² 可比較。',
      firstStepLine:
        '步驟 1（{vars}）：建立基線模型，R² = {r2}，F({df1}, {df2}) = {f}, p = {pStr}',
      stepLine:
        '步驟 {step}（加入 {vars}）：ΔR² = {deltaR2}，ΔF({df1}, {df2}) = {deltaF}, p = {pStr} → {sigWord}',
      sigSummary: '※ 顯著改善整體解釋力的步驟：步驟 {steps}（Δp < .05）。',
    },
    notes: {
      purposeTitle: '用途',
      purpose:
        '依研究者的理論順序，分階段把預測變項投入迴歸模型，逐步檢視「新增的這組變項在控制前面變項後，是否還能顯著解釋依變項」。\n常見情境：\n1. 第 1 區放控制變項（性別、年齡、年資），第 2 區放理論關注變項，檢驗在控制人口變項後理論變項是否仍有獨立貢獻。\n2. 多步驟比較不同理論模型的解釋力增量（incremental validity）。',
      assumpTitle: '前提假設',
      assumptions:
        '與一般 OLS 多元迴歸相同：\n' +
        '1. Y 與 X 之間為線性關係\n' +
        '2. 觀察值獨立\n' +
        '3. 殘差呈常態分布、同質變異\n' +
        '4. 無嚴重多重共線\n' +
        '額外注意：\n' +
        '5. 變項投入順序需有理論依據，不可資料驅動（避免 stepwise 的偏誤）\n' +
        '6. 各步驟需使用相同樣本（本工具自動以 listwise deletion 確保）',
      formulasTitle: '核心公式',
      formulaDeltaR2: 'ΔR²_k = R²_k − R²_{k−1}',
      formulaDeltaF: 'ΔF = (ΔR²_k / dfNum) / ((1 − R²_k) / dfDen)',
      formulaDf: 'dfNum = 該步新增的預測變項數；dfDen = N − (累積預測變項數) − 1',
      readingTitle: '怎麼讀',
      reading:
        '1. 看每一步的 R² 與 Adj. R²：模型整體解釋力如何隨變項加入而成長？\n' +
        '2. 看 ΔR² 與 Δp：「在控制前面變項後，本步加入的變項組是否還顯著貢獻？」這是階層迴歸的核心問題。\n' +
        '3. 看最終係數表：在所有變項都進入後，哪些個別變項仍顯著？\n' +
        '4. 注意：個別 β 在不同步驟會改變，這正是階層迴歸用來呈現「控制效果」的方式。\n\n' +
        '常見陷阱：\n' +
        '- 用資料挑選變項順序 → 應由理論決定\n' +
        '- 樣本量在不同步驟不同 → 本工具已用 listwise 確保一致\n' +
        '- 只看最終 R² 不看 ΔR² → 看不出每組變項的獨立貢獻',
    },
    narrative: {
      sigYes: '顯著',
      sigNo: '未顯著',
      copyHint: '一鍵複製 APA 敘述',
      opener:
        '為檢視各組預測變項對 {yLabel} 的增量解釋力，本研究以階層迴歸（N = {n}）依序投入 {k} 個區塊。',
      step1:
        '步驟 1 投入 {vars}，模型 R² = {r2}（調整後 R² = {adjR2}），F({df1}, {df2}) = {f}, p = {pStr}。',
      stepK:
        '步驟 {step} 加入 {vars}，ΔR² = {deltaR2}，ΔF({df1}, {df2}) = {deltaF}, p = {deltaP}（{sigWord}）；累積 R² = {r2}（調整後 R² = {adjR2}）。',
    },
  },
  fisherExact: {
    title: 'Fisher 精確檢定',
    config: {
      rowVar: '列變數',
      pickRow: '請選列變數',
      rowHint: '需為類別型變數（建議 2 個類別）',
      colVar: '欄變數',
      pickCol: '請選欄變數',
      colHint: '需為類別型變數（建議 2 個類別），不可與列變數相同',
      successRow: '列變數的「成功」類別',
      pickSuccessRow: '請選列變數中要視為成功的類別',
      successCol: '欄變數的「成功」類別',
      pickSuccessCol: '請選欄變數中要視為成功的類別',
    },
    result: {
      tableTitle: '2×2 列聯表',
      statsTitle: '檢定統計量',
      cols: {
        rowTotal: '列總和',
        colTotal: '欄總和',
        p: 'p (exact)',
        or: '勝算比 OR',
        orCi95: 'OR 95% CI',
        lnOr: 'ln OR',
        effect: '效果量',
      },
      effectInterp: {
        trivial: '微弱', small: '小', medium: '中', large: '大',
      },
    },
    warnings: {
      tooManyRowLevels: '提醒：列變數「{varLabel}」共有 {count} 個類別，本檢定僅針對 2×2 表設計，已取「成功」類別與第一個非成功類別組成 2×2 表進行分析。',
      tooManyColLevels: '提醒：欄變數「{varLabel}」共有 {count} 個類別，本檢定僅針對 2×2 表設計，已取「成功」類別與第一個非成功類別組成 2×2 表進行分析。',
      haldane: '注意：表中存在 0 格，已套用 Haldane 修正（每格 +0.5）以計算 OR 與其 95% CI；exact p 仍以原始觀察次數計算。',
    },
    errors: {
      pickRowVar: '請選擇列變數',
      pickColVar: '請選擇欄變數',
      sameVar: '列變數與欄變數不可相同',
      pickSuccessRow: '請選擇列變數的成功類別',
      pickSuccessCol: '請選擇欄變數的成功類別',
      needTwoRowLevels: '列變數需至少有 2 個有效類別',
      needTwoColLevels: '欄變數需至少有 2 個有效類別',
      noData: '可分析資料為 0 列',
    },
    interp: {
      header: '解讀',
      sigYes: '達顯著',
      sigNo: '未達顯著',
      overall:
        '在 N = {n} 名觀察值中，2×2 表為：(a={a}, b={b}, c={c}, d={d})。\n' +
        'Fisher 雙尾 exact p = {pStr} → {sigWord}。\n' +
        '勝算比 OR = {or}（95% CI [{orCiLow}, {orCiHigh}]），ln OR 屬{effect}效果量。',
    },
    notes: {
      q1: '什麼時候用？',
      a1:
        '檢定兩個二元類別變數是否獨立（2×2 列聯表）。\n' +
        '當樣本量小、或卡方檢定的期望次數有 cell < 5 時，Fisher 精確檢定是首選——它不依賴大樣本近似，直接用超幾何分布算精確 p。',
      q2: '前提假設',
      a2:
        '1. 觀察值彼此獨立\n' +
        '2. 邊際次數（列總和、欄總和）視為固定（理論上的條件性檢定）\n' +
        '3. 變數為二元類別（若為多類別，建議改用卡方檢定或先合併類別）\n' +
        '註：Fisher 在小樣本時會略偏保守，但仍是 2×2 小樣本的標準做法。',
      q3: '核心公式',
      a3:
        '單一表格機率（超幾何分布）：\n' +
        '  P(a) = C(a+b, a) · C(c+d, c) / C(N, a+c)\n' +
        '雙尾 p = Σ P(a′)，僅加總所有 P(a′) ≤ P(觀察) 的表格機率。\n' +
        '勝算比 OR = (a·d) / (b·c)；若任一格為 0，套用 Haldane (+0.5) 修正。\n' +
        '95% CI（Woolf log-scale）：exp(ln OR ± 1.96·√(1/a + 1/b + 1/c + 1/d))',
      q4: '怎麼讀',
      a4:
        '1. 看 exact p 是否 < .05 判斷兩變數是否獨立\n' +
        '2. 看 OR：> 1 表「列成功」與「欄成功」正相關；< 1 為負相關；= 1 為獨立\n' +
        '3. 看 OR 95% CI：若不包含 1，等同 p < .05（在大樣本下）\n' +
        '4. ln OR 的絕對值 < 0.5 微弱、< 1.0 小、< 2.0 中、≥ 2.0 大',
    },
    narrative: {
      copyHint: '一鍵複製 APA 敘述',
      main:
        '採用 Fisher 精確檢定，分析「{rowVar}」與「{colVar}」之關聯。' +
        '在 N = {n} 名有效觀察值中，2×2 列聯表為「{rSucc}/{cSucc}」= {a}、「{rSucc}/{cFail}」= {b}、' +
        '「{rFail}/{cSucc}」= {c}、「{rFail}/{cFail}」= {d}。' +
        '雙尾 exact p = {pStr}，勝算比 OR = {or}（95% CI [{orCiLow}, {orCiHigh}]）。',
    },
  },
  zProp: {
    title: 'z 檢定（比例）',
    types: {
      one: '單樣本（與 p₀ 比較）',
      two: '雙獨立樣本比例比較',
    },
    typeHint: {
      one: '檢定一個類別變數中某個類別的比例是否等於指定值 p₀',
      two: '檢定兩個獨立群組在某個事件上的比例是否相同',
    },
    config: {
      typeLabel: '檢定型別',
      var1: '類別變數',
      pickVar: '請選類別變數',
      varHint: '需為類別型變數',
      successLevel: '成功類別',
      pickSuccess: '請選擇要計算比例的類別',
      p0: '理論比例 p₀',
      p0Hint: '0–1 之間，例如 0.5 為「無偏好」假設',
      groupVar: '分組變數',
      pickGroup: '請選分組變數（兩組）',
      groupHint: '僅前兩個群組納入分析',
      valueVar: '事件變數',
      pickValueVar: '請選事件變數',
      valueHint: '事件變數中要計算的「成功」類別',
    },
    result: {
      summaryTitle: '描述統計',
      statsTitle: '檢定統計量',
      cols: {
        success: '成功類別', n: 'n', x: 'x', phat: 'p̂', p0: 'p₀', ci95: '95% CI',
        z: 'z', p: 'p', group: '群組', diff: 'p̂₁ − p̂₂', diffCi95: '差距 95% CI',
        h: "Cohen's h", effect: '效果量',
      },
      effectInterp: {
        trivial: '微弱', small: '小', medium: '中', large: '大',
      },
    },
    errors: {
      pickVar: '請選擇類別變數',
      pickSuccess: '請選擇要計算比例的成功類別',
      pickGroup: '請選擇分組變數',
      pickValueVar: '請選擇事件變數',
      sameVar: '分組變數與事件變數不可相同',
      badP0: 'p₀ 必須介於 0 與 1 之間',
      tooFewN: '樣本數過少（n < 5）',
      needTwoGroups: '分組變數需有兩個有效類別',
      tooManyGroups: '分組變數有 2 個以上類別，請使用卡方檢定',
    },
    interp: {
      header: '解讀',
      sigYes: '達顯著',
      sigNo: '未達顯著',
      oneOverall:
        '在 N = {n} 名觀察值中，「{success}」共 {x} 次（p̂ = {phat}），與假設值 p₀ = {p0} 相比，' +
        'z = {z}，p = {pStr} → {sigWord}。',
      twoOverall:
        '兩群組「{success}」比例：{g1} = {p1}、{g2} = {p2}，差距 = {diff}。\n' +
        'z = {z}，p = {pStr} → {sigWord}。\n' +
        "Cohen's h = {h}，屬於{effect}效果量。",
    },
    notes: {
      q1: '什麼時候用？',
      a1:
        '兩種使用情境：\n' +
        '1. 單樣本：檢定某類別比例是否等於指定值（例如「同意」比例是否高於 50%）\n' +
        '2. 雙樣本：檢定兩個群組的比例是否相同（例如男性與女性的支持率差異）',
      q2: '前提假設',
      a2:
        '1. 觀察值彼此獨立\n' +
        '2. 樣本量足夠大（每組 np ≥ 5 且 n(1−p) ≥ 5）\n' +
        '3. 簡單隨機抽樣\n' +
        '若樣本量小或單格期望值過低，建議改用 Fisher 精確檢定。',
      q3: '核心公式',
      a3:
        '單樣本：z = (p̂ − p₀) / √(p₀(1−p₀)/n)\n' +
        '雙樣本：z = (p̂₁ − p̂₂) / √(p̄(1−p̄)(1/n₁ + 1/n₂))，p̄ = (x₁+x₂)/(n₁+n₂)\n' +
        "效果量 Cohen's h = 2(arcsin√p̂₁ − arcsin√p̂₂)；|h| 0.2/0.5/0.8 對應小/中/大效果",
      q4: '怎麼讀',
      a4:
        '1. 看 p 值是否 < .05 判斷是否拒絕 H₀\n' +
        '2. 看效果量（Cohen\'s h 或差距 95% CI）判斷實質意義\n' +
        '3. 95% CI 不包含 0（雙樣本）或不包含 p₀（單樣本）等同 p < .05',
    },
    narrative: {
      copyHint: '一鍵複製 APA 敘述',
      one:
        '採用單樣本比例 z 檢定，檢定「{success}」之觀察比例是否等於 p₀ = {p0}。' +
        '在 N = {n} 名觀察值中觀察次數為 {x}（p̂ = {phat}），95% CI [{ciLow}, {ciHigh}]。' +
        '檢定結果 z = {z}, p = {pStr}。',
      two:
        '採用雙獨立樣本比例 z 檢定，比較「{g1}」（n₁ = {n1}, p̂₁ = {p1}）與「{g2}」' +
        '（n₂ = {n2}, p̂₂ = {p2}）在「{success}」事件上的比例差異。' +
        '兩群組差距 = {diff}（95% CI [{diffCiLow}, {diffCiHigh}]），' +
        "z = {z}, p = {pStr}, Cohen's h = {h}。",
    },
  },
  chiSq: {
    title: '卡方檢定',
    types: {
      independence: '獨立性檢定',
      gof: '適合度檢定',
    },
    typeHint: {
      independence: '兩個類別變數之間是否獨立（列聯表分析）',
      gof: '一個類別變數的觀察次數是否符合給定的理論分布',
    },
    config: {
      typeLabel: '檢定型別',
      rowVar: '列變數',
      colVar: '欄變數',
      gofVar: '類別變數',
      pickRow: '請選列變數',
      pickCol: '請選欄變數',
      pickGof: '請選類別變數',
      bothCategorical: '兩個變數均需為類別型',
      varNeedCategorical: '需為類別型變數',
      sameVar: '列與欄不可為同一變數',
      expectedProps: '理論機率',
      expectedHint: '預設為均勻（1/k）；可手動填入總和為 1 的機率（不為 1 會自動正規化）',
    },
    result: {
      contingencyTitle: '列聯表（觀察次數）',
      expectedTitle: '期望次數',
      stdResidualsTitle: '標準化殘差',
      statsTitle: '檢定統計量',
      assumpTitle: '假設前提',
      assumpExpected: '期望次數 ≥ 5（{ok}/{total} cells）',
      assumpExpectedDetail: 'Cochran 規則：≥ 80% cells 期望次數 ≥ 5；最小期望次數 = {min}',
      assumpViolatedHint: '若違反，考慮合併相近類別、改用 Fisher exact、或樣本量擴大',
      cols: {
        chi2: 'χ²', df: 'df', p: 'p', n: 'n', cramerV: "Cramer's V",
        category: '類別', observed: '觀察 O', expected: '期望 E', residual: '標準化殘差 z',
      },
      total: '總和',
      cramerHint: '|z| ≥ 1.96 對應該 cell p < .05（雙尾）',
      yatesRow: 'Yates 校正',
      yatesNote: '2×2 列聯表已加報 Yates 連續性校正（對齊 SPSS 預設）；未校正卡方為對照之用。',
      fisherSuggest: '本表為 2×2 且至少一個期望次數 < 5，建議改用 Fisher exact 檢定（小樣本精確檢定）。',
      effectInterp: {
        trivial: '微弱',
        small: '小',
        medium: '中',
        large: '大',
      },
    },
    notes: {
      purposeTitle: '用途',
      purposeIndep:
        '檢定兩個類別變數是否獨立（無相關）。\n例：性別與偏好上課形式之間有沒有關聯？\nH₀：兩變數獨立 / H₁：兩變數相關',
      purposeGof:
        '檢定一個類別變數的觀察次數是否符合給定的理論分布。\n例：擲骰子 600 次，各點數出現次數與「均勻 1/6」是否相符？\nH₀：觀察分布符合理論分布 / H₁：不符合',
      assumpTitle: '前提假設',
      assumptions:
        '1. 觀察值之間獨立\n' +
        '2. 樣本來自簡單隨機抽樣\n' +
        '3. 期望次數 ≥ 5 在至少 80% 的 cell（Cochran 規則）\n' +
        '4. 變數為類別型（非連續）',
      formulasTitle: '核心公式',
      formulaChi2: 'χ² = Σ ((O − E)² / E)',
      formulaIndepE: '獨立性檢定 E_ij = (row_i 總和 × col_j 總和) / N，df = (r − 1)(c − 1)',
      formulaGofE: '適合度檢定 E_i = N · p_i，df = k − 1',
      formulaCramer: "Cramer's V = √(χ² / (N · min(r − 1, c − 1)))",
      formulaResid: '標準化殘差 z_ij = (O_ij − E_ij) / √E_ij',
      readingTitle: '怎麼讀',
      reading:
        '1. 看整體 χ² 的 p 值 — 兩變數是否相關？\n' +
        "2. 看 Cramer's V — 相關強度（< 0.1 微弱、< 0.3 弱、< 0.5 中、≥ 0.5 強）\n" +
        '3. 看標準化殘差 — 哪個 cell 的偏離特別大？|z| ≥ 1.96 對應該 cell p < .05\n' +
        '4. 期望次數 < 5 的 cell 太多（> 20%）→ 結果失準，考慮合併類別或改用 Fisher exact 檢定（精確檢定，2×2 為主）',
    },
    apa: {
      indepSig:
        '卡方獨立性檢定結果顯示，{rowVar} 與 {colVar} 兩變數呈顯著關聯，χ²({df}, N = {n}) = {chi2}, p = {pStr}，Cramer\'s V = {v}（{effect}效果量）。',
      indepNs:
        '卡方獨立性檢定結果顯示，{rowVar} 與 {colVar} 兩變數之間無顯著關聯，χ²({df}, N = {n}) = {chi2}, p = {pStr}。',
      gofSig:
        '卡方適合度檢定結果顯示，{var} 的觀察分布與理論分布{sig}差異，χ²({df}, N = {n}) = {chi2}, p = {pStr}。',
      gofNs:
        '卡方適合度檢定結果顯示，{var} 的觀察分布與理論分布無顯著差異，χ²({df}, N = {n}) = {chi2}, p = {pStr}。',
      sigYes: '達顯著',
      sigNo: '未達顯著',
      sigYesDiff: '存在顯著',
      copyHint: '一鍵複製 APA 敘述',
      yatesAppendix:
        '針對 2×2 列聯表，加報 Yates 連續性校正：χ²({df}, N = {n}) = {chi2Yates}, p = {pYatesStr}。',
    },
    interp: {
      header: '解讀',
      indepOverall:
        '整體檢定 χ²({df}, N = {n}) = {chi2}, p = {pStr} → {sigWord}。' +
        '\nCramer\'s V = {v}，屬於{effect}效果量。',
      gofOverall:
        '整體檢定 χ²({df}, N = {n}) = {chi2}, p = {pStr} → {sigWord}。',
      residSection: '標準化殘差檢視（|z| ≥ 1.96 為主要偏離 cell）：',
      residLine: '{cellLabel}：z = {z}{flag}',
      flagHigh: ' 顯著偏離',
      sigYes: '顯著',
      sigNo: '不顯著',
    },
  },
  logReg: {
    title: '邏輯斯迴歸',
    config: {
      yLabel: '依變項 Y（二元類別）',
      xLabel: '預測變項（可複選）',
      pickY: '請選二元依變項',
      pickXs: '請至少勾選 1 個預測變項',
      yNeedBinary: '此變項有 {k} 個值，邏輯斯迴歸需要剛好 2 個（二元）',
      positiveClass: '正類別（將被編碼為 1）',
      hint: 'Y 必須是二元；X 必須是連續或順序變項',
    },
    result: {
      modelTitle: '模型摘要',
      omnibusTitle: '整體模型檢定',
      coefTitle: '係數表（含 OR 與 95% CI）',
      classTitle: '分類表（閾值 = 0.5）',
      rocTitle: 'ROC 曲線',
      converged: '已收斂（{n} 次迭代）',
      notConverged: '未收斂！結果可能不可靠',
      cols: {
        n: 'n', k: 'k 預測項',
        llNull: 'LL₀（null model）',
        ll: 'LL（full model）',
        lrChi2: 'LR χ²',
        df: 'df',
        p: 'p',
        mcFadden: 'McFadden R²',
        nagelkerke: 'Nagelkerke R²',
        predictor: '預測項',
        b: 'b',
        se: 'SE',
        z: 'Wald z',
        or: 'OR',
        orCI: '95% CI for OR',
        intercept: '常數項',
        actual: '實際',
        predicted: '預測',
        positive: '陽性 (1)',
        negative: '陰性 (0)',
        correctPercent: '正確分類率',
        auc: 'AUC',
        sensitivity: '敏感度',
        specificity: '特異度',
      },
      aucInterp: {
        excellent: '極佳',
        good: '良好',
        fair: '尚可',
        poor: '不佳',
      },
    },
    notes: {
      purposeTitle: '用途',
      purpose:
        '用一組預測變項預測二元類別結果（是/否、患病/健康、離職/留任）。\n' +
        '回答的問題：\n' +
        '（1）整體模型有顯著預測力嗎？（LR 檢定）\n' +
        '（2）每個預測變項在控制其他變項後，獨立貢獻是否顯著？（Wald z）\n' +
        '（3）勝算比 OR：X 增加 1 單位，Y 為陽性的勝算（odds）變多少倍？\n' +
        '（4）模型分類表現如何？（正確分類率、ROC AUC）',
      assumpTitle: '前提假設',
      assumptions:
        '1. 依變項為二元（恰好 2 類）\n' +
        '2. 觀察值獨立\n' +
        '3. logit(p) 與預測變項呈線性關係\n' +
        '4. 無嚴重多重共線\n' +
        '5. 樣本量：每個預測變項至少 10 筆陽性與 10 筆陰性事件（rule of 10）',
      formulasTitle: '核心公式',
      formulaLogit: 'logit(p) = ln(p / (1 − p)) = β₀ + β₁X₁ + ... + βₖXₖ',
      formulaSigmoid: 'p = sigmoid(η) = 1 / (1 + exp(−η))',
      formulaOR: 'OR_i = exp(β_i)（X_i 增加 1 單位的勝算比變化）',
      formulaWald: 'Wald z = β / SE(β)，p = 2(1 − Φ(|z|))',
      formulaLR: 'LR χ² = −2(LL_null − LL_full)，df = k；p 從 χ²(df) 右尾',
      formulaNagelkerke:
        'Cox-Snell R² = 1 − exp(2/n · (LL_null − LL_full))\n' +
        'Nagelkerke R² = Cox-Snell / (1 − exp(2/n · LL_null))（縮放到 [0, 1]）',
      readingTitle: '怎麼讀',
      reading:
        '1. 看 LR 檢定 p — 整體模型是否顯著？\n' +
        '2. 看 Nagelkerke R² — 模型解釋力（0.2 算合理、0.4 不錯、> 0.5 強）\n' +
        '3. 看每個係數 OR 與 95% CI — CI 不跨 1 即代表該預測項顯著\n' +
        '4. 看 AUC — < 0.6 不佳、0.6-0.7 尚可、0.7-0.8 良好、≥ 0.8 極佳\n' +
        '5. 看分類表 — 正確分類率與類別不平衡時的敏感度／特異度\n\n' +
        'OR 解讀：\n' +
        '- OR = 2 → X 增加 1 單位，陽性勝算翻倍\n' +
        '- OR = 0.5 → X 增加 1 單位，陽性勝算減半\n' +
        '- OR = 1 → X 對勝算無影響',
    },
    apa: {
      sentence:
        '邏輯斯迴歸結果顯示，{predictors} 聯合預測 {yLabel}（正類別 = {posClass}）之模型整體{sigWord}（χ²({df}, N = {n}) = {chi2}, p = {pStr}），Nagelkerke R² = {nagelkerke}。{coefList}模型 AUC = {auc}，正確分類率 = {correctPct}%。',
      sentenceNs:
        '邏輯斯迴歸結果顯示，{predictors} 對 {yLabel} 之預測未達顯著（χ²({df}, N = {n}) = {chi2}, p = {pStr}），Nagelkerke R² = {nagelkerke}。',
      coefSig:
        '{name}（OR = {or}, 95% CI = [{ciLow}, {ciHigh}], z = {z}, p = {pStr}）',
      coefOpener: '個別係數中，',
      copyHint: '一鍵複製 APA 敘述',
    },
    interp: {
      header: '解讀',
      overall:
        '整體模型 LR χ²({df}) = {chi2}, p = {pStr} → {sigWord}。' +
        '\nNagelkerke R² = {nagelkerke}（解釋力{strengthWord}），' +
        'AUC = {auc}（{aucWord}），正確分類率 = {correctPct}%。',
      coefSection: '預測變項勝算比：',
      coefLine: '{name}：OR = {or}（CI = [{ciLow}, {ciHigh}]），p = {pStr} → {sigWord}',
      sigYes: '達顯著',
      sigNo: '未達顯著',
      strengthWeak: '較弱',
      strengthFair: '中等',
      strengthStrong: '較強',
    },
  },
  multReg: {
    title: '多元線性迴歸',
    config: {
      yLabel: '依變項 Y',
      xLabel: '預測變項（複選）',
      pickY: '請選依變項',
      pickXs: '請至少勾選 1 個預測變項',
      hint: '勾選下方數值變數作為預測變項；不可包含 Y',
    },
    result: {
      modelTitle: '模型摘要',
      anovaTitle: 'ANOVA 表（整體模型 F 檢定）',
      coefTitle: '係數表',
      assumpTitle: '殘差常態性',
      cols: {
        r: 'R', r2: 'R²', adjR2: 'Adj. R²', se: 'SE 估計值', n: 'n',
        source: '變異來源', ss: 'SS', df: 'df', ms: 'MS', f: 'F', p: 'p',
        regression: '迴歸模型', residual: '殘差', total: '總和',
        predictor: '預測項', b: 'b', stdErr: 'SE', beta: 'β', t: 't', vif: 'VIF',
        intercept: '常數項',
      },
      vifWarn:
        '注意：VIF > 5 的預測變項顯示多重共線跡象（VIF > 10 視為嚴重）。考慮：移除高度相關的變項、加總成綜合分數、或改用主成分迴歸。',
    },
    notes: {
      purposeTitle: '用途',
      purpose:
        '用多個連續預測變項聯合預測一個連續依變項。回答的問題：\n（1）整體模型是否能顯著預測 Y？（F 檢定）\n（2）控制其他變項後，每一個預測變項對 Y 的獨立貢獻？（個別係數的 t 檢定）\n（3）模型解釋了 Y 的多少變異？（R² 與 Adj. R²）\n（4）哪個預測變項的相對影響力最大？（標準化係數 β）',
      assumpTitle: '前提假設',
      assumptions:
        '1. Y 與 X 之間為線性關係\n' +
        '2. 觀察值獨立\n' +
        '3. 殘差呈常態分布（Shapiro-Wilk 自動檢核）\n' +
        '4. 同質變異\n' +
        '5. 無嚴重多重共線（VIF 自動計算；> 5 警示）\n' +
        '6. 適當的樣本量：n ≥ 10–20 × 預測變項數',
      formulasTitle: '核心公式',
      formulaBeta: 'β = (X\'X)⁻¹ X\'y',
      formulaSE: 'SE(β) = √( MSE · diag((X\'X)⁻¹) )',
      formulaF: 'F = (R² / k) / ((1 − R²) / (n − k − 1))，df₁ = k, df₂ = n − k − 1',
      formulaAdjR2: 'Adj. R² = 1 − (1 − R²) · (n − 1) / (n − k − 1)',
      formulaStdBeta: '標準化 β_i = b_i · SD(X_i) / SD(Y)',
      formulaVIF: 'VIF_i = 1 / (1 − R²_i)，R²_i 為 X_i 對其他預測變項的迴歸 R²',
      readingTitle: '怎麼讀',
      reading:
        '1. 看整體 F 檢定 — 模型整體有沒有顯著預測力？\n' +
        '2. 看 R² 與 Adj. R² — 解釋了多少變異？（多元迴歸建議報告 Adj. R²）\n' +
        '3. 看個別係數的 p 值 — 哪些 X 在控制其他變項後仍顯著？\n' +
        '4. 比較標準化 β 的絕對值 — 哪個 X 的相對影響力最大？\n' +
        '5. 看 VIF — 有沒有多重共線問題？（> 5 警示，> 10 嚴重）\n' +
        '6. 看殘差常態性 — 推論前提是否符合？\n\n' +
        '常見陷阱：\n' +
        '- 個別 t 檢定都不顯著但整體 F 顯著 → 多重共線\n' +
        '- R² 高但個別係數都不顯著 → 同上\n' +
        '- 加入更多 X 一定會讓 R² 上升 → 用 Adj. R² 才公平比較',
    },
    apa: {
      sentence:
        '多元線性迴歸結果顯示，{predictors} 聯合預測 {yLabel} 之模型整體{sigWord}（F({df1}, {df2}) = {f}, p = {pStr}），R² = {r2}，調整後 R² = {adjR2}。{coefList}',
      sentenceNs:
        '多元線性迴歸結果顯示，{predictors} 對 {yLabel} 之預測未達顯著（F({df1}, {df2}) = {f}, p = {pStr}），R² = {r2}，調整後 R² = {adjR2}。',
      coefSig:
        '{name}（b = {b}, SE = {se}, β = {beta}, t = {t}, p = {pStr}）',
      coefOpener: '個別係數中，',
      copyHint: '一鍵複製 APA 敘述',
    },
    interp: {
      header: '解讀',
      overall:
        '整體模型 F({df1}, {df2}) = {f}, p = {pStr} → {sigWord}。' +
        ' R² = {r2}（解釋 {r2Pct}% 變異），調整後 R² = {adjR2}。',
      coefSection: '個別預測項：',
      coefLine:
        '{name}：b = {b}（SE = {se}，β = {beta}，t = {t}，p = {pStr}） → {sigWord}',
      vifSection: 'VIF 檢視：',
      vifLine: '{name}: VIF = {vif} {warn}',
      vifWarnHigh: '⚠ 警示',
      vifWarnSevere: '⚠ 嚴重',
      sigYes: '達顯著',
      sigNo: '未達顯著',
    },
  },
  history: {
    title: '分析歷史',
    saveCurrent: '釘選目前分析到歷史',
    saveCurrentHint: '把目前的資料集、分析方法、變數選擇、模式與語言一併保存，方便事後比對',
    needSetup: '需先載入資料集並選擇分析方法',
    empty: '尚無歷史紀錄',
    listTitle: '已釘選的快照（最新在最上）',
    restoreBtn: '還原',
    removeBtn: '移除',
    clearAllBtn: '全部清空',
    clearConfirm: '確定要清空所有歷史紀錄？',
    timeAgo: {
      seconds: '{n} 秒前',
      minutes: '{n} 分鐘前',
      hours: '{n} 小時前',
      days: '{n} 天前',
    },
  },
  transform: {
    title: '變數轉換',
    sourceLabel: '原始變數',
    typeLabel: '轉換型別',
    nameLabel: '新欄位名稱',
    nameHint: '只能用英數與底線；建議保留預設前綴方便識別',
    nameInvalid: '名稱僅可含英數、底線；不可與既有欄位重複',
    types: {
      log: '自然對數 ln(x)',
      log10: '常用對數 log₁₀(x)',
      zscore: 'Z 分數標準化',
      recode_reverse: 'Likert 反向計分',
    },
    typeHint: {
      log: 'x ≤ 0 之值會轉為遺漏',
      log10: 'x ≤ 0 之值會轉為遺漏',
      zscore: '(x − M) / SD，使用該欄全部非缺值之 M 與 SD',
      recode_reverse: 'new = max + min − x；常用於反向計分題還原',
    },
    rangeMin: '最小值',
    rangeMax: '最大值',
    pickSource: '請選原始變數',
    addBtn: '加入',
    removeBtn: '移除',
    closeBtn: '關閉',
  },
  modes: {
    teaching: '教學模式',
    report: '報告模式',
  },
  datasets: {
    none: '尚未載入資料',
    employee: '員工滿意度調查',
    intervention: '教學介入實驗',
    multigroup: '多組比較研究',
    categorical: '類別資料調查',
    employeeDesc: 'Likert 量表 + 部門 + 年資 — 適合相關、迴歸、α',
    interventionDesc: '實驗組／控制組 + 前後測 — 適合 t 檢定',
    multigroupDesc: '三組以上的依變項 — 適合 ANOVA',
    categoricalDesc: '類別變數交叉 — 適合卡方',
  },
  common: {
    comingSoon: '陸續上線中',
    placeholder: '占位內容',
    copy: '複製',
    copied: '已複製',
    collapse: '收起',
    expand: '展開',
  },
  desc: {
    selectVarsTitle: '選擇要分析的變數',
    selectVarsHint: '勾選下方數值變數（連續或順序），可複選',
    noVarsSelected: '請先勾選至少一個變數',
    cols: {
      variable: '變數',
      n: 'N',
      mean: 'M',
      sd: 'SD',
      se: 'SE',
      min: 'Min',
      max: 'Max',
      median: 'Median',
      skew: 'Skew',
      kurt: 'Kurt',
    },
    notes: {
      purposeTitle: '用途',
      purpose:
        '描述每個變數的集中趨勢（M、Median）、離散程度（SD、SE、Min、Max），以及分布形狀（Skew、Kurt）。是任何後續分析前必做的「先認識資料」工作。',
      assumptionsTitle: '前提假設',
      assumptions: '無——敘述統計不涉及推論，沒有假設前提需要檢核。',
      formulasTitle: '核心公式',
      formulaM: 'M = ΣX / n',
      formulaSD: 'SD = √( Σ(X - M)² / (n - 1) )',
      formulaSE: 'SE = SD / √n',
      formulaSkew:
        'Skew = n / [(n-1)(n-2)] · Σ((X - M) / SD)³（Fisher–Pearson type 2，與 SPSS 一致）',
      formulaKurt:
        'Kurt = n(n+1) / [(n-1)(n-2)(n-3)] · Σ((X - M) / SD)⁴ - 3(n-1)² / [(n-2)(n-3)]（excess kurtosis）',
      readingTitle: '怎麼讀',
      reading:
        '偏度（Skew）：>0 右偏（長尾在右）、<0 左偏（長尾在左）、≈0 對稱。' +
        '經驗法則 |Skew| < 1 視為近似對稱。' +
        '\n\n峰度（Kurt）：>0 高瘦（leptokurtic）、<0 平緩（platykurtic）、≈0 接近常態。' +
        '經驗法則 |Kurt| < 1 視為接近常態。',
    },
    apa: {
      // 占位符：{label} 變數標籤 / {n} / {m} / {sd} / {min} / {max} / {median} / {skew} / {kurt}
      sentence:
        '{label}（M = {m}, SD = {sd}, N = {n}, 全距 {min}–{max}, Median = {median}），偏度 = {skew}，峰度 = {kurt}。',
      copyHint: '一鍵複製 APA 敘述',
    },
    interp: {
      // 教學模式的白話解讀（每個變數一段）
      // {label} {m} {sd} {n} {minMaxRange} {skewWord} {kurtWord}
      sentence:
        '{label} 共有 {n} 筆有效值，平均為 {m}，標準差 {sd}，範圍 {minMaxRange}。分布形狀為「{skewWord}」、「{kurtWord}」。',
      skewLeft: '左偏',
      skewRight: '右偏',
      skewSymmetric: '近似對稱',
      kurtHigh: '高瘦於常態',
      kurtLow: '平緩於常態',
      kurtNormal: '接近常態',
    },
  },
  ttest: {
    types: {
      independent: '獨立樣本',
      paired: '配對樣本',
      oneSample: '單一樣本',
    },
    typeHint: {
      independent: 'Welch 修正版本（不假設兩組變異數相等）',
      paired: '同一受試者的兩個變數（如前測、後測）',
      oneSample: '與一個指定值（μ₀）比較',
    },
    config: {
      typeLabel: 't 檢定型別',
      depVar: '依變項',
      groupVar: '分組變項',
      groupVarHint: '需為類別變項且剛好兩組',
      groupVarBadGroups: '此變項有 {k} 組，需要剛好 2 組',
      var1: '變項 1',
      var2: '變項 2',
      mu0: '比較值 μ₀',
      pickDep: '請選依變項',
      pickGroup: '請選分組變項',
      pickVar1: '請選變項 1',
      pickVar2: '請選變項 2',
      enterMu0: '請輸入比較值',
    },
    result: {
      groupStatsTitle: '各組敘述統計',
      groupCol: '組別',
      ttestTitle: 't 檢定結果',
      pairedDescTitle: '配對差敘述統計',
      oneSampleDescTitle: '樣本敘述統計',
      cols: {
        t: 't',
        df: 'df',
        p: 'p',
        meanDiff: '平均數差',
        se: 'SE',
        d: "Cohen's d",
        effect: '效果量',
      },
      assumpTitle: '假設前提檢核',
      normality: 'Shapiro-Wilk 常態性',
      homogeneity: "Levene's 等變異數",
      assumpOk: '通過（p ≥ .05）',
      assumpViolated: '違反（p < .05）',
      assumpViolationWarn:
        '注意：偵測到前提違反。獨立樣本 t 已預設使用 Welch 修正，對等變異數違反具穩健性；若常態性嚴重違反且樣本數小（n < 30），考慮改用無母數檢定（Mann-Whitney U / Wilcoxon）。',
    },
    effectSize: {
      trivial: '微小',
      small: '小',
      medium: '中等',
      large: '大',
    },
    notes: {
      purposeTitle: '用途',
      independentPurpose: '比較兩個獨立組別的平均數是否有差異（如：實驗組 vs 控制組）。',
      pairedPurpose: '比較同一組受試者在兩個時點 / 條件下的差異（如：前測 vs 後測）。',
      oneSamplePurpose: '比較一組樣本的平均數與一個已知母體值（μ₀）是否有差異。',
      assumpTitle: '前提假設',
      independentAssump:
        '1. 兩組獨立\n2. 兩組母體呈常態分布（n ≥ 30 時可由中央極限定理放寬）\n3. 兩組母體變異數相等 — 若違反，使用 Welch 修正（本工具預設即是）',
      pairedAssump: '1. 配對差呈常態分布\n2. 配對之間獨立',
      oneSampleAssump: '1. 樣本來自常態分布母體\n2. 觀察值之間獨立',
      formulasTitle: '核心公式',
      formulaIndepT: 't = (M₁ - M₂) / √(s₁²/n₁ + s₂²/n₂)',
      formulaIndepDf:
        'df = (s₁²/n₁ + s₂²/n₂)² / [ (s₁²/n₁)²/(n₁-1) + (s₂²/n₂)²/(n₂-1) ]（Welch–Satterthwaite）',
      formulaPairedT: 't = M_D / (SD_D / √n)，其中 D = X₁ - X₂',
      formulaOneT: 't = (M - μ₀) / (SD / √n)',
      formulaCohenIndep:
        "Cohen's d = (M₁ - M₂) / s_pooled，s_pooled = √[((n₁-1)s₁² + (n₂-1)s₂²) / (n₁+n₂-2)]",
      formulaCohenPaired: "Cohen's d = M_D / SD_D",
      formulaCohenOne: "Cohen's d = (M - μ₀) / SD",
      readingTitle: '怎麼讀',
      reading:
        'p < .05：兩個平均數差異達顯著（拒絕 H₀）。\n\n' +
        "Cohen's d 解讀：" +
        '|d| < 0.2 微小、0.2-0.5 小、0.5-0.8 中等、> 0.8 大效果量。\n\n' +
        '統計顯著 ≠ 實質重要。樣本越大越容易達到統計顯著，但效果量小可能無實務意義。建議同時看 p 與 d。',
    },
    apa: {
      independent:
        '獨立樣本 t 檢定結果顯示，{g1Name}（M = {m1}, SD = {sd1}, n = {n1}）與{g2Name}（M = {m2}, SD = {sd2}, n = {n2}）之間{sigWord}差異，t({df}) = {t}, p = {pStr}，Cohen\'s d = {d}（{effectWord}效果量）。',
      paired:
        '配對樣本 t 檢定結果顯示，{var1Name}（M = {m1}, SD = {sd1}）與{var2Name}（M = {m2}, SD = {sd2}）之間{sigWord}差異，配對差平均 {meanDiff}（SD = {sdDiff}），t({df}) = {t}, p = {pStr}，Cohen\'s d = {d}（{effectWord}效果量）。',
      oneSample:
        '單一樣本 t 檢定結果顯示，樣本平均（M = {m}, SD = {sd}, n = {n}）與比較值 μ₀ = {mu0} 之間{sigWord}差異，t({df}) = {t}, p = {pStr}，Cohen\'s d = {d}（{effectWord}效果量）。',
      sigYes: '達顯著',
      sigNo: '未達顯著',
      copyHint: '一鍵複製 APA 敘述',
    },
    interp: {
      // 白話教學解讀
      independent:
        '結論：{g1Name}（M = {m1}）與{g2Name}（M = {m2}）的平均數差異{sigWord}（t = {t}, p = {pStr}）。' +
        ' Cohen\'s d = {d}，屬於{effectWord}效果量。{practical}',
      paired:
        '結論：{var1Name}（M = {m1}）與{var2Name}（M = {m2}）之間的配對差異{sigWord}（t = {t}, p = {pStr}）。' +
        ' Cohen\'s d = {d}，屬於{effectWord}效果量。{practical}',
      oneSample:
        '結論：樣本平均（M = {m}）與比較值 μ₀ = {mu0} 之間的差異{sigWord}（t = {t}, p = {pStr}）。' +
        " Cohen's d = {d}，屬於{effectWord}效果量。{practical}",
      practicalSig: '差異有統計意義；效果量可作為實務判斷的參考。',
      practicalNs: '尚不能拒絕「兩者沒有差異」的虛無假設；可能是真的沒差，或樣本太小檢定力不足。',
    },
  },
  corr: {
    title: '相關矩陣',
    methodLabel: '相關方法',
    methods: {
      pearson: 'Pearson r',
      spearman: 'Spearman ρ',
    },
    methodHint: {
      pearson: '線性相關；要求兩變數為連續且呈雙變量常態',
      spearman: '基於秩的單調相關；不要求常態，順序量表也適用',
    },
    symbol: {
      pearson: 'r',
      spearman: 'ρ',
    },
    methodLabelInline: {
      pearson: 'Pearson 積差相關',
      spearman: 'Spearman 等級相關',
    },
    selectVarsTitle: '選擇要分析的變數',
    selectVarsHint: '至少勾選 2 個數值變數（連續或順序）；會計算所有兩兩配對',
    needAtLeastTwo: '請勾選至少 2 個變數',
    cellHint: '矩陣顯示 {sym}（顯著時加星號）+ p 值與 n。* p < .05、** p < .01、*** p < .001',
    notes: {
      purposeTitle: '用途',
      purposePearson:
        '描述兩個連續／順序變數之間「線性關聯的方向與強度」。\n正相關（r > 0）：兩變數同向變動。\n負相關（r < 0）：兩變數反向變動。\nr ≈ 0：無線性關聯（可能仍有非線性關係）。',
      purposeSpearman:
        '描述兩個變數之間「單調關聯的方向與強度」（不要求線性）。\n演算法：對 X 與 Y 各自取秩後，套 Pearson 公式。\n相對於 Pearson r 的優點：不要求常態、對極端值較穩健、可處理順序量表。',
      assumpTitle: '前提假設',
      assumptionsPearson:
        '1. 兩變數均為連續變項（順序量表 ≥ 5 階亦可使用）\n2. 兩變數呈雙變量常態分布（n ≥ 30 時可由中央極限定理放寬）\n3. 兩變數呈線性關係 — 散佈圖明顯曲線時不應使用 Pearson r\n4. 觀察值之間獨立\n5. 同質變異（homoscedasticity）— 殘差散佈不應隨 X 改變',
      assumptionsSpearman:
        '1. 兩變數至少為順序測量尺度\n2. 兩變數呈單調關係（同向或反向，不必線性）\n3. 觀察值之間獨立\n（不要求常態、不要求線性、對極端值較穩健）',
      formulasTitle: '核心公式',
      formulaR: 'r = Σ((Xi - Mx)(Yi - My)) / √(Σ(Xi - Mx)² · Σ(Yi - My)²)',
      formulaT: 't = r √(n - 2) / √(1 - r²)，df = n - 2',
      formulaRho: 'ρ = Pearson(rank(X), rank(Y))（並列值用平均秩）',
      formulaTSpearman: 't = ρ √(n - 2) / √(1 - ρ²)，df = n - 2',
      readingTitle: '怎麼讀',
      reading:
        '|{sym}| 強度建議（Cohen, 1988）：< 0.1 微弱、0.1-0.3 弱、0.3-0.5 中等、> 0.5 強。\n\n' +
        '{sym}² 表示 X 與 Y 共享變異的比例（決定係數）。例：{sym} = 0.5 → {sym}² = 0.25 → 解釋 25% 變異。\n\n' +
        '相關 ≠ 因果。即使達顯著，也不能推論方向與因果。',
    },
    apa: {
      // 顯著的配對列出，無顯著時用 noSig 段落
      methodPrefix: '本研究採用{methodInline}分析。',
      pairLine: '{labelA} 與 {labelB} 之間呈{strengthWord}{directionWord}相關（{sym} = {r}, p = {pStr}, n = {n}）。',
      noSig: '本資料中無達顯著的相關配對（α = .05）。',
      copyHint: '一鍵複製 APA 敘述',
      strengthWord: { weak: '弱', moderate: '中等', strong: '強' },
      directionWord: { positive: '正', negative: '負' },
    },
    interp: {
      header: '解讀',
      // 教學模式：列出每個達顯著的配對
      pairLine: '{labelA} ↔ {labelB}：{sym} = {r} → {strengthWord}{directionWord}相關，p = {pStr} → {sigWord}',
      noSig: '所有變數兩兩之間在 α = .05 下都未達顯著。可能是真的無關，或樣本太小檢定力不足。',
      sigYes: '顯著',
      sigNo: '不顯著',
    },
  },
  simpleReg: {
    title: '簡單線性迴歸',
    config: {
      yLabel: '依變項 Y',
      xLabel: '預測變項 X',
      pickY: '請選依變項',
      pickX: '請選預測變項',
      sameVar: 'X 與 Y 不可為同一變項',
    },
    result: {
      modelTitle: '模型摘要',
      anovaTitle: 'ANOVA 表',
      coefTitle: '係數表',
      cols: {
        r: 'r', r2: 'R²', adjR2: 'Adj. R²', se: 'SE 估計值',
        source: '變異來源', ss: 'SS', df: 'df', ms: 'MS', f: 'F', p: 'p',
        regression: '迴歸模型', residual: '殘差', total: '總和',
        predictor: '預測項', b: 'b', stdErr: 'SE', beta: 'β', t: 't',
        intercept: '常數項', slope: '斜率',
      },
      assumpTitle: '殘差常態性',
    },
    notes: {
      purposeTitle: '用途',
      purpose:
        '用一個連續預測變項 X 預測連續依變項 Y。回答的問題是：\n（1）X 是否能顯著預測 Y？（F 檢定 / b₁ 的 t 檢定）\n（2）X 解釋了 Y 的多少變異？（R²）\n（3）X 每增加 1 單位，Y 平均改變多少？（斜率 b₁）',
      assumpTitle: '前提假設',
      assumptions:
        '1. 線性關係：X 與 Y 之間為線性關係（散佈圖檢視）\n2. 觀察值獨立\n3. 殘差呈常態分布（Shapiro-Wilk 自動檢核）\n4. 同質變異：殘差變異不隨 X 改變（待 PR-3c.5 加 Breusch-Pagan）',
      formulasTitle: '核心公式',
      formulaB1: 'b₁ = Σ((Xi - Mx)(Yi - My)) / Σ(Xi - Mx)²',
      formulaB0: 'b₀ = My - b₁ · Mx',
      formulaR2: 'R² = SS_迴歸 / SS_總和 = 1 - SS_殘差 / SS_總和',
      formulaAdjR2: 'Adj. R² = 1 - (1 - R²)(n - 1)/(n - k - 1)（k 為預測變項數，此處 k = 1）',
      formulaF: 'F = MS_迴歸 / MS_殘差，df₁ = 1, df₂ = n - 2',
      formulaBeta: '標準化 β = b₁ · SD(X) / SD(Y)（簡單迴歸下 = r）',
      readingTitle: '怎麼讀',
      reading:
        '迴歸方程式：Ŷ = b₀ + b₁ · X\n\n' +
        '解讀步驟：\n' +
        '1. 看 F 與其 p — 是否整體模型顯著？\n' +
        '2. 看 R² — 模型解釋了 Y 的多少變異？（簡單迴歸下 R² = r²）\n' +
        '3. 看 b₁ 的方向與大小 — X 增加 1 單位，Y 平均如何變動？\n' +
        '4. 看標準化 β — 與其他模型比較預測強度時用。',
    },
    apa: {
      sentence:
        '簡單線性迴歸結果顯示，{xLabel} 顯著預測 {yLabel}（F({df1}, {df2}) = {f}, p = {pStr}），R² = {r2}，調整後 R² = {adjR2}。迴歸方程式為 {yLabel} = {b0} + {b1} × {xLabel}（β = {beta}, t({df2}) = {t}, p = {pStrSlope}）。',
      sentenceNs:
        '簡單線性迴歸結果顯示，{xLabel} 對 {yLabel} 之預測未達顯著（F({df1}, {df2}) = {f}, p = {pStr}），R² = {r2}，調整後 R² = {adjR2}。',
      copyHint: '一鍵複製 APA 敘述',
    },
    interp: {
      sentence:
        '結論：{xLabel} 對 {yLabel} 的預測{sigWord}（F = {f}, p = {pStr}）。模型解釋了 {r2Pct}% 的變異（R² = {r2}）。' +
        '預測方程式為 Ŷ = {b0} + {b1} × X — X 每增加 1 單位，Y 平均改變 {b1} 單位。' +
        ' 標準化係數 β = {beta}，效果量{strengthWord}。',
      sigYes: '達顯著',
      sigNo: '未達顯著',
      strengthWeak: '較弱',
      strengthModerate: '中等',
      strengthStrong: '較強',
    },
  },
  anova2: {
    title: '雙因子變異數分析',
    config: {
      depVar: '依變項（連續或順序）',
      factorA: '因子 A',
      factorB: '因子 B',
      pickDep: '請選依變項',
      pickFactorA: '請選因子 A',
      pickFactorB: '請選因子 B',
      sameFactor: '兩個因子不可為同一變項',
      hint: '兩個因子均需為類別型，且各 ≥ 2 組',
    },
    result: {
      cellMeansTitle: '細格平均（Cell Means）',
      anovaTitle: 'ANOVA 表（Type III SS）',
      effectSizeTitle: '效果量',
      interactionPlotTitle: '交互作用圖',
      cols: {
        source: '變異來源',
        ss: 'SS',
        df: 'df',
        ms: 'MS',
        f: 'F',
        p: 'p',
        partialEta2: '偏 η²',
        effectA: '主效果 A',
        effectB: '主效果 B',
        effectAB: '交互作用 A × B',
        error: '誤差',
        total: '總和',
        cell: '細格',
        marginalRow: '邊際 A',
        marginalCol: '邊際 B',
        grandMean: '總平均',
        n: 'n',
        mean: 'M',
        sd: 'SD',
      },
      effectInterp: {
        small: '小', medium: '中', large: '大',
      },
    },
    notes: {
      purposeTitle: '用途',
      purpose:
        '同時檢驗兩個類別自變項對一個連續依變項的影響。回答的問題：\n' +
        '（1）A 因子的主效果：忽略 B 時，A 各組是否有差？\n' +
        '（2）B 因子的主效果：忽略 A 時，B 各組是否有差？\n' +
        '（3）A × B 交互作用：A 對 Y 的效果是否會隨 B 的層級而不同？\n' +
        '當交互作用顯著時，主效果的解讀需在交互作用條件下進行（不能只看邊際）。',
      assumpTitle: '前提假設',
      assumptions:
        '1. 觀察值獨立\n' +
        '2. 每個細格的母體呈常態分布（n ≥ 30 / 細格時可放寬）\n' +
        '3. 細格間變異數同質（Levene\'s 待後續加入）\n' +
        '4. 各變項均正確分類（無誤分組）\n' +
        '5. 樣本量：建議每細格至少 5 筆',
      formulasTitle: '核心公式（Type III SS）',
      formulaSS:
        '對每個效果 E，採設計矩陣效果編碼後跑 OLS：\n' +
        'SS_E = ESS(完整模型移除 E) − ESS(完整模型)',
      formulaDf: 'df_A = nA − 1, df_B = nB − 1, df_AB = (nA − 1)(nB − 1), df_誤差 = N − nA · nB',
      formulaPartialEta2: '偏 η² = SS_效果 / (SS_效果 + SS_誤差)',
      readingTitle: '怎麼讀',
      reading:
        '解讀步驟：\n' +
        '1. 先看交互作用 A × B 的 p — 顯著嗎？\n' +
        '2. 若交互作用顯著 → 主效果的解讀必須在不同 B 層級分別檢視（簡單主效應分析），不能單純看邊際平均\n' +
        '3. 若交互作用不顯著 → 可分別解讀兩個主效果\n' +
        '4. 偏 η² 解讀：< 0.06 小、0.06-0.14 中、≥ 0.14 大\n\n' +
        '交互作用圖判讀：\n' +
        '- 兩條線平行 → 無交互作用\n' +
        '- 兩條線交叉 → 序級交互作用（disordinal）\n' +
        '- 兩條線同向但斜率不同 → 量級交互作用（ordinal）',
    },
    apa: {
      sentence:
        '雙因子變異數分析結果顯示，{factorA} 主效果{sigA}（F({df1A}, {df2}) = {fA}, p = {pA}, 偏 η² = {peA}）、' +
        '{factorB} 主效果{sigB}（F({df1B}, {df2}) = {fB}, p = {pB}, 偏 η² = {peB}）、' +
        '{factorA} × {factorB} 交互作用{sigAB}（F({df1AB}, {df2}) = {fAB}, p = {pAB}, 偏 η² = {peAB}）。',
      sigYes: '達顯著',
      sigNo: '未達顯著',
      copyHint: '一鍵複製 APA 敘述',
    },
    interp: {
      header: '解讀',
      summary:
        '主效果 A（{factorA}）：F({df1A}, {df2}) = {fA}, p = {pA} → {sigA}（偏 η² = {peA}, {effectA}）\n' +
        '主效果 B（{factorB}）：F({df1B}, {df2}) = {fB}, p = {pB} → {sigB}（偏 η² = {peB}, {effectB}）\n' +
        '交互作用 A × B：F({df1AB}, {df2}) = {fAB}, p = {pAB} → {sigAB}（偏 η² = {peAB}, {effectAB}）',
      interactionWarn: '交互作用顯著：主效果只能在「特定 B 層級」內解讀；建議搭配交互作用圖與簡單主效應檢定。',
      sigYes: '顯著',
      sigNo: '不顯著',
    },
  },
  anova: {
    title: '單因子變異數分析',
    config: {
      depVar: '依變項',
      factor: '因子（分組變項）',
      pickDep: '請選依變項',
      pickFactor: '請選因子',
      factorHint: '需為類別變項且至少 3 組（兩組請改用 t 檢定）',
      factorBadGroups: '此變項只有 {k} 組（< 2 組），無法執行 ANOVA',
      useTTestForTwoGroups: '此分組變項僅有 2 組，ANOVA 此時等價於兩樣本 t 檢定，請改用左側選單的「獨立樣本 t 檢定」以取得更直觀的結果。',
    },
    result: {
      groupStatsTitle: '各組敘述統計',
      anovaTitle: 'ANOVA 表',
      effectSizeTitle: '效果量',
      tukeyTitle: 'Tukey HSD 事後比較',
      bonferroniTitle: 'Bonferroni 事後比較',
      bonferroniHint: 'p_adj = min(1, p_raw × m)，m = {m}（比較組數）；較保守但與 Tukey 結果一致時可雙重佐證',
      assumpTitle: '假設前提檢核',
      groupCol: '組別',
      cols: {
        source: '變異來源',
        ss: 'SS',
        df: 'df',
        ms: 'MS',
        f: 'F',
        p: 'p',
        between: '組間',
        within: '組內',
        total: '總和',
        eta2: 'η²',
        omega2: 'ω²',
        pair: '比較',
        meanDiff: '平均差',
        se: 'SE',
        q: 'q',
        t: 't',
        pRaw: 'p（未校正）',
        pAdj: 'p（Bonferroni）',
      },
      effectInterp: {
        eta2Label: 'η²（樣本內效果量）：',
        omega2Label: 'ω²（無偏估計）：',
        small: '小',
        medium: '中',
        large: '大',
        // Cohen 慣例：η² < 0.06 小、< 0.14 中、≥ 0.14 大
      },
      assumpViolationWarn:
        '注意：偵測到前提違反。傳統單因子 ANOVA 對中度違反具一定穩健性，但若常態性嚴重違反或變異數差距大，考慮改用 Welch ANOVA 或 Kruskal-Wallis 無母數檢定。',
    },
    notes: {
      purposeTitle: '用途',
      purpose:
        '比較三組（含）以上獨立樣本的平均數是否有差異。\n' +
        'F 檢定回答「至少有一組與其他組不同嗎？」（整體效果）；達顯著後再用 Tukey HSD 找出「具體是哪幾對組別不同」（事後比較）。',
      assumpTitle: '前提假設',
      assumptions:
        '1. 各組獨立\n' +
        '2. 各組母體呈常態分布（n ≥ 30 時可由中央極限定理放寬）\n' +
        '3. 各組母體變異數相等（homogeneity of variance）— 違反時改用 Welch ANOVA',
      formulasTitle: '核心公式',
      formulaSSb: 'SS_組間 = Σ n_i · (M_i - M̄)²',
      formulaSSw: 'SS_組內 = Σ_i Σ_j (X_ij - M_i)²',
      formulaF: 'F = (SS_組間 / df_組間) / (SS_組內 / df_組內)，df_組間 = k-1，df_組內 = N-k',
      formulaEta2: 'η² = SS_組間 / SS_總和',
      formulaOmega2: 'ω² = (SS_組間 - df_組間 · MS_組內) / (SS_總和 + MS_組內)',
      formulaTukey:
        'Tukey HSD：q_ij = |M_i - M_j| / √(MS_組內 · (1/n_i + 1/n_j) / 2)，' +
        'p 值用 studentized range 分布（k, df_組內）右尾',
      readingTitle: '怎麼讀',
      reading:
        '1. F 檢定 p < .05 → 至少一對組別不同（整體效果顯著），可進事後比較。\n' +
        '2. F 檢定 p ≥ .05 → 不可進事後比較（族系錯誤率失控）。\n\n' +
        'η² 解讀（Cohen, 1988）：< 0.06 小、0.06-0.14 中、≥ 0.14 大。\n\n' +
        'ω² 較 η² 無偏，特別是小樣本時建議報告。\n\n' +
        'Tukey HSD 已自動控制族系錯誤率（family-wise error），所有兩兩比較共用 α = .05。',
    },
    apa: {
      sentence:
        '單因子變異數分析結果顯示，{factor}對{depVar}的影響{sigWord}，F({df1}, {df2}) = {f}, p = {pStr}，η² = {eta2}（{etaInterp}效果量）。' +
        '{tukeySection}',
      sentenceNs:
        '單因子變異數分析結果顯示，{factor}對{depVar}的影響{sigWord}，F({df1}, {df2}) = {f}, p = {pStr}，η² = {eta2}。',
      tukeyOpener: 'Tukey HSD 事後比較顯示：',
      tukeyPairLine: '{a}（M = {ma}）與{b}（M = {mb}）之間達顯著差異（平均差 = {diff}, p = {pStr}）',
      tukeyNoSig: 'Tukey HSD 事後比較中，無任何兩組達顯著差異。',
      copyHint: '一鍵複製 APA 敘述',
    },
    interp: {
      header: '解讀',
      overall:
        '整體 F 檢定 {sigWord}：F({df1}, {df2}) = {f}, p = {pStr}。' +
        '\n效果量 η² = {eta2}，屬於{etaInterp}效果量；ω² = {omega2}（無偏估計）。',
      tukeyOpener: 'Tukey HSD 事後比較結果：',
      tukeyPair: '{a} vs {b}：平均差 = {diff}，q = {q}，p = {pStr} → {sigWord}',
      noPosthoc: '整體 F 不顯著，不進行事後比較。',
      sigYes: '顯著',
      sigNo: '不顯著',
    },
  },
  efa: {
    title: '探索性因素分析',
    config: {
      selectVarsTitle: '選擇要分析的變數',
      selectVarsHint: '至少 3 個數值變數（連續或順序）；建議 ≥ 5 個以呈現結構',
      needAtLeastThree: '請至少勾選 3 個變數',
      nFactorsTitle: '因子數',
      nFactorsHint: '留空 → Kaiser 規則（特徵值 > 1）；填入正整數 → 強制使用該數',
      rotationTitle: '轉軸方法',
      rotations: {
        varimax: 'Varimax（正交）',
        none: '不轉軸',
      },
      rotationHint: {
        varimax: '正交轉軸：因子之間相互獨立；單純結構詮釋',
        none: '主成分原始 loadings；通常難以詮釋',
      },
    },
    result: {
      suitabilityTitle: '適合度檢定',
      eigenvaluesTitle: '特徵值與變異解釋',
      screeTitle: '陡坡圖（Scree Plot）',
      loadingsTitle: '因子負荷量矩陣',
      communalitiesTitle: '共同性（h²）',
      cols: {
        kmo: 'KMO（取樣適切性）',
        bartlett: "Bartlett's 球形檢定",
        chi2: 'χ²',
        df: 'df',
        p: 'p',
        factor: '因子',
        eigenvalue: '特徵值',
        percent: '變異 %',
        cumulative: '累積 %',
        variable: '變數',
        h2: 'h²',
        communalities: '共同性',
      },
      kmoInterp: {
        unacceptable: '不可接受', miserable: '極差', mediocre: '尚可', middling: '中等',
        meritorious: '優良', marvelous: '極佳',
      },
      decisionRule: '採用 {k} 個因子（{strategy}）',
      strategyKaiser: 'Kaiser：特徵值 > 1',
      strategyUser: '使用者指定',
      bartlettSig: '球形檢定顯著（拒絕單位矩陣假設，適合 EFA）',
      bartlettNs: '球形檢定未顯著（變數彼此關聯弱，EFA 結果可能不穩）',
      cumNote: '累積變異 ≥ {pct}% — 採用 {k} 個因子',
    },
    notes: {
      purposeTitle: '用途',
      purpose:
        '從多個觀察變數中找出潛在的「共同因子」結構。\n' +
        '回答的問題：\n' +
        '（1）這些變數背後有幾個潛在構念？\n' +
        '（2）每個變數主要反映哪個因子？（負荷量）\n' +
        '（3）模型解釋了多少變異？（共同性 + 累積變異）',
      assumpTitle: '前提假設',
      assumptions:
        '1. 變數至少為順序測量（5 階以上 Likert 可用）\n' +
        '2. 樣本量：至少 5N（每變數 5 筆），或 N ≥ 100；KMO ≥ 0.6 才適合\n' +
        '3. Bartlett\'s 球形檢定須顯著（變數間有相關）\n' +
        '4. 雙變量常態分布（Pearson 相關矩陣穩健性的需要）\n' +
        '5. 線性關係',
      formulasTitle: '核心公式',
      formulaR: '相關矩陣 R（p × p）',
      formulaEig: 'R = V · diag(λ) · Vᵀ（特徵分解，Jacobi 旋轉法）',
      formulaLoad: '主成分負荷量：A = V · diag(√λ)；取前 k 行 → A_k',
      formulaH2: '共同性 hᵢ² = Σⱼ aᵢⱼ²（採用 k 個因子後第 i 個變數的解釋程度）',
      formulaVarimax:
        'Varimax：對 A_k 做 Kaiser 標準化後，迭代旋轉每對因子使「平方負荷量變異」最大\n' +
        'V(L) = (1/p) Σⱼ [Σᵢ lᵢⱼ⁴ − (1/p)(Σᵢ lᵢⱼ²)²]',
      formulaBartlett:
        "Bartlett's: χ² = -((n-1) - (2p+5)/6) · ln|R|，df = p(p-1)/2",
      readingTitle: '怎麼讀',
      reading:
        '1. 看 KMO（≥ 0.6 才適合）+ Bartlett\'s p（顯著才適合）\n' +
        '2. 看陡坡圖找「斷點」—— 大於斷點的因子保留\n' +
        '3. 看 Kaiser（特徵值 > 1）建議的因子數，與斷點對照\n' +
        '4. 看轉軸後負荷量矩陣 — 每個變數歸屬最大絕對值的因子\n' +
        '5. 看共同性 h² — < 0.30 表示該變數被模型解釋有限，考慮移除\n\n' +
        '負荷量解讀慣例（絕對值）：\n' +
        '- ≥ 0.71 優秀（excellent）\n' +
        '- ≥ 0.63 很好（very good）\n' +
        '- ≥ 0.55 好（good）\n' +
        '- ≥ 0.45 普通（fair）\n' +
        '- ≥ 0.32 可接受（poor）\n' +
        '- < 0.32 應考慮移除',
    },
    apa: {
      sentence:
        '對 {p} 個變數進行探索性因素分析（主成分萃取，Varimax 轉軸）。' +
        'KMO = {kmo}（{kmoInterp}），Bartlett\'s 球形檢定顯著（χ²({df}, N = {n}) = {chi2}, p = {pStr}）。' +
        '採 Kaiser 規則保留 {k} 個因子，累積解釋變異 {cumPct}%。',
      sentenceUnsuit:
        '對 {p} 個變數的 KMO = {kmo}（{kmoInterp}），EFA 適合度{suitWord}。',
      copyHint: '一鍵複製 APA 敘述',
    },
    interp: {
      header: '解讀',
      summary:
        '適合度：KMO = {kmo}（{kmoInterp}）；Bartlett χ²({df}) = {chi2}, p = {pStr}。\n' +
        '採用 {k} 個因子，累積變異 {cumPct}%。\n' +
        '{rotationLine}',
      rotationLineYes: '已套用 Varimax 正交轉軸；負荷量矩陣較易詮釋。',
      rotationLineNo: '未套用轉軸；單一因子或要求不轉軸時，原始負荷量直接呈現。',
    },
  },
  alpha: {
    title: "Cronbach's α 信度分析",
    selectVarsTitle: '選擇量表題',
    selectVarsHint:
      '勾選同一個量表的題目（建議至少 3 題；若有反向題，請先在 Step 4 變數轉換中重新編碼）',
    needAtLeast2: '請選至少 2 題',
    summaryTitle: '總體信度',
    itemTitle: '項目分析',
    cols: {
      alpha: 'Cronbach α',
      kItems: '題數',
      n: '有效樣本',
      meanInter: '平均項間相關',
      item: '項目',
      mean: 'M',
      sd: 'SD',
      itemTotalCorr: '校正項目-總分相關',
      alphaIfDeleted: '刪題後 α',
      interpretation: '解讀',
    },
    interpretation: {
      excellent: '極佳',
      good: '良好',
      acceptable: '可接受',
      questionable: '疑慮',
      poor: '不佳',
      unacceptable: '不可接受',
    },
    droppedNote: '因遺漏值剔除 {n} 列（listwise deletion）',
    notes: {
      purposeTitle: '用途',
      purpose:
        '評估量表內部一致性信度（internal consistency reliability）。\n' +
        '回答的問題：「這幾道題目是不是在量同一個構念？分數加總有沒有道理？」\n\n' +
        '注意：α 是「同質性」的指標，不是「效度」。α 高只代表題目互相一致，不代表它們真的測到你想測的東西（那是建構效度的問題，需要 EFA / CFA / 收斂效度等）。',
      assumpTitle: '前提假設',
      assumptions:
        '1. 各題測量同一個潛在構念（單向度）— α 在多向度量表會失準\n' +
        '2. 各題之間在概念上應為加總有意義（不是排序、不是分類）\n' +
        '3. 反向題已先重新編碼為同方向\n' +
        '4. 各題測量誤差互相獨立（tau-equivalent 假設；違反時 α 為下界估計）',
      formulasTitle: '核心公式',
      formulaAlpha: 'α = (k / (k-1)) · (1 - Σσ²_i / σ²_t)',
      formulaItc:
        '校正項目-總分相關 r_i = Pearson(X_i, Σ_{j≠i} X_j)',
      formulaAlphaDel:
        "刪題後 α(i) = α 用 k - 1 題重算（去掉 X_i）",
      readingTitle: '怎麼讀',
      reading:
        'α 解讀慣例（DeVellis 2017 / Nunnally 1978）：\n' +
        '≥ 0.90 極佳、0.80-0.89 良好、0.70-0.79 可接受、0.60-0.69 疑慮、0.50-0.59 不佳、< 0.50 不可接受。\n\n' +
        '檢視「校正項目-總分相關」：\n' +
        '- ≥ 0.30：該題與整份量表共識性合理\n' +
        '- < 0.30：該題與其他題共識性低，建議檢視題意或考慮刪除\n' +
        '- 接近 0 或為負：該題可能反向計分未處理，或測量到不同構念\n\n' +
        '檢視「刪題後 α」：\n' +
        '- 若刪除某題後 α 顯著上升，該題可能損害一致性，建議檢視\n' +
        '- 若所有題刪題後 α 都下降，量表內部結構穩健\n\n' +
        '注意：題數越多，α 通常越高（公式中 k/(k-1) 的影響）。比較不同量表的 α 時要考慮題數差異。',
    },
    apa: {
      sentence:
        '本研究以 Cronbach\'s α 評估量表的內部一致性信度。{itemList} 共 {k} 題（n = {n}），α = {alpha}（{interp}），平均項間相關 = {meanInter}。',
      copyHint: '一鍵複製 APA 敘述',
    },
    interp: {
      header: '解讀',
      summary:
        '本量表共 {k} 題，有效樣本 {n} 筆，Cronbach α = {alpha}（{interp}信度）。' +
        '平均項間相關 = {meanInter}。{recommendation}',
      recommendExcellent: '量表內部一致性極佳，可直接使用。',
      recommendGood: '量表內部一致性良好，可使用。',
      recommendAcceptable:
        '量表內部一致性可接受，建議檢視「校正項目-總分相關 < 0.30」的題目；若有「刪題後 α 明顯上升」的題目，考慮修訂或刪除。',
      recommendLow:
        '量表內部一致性偏低，建議：（1）檢視反向題是否已重新編碼；（2）檢視校正項目-總分相關過低的題目；（3）若仍偏低，需重新檢視量表的構念與題目設計。',
    },
  },
  pls: {
    title: 'PLS-SEM 偏最小平方法結構方程模型',
    config: {
      lvsTitle: '潛在變數（構念）',
      lvsHint: '為每個潛在變數命名、選擇測量模式（反映型／形成型）並勾選指標題（每構念建議 ≥ 3 題，允許單指標）',
      lvLabel: '構念',
      indicatorsLabel: '指標',
      modeLabel: '測量模式',
      modeReflective: '反映型',
      modeFormative: '形成型',
      modeHint: '反映型（Mode A）＝指標是構念的展現；形成型（Mode B）＝指標共同組成構念，報表以權重檢定＋外部 VIF 取代信度表',
      addLv: '新增潛在變數',
      removeLv: '刪除此構念',
      noIndicatorsLeft: '可用指標已被其他構念佔用',
      pathsTitle: '結構路徑（from → to）',
      pathsHint: '宣告構念之間的影響方向；路徑圖必須無環（遞迴模型）',
      addPath: '新增路徑',
      removePath: '刪除此路徑',
      pickLv: '選擇構念',
      pathIncomplete: '第 {i} 條路徑尚未同時選擇 from 與 to',
      bootstrapTitle: 'Bootstrap 重抽次數',
      bootstrapHint: '期刊慣例為 5000 次；資料量大或先探索時，可用 500 / 1000 快速預覽（預設 1000）',
      advancedTitle: '進階選項',
      schemeTitle: 'Weighting scheme',
      schemeNames: { path: 'Path', factorial: 'Factorial', centroid: 'Centroid' },
      schemeHint: 'Path 為 SmartPLS 4 預設；centroid / factorial 供方法比較與舊文獻重現。',
      plscLabel: 'Consistent PLS（PLSc）',
      plscHint: '以 rho_A 校正反映型構念的測量誤差衰減（Dijkstra & Henseler, 2015）；路徑、loadings、CR / AVE 皆改用校正後值，bootstrap 同步採 consistent 流程。',
      ciTypeTitle: 'Bootstrap 信賴區間',
      ciPercentile: 'Percentile',
      ciBca: 'BCa',
      ciTypeHint: 'Percentile 為 SmartPLS 4 預設；BCa（偏誤校正＋加速）另需 n 次 jackknife 重估計，較慢但對偏態抽樣分布較準。',
      q2Label: 'Blindfolding Q²',
      q2Hint: '構念層 cross-validated redundancy（omission distance = 7），評估內生構念的預測相關性；會增加運算時間。',
      run: '執行分析',
      rerun: '重新執行分析',
      staleNote: '模型設定已變更 — 目前結果對應的是上一次執行的設定，請重新執行。',
      errorsTitle: '模型驗證未通過：',
      modeNote: 'W4 版本：調節（two-stage 對齊 SmartPLS 4；product indicator／orthogonalizing 選配）、二次效果、三向交互、高階構念（repeated indicators／two-stage／disjoint）、中介效果分解（bootstrap CI）。W3 既有：Mode A/B、三種 scheme、PLSc、percentile/BCa、model fit、Q²。限制：PLSc 與 Q² 不支援含調節／高階構念的模型。缺失值採 casewise 剔除。',
      viewForm: '表單',
      viewCanvas: '畫布',
      viewFormHint: '以下拉與多選宣告模型；適合精確編輯與行動裝置。',
      viewCanvasHint: '右側主區切換為拖拉式模型畫布，與表單共用同一份模型。',
      canvasNarrowFallback: '畫布需要較寬螢幕，行動裝置已自動退回表單模式。',
      interactionsTitle: '調節與二次效果（交互項）',
      interactionsHint: '宣告 A × B 交互項後，在結構路徑把它指向依變數；A 與 B 選同一構念即為二次效果（僅 two-stage）。未宣告的主效果路徑（A → Y、B → Y）引擎會自動補上（SmartPLS 4 行為）。',
      addInteraction: '新增交互項',
      removeInteraction: '刪除此交互項',
      intFactor1: '構念 A',
      intFactor2: '構念 B',
      intFactor3: '構念 C（三向交互，可留空）',
      intMethodTitle: '交互項生成法（全部交互項共用）',
      intMethodNames: { 'two-stage': 'Two-stage', 'product-indicator': 'Product indicator', orthogonal: 'Orthogonal' },
      intMethodHint: 'Two-stage 為 SmartPLS 4 唯一支援且本工具對齊之法（交互項不標準化）；product indicator／orthogonalizing 對齊 seminr、供方法比較，僅支援兩個相異的反映型構念。',
      intIncomplete: '第 {i} 個交互項尚未選滿兩個構念',
      hocTitle: '高階構念（HOC）',
      hocHint: '把多個低階構念組成高階構念。低階構念會被高階構念吸收：結構路徑與交互項請改用高階構念名稱。',
      addHoc: '新增高階構念',
      removeHoc: '刪除此高階構念',
      hocNameLabel: '名稱',
      hocComponentsLabel: '低階構念（≥ 2）',
      hocMethodTitle: '估計法（全部高階構念共用）',
      hocMethodNames: { repeated: 'Repeated indicators', disjoint: 'Disjoint two-stage', 'two-stage': 'Embedded two-stage' },
      hocMethodHint: 'Disjoint two-stage 為近年方法文獻的建議（Becker et al., 2023）；repeated indicators 單次估計最透明，但高階構念指向低階構念的路徑會墊高其 R²，解讀時留意。',
      hocIncomplete: '高階構念「{name}」需要名稱與至少 2 個低階構念',
      w5Title: '群組與預測（W5）',
      w5GroupColumn: '分組欄位',
      w5PickColumn: '選擇欄位',
      w5PickValue: '選擇群組值',
      w5G1: '群組 1',
      w5G2: '群組 2',
      w5MgaLabel: 'PLS-MGA 多群組分析',
      w5MgaHint: '兩群組路徑係數差異的三法檢定（Henseler MGA／permutation／參數檢定）；建議先看 MICOM 確認測量恆等性。',
      w5MicomLabel: 'MICOM 測量恆等性',
      w5MicomHint: 'MGA 的前置檢核：compositional invariance（step 2）與等平均/等變異（step 3）的 permutation 檢定。',
      w5PermsTitle: 'Permutation 次數',
      w5PermsHint: '正式報告建議 1000；探索用 200 較快。',
      w5PredictLabel: 'PLSpredict（k-fold 樣本外預測）',
      w5PredictHint: '含 LM 基準比較與 CVPAT 檢定（Shmueli et al., 2019；Liengaard et al., 2021）。',
      w5KTitle: 'k（folds）',
      w5IpmaLabel: 'IPMA 重要性－績效地圖',
      w5IpmaHint: '非標準化總效果（importance）×0–100 重標定分數平均（performance）；選擇目標構念。',
      w5CipmaLabel: 'cIPMA（結合 NCA 必要性）',
      w5CipmaHint: '對目標的直接前置構念，以 0–100 分數跑必要條件分析（NCA）；必要性判準 d ≥ .1 且 permutation p < .05（Hauff et al., 2024）。',
      w5Target: '目標構念',
      w5NeedGroups: 'MGA／MICOM 需要選擇分組欄位與兩個不同的群組值',
      w5NeedTarget: 'IPMA 需要選擇目標構念（必須是內生構念）',
      w5W4Note: '注意：MICOM／PLSpredict／IPMA 目前不支援含調節或高階構念的模型。',
    },
    canvas: {
      hint: '拖曳構念移動位置；從一個構念的下方端點拉到另一構念建立路徑；點路徑可刪；點構念開指標面板（可切換反映型／形成型）；雙擊改名。',
      legend: '橢圓 = 潛在變數（圓內顯示 R²、形成型標記 Mode B）、小矩形 = 指標（連線顯示 loading；形成型顯示權重 w）、箭頭 = 結構路徑（顯示 β 與顯著星號）。綠 = 顯著、紅 = 未達顯著。',
      empty: '尚無潛在變數，先新增一個構念開始建模。',
      exportBtn: '匯出模型圖',
      exportHint: '匯出白底 PNG（論文用）',
      exporting: '匯出中…',
      modeBadge: 'Mode B（形成型）',
    },
    result: {
      runFirst: '請先在左側宣告潛在變數與結構路徑，按「執行分析」後才會計算（bootstrap 需要數秒鐘）。',
      computing: '計算中……bootstrap {pct}%（已移至背景執行緒，介面不會卡住）',
      computingShort: '計算中……完成後自動顯示。',
      cards: { n: '有效樣本 N', iterations: 'PLS 迭代', bootstrap: 'Bootstrap 有效重抽', r2: 'R²' },
      converged: '已收斂',
      notConverged: '未收斂',
      settingsLine: 'weighting scheme = {scheme}{plsc}',
      plscTag: '｜PLSc（consistent PLS）已啟用 — 路徑與 loadings 為校正後值',
      measurementTitle: '測量模型 — 外部負荷量（反映型）',
      loadingNote: '負荷量門檻：≥ .708 佳（綠）、.40 – .708 邊緣（黃）、< .40 不佳（紅）。SE / t / p 來自 bootstrap 重抽。',
      formativeTitle: '測量模型 — 形成型外部權重（bootstrap 檢定）',
      formativeNote: '權重的 SE / t / p / CI 來自 bootstrap；外部 VIF（指標共線性）：< 3.3 佳（綠）、3.3 – 5 注意（黃）、≥ 5 疑慮（紅）。權重不顯著時，負荷量 ≥ .50 仍可支持保留該指標（備援判讀；Hair et al., 2017）。',
      reliabilityTitle: '測量模型 — 信度與收斂效度',
      reliabilityNote: '通過門檻：α ≥ .70、rho_A ≥ .70、CR ≥ .70、AVE ≥ .50；列首燈號 = 四項全數通過。單指標構念定義上皆為 1，以「—」表示；形成型構念不適用信度/收斂效度，見形成型權重表。',
      discriminantFLTitle: '區辨效度 — Fornell-Larcker 準則',
      flNote: '對角線（粗體）為 √AVE，須大於同列／同欄所有構念間相關（綠 = 通過、紅 = 違反）；形成型構念不定義 AVE（—）。',
      discriminantHTMTTitle: '區辨效度 — HTMT',
      htmtNote: 'HTMT < .85 通過（綠）、≥ .85 區辨效度有疑慮（紅）；含單指標或形成型構念的配對不定義（—）。',
      structuralTitle: '結構模型 — 路徑係數（bootstrap 推論）',
      bootstrapMeta: 'bootstrap {nValid} / {nRequested} 次有效重抽（seed = {seed}、{ciType} 95% CI、construct-level 符號校正）',
      bootstrapUnavailable: 'Bootstrap 失敗，以下僅顯示點估計：{message}',
      r2Title: '結構模型 — 解釋力',
      effectsTitle: '結構模型 — 效果量 f² 與共線性 VIF',
      f2Note: 'f² 慣例（Cohen, 1988）：.02 小、.15 中、.35 大。VIF：< 3.3 佳（綠）、3.3 – 5 注意（黃）、≥ 5 共線性疑慮（紅）。',
      fitTitle: '模型適配 — SRMR / d_ULS / d_G / NFI',
      fitNote: 'SRMR：< .08 佳（綠）、.08 – .10 邊緣（黃）、≥ .10 不佳（紅）；NFI ≥ .90 佳。d_ULS / d_G 供模型間比較（越小越好）。「飽和模型」構念相關自由（只評測量模型）、「估計模型」依結構路徑隱含相關。依原始文獻公式計算（SmartPLS 未完整公開實作細節），建議與 SmartPLS / seminr 抽驗互證。\nGoF（Tenenhaus et al., 2005）＝ √(平均 communality × 平均 R²)：官方文件明載**不建議**作為適配指標，僅供舊文獻對照；communality 取反映型多指標構念。',
      q2Title: '預測相關性 — Blindfolding Q²',
      q2Note: 'Q² > 0 表示對該內生構念具預測相關性（綠）；≤ 0 表示不優於以平均數預測（紅）。構念層 cross-validated redundancy，omission distance D = {d}。',
      q2Unavailable: 'Q² 計算失敗：{message}',
      cols: {
        lv: '構念',
        indicator: '指標',
        loading: '負荷量',
        weight: '權重',
        outerVif: '外部 VIF',
        alpha: "Cronbach's α",
        rhoA: 'rho_A',
        cr: 'CR',
        ave: 'AVE',
        path: '路徑',
        beta: 'β',
        se: 'Bootstrap SE',
        t: 't',
        p: 'p',
        ci: '95% CI',
        r2: 'R²',
        adjR2: '調整 R²',
        f2: 'f²',
        vif: 'VIF',
        effect: '效果量',
        fitIndex: '適配指標',
        saturated: '飽和模型',
        estimated: '估計模型',
        q2: 'Q²',
      },
      f2Interp: { none: '不足', small: '小', medium: '中', large: '大' },
      stage1Note: '多階段模型：以下測量模型統計量（負荷量、信效度、區辨效度、fit）來自第一階段（原始指標）；結構模型（路徑、R²、f²）來自最終階段（LV 分數）。最終（分數層）模型不報 model fit。',
      autoAddedLine: '已自動補主效果路徑：{paths}（SmartPLS 4 行為）',
      interactionTitle: '調節 — 交互效果與 simple slopes',
      interactionMethodLine: '交互項生成法 = {method}',
      sdProductTag: '｜交互項不標準化（÷ sd 乘積）',
      quadraticTag: '二次效果',
      slopesNote: 'Simple slope（Aiken & West, 1991）：調節變數在 −1 SD／平均／＋1 SD 的條件斜率；SE / t / p / CI 由 bootstrap 路徑重抽派生。two-stage 交互項係數以未標準化乘積量尺回報（SmartPLS 4 慣例）；二次效果顯示 x = −1／0／＋1 SD 處之切線斜率。product indicator／orthogonalizing 不提供 simple slope（係數為標準化構念量尺）。',
      slopeLevelNames: { lo: '−1 SD', mid: '平均', hi: '＋1 SD' },
      slopeCol: '條件斜率',
      slopeAxisX: '{iv}（SD）',
      slopeLegendModerator: '調節變數 {moderator}',
      mediationTitle: '中介 — 效果分解（bootstrap CI）',
      mediationNote: '特定間接效果之 bootstrap CI 不含 0 即支持該中介路徑（Preacher & Hayes, 2008）。VAF = 間接效果總和 ÷ 總效果（Hair et al., 2017）：> 80% 近完全中介、20% – 80% 部分中介、< 20% 中介有限（僅在直接與間接同向時具意義）。類型判讀（Zhao et al., 2010）見報告模式。',
      effectCol: '效果',
      directLabel: '直接效果',
      indirectVia: '特定間接：經 {via}',
      totalIndirectLabel: '間接效果總和',
      totalLabel: '總效果',
      vafCol: 'VAF',
      derivedTitle: '第二階段資料 — LV 分數新資料檔',
      derivedNote: '兩階段程序最終階段的輸入資料（構念分數與交互項乘積），對齊 SmartPLS 4「由 LV 分數產生資料檔」的工作流程；可下載留檔或供其他軟體重現第二階段。',
      downloadDerived: '下載 CSV',
      mgaTitle: '多群組分析 — PLS-MGA（三法並列）',
      mgaMeta: '群組：{g1}（n = {n1}）vs {g2}（n = {n2}）｜bootstrap {b} 次／組｜permutation {np} 次有效',
      mgaNote: '判讀以 permutation 檢定為主（Chin & Dibbern, 2010；分布無母數假設），Henseler MGA p 為單尾 P(β₁ ≤ β₂)——接近 0 或 1 都代表組間差異；參數檢定（pooled／Welch）供對照。進行 MGA 前應先以 MICOM 確認 compositional invariance，否則差異可能來自測量而非結構。',
      mgaColG1: 'β（{g}）',
      mgaColG2: 'β（{g}）',
      mgaColDiff: 'Δβ',
      mgaColHenseler: 'p (Henseler)',
      mgaColPerm: 'p (permutation)',
      mgaColParam: 'p (pooled t)',
      mgaColWelch: 'p (Welch)',
      micomTitle: '測量恆等性 — MICOM',
      micomNote: 'Step 1（configural）：兩群組使用相同模型設定、指標與資料處理——由本工具的執行方式自動滿足。Step 2（compositional invariance）：c ≥ 5% 分位（permutation）即成立（綠）。Step 3：平均差／變異差落在 permutation 95% CI 內即等平均／等變異（完全恆等）；只過 step 2 為部分恆等（可做 MGA，比較平均時留意）。',
      micomColC: 'c（step 2）',
      micomColQ5: '5% 分位',
      micomColMean: '平均差 [95% CI]',
      micomColVar: '變異差 [95% CI]',
      predictTitle: '樣本外預測 — PLSpredict（k = {k}）',
      predictNote: '判讀（Shmueli et al., 2019）：先看 Q²predict > 0（優於訓練摺平均）；再比 PLS 與 LM 的 RMSE——全部指標 PLS 較低＝高預測力、多數較低＝中、少數較低＝低、全部較高＝缺乏預測力。CVPAT（Liengaard et al., 2021）：d̄ > 0 且 p < .05 表示 PLS 的平均損失顯著低於基準。',
      predictColQ2p: 'Q²predict',
      predictColRmsePls: 'RMSE (PLS)',
      predictColRmseLm: 'RMSE (LM)',
      predictColMae: 'MAE (PLS)',
      cvpatVsIA: 'CVPAT：PLS vs 指標平均（IA）',
      cvpatVsLM: 'CVPAT：PLS vs 線性模型（LM）',
      ipmaTitle: '重要性－績效地圖 — IPMA（目標：{target}）',
      ipmaNote: 'Importance = 對目標構念的非標準化總效果、performance = 0–100 重標定分數平均（Ringle & Sarstedt, 2016）。右下象限（重要但績效低）為優先改善區。重標定用觀察到的 min/max（SmartPLS 用量表理論界線，兩者在極端值未出現時會有差異）；目標績效 = {targetPerf}。',
      ipmaColImportance: 'Importance（總效果）',
      cipmaTitle: 'cIPMA — 必要條件分析（NCA on 0–100 分數）',
      cipmaColDCe: 'd（CE-FDH）',
      cipmaColDCr: 'd（CR-FDH）',
      cipmaColP: 'p（permutation）',
      cipmaColNecessary: '必要性',
      cipmaNecessaryYes: '必要條件',
      cipmaNecessaryNo: '證據不足',
      cipmaBottleneckTitle: 'Bottleneck（目標各水準所需的條件分數）',
      cipmaColLevel: '目標水準',
      cipmaNote: '只測目標構念的直接前置構念（Hauff et al., 2024）；表格為達到各目標水準（% of range）所需的條件分數（0–100），括號為未達所需水準的案例比例；NN = 該水準無必要門檻。必要性判準：d ≥ .1 且 p < .05，並須有理論支持。permutation 檢定為固定種子的近似檢定（10,000 次）。',
      ipmaColPerformance: 'Performance（0–100）',
      ipmaIndicatorTitle: '指標層 IPMA',
      w5ErrorPrefix: '{feature} 無法計算：{message}',
    },
    notes: {
      purposeTitle: '用途',
      purpose:
        '偏最小平方法結構方程模型（PLS-SEM）以指標的加權線性組合近似潛在構念，' +
        '同時估計「測量模型」（構念 ↔ 指標）與「結構模型」（構念之間的路徑）。\n\n' +
        '適合：預測導向的研究、模型較複雜（構念多、路徑多）、樣本較小、資料非常態，或理論尚在發展階段。\n\n' +
        '與 CB-SEM 差異：CB-SEM 檢驗共變異結構的整體適配（理論驗證取向）；PLS-SEM 最大化內生構念的被解釋變異（預測取向）。SRMR 等適配指標屬近似性檢核，非 χ² 類檢定。',
      assumpTitle: '前提與適用情境',
      assumptions:
        '1. 測量模式需依理論指定：反映型（Mode A）指標是構念的展現、同構念指標應高相關；形成型（Mode B）指標共同組成構念、彼此不必相關，但不可高度共線（看外部 VIF）\n' +
        '2. 結構模型為遞迴模型：路徑圖無環（不允許互為因果）\n' +
        '3. 指標為連續或近似連續變數（Likert 5 / 7 點常見）\n' +
        '4. 樣本量下限參考「10 倍法則」：至少為指向任一構念的最大路徑數之 10 倍\n' +
        '5. 推論統計以 bootstrap 重抽建立，不需常態分布假設\n' +
        '6. 若研究目的是估計「構念間的真實相關／路徑」（理論驗證），反映型構念建議開啟 PLSc 校正測量誤差衰減',
      conceptsTitle: '核心概念',
      concepts:
        '外部負荷量（loading）：指標與構念的相關；≥ .708 表示構念可解釋該指標 ≥ 50% 變異\n' +
        '外部權重（weight）：形成型指標對構念的貢獻（迴歸權重），以 bootstrap 檢定顯著性\n' +
        "信度：Cronbach's α（下界）、rho_A（較不偏）、CR 組合信度（上界），皆建議 ≥ .70（僅反映型）\n" +
        'AVE 平均萃取變異量：收斂效度，≥ .50；Fornell-Larcker：√AVE 應大於構念間相關\n' +
        'HTMT 異質-單質比：區辨效度，< .85（保守）或 < .90（寬鬆）\n' +
        'Weighting scheme：內部代理的加權法——path（預設）／factorial（相關）／centroid（相關符號），實務差異通常極小\n' +
        'PLSc（consistent PLS）：以 rho_A 反衰減校正，讓反映型構念的路徑趨近 CB-SEM 的一致估計\n' +
        'R²：內生構念被解釋的變異；f²：移除某前置構念後 R² 的變化量；內部 VIF：前置構念共線性\n' +
        'Model fit：SRMR（標準化殘差均方根，< .08）、d_ULS / d_G（距離量）、NFI（≥ .90）\n' +
        'Q²（blindfolding）：略去部分資料點再預測的交叉驗證，> 0 表示具預測相關性\n' +
        'Bootstrap：以放回重抽的經驗分布估計 SE、t、p 與信賴區間（percentile 或 BCa）',
      readingTitle: '怎麼讀',
      reading:
        '1. 先看收斂狀態與樣本警語\n' +
        '2. 測量模型：反映型看負荷量 ≥ .708、α / rho_A / CR ≥ .70、AVE ≥ .50；形成型看權重顯著性與外部 VIF < 3.3（權重不顯著但負荷量 ≥ .50 可備援保留）\n' +
        '3. 區辨效度：Fornell-Larcker 通過、HTMT < .85\n' +
        '4. 模型適配：SRMR < .08（飽和模型看測量、估計模型加結構）\n' +
        '5. 測量模型合格後，才解讀結構模型：路徑係數的 p 與 95% CI、f² 效果量、VIF\n' +
        '6. 最後看 R²（.25 / .50 / .75 約略對應弱 / 中 / 強）與 Q²（> 0 具預測相關性）\n' +
        '7. CCA（確認性組合分析）工作流程：若研究定位是「組合（composite）」而非反映型因素——依序檢核 (a) 權重／負荷量顯著性（bootstrap）、(b) 外部 VIF 共線性、(c) 組合信度 rho_A/rho_c、(d) 區辨效度 HTMT——本工具的既有報表已涵蓋全部步驟，依此順序讀表即為 CCA（Hair et al., 2020）',
      w5Title: '群組與預測（W5）',
      w5:
        'PLS-MGA：兩群組各自估計後比較路徑係數。permutation 檢定為主判準；Henseler MGA 為單尾 bootstrap 比較；參數檢定假設較強、供對照。前置：MICOM 至少通過 step 2（compositional invariance），否則組間差異可能是測量差異\n' +
        'MICOM 三步：configural（同模型同處理，工具自動滿足）→ compositional（c 與 permutation 5% 分位比較）→ 等平均/等變異（完全恆等才可合併樣本或比較平均）\n' +
        'PLSpredict：k-fold 樣本外預測；Q²predict > 0 是底線，與 LM（指標對指標的線性基準）比 RMSE 分四級判讀；CVPAT 給整體檢定\n' +
        'IT 準則（AIC/AICc/BIC/HQ）：比較「同一內生構念的不同前置組合」哪個更簡約有效，越小越好；跨資料集不可比\n' +
        'IPMA：importance（非標準化總效果）× performance（0–100 平均）辨識「重要但表現差」的優先改善構念/指標\n' +
        'cIPMA：IPMA × NCA 的組合（Hauff et al., 2024）——對目標的直接前置構念以 0–100 分數跑必要條件分析；「重要且必要但表現差」是最高優先，bottleneck 表給出各目標水準的最低條件分數\n' +
        '限制：MICOM/PLSpredict/IPMA 不支援含調節/高階構念的模型；MGA 支援（各組獨立跑完整管線）',
      w4Title: '調節、高階構念與中介（W4）',
      w4:
        '調節（two-stage）：第一階段估計主效果模型取得 LV 分數，第二階段以「分數乘積」作為交互項。對齊 SmartPLS 4 的兩個行為——自動補主效果路徑、交互項不標準化（係數 = 標準化係數 ÷ 乘積之標準差）。交互項 f² 建議用 Kenny（2018）較小門檻：.005 / .01 / .025\n' +
        '二次效果：同一機制，交互項 = 分數平方；三向以上交互：分數連乘（請同時納入所有低階交互項，維持階層完整）\n' +
        'Product indicator／orthogonalizing：以指標乘積（或其殘差）作為交互構念指標，係數為標準化量尺（對齊 seminr）；與 two-stage 數值不同屬預期，論文請擇一並說明\n' +
        '高階構念：repeated indicators（HOC 區塊 = 全部 LOC 指標，單次估計）、disjoint two-stage（第一階段 LOC 直連結構取分數，第二階段以分數為 HOC 指標；近年文獻建議）、embedded two-stage。repeated 的已知侷限：HOC 與 LOC 共用指標，HTMT 對此類配對不定義（報表以 — 呈現）、model fit 無法計算；HOC→LOC 路徑的 R² 屬機制性數值，不宜作為解釋力證據\n' +
        '中介：直接／特定間接（路徑係數乘積）／間接總和／總效果之分解，推論以 bootstrap CI 為準（Preacher & Hayes, 2008）；VAF 與 Zhao et al.（2010）類型判讀輔助解讀\n' +
        '限制：PLSc 與 blindfolding Q² 目前不支援含調節／高階構念的模型；此類模型的預測評估留待 PLSpredict（W5）',
    },
    apa: {
      intro:
        '本研究以偏最小平方法結構方程模型（PLS-SEM；{scheme} weighting scheme{plsc}）檢驗研究模型（N = {n}），' +
        '並以 bootstrap 重抽 {nValid} 次（{ciType} 95% 信賴區間）進行推論。',
      introNoBoot:
        '本研究以偏最小平方法結構方程模型（PLS-SEM；{scheme} weighting scheme{plsc}）檢驗研究模型（N = {n}）。',
      plscClause: '、consistent PLS（PLSc）校正',
      schemeNames: { path: 'path', factorial: 'factorial', centroid: 'centroid' },
      ciNames: { percentile: 'percentile', bca: 'BCa' },
      measurement:
        "反映型測量模型方面，各構念之 Cronbach's α 介於 {alphaRange}、組合信度 CR 介於 {crRange}、" +
        '平均萃取變異量 AVE 介於 {aveRange}，{measVerdict}',
      measOk: '信度與收斂效度皆達建議門檻（CR ≥ .70、AVE ≥ .50）。',
      measBad: '部分構念未達建議門檻（CR ≥ .70、AVE ≥ .50），解讀時應留意。',
      formative: '形成型構念（{lvs}）以外部權重之 bootstrap 檢定與指標共線性評估，外部 VIF 最大值為 {vifMax}。',
      htmt: '區辨效度方面，HTMT 最大值為 {htmtMax}，{htmtVerdict}',
      htmtOk: '低於 .85 門檻，構念間具區辨效度。',
      htmtBad: '高於 .85 門檻，部分構念間的區辨效度有疑慮。',
      fit: '模型適配方面，估計模型之 SRMR = {srmr}，{fitVerdict}',
      fitOk: '低於 .08 門檻。',
      fitBad: '高於 .08 門檻，整體適配應留意。',
      q2: '內生構念之 blindfolding Q²（D = {d}）介於 {q2Range}，{q2Verdict}',
      q2Ok: '皆大於 0，模型具預測相關性。',
      q2Bad: '部分構念未大於 0，預測相關性有限。',
      structuralIntro: '結構模型檢定結果：',
      path: '{from} → {to}（β = {beta}, t = {t}, {pStr}, 95% CI [{lo}, {hi}]，{sig}）',
      pathNoBoot: '{from} → {to}（β = {beta}）',
      sigYes: '顯著',
      sigNo: '未達顯著',
      r2: '{lv} 的 R² = {r2}',
      moderation: '調節效果方面，{name}（{method}）對 {to} 的交互效果 β = {beta}{stat}，{sig}',
      moderationSlopes: '；simple slope 顯示 {moderator} 於 −1 SD／＋1 SD 時，{iv} 的條件斜率分別為 {lo} 與 {hi}。',
      quadraticSentence: '{name} 對 {to} 的二次效果 β = {beta}{stat}，{sig}。',
      modStat: '（t = {t}, {pStr}, 95% CI [{cl}, {ch}]）',
      modSigYes: '達統計顯著',
      modSigNo: '未達統計顯著',
      modMethodNames: { 'two-stage': 'two-stage，交互項未標準化', 'product-indicator': 'product indicator', orthogonal: 'orthogonalizing' },
      mediationIntro: '中介效果分解（bootstrap 95% CI）：',
      mediationSentence: '{from} → {to}：總效果 = {total}、直接效果 = {direct}、間接效果總和 = {indirect}{ci}{vaf}{type}',
      mediationCi: '（CI [{lo}, {hi}]）',
      mediationVaf: '，VAF = {vaf}',
      mediationType: '，屬{type}（Zhao et al., 2010）',
      medTypes: {
        complementary: '互補型部分中介',
        competitive: '競爭型部分中介',
        indirectOnly: '間接效果型（完全中介）',
        directOnly: '僅直接效果（無中介）',
        none: '無效果型',
      },
      noDirect: '無（未設定直接路徑）',
      copyHint: '一鍵複製 APA 敘述',
    },
  },
  nca: {
    title: 'NCA 必要條件分析',
    config: {
      xLabel: '條件變數 X（必要條件）',
      yLabel: '結果變數 Y',
      pickX: '請選條件變數',
      pickY: '請選結果變數',
      sameVar: 'X 與 Y 不可為同一變項',
      hint: 'NCA 檢視「X 是否為 Y 的必要條件」：若高 Y 一定需要高 X，散佈圖左上角會是空的。與迴歸的「平均效果」不同，NCA 看的是「天花板」。',
    },
    result: {
      scopeTitle: 'Scope（分析範圍）',
      scope: 'scope 面積',
      ceilingTitle: 'Ceiling line 摘要',
      ceilingHint: 'CE-FDH 為非遞減階梯（envelopment），準確度恆為 100%；CR-FDH 為過 ceiling 點的 OLS 線性 ceiling。d = 空白區 / scope。',
      bottleneckTitle: 'Bottleneck 表（CE-FDH）',
      readingTitle: '解讀',
      nn: 'NN',
      nnHint: 'NN（Not Necessary）= 該 Y 水準所需的 X 已在最小值之下，X 在此水準非為瓶頸。所需 X 隨 Y 水準單調非遞減。',
      cols: {
        dCe: 'd（CE-FDH）', dCr: 'd（CR-FDH）', p: 'p（permutation）', nPeers: 'ceiling 點數',
        ceiling: 'Ceiling', zone: '空白區', d: 'd', effect: '效果', accuracy: '準確度',
        yLevel: '水準', yValue: 'Y 值', xRequired: '所需值', xPercent: '所需 %',
      },
    },
    effect: {
      small: '小', medium: '中', large: '大', veryLarge: '非常大',
    },
    notes: {
      purposeTitle: '用途',
      purpose:
        '必要條件分析（NCA, Dul 2016）檢視「X 是否為 Y 的必要但不充分條件」。\n' +
        '回答的問題是：\n（1）要達到某水準的 Y，是否一定需要達到某水準的 X？（左上角是否為空）\n' +
        '（2）這個必要性有多強？（effect size d）\n（3）達到各 Y 水準，最低需要多少 X？（bottleneck 表）',
      assumpTitle: '前提與界線',
      assumptions:
        '1. NCA 是「必要性」邏輯，與迴歸的「平均增量效果」互補而非替代——顯著的迴歸係數不保證必要性，反之亦然。\n' +
        '2. 對離群值敏感（單一左上角的點可讓 ceiling 大幅位移）——務必檢視散佈圖與穩健性。\n' +
        '3. scope 預設用實證 min/max；理論上下限不同時效果量會變（宜雙軌報告）。\n' +
        '4. permutation 檢定為近似顯著性；建議效果量 d ≥ .1 且 p < .05 才主張必要性。',
      formulasTitle: '核心公式',
      formulaCeiling: 'CE-FDH：ceiling(x) = max{ y_i : x_i ≤ x }（非遞減階梯）',
      formulaScope: 'scope S = (X_max − X_min)(Y_max − Y_min)',
      formulaD: 'effect size d = 空白區（ceiling zone C）/ scope S，範圍 0–1',
      readingTitle: '怎麼讀',
      reading:
        '1. 看 effect size d 與 permutation p — d ≥ .1 且 p < .05 才主張 X 為 Y 的必要條件。\n' +
        '2. 效果量分級（Dul）：0<d<.1 小、.1≤d<.3 中、.3≤d<.5 大、d≥.5 非常大。\n' +
        '3. 看 bottleneck 表 — 要達到某水準的 Y，最低需要多少 X；NN 表該水準 X 非瓶頸。\n' +
        '4. CE-FDH（階梯）與 CR-FDH（線性）並列 — 結論一致時穩健性較高。',
      refTitle: '文獻出處',
      ref:
        'Dul, J. (2016). Necessary Condition Analysis (NCA). Organizational Research Methods, 19(1), 10–52.\n' +
        'Dul, J., van der Laan, E., & Kuik, R. (2020). A statistical significance test for NCA. Organizational Research Methods.\n' +
        '數值以 R NCA 套件封閉式定義實作；慣例對齊仍待本機 R 抽驗（見 validation-report）。',
    },
    apa: {
      sentence:
        '必要條件分析（NCA; Dul, 2016）結果顯示，{xLabel} 是 {yLabel} 的必要條件（CE-FDH d = {dCe}，效果量{effectWord}；CR-FDH d = {dCr}），效果量以近似 permutation 檢定達顯著（p = {pStr}，n = {n}）。bottleneck 分析指出達到各水準之 {yLabel} 所需的最低 {xLabel} 水準。',
      sentenceNs:
        '必要條件分析（NCA; Dul, 2016）結果顯示，{xLabel} 作為 {yLabel} 之必要條件的證據不足（CE-FDH d = {dCe}；CR-FDH d = {dCr}），近似 permutation 檢定未達顯著（p = {pStr}，n = {n}）。',
      copyHint: '一鍵複製 APA 敘述',
    },
    interp: {
      sentence:
        '結論：{xLabel} {concl} {yLabel} 的必要條件（CE-FDH d = {d}，效果量{effectWord}，permutation p = {pStr}）。' +
        '必要性成立時，代表若 {xLabel} 未達門檻，{yLabel} 就到不了對應水準；但這不保證高 {xLabel} 一定帶來高 {yLabel}（必要非充分）。',
      supported: '是',
      notSupported: '不足以作為',
    },
  },
}
