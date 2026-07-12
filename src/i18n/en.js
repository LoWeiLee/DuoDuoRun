/**
 * English string table.
 *
 * Same namespace structure as zh-TW.js — keep keys in sync.
 */
export default {
  app: {
    title: 'DuoDuoRun',
    subtitle: '多多快跑',
    tagline: 'A pure-frontend statistical tool — no install, no data leaves your browser.',
  },
  home: {
    heroTagline: "Can't run stats? Ask Duoduo to run them for you — she'll roll her eyes, but she'll get you the right answer.",
    byAuthor: 'by Lo-Wei Lee',
    authorUrl: 'https://loweilee.github.io/homepage/',
    cards: {
      purpose: {
        title: 'Purpose',
        body:
          "A statistical analysis tool built for Taiwan's social-science teachers and students. " +
          "Covers 14 commonly used methods including descriptive stats, t-tests, ANOVA, correlation/regression, " +
          "chi-square, nonparametric tests, Cronbach's α, and EFA. " +
          "Results align with SPSS / JASP and bilingual APA narratives are provided in Traditional Chinese and English.",
      },
      author: {
        title: 'Author',
        body:
          'Developer: Lo-Wei Lee, Assistant Professor\n' +
          'Affiliation: Department of Maritime Potrol, Taiwan Police College\n' +
          'Research areas: GAI and Smart Government, Digital Governance, Data Governance, Algorithmic Bias and Accountability, Technology Law and Digital Human Rights',
      },
      privacy: {
        title: 'Privacy',
        body:
          'All data parsing, statistical computation, and result rendering run locally in your browser. ' +
          'No APIs are called, no user data is collected, ' +
          'and uploaded files never leave your computer.',
      },
      citation: {
        title: 'Citation (Unreleased)',
        intro: 'If this tool helps your work, please cite as:',
        apaLabel: 'APA',
        bibtexLabel: 'BibTeX',
        apa:
          'Lee, L.-W. (2026). DuoDuoRun: A pure-frontend statistical analysis tool ' +
          '(Version 1.0) [Computer software]. https://loweilee.github.io/DuoDuoRun/',
        bibtex:
          '@software{lee2026duoduorun,\n' +
          '  author  = {Lee, Lo-Wei},\n' +
          '  title   = {{DuoDuoRun}: A pure-frontend statistical analysis tool},\n' +
          '  year    = {2026},\n' +
          '  version = {1.0},\n' +
          '  url     = {https://loweilee.github.io/DuoDuoRun/}\n' +
          '}',
        copy: 'Copy',
        copied: 'Copied',
      },
    },
    footerPrefix: 'This project is currently in beta and is unreleased. For bug reports or feature suggestions, please contact: ',
    footerEmail: 'serpent910@gmail.com',
  },
  helper: {
    fabTitle: 'Not sure which analysis?',
    fabHint: 'Duoduo helps you choose',
    fabBubble: 'Need help picking an analysis?',
    intro: "Hi, I'm Duoduo. Answer a few questions and I'll find the best analysis for you ✨",
    backBtn: 'Back',
    restartBtn: 'Start over',
    closeBtn: 'Close',
    recTitle: 'Recommended (click to jump to that analysis)',
    recNote: 'When multiple, ordered by best fit; pick based on your research context.',
    q: {
      start: 'What are you trying to do?',
      describe: 'How do you want to look at the data?',
      compareDv: 'What is the type of your dependent variable (DV)?',
      compareN: 'How many groups are you comparing?',
      compareTwoDesign: 'Independent groups or paired?',
      compareManyDesign: 'What is the design?',
      relate: 'What is your research question?',
      scale: 'What do you want to evaluate?',
      classify: 'Which type of analysis?',
    },
    opt: {
      describe: 'Describe the data (distribution, mean, SD, etc.)',
      compare: 'Compare differences across groups',
      relate: 'Examine relationships between variables',
      scale: 'Assess scale / inter-rater reliability',
      classify: 'Classification, dimensionality reduction, clustering',
      summary: 'Get N, mean, SD, and other basic stats',
      visualize: 'Scatterplot, histogram, boxplot',
      normality: 'Check whether data are normally distributed',
      continuous: 'Continuous (e.g., scores, age, salary)',
      categorical: 'Categorical (e.g., gender, preference, pass/fail)',
      nonnormal: 'Continuous but heavily skewed / small N',
      oneVsFixed: 'Compare to a fixed value (e.g., is mean = 70?)',
      twoGroups: '2 groups',
      threePlus: '3 or more groups',
      independent: 'Two different sets of people',
      paired: 'Same people in two situations (e.g., pre vs. post)',
      between: 'Different groups, one measure each (between-subjects)',
      within: 'Same people, multiple measures (within-subjects)',
      mixed: 'One between-subjects factor × one within-subjects factor',
      covariate: 'Compare groups while controlling another continuous variable',
      multiDv: 'Multiple DVs at once',
      corr: 'Just the strength of association between two variables',
      simpleReg: 'One X predicts a continuous Y',
      multiReg: 'Multiple Xs predict a continuous Y',
      logisticReg: 'Multiple Xs predict a binary Y (yes/no, pass/fail)',
      hierReg: 'Enter Xs in theory-driven blocks; check incremental contribution',
      reliability: 'Internal consistency of a scale (α)',
      explore: "Explore how many factors lie behind the data",
      confirm: 'Verify a pre-specified factor structure',
      agreementCat: 'Two raters agreeing on categorical judgments',
      agreementCont: 'Multiple raters agreeing on continuous scores',
      lda: 'Known classes; find linear combinations that separate them (with classification)',
      cluster: 'Unknown classes; group samples automatically',
    },
  },
  toolbar: {
    selectDataset: 'Select demo dataset',
    uploadData: 'Upload data',
    uploadHint: 'Supports .csv / .xlsx / .xls; parsed in your browser, never uploaded to a server',
    uploadingFile: 'Parsing…',
    uploadSuccess: 'Loaded {n} rows × {k} columns',
    uploadError: 'Upload failed: {msg}',
    uploadedLabel: 'Uploaded: {name}',
    uploadedGroupLabel: 'Uploaded',
    demoGroupLabel: 'Demo datasets',
    unsupportedFormat: 'Unsupported format: .{ext} (only csv / xlsx / xls)',
    fileTooLarge: 'File too large ({actual} MB); the limit is {max} MB. Trim the data in Excel or split the file first.',
    decodedAsBig5: 'Detected Big5 encoding and converted automatically. If text still looks garbled, save the CSV as UTF-8 in Excel or use .xlsx directly.',
    encodingSuspect: 'File encoding seems to be neither UTF-8 nor Big5; column names and category values may appear garbled. Please re-save as .xlsx.',
    ignoredSheets: 'Loaded sheet "{used}"; the following sheets were not loaded: {list} (only the first sheet is read).',
    largeRowCount: 'Dataset is large ({n} rows); computations may be slower.',
    warningsLabel: 'Notes',
    export: 'Export report',
    runsLocally: 'runs locally',
    language: 'Language',
    mode: 'Mode',
  },
  sidebar: {
    descriptive: 'Descriptive statistics',
    inferential: 'Inferential statistics',
    regression: 'Correlation & regression',
    scale: 'Scale analysis',
    multivariate: 'Multivariate analysis',
    sem: 'Structural equation models',
    comingSoon: 'Coming soon',
    comingSoonHint: 'Planned, not yet available',
    cbSem: 'CB-SEM (covariance-based)',
    plsSem: 'PLS-SEM',
    nca: 'NCA (Necessary Condition Analysis)',
    hlm: 'HLM (multilevel)',
    mcnemar: "McNemar's test",
    friedman: 'Friedman test',
    multinomialLogit: 'Multinomial logistic',
    ordinalLogit: 'Ordinal logistic',
    probit: 'Probit regression',
    poisson: 'Poisson regression',
    polynomialReg: 'Polynomial regression',
    cox: 'Cox proportional hazards',
    cca: 'Canonical correlation',
    bayesT: 'Bayesian t-test',
    bayesAnova: 'Bayesian ANOVA',
    bayesCorr: 'Bayesian correlation',
    irt: 'Item response theory',
    meta: 'Meta-analysis',
    arima: 'ARIMA time series',
    descStats: 'Basic descriptive stats',
    normality: 'Normality tests',
    visualization: 'Visualization',
    tTest: 't-test',
    oneWayAnova: 'One-way ANOVA',
    twoWayAnova: 'Two-way ANOVA',
    chiSquare: 'Chi-square test',
    nonparametric: 'Nonparametric tests',
    correlation: 'Correlation',
    simpleRegression: 'Simple linear regression',
    multipleRegression: 'Multiple regression',
    logisticRegression: 'Logistic regression',
    cronbachAlpha: "Cronbach's α",
    efa: 'Exploratory factor analysis',
    zProp: 'z-test (proportions)',
    fisherExact: "Fisher's exact test",
    kappa: "Cohen's Kappa (inter-rater agreement)",
    hierReg: 'Hierarchical regression',
    ancova: 'ANCOVA',
    icc: 'ICC (intraclass correlation)',
    repAnova: 'Repeated measures ANOVA',
    mixedAnova: 'Mixed ANOVA',
    manova: 'MANOVA',
    lda: 'Discriminant analysis (LDA)',
    cluster: 'Cluster analysis',
    cfa: 'CFA (confirmatory factor analysis)',
  },
  panels: {
    configTitle: 'Analysis settings',
    configEmpty: 'Pick an analysis from the sidebar',
    configNoDataset: 'Load a dataset first (top right)',
    loadDemo: 'Load demo settings',
    loadDemoHint: 'One-click load: a representative dataset and variable selection for this analysis',
    demoLoaded: 'Demo loaded',
    copyTablesBtn: 'Copy tables',
    copyTablesHint: 'Copy all result tables as tab-separated text; paste into Excel / Google Sheets to auto-split columns',
    copiedTables: 'Copied {n} table(s)',
    copyEmpty: 'No tables to copy yet',
    assumpTitle: 'Assumption check',
    assumpHint: 'Quick health check on whether the data fits this analysis — click to expand',
    assumpExpand: 'Expand',
    assumpCollapse: 'Collapse',
    assumpStatus: { ok: 'OK', warn: 'Caution', fail: 'Violated', info: 'Info', skip: 'Skipped' },
    assumpEmpty: 'No automatic assumption check for this analysis',
    assumpChecks: {
      sampleSize: 'Effective sample size',
      sampleSizeDetail: 'N = {n} (after listwise deletion)',
      sampleSizeDetailGroups: 'N = {n} ({k} groups, listwise)',
      sampleSizeDetailRatio: 'N = {n}; predictors p = {p} (rule of thumb: N ≥ {recommended})',
      normality: 'Normality (Shapiro-Wilk)',
      normalityGroup: 'Normality — group {group}',
      normalityVar: 'Normality — {var}',
      normalityDiff: 'Normality of difference (pre − post)',
      normalityDetail: 'n = {n}, W = {w}, p = {p}',
      varianceHomogeneity: 'Homogeneity of variance (Levene)',
      leveneDetail: 'F({df1}, {df2}) = {f}, p = {p}',
      tooFewForNormality: 'Too few cases (< 3) to test',
      tooFewForLevene: 'Not enough groups or cases',
    },
    variablesTitle: 'Variables',
    resultTitle: 'Statistical results',
    resultEmpty: 'This analysis ships in Step 3',
    resultNoDataset: 'Load a demo dataset from the top right',
    explainTitle: 'Method notes',
    explainEmpty: 'Pick an analysis to see purpose, assumptions, and formula',
    explainTeaching: 'Will show method purpose, assumptions, and core formula (teaching mode)',
    explainReport: 'Will show APA-formatted result narrative (Chinese + English)',
    previewTitle: 'Data preview',
    previewSubtitle: 'Showing first 20 of {n} rows × {k} variables',
  },
  varTypes: {
    continuous: 'Continuous',
    ordinal: 'Ordinal',
    categorical: 'Categorical',
    unknown: 'Unknown',
  },
  variables: {
    missing: '{n} missing',
    distinct: '{n} distinct',
    noMissing: 'no missing',
    transformed: 'transformed',
    addTransform: 'Add transform',
    transformsTitle: 'Existing transforms',
    noTransforms: 'No transforms yet',
  },
  viz: {
    title: 'Data visualization',
    types: {
      scatter: 'Scatter plot',
      histogram: 'Histogram',
      boxplot: 'Box plot',
      heatmap: 'Correlation heatmap',
    },
    typeHint: {
      scatter: 'Linear relationship between two variables; auto-adds a regression line',
      histogram: 'Frequency distribution of one variable; bins via Freedman-Diaconis',
      boxplot: 'Median, IQR, and outliers; can be grouped by a categorical variable',
      heatmap: 'Pairwise correlation matrix; amber = positive, denim = negative',
    },
    config: {
      typeLabel: 'Chart type',
      xLabel: 'X variable',
      yLabel: 'Y variable',
      pickX: 'Pick X',
      pickY: 'Pick Y',
      groupVar: 'Grouping variable (optional)',
      groupVarHint: 'If a categorical variable is picked, the box plot will be grouped',
      none: 'No grouping',
      multiVarsTitle: 'Select variables',
      multiVarsHint: 'At least 2 (heatmap) or 1 (histogram)',
      needAtLeastOne: 'Pick at least 1 variable',
      needAtLeastTwo: 'Pick at least 2 variables',
      regressionLine: 'Show regression line',
    },
    notes: {
      purposeTitle: 'Purpose',
      purpose:
        'Visualization is the "always-look-first" companion to statistical analysis.\n' +
        '- Scatter: linearity, outliers, non-linear patterns between two variables\n' +
        '- Histogram: distribution shape (normal, skewed, bimodal)\n' +
        '- Box plot: central tendency and spread across groups; quick outlier ID\n' +
        '- Heatmap: spot the correlation structure across many variables at a glance',
      tipsTitle: 'Reading hints',
      tips:
        'Scatter:\n' +
        '- Tighter line → stronger linear correlation\n' +
        '- Diffuse but directional → weak linear correlation\n' +
        '- Curve shape → Pearson r misleading; try Spearman or nonlinear models\n\n' +
        'Histogram:\n' +
        '- Single-peaked symmetric → near normal\n' +
        '- Long right tail → right-skewed (income, reaction time)\n' +
        '- Two peaks → sample may mix two subpopulations\n\n' +
        'Box plot:\n' +
        '- Median offset within the box → skewed\n' +
        '- Asymmetric whiskers → skewed\n' +
        '- Outlier dots → values to inspect\n\n' +
        'Heatmap:\n' +
        '- Darker amber → stronger positive correlation; darker denim → stronger negative\n' +
        '- Diagonal is self-correlation (always = 1)',
    },
  },
  norm: {
    title: 'Normality tests',
    selectVarsTitle: 'Select variables to test',
    selectVarsHint:
      'Tick numeric variables (continuous or ordinal); both Shapiro-Wilk and Kolmogorov-Smirnov are run',
    needAtLeastOne: 'Tick at least one variable',
    cols: {
      variable: 'Variable',
      n: 'n',
      sw_w: 'SW W',
      sw_p: 'SW p',
      ks_d: 'KS D',
      ks_p: 'KS p',
      verdict: 'Verdict',
    },
    verdict: {
      normal: 'Approximately normal',
      nonNormal: 'Non-normal',
      mixed: 'Mixed verdict',
    },
    notes: {
      purposeTitle: 'Purpose',
      purpose:
        "Test whether a sample comes from a normal population.\nTypical use: check the normality assumption before running t-tests, ANOVA, or regression; if violated, consider nonparametric alternatives or variable transformation.",
      assumpTitle: 'Assumptions',
      assumptions:
        '1. Independent observations\n2. At least ordinal scale\n3. Both tests have low power for very small n (< 20); pair with Q-Q plot / histogram',
      compareTitle: 'Differences between SW and KS',
      compare:
        'Shapiro-Wilk (W): more sensitive to skewness; usually more powerful at n ≤ 50; works up to n = 5000 (Royston 1992).\n' +
        "Kolmogorov-Smirnov (D, Lilliefors-corrected): sensitive to central deviations; classic KS with sample mean/SD as parameters is overly conservative without correction — Lilliefors correction is auto-applied here.\n\n" +
        'Practical guidance:\n' +
        '- Both non-significant → normality assumption holds\n' +
        '- Only SW significant → skewness issue; try log or Box-Cox transform\n' +
        '- Only KS significant → central deviation (e.g., bimodal); inspect visually\n' +
        '- Very large n (> 300) → both tests become hyper-sensitive to trivial deviations; rely on Q-Q plot + skew/kurt instead',
      formulasTitle: 'Core formulas',
      formulaSW: 'W = (Σa_i · x_(i))² / Σ(x_i − M̄)²',
      formulaKS: 'D = max |F_emp(x) − Φ((x − M̄) / SD)|',
      readingTitle: 'How to read it',
      reading:
        'p < .05 → reject "sample is from a normal population"; p ≥ .05 → cannot reject (does NOT prove normality).\n\n' +
        'Pair with skewness/kurtosis and a Q-Q plot (visual module forthcoming) for robust judgement, not p-values alone.',
    },
    apa: {
      sentence:
        'Normality results — {var}: Shapiro-Wilk W = {w}, p = {pSW}; Kolmogorov-Smirnov (Lilliefors-corrected) D = {d}, p = {pKS} (n = {n}).',
      copyHint: 'Copy APA narrative',
    },
    interp: {
      header: 'Reading',
      line: '{var}: {verdict} (SW: W = {w}, p = {pSW}; KS: D = {d}, p = {pKS})',
    },
  },
  np: {
    title: 'Nonparametric tests',
    types: {
      mw: 'Mann-Whitney U (independent 2 groups)',
      wilcoxon: 'Wilcoxon Signed-Rank (paired)',
      kw: 'Kruskal-Wallis (3+ groups)',
    },
    typeHint: {
      mw: 'Two-group rank-sum test; nonparametric counterpart of independent t-test',
      wilcoxon: 'Paired-rank test; nonparametric counterpart of paired t-test',
      kw: 'Three-or-more-group rank ANOVA; nonparametric counterpart of one-way ANOVA',
    },
    config: {
      typeLabel: 'Test type',
      depVar: 'Dependent (continuous or ordinal)',
      groupVar: 'Grouping variable (exactly 2 groups)',
      groupVarKW: 'Grouping variable (≥ 3 groups)',
      var1: 'Variable 1',
      var2: 'Variable 2',
      pickDep: 'Pick a dependent variable',
      pickGroup: 'Pick a grouping variable',
      pickVar1: 'Pick variable 1',
      pickVar2: 'Pick variable 2',
      groupVarBadGroups: 'This variable has {k} groups; needs exactly 2',
      factorBadGroups: 'This factor has {k} groups; needs at least 3',
      showDunn: "Show post-hoc (Dunn's test)",
      dunnHint: "When KW is significant, use Dunn's pairwise test with Bonferroni adjustment for family-wise error",
    },
    result: {
      statsTitle: 'Test statistics',
      groupRanksTitle: 'Group rank sums',
      groupCol: 'Group',
      cols: {
        u: 'U', u1: 'U₁', u2: 'U₂', wpos: 'W⁺', wneg: 'W⁻', t: 'T',
        h: 'H', df: 'df', z: 'z', p: 'p', n: 'n', meanRank: 'Mean rank', sumRank: 'Rank sum',
        eps2: 'ε²', r: 'r (effect size)',
        pair: 'Pair', meanRankA: 'Mean rank A', meanRankB: 'Mean rank B',
        diffRank: '|Δmean rank|', zDunn: 'z', pRaw: 'Raw p', pAdj: 'Adj. p (Bonferroni)',
      },
      tieNote: 'Result includes tie correction',
      droppedNote: '{n} pairs with D = 0 dropped',
      continuityNote: 'p-value applies ±0.5 continuity correction (matches SPSS / R wilcox.test default).',
      smallSampleNote: 'Small sample (n < 10); the normal approximation has limited precision — interpret alongside effect size and descriptive statistics.',
      allZeroDiffsNote: 'All paired differences are zero — the two variables are identical (p = 1).',
      effect: { small: 'small', medium: 'medium', large: 'large' },
      kwSigPosthoc:
        "After significant H, run Dunn's pairwise test (toggle \"Show post-hoc (Dunn's test)\" on the left to enable).",
      dunnTitle: "Dunn's post-hoc (Bonferroni-adjusted)",
      dunnEmpty: 'No pairs to compare',
    },
    notes: {
      purposeTitle: 'Purpose',
      purposeMW:
        'Mann-Whitney U (a.k.a. Wilcoxon rank-sum) tests whether two independent groups differ in median location. Use when:\n' +
        '- Samples not normally distributed\n' +
        '- Ordinal data (Likert)\n' +
        '- Small n (< 30) with questionable normality',
      purposeWil:
        'Wilcoxon Signed-Rank tests whether the median paired difference equals zero. Use when:\n' +
        '- Paired t-test differences not normal\n' +
        '- Ordinal pre/post comparisons',
      purposeKW:
        'Kruskal-Wallis H tests whether three or more independent groups differ in location. Use when:\n' +
        '- Groups not normally distributed\n' +
        '- Variances clearly unequal\n' +
        '- Ordinal multi-group comparison',
      assumpTitle: 'Assumptions',
      assumptionsMW:
        '1. Independent groups\n2. Similar shape across groups (for median-shift inference)\n3. At least ordinal scale',
      assumptionsWil: '1. Pairs are independent\n2. Differences are symmetric around the median',
      assumptionsKW:
        '1. Independent groups\n2. Similar shape across groups\n3. At least ordinal scale',
      formulasTitle: 'Core formulas',
      formulaMWU: 'U₁ = R₁ − n₁(n₁+1)/2, U₂ = n₁n₂ − U₁, U = min(U₁, U₂)',
      formulaMWZ: 'z = (U₁ − μ) / σ with tie correction; p = 2(1 − Φ(|z|))',
      formulaWil: 'W⁺ = Σ rank(|D|) where D > 0; T = min(W⁺, W⁻)',
      formulaWilZ:
        'z = (W⁺ − n(n+1)/4) / √((n(n+1)(2n+1) − Σ(t³−t)/2)/24)',
      formulaKW:
        'H = (12/(N(N+1))) Σ(R_i² / n_i) − 3(N+1), tie-corrected by dividing 1 − Σ(t³−t)/(N³−N)',
      formulaKWdf: 'df = k − 1; p from χ²(df) right tail',
      formulaEffMW: 'Effect size r = |z| / √N',
      formulaEffKW: 'Effect size ε² = (H − k + 1) / (N − k)',
      readingTitle: 'How to read it',
      reading:
        '1. p < .05 → reject H₀ (groups differ in location)\n' +
        '2. Effect size r: < 0.1 trivial, < 0.3 small, < 0.5 medium, ≥ 0.5 large\n' +
        "3. After significant KW, run Dunn's pairwise post-hoc\n\n" +
        'When to choose nonparametric over t / ANOVA:\n' +
        '- Small n, suspect normality, outliers, or ordinal scale → nonparametric\n' +
        '- Large n with normality OK → t / ANOVA usually more powerful',
      dunnNote:
        "Dunn's post-hoc: when the overall KW test is significant, Dunn's pairwise comparisons identify *which* groups differ.\n" +
        'Statistic: for each pair, z = (R̄_i − R̄_j) / SE, where SE uses the pooled-rank variance with tie correction; ' +
        'the raw p-value comes from the standard normal distribution.\n' +
        'Multiple-comparison adjustment: Bonferroni across m = k(k−1)/2 pairs (p_adj = min(1, p × m)); ' +
        'this is conservative but tightly controls family-wise error.\n' +
        'Reading: rely on the adjusted p — pairs with adj. p < .05 are flagged as significantly different.',
    },
    apa: {
      mw:
        'A Mann-Whitney U test indicated a {sigWord} difference in {depLabel} between {g1Name} and {g2Name}, U = {u}, z = {z}, p = {pStr}, effect size r = {r} ({effect}).',
      wilcoxon:
        'A Wilcoxon signed-rank test indicated a {sigWord} difference between {var1Name} and {var2Name}, T = {t}, z = {z}, p = {pStr}, n = {n} ({nDropped} zero-difference pairs dropped), effect size r = {r} ({effect}).',
      kw:
        'A Kruskal-Wallis H test indicated a {sigWord} effect of {factor} on {depLabel}, H({df}, N = {n}) = {h}, p = {pStr}, ε² = {eps2}.',
      sigYes: 'significant',
      sigNo: 'non-significant',
      copyHint: 'Copy APA narrative',
    },
    narrative: {
      dunnLine:
        "Pairwise comparisons were conducted using Dunn's test with Bonferroni adjustment for family-wise error (m = {m}). Pairs with adjusted p < .05 were: {sigPairs}.",
      dunnNoSig: 'none',
    },
    interp: {
      header: 'Reading',
      mw:
        'Conclusion: {depLabel} differed {sigWord} between {g1Name} (mean rank = {mr1}) and {g2Name} (mean rank = {mr2}); U = {u}, z = {z}, p = {pStr}.' +
        '\nEffect size r = {r} ({effect}).',
      wilcoxon:
        'Conclusion: the difference between {var1Name} and {var2Name} was {sigWord} (W⁺ = {wpos}, W⁻ = {wneg}, T = {t}, z = {z}, p = {pStr}, n = {n}).' +
        '\nEffect size r = {r} ({effect}).',
      kw:
        'Conclusion: the effect of {factor} on {depLabel} was {sigWord} (H({df}, N = {n}) = {h}, p = {pStr}).' +
        '\nε² = {eps2}.',
      kwPosthoc: "Note: after significant H, run Dunn's pairwise post-hoc.",
      sigYes: 'significant',
      sigNo: 'not significant',
    },
  },
  fisherExact: {
    title: "Fisher's exact test",
    config: {
      rowVar: 'Row variable',
      pickRow: 'Pick the row variable',
      rowHint: 'Must be categorical (ideally 2 levels)',
      colVar: 'Column variable',
      pickCol: 'Pick the column variable',
      colHint: 'Must be categorical (ideally 2 levels), different from the row variable',
      successRow: 'Success level of the row variable',
      pickSuccessRow: 'Pick the level treated as success on the row variable',
      successCol: 'Success level of the column variable',
      pickSuccessCol: 'Pick the level treated as success on the column variable',
    },
    result: {
      tableTitle: '2×2 contingency table',
      statsTitle: 'Test statistics',
      cols: {
        rowTotal: 'Row total',
        colTotal: 'Col total',
        p: 'p (exact)',
        or: 'Odds ratio',
        orCi95: 'OR 95% CI',
        lnOr: 'ln OR',
        effect: 'Effect',
      },
      effectInterp: {
        trivial: 'trivial', small: 'small', medium: 'medium', large: 'large',
      },
    },
    warnings: {
      tooManyRowLevels: 'Note: row variable "{varLabel}" has {count} levels. Fisher\'s exact test is designed for 2×2 tables; the success level and the first non-success level were used to form the 2×2 table.',
      tooManyColLevels: 'Note: column variable "{varLabel}" has {count} levels. Fisher\'s exact test is designed for 2×2 tables; the success level and the first non-success level were used to form the 2×2 table.',
      haldane: 'Note: at least one cell is 0. Haldane correction (+0.5 to all cells) was applied for the OR and its 95% CI; exact p is still computed from the raw counts.',
    },
    errors: {
      pickRowVar: 'Pick a row variable',
      pickColVar: 'Pick a column variable',
      sameVar: 'Row and column variables must differ',
      pickSuccessRow: 'Pick a success level for the row variable',
      pickSuccessCol: 'Pick a success level for the column variable',
      needTwoRowLevels: 'The row variable needs at least 2 valid levels',
      needTwoColLevels: 'The column variable needs at least 2 valid levels',
      noData: 'No analyzable rows',
    },
    interp: {
      header: 'Interpretation',
      sigYes: 'significant',
      sigNo: 'not significant',
      overall:
        'In N = {n} observations, the 2×2 table is (a={a}, b={b}, c={c}, d={d}).\n' +
        "Fisher's two-sided exact p = {pStr} → {sigWord}.\n" +
        'Odds ratio OR = {or} (95% CI [{orCiLow}, {orCiHigh}]); ln OR indicates a {effect} effect.',
    },
    notes: {
      q1: 'When to use?',
      a1:
        'To test independence between two binary categorical variables in a 2×2 table.\n' +
        "When the sample is small or any cell's expected count is < 5 (so chi-square is unreliable), Fisher's exact test is the standard choice — it uses the hypergeometric distribution and gives an exact p-value without large-sample approximation.",
      q2: 'Assumptions',
      a2:
        '1. Independent observations\n' +
        '2. Margins (row totals, column totals) treated as fixed (conditional inference)\n' +
        '3. Both variables are binary; for >2 levels, use chi-square or collapse categories\n' +
        "Note: Fisher's test is slightly conservative in small samples but remains the standard for small 2×2 tables.",
      q3: 'Formulas',
      a3:
        'Probability of one table (hypergeometric):\n' +
        '  P(a) = C(a+b, a) · C(c+d, c) / C(N, a+c)\n' +
        "Two-sided p = sum of P(a') for all tables with P(a') ≤ P(observed).\n" +
        'Odds ratio OR = (a·d) / (b·c); if any cell is 0, apply the Haldane correction (+0.5).\n' +
        '95% CI (Woolf, log-scale): exp(ln OR ± 1.96·√(1/a + 1/b + 1/c + 1/d))',
      q4: 'How to read',
      a4:
        '1. Compare exact p with .05 to decide on independence\n' +
        '2. OR > 1: row-success and col-success are positively associated; OR < 1: negatively; OR = 1: independent\n' +
        '3. If the OR 95% CI excludes 1, this is equivalent (asymptotically) to p < .05\n' +
        '4. |ln OR|: < 0.5 trivial, < 1.0 small, < 2.0 medium, ≥ 2.0 large',
    },
    narrative: {
      copyHint: 'Copy APA narrative',
      main:
        "Fisher's exact test was conducted to assess the association between \"{rowVar}\" and \"{colVar}\". " +
        'Of N = {n} valid observations, the 2×2 cells were "{rSucc}/{cSucc}" = {a}, "{rSucc}/{cFail}" = {b}, ' +
        '"{rFail}/{cSucc}" = {c}, "{rFail}/{cFail}" = {d}. ' +
        'The two-sided exact p = {pStr}; odds ratio OR = {or} (95% CI [{orCiLow}, {orCiHigh}]).',
    },
  },
  ancova: {
    title: 'ANCOVA (Analysis of Covariance)',
    config: {
      yLabel: 'Dependent variable Y (continuous)',
      pickY: 'Pick the DV',
      factorLabel: 'Factor (categorical)',
      pickFactor: 'Pick the factor',
      factorHint: 'Must be categorical with at least 2 levels',
      covLabel: 'Covariate(s) (>= 1, continuous)',
      covHint: 'Tick numeric variables to include as covariates; cannot be the DV',
    },
    errors: {
      pickDep: 'Please pick the dependent variable',
      pickFactor: 'Please pick the factor',
      pickCov: 'Please tick at least one covariate',
      covIsY: 'The DV cannot also be a covariate',
      covIsFactor: 'The factor cannot also be a covariate',
      factorBadGroups: 'The factor has only {k} group(s); at least 2 are required',
      tooFewN: 'Not enough valid cases (N must exceed k + p + 1)',
      'singular-matrix': "Design matrix is collinear; cannot be solved (X'X is singular)",
      'length-mismatch': 'Data length mismatch',
    },
    result: {
      homoTitle: 'Homogeneity-of-regression-slopes test',
      homoLabel: 'Factor x Covariate interaction',
      homoOk: 'OK',
      homoViolated: 'violated',
      homoNotComputable: 'Not enough degrees of freedom to test (e.g., N - k - p - interactions <= 0).',
      homoViolationWarn:
        'Warning: the homogeneity-of-slopes assumption is violated (interaction p < .05). The covariate-DV relationship differs across factor levels, so ANCOVA-adjusted means may mislead; consider a moderation model or stratified analysis.',
      tableTitle: 'ANCOVA table (Type-III adjusted SS)',
      rawMeansTitle: 'Raw (unadjusted) means',
      adjMeansTitle: 'Adjusted (LS) means',
      adjMeansHint: 'Adjusted means: predicted Y at the grand mean of all covariates; 95% CI uses +/-1.96 * SE (large-sample approximation).',
      cols: {
        source: 'Source', ss: 'SS', df: 'df', ms: 'MS', f: 'F', p: 'p',
        partialEta2: 'partial eta-sq', error: 'Error', total: 'Total',
        level: 'Level', mean: 'Mean', adjMean: 'Adj. mean', se: 'SE', ci95: '95% CI',
      },
      effectInterp: { small: 'small', medium: 'medium', large: 'large' },
    },
    interp: {
      header: 'Interpretation',
      sigYes: 'significant',
      sigNo: 'not significant',
      overall:
        'After adjusting for the covariate(s), the main effect of {factor} on {yLabel} was F({df1}, {df2}) = {f}, p = {pStr} -> {sigWord}; partial eta-sq = {eta2} ({etaInterp}).',
      covSection: 'Covariate-specific adjusted tests:',
      covLine: '{name}: F({df1}, {df2}) = {f}, p = {pStr}, partial eta-sq = {eta2} -> {sigWord}',
    },
    notes: {
      purposeTitle: 'Purpose',
      purpose:
        'ANCOVA combines ANOVA (group-mean comparisons) and regression (continuous predictors).\nTypical uses:\n1. Compare experimental vs. control groups while removing the influence of pre-test scores, age, IQ, etc.\n2. Ask: do group differences remain after controlling for X?\n3. Boost statistical power - the covariate absorbs within-group variance, shrinking MS_error.',
      assumpTitle: 'Assumptions',
      assumptions:
        '1. DV is continuous, covariates are continuous, factor is categorical\n' +
        '2. Independent observations\n' +
        '3. Residuals are normal with constant variance\n' +
        '4. Linear relationship between covariates and DV\n' +
        '5. Covariates are independent of the factor (covariates should not be affected by the manipulation)\n' +
        '6. * Homogeneity of regression slopes - the covariate-DV slope is the same across factor levels; if violated, ANCOVA adjustment is misleading.',
      formulasTitle: 'Core formulas',
      formulaModel: 'Y = b0 + sum b_g * Dummy_g + sum b_j * Cov_j + e',
      formulaSSfactor: 'SS_factor = SS_res(reduced: covariates only) - SS_res(full)',
      formulaSScov: 'SS_cov_j = SS_res(model w/o cov_j) - SS_res(full)',
      formulaF: 'F = MS_effect / MS_error; df_factor = k - 1, df_error = N - k - p',
      formulaPartialEta2: 'partial eta-sq = SS_effect / (SS_effect + SS_error)',
      formulaAdjMean:
        'Adjusted mean_g = b0_hat + b_g_hat + sum b_j_hat * Cbar_j (Cbar_j = grand mean of cov_j)',
      formulaHomo:
        'Homogeneity F = ((SS_res_full - SS_res_homo) / # interactions) / (SS_res_homo / df_homo)',
      readingTitle: 'How to read',
      reading:
        '1. * First check the homogeneity-of-slopes test: if violated (p < .05), every ANCOVA conclusion should be discounted.\n' +
        '2. Read the F and p of the factor: are group differences significant after adjusting for the covariates?\n' +
        '3. Read each covariate F and p: which covariates significantly relate to the DV?\n' +
        '4. Read partial eta-sq for each effect (< .06 small, < .14 medium, >= .14 large).\n' +
        '5. Read the adjusted (LS) means - these, not the raw means, are what ANCOVA actually compares.\n\n' +
        'Common pitfalls:\n' +
        '- The covariate is itself affected by the treatment -> assumption violated\n' +
        '- Using ANCOVA to substitute for randomization\n' +
        '- Ignoring the homogeneity-of-slopes test',
    },
    apa: {
      sentence:
        'An ANCOVA was conducted to examine differences in {yLabel} across {factor} after controlling for {covList} (N = {n}). The main effect of {factor} was significant, F({df1}, {df2}) = {f}, p = {pStr}, partial eta-sq = {eta2}. {covSection}{homoSection}',
      sentenceNs:
        'An ANCOVA was conducted to examine differences in {yLabel} across {factor} after controlling for {covList} (N = {n}). The main effect of {factor} was not significant, F({df1}, {df2}) = {f}, p = {pStr}, partial eta-sq = {eta2}. {covSection}{homoSection}',
      covOpener: 'For the covariates, ',
      covLine: '{name} (F({df1}, {df2}) = {f}, p = {pStr}, partial eta-sq = {eta2})',
      homoOk: ' The homogeneity-of-slopes test, F({df1}, {df2}) = {f}, p = {pStr}, did not violate the assumption.',
      homoBad: ' The homogeneity-of-slopes test, F({df1}, {df2}) = {f}, p = {pStr}, violated the assumption; results should be interpreted with caution.',
      copyHint: 'Copy APA narrative to clipboard',
    },
  },
  icc: {
    title: 'ICC (intraclass correlation)',
    config: {
      selectRatersTitle: 'Select rater columns',
      selectRatersHint: 'Tick the numeric column for each rater (rows = subjects, columns = raters). At least 2 raters; 3+ is more stable.',
    },
    result: {
      summaryTitle: 'Summary',
      anovaTitle: 'ANOVA mean-square breakdown',
      variantTitle: 'Six ICC variants (Shrout & Fleiss, 1979)',
      designNote: 'Two-way ANOVA (subjects x raters, no interaction term)',
      droppedNote: '{n} rows dropped (listwise deletion)',
      interpRange: 'Interpretation (Koo & Li, 2016): < .50 poor, .50-.75 moderate, .75-.90 good, >= .90 excellent',
      cols: {
        n: 'Valid n', k: 'Raters', design: 'Design',
        source: 'Source', df_short: 'df', ms: 'MS',
        variant: 'Variant', description: 'Description', icc: 'ICC', ci95: '95% CI',
        f: 'F', df: 'df1, df2', p: 'p', interp: 'Reading',
      },
      rows: {
        between: 'Between-subject (MS_R)',
        raterCol: 'Between-rater (MS_C)',
        residual: 'Residual (MS_E)',
        within: 'Within-subject (MS_W)',
      },
      variantLabel: {
        icc1_1: 'ICC(1,1)', icc1_k: 'ICC(1,k)',
        icc2_1: 'ICC(2,1)', icc2_k: 'ICC(2,k)',
        icc3_1: 'ICC(3,1)', icc3_k: 'ICC(3,k)',
      },
      variantDesc: {
        icc1_1: 'One-way random, single rater',
        icc1_k: 'One-way random, average of k',
        icc2_1: 'Two-way random, single rater, absolute agreement',
        icc2_k: 'Two-way random, average of k, absolute agreement',
        icc3_1: 'Two-way mixed, single rater, consistency',
        icc3_k: 'Two-way mixed, average of k, consistency',
      },
    },
    errors: {
      needAtLeast2Raters: 'Pick at least 2 rater columns',
      needAtLeast3Subjects: 'Not enough valid subjects (need at least 3 with all rater columns observed)',
    },
    interp: { poor: 'poor', moderate: 'moderate', good: 'good', excellent: 'excellent' },
    decisionTree: {
      header: 'Which ICC should I report? (decision tree)',
      body:
        'Step 1 | Same raters for all subjects, or different (random) raters per subject?\n  - Different/random raters per subject -> ICC(1, *)\n  - Same raters across all subjects, raters as random sample of a larger pool -> ICC(2, *)\n  - Same raters across all subjects, fixed (no generalization) -> ICC(3, *)\n\nStep 2 | Single rater or average of k raters in practice?\n  - Single -> ICC(*, 1)\n  - Average of k -> ICC(*, k)\n\nStep 3 (only ICC(2, *) vs ICC(3, *)) | Absolute agreement or consistency?\n  - Care about absolute score values -> absolute (ICC(2, *))\n  - Care only about rank order -> consistency (ICC(3, *))\n\nCommon situations:\n  - Inter-rater reliability with raters drawn from a larger pool -> ICC(2,1) or ICC(2,k)\n  - Same fixed raters, no generalization -> ICC(3,1) or ICC(3,k)\n  - Reporting: report point estimate AND 95% CI; interpret per Koo & Li (2016).',
    },
    notes: {
      purposeTitle: 'Purpose',
      purpose:
        'Quantify the consistency of scores when each subject is rated by multiple raters (or measured repeatedly).\nCommon uses:\n1. Inter-rater reliability\n2. Test-retest reliability\n3. Item homogeneity in some scale contexts (Cronbach\'s alpha is more common for that)\n\nKey: ICC is a family of 6 variants (Shrout & Fleiss, 1979). Choose based on study design.',
      assumpTitle: 'Assumptions',
      assumptions:
        '1. Subjects are a random sample\n' +
        '2. Two-way model: subject x rater interaction is assumed negligible\n' +
        '3. Residuals approximately normal with constant variance\n' +
        '4. ICC(1, *): each subject is rated by a different set of raters\n' +
        '5. ICC(2, *): same raters score everyone; raters are random sample of a population\n' +
        '6. ICC(3, *): same raters score everyone; raters are fixed\n' +
        '7. Listwise deletion: subject with any missing rater column is dropped',
      formulasTitle: 'Core formulas',
      formulaAnova:
        'MS_R = SS_R/(n-1); MS_C = SS_C/(k-1); MS_E = SS_E/((n-1)(k-1)); MS_W = (SS_C+SS_E)/(n(k-1))',
      formulaIcc1_1: '(MS_R - MS_W) / (MS_R + (k-1)*MS_W)',
      formulaIcc1_k: '(MS_R - MS_W) / MS_R',
      formulaIcc2_1: '(MS_R - MS_E) / (MS_R + (k-1)*MS_E + k*(MS_C - MS_E)/n)',
      formulaIcc2_k: '(MS_R - MS_E) / (MS_R + (MS_C - MS_E)/n)',
      formulaIcc3_1: '(MS_R - MS_E) / (MS_R + (k-1)*MS_E)',
      formulaIcc3_k: '(MS_R - MS_E) / MS_R',
      readingTitle: 'How to read',
      reading:
        '1. Confirm study design first; pick the right variant.\n' +
        '2. Koo & Li (2016): < .50 poor, .50-.75 moderate, .75-.90 good, >= .90 excellent\n' +
        '3. Always report 95% CI alongside point estimate.\n' +
        '4. F test against H0: ICC = 0 means reliability is significantly above zero, NOT that reliability is "good enough".\n' +
        '5. Average-rating ICCs (*, k) tend to be higher than (*, 1) due to Spearman-Brown effect; do not directly compare.\n' +
        '6. ICC is sensitive to outliers; consider sensitivity check.',
    },
    narrative: {
      copyHint: 'Copy APA narrative',
      sentence:
        'Inter-rater reliability across {itemList} ({k} raters, n = {n} subjects) was assessed via the intraclass correlation coefficient. ' +
        'Following Shrout & Fleiss (1979), ICC(2,1) (two-way random, absolute agreement, single rater) was reported: ' +
        'ICC = {icc}, 95% CI {ci}, F({df1}, {df2}) = {f}, p = {pStr} ({interp} reliability).',
    },
  },
  repAnova: {
    title: 'Repeated measures ANOVA',
    config: {
      selectConditionsTitle: 'Select repeated-measures conditions',
      selectConditionsHint: 'Pick the columns measured at different time points / conditions on the same subjects (>= 2 columns required; each row = one subject, each column = one repeated condition).',
    },
    result: {
      summaryTitle: 'Overall summary',
      descTitle: 'Descriptives by condition',
      mauchlyTitle: "Mauchly's test of sphericity",
      mauchlyLabel: 'Sphericity assumption',
      mauchlyOk: 'Sphericity satisfied',
      mauchlyViolated: 'Sphericity violated',
      mauchlyNotApplicable: "With only 2 conditions, sphericity is automatically satisfied; Mauchly's test is not applicable.",
      anovaTitle: 'RM-ANOVA table (with sphericity corrections)',
      recOk: "Mauchly's test is not significant; report the Sphericity-Assumed row.",
      recViolated: "Mauchly's test is significant (p < .05); the sphericity assumption is violated. Report the Greenhouse-Geisser-corrected row (conservative, most common); if eps_GG > 0.75, the Huynh-Feldt correction can also be reported for slightly higher power.",
      recK2: 'With k = 2 the sphericity assumption is automatically satisfied; report the Sphericity-Assumed row directly.',
      cols: {
        n: 'n (subjects)', kCond: 'k (conditions)',
        condition: 'Condition', mean: 'M', sd: 'SD',
        source: 'Source', eps: 'eps', ss: 'SS', df: 'df',
        dfTreat: 'df (treatment)', dfError: 'df (error)',
        ms: 'MS', f: 'F', p: 'p',
        partialEta2: 'partial eta-sq', etaG2: 'generalised eta-sq_G',
      },
      sources: {
        sa: 'Sphericity assumed',
        gg: 'Greenhouse-Geisser',
        hf: 'Huynh-Feldt',
        lb: 'Lower-bound',
        error: 'Error (subj x cond)',
        bs: 'Between-subjects',
        total: 'Total',
      },
      effectInterp: { small: 'small', medium: 'medium', large: 'large' },
    },
    errors: {
      needAtLeast2: 'Please select at least 2 condition columns.',
      tooFewN: 'Effective sample is too small (n = {n} after listwise deletion).',
    },
    interp: {
      header: 'Interpretation',
      sigYes: 'significant',
      sigNo: 'not significant',
      overall:
        'Repeated-measures ANOVA was conducted on N = {n} subjects across k = {k} conditions. ' +
        'Based on the {sourceName} row, F({df1}, {df2}) = {f}, p = {pStr}, which is {sigWord}.' +
        '\nEffect size: partial eta-sq = {eta2} ({etaInterp}); generalised eta-sq_G = {etaG2}.',
      useSA: "Note: Mauchly's test was not significant; the Sphericity-Assumed row is used for reporting.",
      useGG: "Note: Mauchly's test indicated a sphericity violation; the Greenhouse-Geisser-corrected df and p have been used for interpretation.",
      k2Note: 'Note: with k = 2, sphericity is automatically satisfied; no correction is needed.',
    },
    notes: {
      purposeTitle: 'Purpose',
      purpose:
        'Compares the means of the same subjects measured under >= 2 repeated conditions.\n' +
        'Typical uses: pretest / posttest / follow-up; same subjects under different experimental conditions.',
      assumpTitle: 'Assumptions',
      assumptions:
        '1. Independence of subjects\n' +
        '2. Approximately normal DV per condition\n' +
        '3. Sphericity: variances of all pairwise differences equal\n' +
        '4. Wide-format data: each row = one subject, each column = one condition.',
      formulasTitle: 'Core formulae',
      formulaSStotal: 'SS_total; df_total = nk - 1',
      formulaSSbs: 'SS_between-subjects; df = n - 1',
      formulaSStreat: 'SS_treatment; df = k - 1',
      formulaSSerror: 'SS_error; df = (n-1)(k-1)',
      formulaF: 'F = MS_treatment / MS_error',
      formulaPartialEta2: 'partial eta-sq = SS_treat / (SS_treat + SS_error)',
      formulaEtaG2: 'generalised eta-sq_G = SS_treat / (SS_treat + SS_BS + SS_error)',
      formulaMauchly: "Mauchly W = det(S) / (tr(S)/(k-1))^(k-1)",
      formulaGG: 'eps_GG = (tr S)^2 / [(k-1) * tr(S^2)]',
      formulaHF: 'eps_HF formula (see code)',
      formulaLB: 'eps_LB = 1 / (k-1)',
      readingTitle: 'How to read',
      reading:
        "1. Look at Mauchly first (k >= 3): p < .05 -> sphericity violated.\n" +
        '2. If satisfied -> report Sphericity-Assumed row.\n' +
        '3. If violated -> Greenhouse-Geisser row (most common); if eps_GG > 0.75 also Huynh-Feldt is acceptable.\n' +
        '4. F is identical across all four rows; only df (and p) shrink with eps.\n' +
        '5. Report both partial eta-sq and generalised eta-sq_G.',
    },
    apa: {
      sentence:
        'A repeated-measures ANOVA was conducted on N = {n} subjects across {k} conditions ({condList}). ' +
        '{sphericitySection} ' +
        'Under {correction}, the main effect was significant, F({df1}, {df2}) = {f}, p = {pStr}, partial eta-sq = {eta2}, eta-sq_G = {etaG2}.',
      sentenceNs:
        'A repeated-measures ANOVA was conducted on N = {n} subjects across {k} conditions ({condList}). ' +
        '{sphericitySection} ' +
        'Under {correction}, the main effect was not significant, F({df1}, {df2}) = {f}, p = {pStr}, partial eta-sq = {eta2}, eta-sq_G = {etaG2}.',
      sphericityOk:
        "Mauchly's test did not indicate a violation of sphericity (W = {w}, chi-sq({df}) = {chi2}, p = {pStr}).",
      sphericityViolated:
        "Mauchly's test indicated a violation of sphericity (W = {w}, chi-sq({df}) = {chi2}, p = {pStr}); therefore the Greenhouse-Geisser correction (eps = {epsGG}) was applied.",
      k2Note: "With only 2 conditions, sphericity is automatically satisfied and Mauchly's test was not performed.",
      saLabel: 'sphericity assumed',
      ggLabel: 'the Greenhouse-Geisser correction',
      copyHint: 'Copy APA narrative',
    },
  },
  lda: {
    title: 'LDA (Linear discriminant analysis)',
    config: {
      groupLabel: 'Grouping variable (categorical, >= 2 levels)',
      pickGroup: 'Pick the grouping variable',
      groupHint: 'Must be categorical with at least 2 levels; the levels are the target classes',
      predictorsLabel: 'Predictors (>= 2 continuous)',
      predictorsHint: 'Tick numeric variables; need at least 2; the grouping variable cannot also be a predictor',
    },
    errors: {
      pickGroup: 'Please pick the grouping variable',
      pickPredictors: 'Please tick at least 2 predictors',
      'group-in-predictors': 'The grouping variable cannot also be a predictor',
      groupBadGroups: 'The grouping variable has only {k} group(s); at least 2 are required',
      tooFewN: 'Not enough valid cases (N = {N}; need N > k + p; current k = {k}, p = {p})',
      singularPooled: 'Pooled within-class covariance S_p is singular; consider dropping highly correlated predictors',
    },
    result: {
      groups: 'groups', predictors: 'predictors', functions: 'discriminant functions', cases: 'cases',
      functionsTitle: 'Discriminant functions',
      functionsHint: 'At most min(k - 1, p) functions can be retained. Wilks Lambda and chi-sq are sequential tests starting from function j.',
      stdCoefTitle: 'Standardized canonical coefficients',
      stdCoefHint: 'Scaled so w^T S_p w = 1. Light < 0.32 (weak), mid 0.32-0.55, amber >= 0.55 (strong).',
      structureTitle: 'Structure matrix',
      structureHint: 'Correlation between predictors and discriminant scores. |r| >= 0.30 is meaningful. Preferred for naming the construct.',
      centroidsTitle: 'Group centroids',
      centroidsHint: 'Group means projected onto the discriminant axes.',
      classifyTitle: 'Classification (resubstitution)',
      overallAccuracy: 'Overall accuracy',
      classifyHint: 'Diagonal = correctly classified. Note: resubstitution overestimates true performance; report cross-validated accuracy in formal write-ups.',
      boxMTitle: "Box's M test of equality of covariance matrices",
      boxMLabel: 'Covariance homogeneity',
      boxMOk: 'OK (p > .001)', boxMViolated: 'violated (p <= .001)',
      boxMNotApplicable: 'Not computable.',
      boxMViolatedWarn: "Warning: Box's M is significant - covariance matrices differ. Consider QDA.",
      cols: {
        function: 'Function', eigenvalue: 'Eigenvalue', canonicalR: 'Canonical r',
        percent: '% of var', cumulative: 'Cumulative %',
        wilks: "Wilks' Lambda", chi2: 'chi-sq', df: 'df', p: 'p',
        predictor: 'Predictor', group: 'Group',
        actualBackslashPredicted: 'Actual \\ Predicted',
        total: 'Total', classAccuracy: 'Class accuracy',
      },
      accuracyInterp: {
        poor: 'poor (< 50%)', modest: 'modest (50-70%)',
        good: 'good (70-85%)', excellent: 'excellent (>= 85%)',
      },
    },
    interp: {
      header: 'Interpretation', sigYes: 'significant', sigNo: 'not significant',
      overall:
        'An LDA tested whether {p} predictors discriminate membership in {group} (k = {k} groups; N = {n}).\n' +
        'Up to {nFns} functions extracted. Function 1: Wilks Lambda = {f1Lambda}, chi-sq({f1Df}) = {f1Chi2}, p = {f1Pstr} -> {sigWord}; canonical r = {f1CanR}, accounting for {f1PctVar}% of discriminant variance.\n' +
        'Resubstitution classification accuracy = {accPct}% ({accInterp}).',
      boxLine: "Box's M: chi-sq({df}) = {chi2}, p = {pStr} - {verdict}",
      boxOk: 'covariance homogeneity satisfied',
      boxBad: 'covariance homogeneity violated; consider QDA',
      boxNotApplicable: "Box's M not computable.",
      sigFollowUp: 'Significant; use the structure matrix to name the construct and centroids to describe group positions.',
      nsAdvice: 'Not significant; classification use is not recommended.',
    },
    notes: {
      purposeTitle: 'Purpose',
      purpose:
        'LDA is both classifier and dimensionality-reduction. Use cases include diagnosis prediction, firm classification, and MANOVA follow-up.\n\nVs MANOVA: equivalent math; LDA emphasises separation/classification.\nVs logistic regression: LDA needs MVN + common Sigma; logistic does not.',
      assumpTitle: 'Assumptions',
      assumptions:
        '1. Multivariate normality\n' +
        "2. Equal covariance across groups (Box's M); switch to QDA if violated\n" +
        '3. Independent observations\n' +
        '4. Continuous predictors with no severe collinearity\n' +
        '5. n_g > p (recommended n_g >= 20 + p)\n' +
        '6. No severe outliers',
      formulasTitle: 'Core formulas',
      formulaW: 'W = sum_g sum_i (X_gi - X_g_bar)^T (X_gi - X_g_bar)',
      formulaB: 'B = sum_g n_g * (X_g_bar - X_bar)^T (X_g_bar - X_bar)',
      formulaSp: 'S_p = W / (N - k)',
      formulaEig: 'Discriminant functions = eigenvectors of W^-1 B',
      formulaCanR: 'Canonical r = sqrt(lambda / (1 + lambda))',
      formulaWilks: "Wilks' Lambda_j = prod_{i>=j} 1 / (1 + lambda_i)",
      formulaDelta: 'delta_g(x) = x^T S_p^-1 mu_g - 0.5 mu_g^T S_p^-1 mu_g + log(pi_g)',
      readingTitle: 'How to read',
      reading:
        "1. Check Box's M.\n" +
        '2. Wilks Lambda row 1 tests overall.\n' +
        '3. Canonical r > 0.5 strong.\n' +
        '4. Standardized vs structure matrix.\n' +
        '5. Centroids show position.',
      classifyTitle: 'How to read confusion matrix',
      classifyHowTo:
        '1. Diagonal = correctly classified.\n' +
        '2. Overall accuracy = sum(diag) / N.\n' +
        '3. Compare to chance (1/k for balanced).\n' +
        '4. Note: resubstitution overestimates.',
    },
    apa: {
      sentence:
        'A linear discriminant analysis was conducted to examine whether {predictorList} ({p} predictors) discriminate membership in {group} (k = {k} groups; N = {n}). ' +
        '{nFns} discriminant function(s) were extracted; the first function was significant, ' +
        "Wilks' Lambda = {f1Lambda}, chi-sq({f1Df}) = {f1Chi2}, p = {f1Pstr}, canonical r = {f1CanR}, accounting for {f1PctVar}% of discriminant variance. " +
        'Using linear discriminant scores, the resubstitution classification accuracy was {accPct}%.{boxSection}',
      sentenceNs:
        'A linear discriminant analysis was conducted to examine whether {predictorList} ({p} predictors) discriminate membership in {group} (k = {k} groups; N = {n}). ' +
        '{nFns} discriminant function(s) were extracted; the first function was not significant, ' +
        "Wilks' Lambda = {f1Lambda}, chi-sq({f1Df}) = {f1Chi2}, p = {f1Pstr}, canonical r = {f1CanR}. " +
        'Using linear discriminant scores, the resubstitution classification accuracy was {accPct}%.{boxSection}',
      boxOk: " Box's M test, chi-sq({df}) = {chi2}, p = {pStr}, did not violate the assumption.",
      boxBad: " Box's M test, chi-sq({df}) = {chi2}, p = {pStr}, violated the assumption; consider QDA.",
      boxNotApplicable: " Box's M was not computable.",
      copyHint: 'Copy APA narrative to clipboard',
    },
  },
  cluster: {
    title: 'Cluster analysis',
    config: {
      methodLabel: 'Method',
      methods: { kmeans: 'k-means', hierarchical: 'Hierarchical (Ward)' },
      methodHint: {
        kmeans: 'k-means: k-means++ seeding plus Lloyd iterations; 10 random restarts retain the lowest-WSS solution.',
        hierarchical: 'Hierarchical Ward: agglomerative bottom-up merging by minimum within-cluster SS increment.',
      },
      kLabel: 'Number of clusters k (2-10)',
      kHint: 'Inspect the elbow curve first.',
      standardizeLabel: 'Standardize variables (z-score)',
      standardizeHint: 'Recommended whenever variable scales differ markedly.',
      varsLabel: 'Clustering variables (>= 2 continuous)',
      varsHint: 'Tick numeric variables.',
    },
    errors: {
      needAtLeastTwoVars: 'Pick at least 2 clustering variables',
      kRange: 'k must be an integer between 2 and 10',
      tooFewN: 'Insufficient effective sample size (N = {N}; needs N > k with k = {k}, p = {p})',
      kTooSmall: 'k must be at least 2',
      unknownMethod: 'Unknown clustering method',
    },
    result: {
      vars: 'variables', method: 'Method', iterations: 'iterations', notConverged: 'not converged',
      elbowTitle: 'Elbow curve (WSS vs. k)',
      elbowHint: 'Pick k at the bend where WSS levels off. Currently selected k highlighted.',
      sizesTitle: 'Cluster sizes',
      centroidsTitle: 'Cluster centroids / variable profile',
      centroidsHint: 'Each cell shows mean (original scale) plus z-score. |z| >= 1 highlighted.',
      qualityTitle: 'Quality metrics',
      qualityHint: 'WSS = within-cluster SS. BSS/TSS analogous to R². Mean silhouette: -1 to 1, >= .50 strong.',
      dendroTitle: 'Dendrogram (merge steps)',
      dendroHint: 'X = step. Y = ΔSS. Dashed line marks k cut.',
      cols: {
        cluster: 'Cluster', percent: '%', wss: 'WSS', bss: 'BSS',
        bssRatio: 'BSS / TSS', silhouette: 'Silhouette',
      },
      silhouetteInterp: {
        noStructure: 'no real structure', weak: 'weak structure',
        reasonable: 'reasonable structure', strong: 'strong structure',
      },
    },
    interp: {
      header: 'Interpretation',
      overall:
        '{method} clustering partitioned N = {n} cases on {p} variables into k = {k} clusters.\n' +
        'BSS/TSS = {bssRatio}%; mean silhouette = {silhouette} ({sInterp}).',
      recommendation:
        'Recommendations: (1) read elbow curve; (2) inspect z-score table to label clusters; (3) if silhouette < .25, reduce k or change method (k-means <-> Ward).',
    },
    notes: {
      purposeTitle: 'Purpose',
      purpose:
        'Cluster analysis partitions cases into internally homogeneous, mutually distinct subgroups (unsupervised).\n' +
        'Typical: customer segmentation, respondent typology, exploratory natural-grouping check.',
      assumpTitle: 'Assumptions',
      assumptions:
        '1. Continuous variables.\n' +
        '2. Comparable scales (standardize otherwise).\n' +
        '3. Independent observations.\n' +
        '4. k-means assumes spherical clusters.\n' +
        '5. No severe outliers.',
      formulasTitle: 'Core formulas',
      formulaTSS: 'TSS = sum_i ||x_i - x_bar||^2',
      formulaWSS: 'WSS = sum_g sum_{i in g} ||x_i - mu_g||^2',
      formulaBSS: 'BSS = sum_g n_g * ||mu_g - x_bar||^2',
      formulaWard: "Ward dSS(I,J) = (n_I * n_J / (n_I + n_J)) * ||c_I - c_J||^2",
      formulaSil: 's(i) = (b(i) - a(i)) / max(a(i), b(i))',
      readingTitle: 'How to read',
      reading:
        '1. Use elbow curve.\n' +
        '2. Silhouette: >= .50 strong.\n' +
        '3. Z-score table for naming.\n' +
        '4. Watch sizes.\n' +
        '5. Cross-check methods.',
      chooseTitle: 'Choosing between methods',
      chooseMethod:
        'k-means: fast, large samples, spherical clusters, k pre-specified.\n' +
        'Ward: small samples, exploratory, O(N^2) cost, irreversible merges.\n' +
        'Run both as cross-validation.',
    },
    apa: {
      sentence:
        '{method} cluster analysis partitioned N = {n} cases on {varList} ({p} variables, {stdWord}) into k = {k} clusters. ' +
        'Cluster sizes were {sizesLine}. BSS/TSS = {bssRatio}%, mean silhouette = {silhouette} ({sInterp}).',
      standardizedYes: 'standardized to z-scores',
      standardizedNo: 'not standardized',
      copyHint: 'Copy APA narrative',
    },
  },
  cfa: {
    title: 'CFA (Confirmatory factor analysis)',
    config: {
      factorsTitle: 'Define factor structure',
      factorsHint: 'Name each factor and select its indicator items',
      factorLabel: 'Factor',
      indicatorsLabel: 'Indicators',
      addFactor: 'Add factor',
      removeFactor: 'Remove last',
      noIndicatorsLeft: 'All available indicators are taken by other factors',
      simpleStructureNote:
        'Simple-structure CFA: each indicator loads on exactly one factor (no cross-loadings, no correlated residuals). Factor variances fixed at 1.0.',
    },
    errors: {
      'no-factors': 'No factors defined yet',
      'no-valid-factor': 'Define at least one factor with >= 2 indicators',
      'too-few-indicators': 'Each factor needs at least 2 indicators',
      'too-few-total-indicators': 'Total indicators must be >= 3',
      'duplicate-indicator': 'An indicator cannot belong to two factors',
      'need-more-data': 'Not enough complete observations',
      'underidentified': 'Model is under-identified',
      'sample-cov-not-pd': 'Sample covariance matrix is not positive-definite',
      'optimization-failed': 'ML estimation did not converge',
    },
    result: {
      summaryTitle: 'Model summary',
      fitIndicesTitle: 'Fit indices',
      loadingsTitle: 'Factor loadings',
      factorCorrTitle: 'Factor correlations',
      residualsTitle: 'Residual variances',
      converged: 'Converged',
      notConverged: 'Not converged (interpret with caution)',
      iterStr: '{iter} iterations',
      cols: {
        n: 'N', pIndicators: 'Indicators (p)', mFactors: 'Factors (m)', df: 'df',
        factor: 'Factor', indicator: 'Indicator',
        lambda: 'lambda (unstd.)', lambdaStd: 'lambda (std.)',
        se: 'SE', z: 'z', p: 'p', r2: 'R²',
        theta: 'theta (residual var.)', rmseaP: 'RMSEA p (close fit)',
      },
      thresholdNote:
        'Reference (Hu & Bentler, 1999):\n' +
        'CFI / TLI >= .95 good, >= .90 acceptable, < .90 poor\n' +
        'RMSEA <= .06 good, <= .08 acceptable, > .08 poor\n' +
        'SRMR <= .08 good, > .08 poor',
      rmseaPNote: 'H0: RMSEA <= .05; p > .05 means close-fit not rejected',
      loadingsNote: 'Std. loading colour: < 0.40 weak, 0.40-0.50 fair, 0.50-0.70 good, >= 0.70 strong',
      factorCorrNote: 'Diagonal fixed to 1.\nCorrelations >= 0.85 suggest poor discriminability.',
      seUnavailable: 'Hessian inversion failed; SEs unavailable.',
    },
    fitInterp: { good: 'good', acceptable: 'acceptable', poor: 'poor' },
    notes: {
      purposeTitle: 'Purpose',
      purpose:
        'CFA tests whether a pre-specified factor structure is consistent with the observed covariance.\nVs EFA: EFA explores; CFA verifies.',
      assumpTitle: 'Assumptions',
      assumptions:
        '1. Multivariate normality\n' +
        '2. Simple structure\n' +
        '3. Uncorrelated residuals\n' +
        '4. N >= 200 or N / free-params >= 5\n' +
        '5. Identified: df >= 0',
      formulasTitle: 'Core formulas',
      formulaModel: 'Model: Sigma(theta) = Lambda Phi Lambda^T + Theta',
      formulaFitFn: 'F_ML(theta) = log|Sigma| + tr(S Sigma^-1) - log|S| - p',
      formulaChi2: 'chi-sq = (N - 1) * F_min',
      formulaCfi: 'CFI = 1 - max(chi-sq - df, 0) / max(chi-sq_null - df_null, 0)',
      formulaTli: 'TLI = (chi-sq_null/df_null - chi-sq/df) / (chi-sq_null/df_null - 1)',
      formulaRmsea: 'RMSEA = sqrt(max(chi-sq - df, 0) / (df * (N-1)))',
      formulaSrmr: 'SRMR = standardized residual root-mean-square',
      formulaDf: 'df = p(p+1)/2 - t; t = p + m(m-1)/2 + p',
      thresholdsTitle: 'Fit thresholds',
      thresholds: 'See above (Hu & Bentler 1999).',
      readingTitle: 'How to read',
      reading:
        '1. Convergence first.\n' +
        '2. Fit indices.\n' +
        '3. Std. loadings >= 0.50.\n' +
        '4. R² >= 0.30.\n' +
        '5. Factor r <= 0.85.',
    },
    apa: {
      sentence:
        'A CFA (ML) tested a {m}-factor structure ({factorList}) with {p} indicators (N = {n}). ' +
        'Fit: chi-sq({df}) = {chi2}, p = {pStr}; CFI = {cfi}; TLI = {tli}; RMSEA = {rmsea} (90% CI {rmseaCi}); SRMR = {srmr}. ' +
        'Overall fit was {overall}.',
      copyHint: 'Copy APA narrative',
    },
    interp: {
      header: 'Interpretation',
      summary:
        'N = {n}; {p} indicators across {m} factors; df = {df}.\n' +
        'chi-sq({df}) = {chi2}, p = {pStr}; CFI = {cfi}; TLI = {tli};\n' +
        'RMSEA = {rmsea}, 90% CI {rmseaCi}; SRMR = {srmr}.\n' +
        'Overall fit: {overall}.',
    },
  },
  mixedAnova: {
    title: 'Mixed ANOVA',
    config: {
      betweenVar: 'Between-subjects factor',
      pickBetween: 'Pick the between-subjects factor (categorical, >= 2 groups)',
      betweenHint: 'Each subject belongs to exactly one level (e.g. treatment vs. control, male vs. female).',
      selectConditionsTitle: 'Within-subjects factor (repeated conditions)',
      selectConditionsHint: 'Pick the columns measured at different time points / conditions on the same subjects (>= 2 columns required; each row = one subject, each column = one repeated level).',
    },
    result: {
      summaryTitle: 'Overall summary',
      descTitle: 'Descriptives (between x within)',
      mauchlyTitle: "Mauchly's test of sphericity (within factor)",
      mauchlyLabel: 'Sphericity assumption',
      mauchlyOk: 'Sphericity satisfied',
      mauchlyViolated: 'Sphericity violated',
      mauchlyNotApplicable: "With only 2 within-subjects levels, sphericity is automatically satisfied; Mauchly's test is not applicable.",
      anovaTitle: 'Mixed ANOVA table (with sphericity corrections)',
      recOk: "Mauchly's test is not significant; report the Sphericity-Assumed row for both the within main effect and the interaction.",
      recViolated: "Mauchly's test is significant (p < .05); report the Greenhouse-Geisser-corrected row for the within main effect and the interaction; if eps_GG > 0.75, the Huynh-Feldt correction can also be reported. The between-subjects main effect is unaffected by sphericity.",
      recK2: 'With b = 2 the sphericity assumption is automatically satisfied; report the Sphericity-Assumed row directly for the within and interaction effects.',
      cols: {
        n: 'Total N', aGroups: 'a (groups)', bConditions: 'b (conditions)',
        group: 'Group', condition: 'Condition', mean: 'M', sd: 'SD',
        source: 'Source', eps: 'eps', ss: 'SS', df: 'df',
        dfTreat: 'df (effect)', dfError: 'df (error)',
        ms: 'MS', f: 'F', p: 'p',
        partialEta2: 'partial eta-sq', fAB: 'F (A x B)',
      },
      sections: {
        between: '-- Between-subjects --',
        within: '-- Within-subjects --',
      },
      sources: {
        effectA: 'A (between-subjects main)',
        subjWithinA: 'Subjects within A (error)',
        effectB: 'B (within-subjects main)',
        effectAB: 'A x B (interaction)',
        errorWithin: 'Error (within)',
        sa: 'Sphericity assumed',
        gg: 'Greenhouse-Geisser',
        hf: 'Huynh-Feldt',
        total: 'Total',
      },
      effectInterp: { small: 'small', medium: 'medium', large: 'large' },
    },
    errors: {
      pickBetween: 'Please select a between-subjects factor first.',
      needAtLeast2: 'Please select at least 2 within-subjects condition columns.',
      needAtLeast2Groups: 'The between-subjects factor must have at least 2 groups.',
      tooFewN: 'Effective sample is too small (N = {n} after listwise deletion).',
      tooFewPerGroup: 'Some groups have fewer than 2 subjects.',
    },
    interp: {
      header: 'Interpretation',
      sigYes: 'significant',
      sigNo: 'not significant',
      summary:
        'A mixed ANOVA was conducted on N = {n} subjects (between-subjects a = {a} groups x within-subjects b = {b} conditions).' +
        '\n- Between-subjects main effect ({factorA}): F({df1A}, {df2A}) = {fA}, p = {pA}, which is {sigA}; partial eta-sq = {peA} ({effectAStr}).' +
        '\n- Within-subjects main effect: F({df1B}, {df2B}) = {fB}, p = {pB}, which is {sigB}; partial eta-sq = {peB} ({effectBStr}).' +
        '\n- Interaction (A x B): F({df1AB}, {df2AB}) = {fAB}, p = {pAB}, which is {sigAB}; partial eta-sq = {peAB} ({effectABStr}).',
      useSA: "Note: Mauchly's test was not significant; the Sphericity-Assumed row is used for the within and interaction effects.",
      useGG: "Note: Mauchly's test indicated a sphericity violation; the Greenhouse-Geisser-corrected df and p have been used for the within and interaction effects.",
      k2Note: 'Note: with within b = 2, sphericity is automatically satisfied; no correction is needed.',
      interactionWarn: 'When the interaction is significant, prefer interpreting simple main effects rather than marginal main effects.',
    },
    notes: {
      purposeTitle: 'Purpose',
      purpose:
        'A mixed design has both a between-subjects factor and a within-subjects factor.\nTypical uses: treatment vs. control across pretest / posttest / follow-up; departments of employees over multiple time points.\nTests three effects simultaneously: between-group differences, within-condition differences, and the interaction.',
      assumpTitle: 'Assumptions',
      assumptions:
        '1. Independence of subjects across groups\n' +
        '2. Approximately normal DV within each group x condition cell\n' +
        '3. Homogeneity of variance across between-subject groups\n' +
        '4. Sphericity of the within-subjects contrast covariance\n' +
        '5. Wide-format data',
      formulasTitle: 'Core formulae',
      formulaSStotal: 'SS_total; df_total = Nb - 1',
      formulaSSA: 'SS_A; df = a - 1',
      formulaSSsubj: 'SS_subjects(A); df = N - a',
      formulaSSB: 'SS_B; df = b - 1',
      formulaSSAB: 'SS_AB; df = (a-1)(b-1)',
      formulaSSerror: 'SS_error(within); df = (b-1)(N-a)',
      formulaFA: 'F_A = MS_A / MS_subjects(A)',
      formulaFB: 'F_B = MS_B / MS_error(within)',
      formulaFAB: 'F_AB = MS_AB / MS_error(within)',
      formulaPartialEta2: 'partial eta-sq_effect = SS_effect / (SS_effect + corresponding error)',
      formulaMauchly: "Mauchly W on pooled within-group covariance",
      formulaGG: 'eps_GG = (tr S)^2 / [(b-1) * tr(S^2)]',
      formulaHF: 'eps_HF formula',
      formulaLB: 'eps_LB = 1 / (b-1)',
      readingTitle: 'How to read',
      reading:
        '1. Inspect the A x B interaction first.\n' +
        '2. The between A test uses MS_subjects(A) as denominator and is unaffected by sphericity.\n' +
        '3. The within B and the AB interaction share MS_error(within) and are sphericity-sensitive.\n' +
        '4. F is identical across SA / GG / HF rows; only df (and p) shrink.\n' +
        '5. Use partial eta-sq for effect sizes.',
    },
    apa: {
      sentence:
        'A mixed ANOVA was conducted on N = {n} subjects with {factorA} as the between-subjects factor (a = {a}) and a within-subjects factor of b = {b} conditions ({condList}). ' +
        '{sphericitySection} ' +
        '{factorA}: F({df1A}, {df2A}) = {fA}, p = {pA}, partial eta-sq = {peA}, {sigA}; ' +
        'under {correction}, the within-subjects main effect was {sigB}, F({df1B}, {df2B}) = {fB}, p = {pB}, partial eta-sq = {peB}; ' +
        'the interaction was {sigAB}, F({df1AB}, {df2AB}) = {fAB}, p = {pAB}, partial eta-sq = {peAB}.',
      sphericityOk: "Mauchly's test did not indicate a violation (W = {w}, chi-sq({df}) = {chi2}, p = {pStr}).",
      sphericityViolated: "Mauchly's test indicated a violation (W = {w}, chi-sq({df}) = {chi2}, p = {pStr}); GG correction (eps = {epsGG}) applied to within and interaction effects.",
      k2Note: 'With only 2 within levels, sphericity is automatically satisfied.',
      saLabel: 'sphericity assumed',
      ggLabel: 'the Greenhouse-Geisser correction',
      sigYes: 'significant',
      sigNo: 'not significant',
      copyHint: 'Copy APA narrative',
    },
  },
  manova: {
    title: 'MANOVA (Multivariate ANOVA)',
    config: {
      factorLabel: 'Factor (categorical, >= 2 levels)',
      pickFactor: 'Pick the factor',
      factorHint: 'Must be categorical with at least 2 levels',
      dvLabel: 'Dependent variables (>= 2 continuous)',
      dvHint: 'Tick numeric variables to include as DVs; need at least 2 DVs, factor cannot also be a DV',
    },
    errors: {
      pickFactor: 'Please pick the factor',
      pickDVs: 'Please tick at least 2 dependent variables',
      'factor-in-dvs': 'The factor cannot also be a DV',
      factorBadGroups: 'The factor has only {k} group(s); at least 2 are required',
      tooFewN: 'Not enough valid cases (N = {N}; need N > k + p; current k = {k}, p = {p})',
      'singular-matrix': 'Data is too collinear; E + H is singular',
      'length-mismatch': 'Data length mismatch',
    },
    result: {
      groups: 'groups',
      dvs: 'DVs',
      descTitle: 'Group descriptives, M (SD)',
      descHint: 'Each cell shows mean (SD); rows = groups, columns = DVs.',
      boxMTitle: "Box's M test of equality of covariance matrices",
      boxMLabel: 'Covariance homogeneity',
      boxMOk: 'OK (p > .001)',
      boxMViolated: 'violated (p <= .001)',
      boxMNotApplicable: 'Not computable (a group may be too small or the matrix is singular).',
      boxMViolatedWarn:
        "Warning: Box's M is significant - covariance matrices differ across groups. Prefer Pillai's V; Wilks and Hotelling-Lawley may inflate Type I error.",
      multTitle: 'Multivariate tests',
      tests: {
        wilks: "Wilks' Lambda",
        pillai: "Pillai's V",
        hotellingLawley: 'Hotelling-Lawley T',
        roy: "Roy's Largest Root",
      },
      upperBound: 'upper bound',
      cols: {
        test: 'Test', statistic: 'Statistic', f: 'F approx',
        df1: 'df1', df2: 'df2', p: 'p', partialEta2: 'partial eta-sq',
        group: 'Group', idx: '#', eigenvalue: 'Eigenvalue lambda_i',
        contribution: 'lambda/(1+lambda)',
      },
      effectInterp: { small: 'small', medium: 'medium', large: 'large' },
      eigenTitle: 'Eigenvalues of E^-1 H',
      eigenHint: "lambda/(1+lambda) is each root's contribution to Pillai's V; Roy uses the largest.",
      recommendation:
        "Pillai's V is most robust; Wilks' Lambda is the conventional default; report Pillai when Box's M is violated. Roy's largest root is an upper bound and should be paired with another statistic.",
    },
    interp: {
      header: 'Interpretation',
      sigYes: 'significant',
      sigNo: 'not significant',
      overall:
        'A one-way MANOVA tested whether {factor} (k = {k} groups) affected the multivariate vector of {p} DVs (N = {n}).\n' +
        "Wilks' Lambda = {wilks}, F({wDf1}, {wDf2}) = {wF}, p = {wPstr} -> {sigWord}; partial eta-sq = {wEta2} ({wEtaInterp}).\n" +
        "Pillai's V = {pillai}, F = {pF}, p = {pPstr}; partial eta-sq = {pEta2} ({pEtaInterp}).",
      boxLine: "Box's M: chi-sq({df}) = {chi2}, p = {pStr} - {verdict}",
      boxOk: 'covariance homogeneity satisfied',
      boxBad: "covariance homogeneity violated; prefer Pillai's V",
      boxNotApplicable: "Box's M not computable (insufficient sample or singular matrix).",
      sigFollowUp: 'Significant; follow-up univariate ANOVAs on each DV (with Bonferroni alpha) can identify which DVs drive the effect.',
      nsAdvice: 'Not significant; conventional practice does not pursue univariate follow-ups.',
    },
    notes: {
      purposeTitle: 'Purpose',
      purpose:
        'MANOVA tests whether a categorical factor affects a vector of multiple continuous DVs simultaneously.\nAdvantage: leverages correlation between DVs to detect multivariate patterns hidden from univariate tests.',
      assumpTitle: 'Assumptions',
      assumptions:
        '1. Multivariate normality\n' +
        "2. Homogeneity of covariance matrices (Box's M)\n" +
        '3. Independent observations\n' +
        '4. DVs continuous\n' +
        '5. n_g > p (recommended n_g >= 20 + p)\n' +
        '6. No severe multivariate outliers',
      formulasTitle: 'Core formulas',
      formulaH: 'H = sum_g n_g * (Y_g - Y)^T (Y_g - Y)',
      formulaE: 'E = sum_g sum_i (Y_gi - Y_g)^T (Y_gi - Y_g)',
      formulaWilks: "Wilks' Lambda = det(E) / det(E + H)",
      formulaPillai: "Pillai's V = trace((E+H)^-1 H)",
      formulaHL: 'Hotelling-Lawley T = trace(E^-1 H)',
      formulaRoy: "Roy = max lambda_i",
      formulaBoxM: "Box's M with chi-sq approximation",
      readingTitle: 'How to read',
      reading:
        "1. Check Box's M first.\n" +
        '2. Compare four multivariate tests; prefer Pillai if disagree.\n' +
        '3. Inspect partial eta-sq.\n' +
        '4. Significant -> follow-up univariate ANOVAs with Bonferroni.\n' +
        "5. Roy's largest root is an upper bound.",
    },
    apa: {
      sentence:
        'A one-way MANOVA was conducted to examine the effect of {factor} (k = {k} groups) on the multivariate vector of {dvList} ({p} DVs; N = {n}). ' +
        "The multivariate main effect was significant, Wilks' Lambda = {lambda}, F({wDf1}, {wDf2}) = {wF}, p = {wPstr}, partial eta-sq = {wEta2}." +
        '{pillaiSection}{boxSection}',
      sentenceNs:
        'A one-way MANOVA was conducted to examine the effect of {factor} (k = {k} groups) on the multivariate vector of {dvList} ({p} DVs; N = {n}). ' +
        "The multivariate main effect was not significant, Wilks' Lambda = {lambda}, F({wDf1}, {wDf2}) = {wF}, p = {wPstr}, partial eta-sq = {wEta2}." +
        '{pillaiSection}{boxSection}',
      pillaiLine:
        " Pillai's V was also reported: V = {v}, F({df1}, {df2}) = {f}, p = {pStr}, partial eta-sq = {eta2}.",
      boxOk:
        " Box's M test, chi-sq({df}) = {chi2}, p = {pStr}, did not violate the covariance-homogeneity assumption.",
      boxBad:
        " Box's M test, chi-sq({df}) = {chi2}, p = {pStr}, violated the covariance-homogeneity assumption, so Pillai's V is treated as the primary statistic.",
      boxNotApplicable: " Box's M was not computable (insufficient sample or singular matrix).",
      copyHint: 'Copy APA narrative to clipboard',
    },
  },
  kappa: {
    title: "Cohen's Kappa (inter-rater agreement)",
    weightings: {
      none: 'Unweighted',
      linear: 'Linear',
      quadratic: 'Quadratic',
    },
    weightingHint: {
      none: "Only exact matches count; categories treated as unordered (standard Cohen's κ)",
      linear: 'Penalty grows linearly with |i − j|/(k − 1); use for ordered categories',
      quadratic: 'Penalty grows with ((i − j)/(k − 1))²; close to ICC, use for ordered categories',
    },
    config: {
      rater1Var: 'Rater 1 (variable)',
      rater2Var: 'Rater 2 (variable)',
      pickRater1: 'Pick the categorical variable for rater 1',
      pickRater2: 'Pick the categorical variable for rater 2',
      raterHint: 'Must be categorical; only the intersection of levels is used',
      weightingLabel: 'Weighting',
    },
    result: {
      tableTitle: 'k×k Agreement table',
      tableHint: 'Diagonal (highlighted) = matching judgements; k = {k}',
      statsTitle: 'κ test statistics',
      variantsTitle: 'Three weighting variants',
      variantsHint: '★ marks the current selection; linear / quadratic only apply when categories are ordered',
      cols: {
        rater1Backslash2: 'Rater 1 \\ 2',
        total: 'Total',
        po: 'Po',
        pe: 'Pe',
        kappa: 'κ',
        se: 'SE',
        ci95: '95% CI',
        z: 'z',
        p: 'p',
        weighting: 'Weighting',
        interp: 'Interpretation',
      },
    },
    errors: {
      pickRater1: 'Pick a categorical variable for rater 1',
      pickRater2: 'Pick a categorical variable for rater 2',
      sameVar: 'Rater 1 and rater 2 must be different variables',
      needTwoLevels: 'Fewer than 2 common levels — κ cannot be computed',
      noData: 'No paired observations available',
      undefinedKappa: 'Marginal distribution is fully skewed (1 − Pe = 0); κ is mathematically undefined. Inspect the data distribution.',
    },
    interp: {
      header: 'Interpretation',
      sigYes: 'significant',
      sigNo: 'not significant',
      levels: {
        poor: 'poor (< 0)',
        slight: 'slight (0.0–0.2)',
        fair: 'fair (0.2–0.4)',
        moderate: 'moderate (0.4–0.6)',
        substantial: 'substantial (0.6–0.8)',
        almostPerfect: 'almost perfect (0.8–1.0)',
        undefined: 'undefined',
      },
      overall:
        'Across N = {n} paired ratings on k = {k} common categories, ' +
        'observed agreement Po = {po}, chance agreement Pe = {pe}; ' +
        '{weighting} κ = {kappa} (95% CI [{ciLow}, {ciHigh}]).\n' +
        'z = {z}, p = {pStr} → {sigWord}.\n' +
        'Per Landis & Koch (1977), this is {level}.',
    },
    notes: {
      q1: 'When to use?',
      a1:
        "Use Cohen's κ when two raters classify the same set of cases into the same category system, and you want to know how much they agree.\n" +
        'Typical settings: qualitative coding reliability, diagnostic agreement, human-annotation quality checks, double-blind review concordance.',
      q2: 'Assumptions',
      a2:
        '1. Each case is rated independently by the two raters using the same category system\n' +
        '2. The two raters share the same set of categories — the tool intersects the levels automatically\n' +
        '3. Observations are independent of each other\n' +
        '4. Weighted κ (linear / quadratic) requires ordered categories (e.g. severity 1/2/3); use unweighted for nominal categories.',
      q3: 'Formulas',
      a3:
        'Po = Σ diagonal / N\n' +
        'Pe = Σᵢ (rowᵢ/N)(colᵢ/N)\n' +
        'κ  = (Po − Pe) / (1 − Pe)\n' +
        'Weighted κ: Po_w and Pe_w via a weight matrix w_{ij}\n' +
        '  linear:     w_{ij} = 1 − |i−j|/(k−1)\n' +
        '  quadratic:  w_{ij} = 1 − ((i−j)/(k−1))²\n' +
        'Variance under H₀: Var(κ) = Pe / (N(1 − Pe)); z = κ / √Var\n' +
        '95% CI uses asymptotic SE: Var = Po(1 − Po) / (N(1 − Pe)²)',
      q4: 'How to read',
      a4:
        '1. Inspect κ. Landis & Koch (1977): < 0 poor, 0.0–0.2 slight, 0.2–0.4 fair, 0.4–0.6 moderate, 0.6–0.8 substantial, 0.8–1.0 almost perfect\n' +
        '2. Look at the 95% CI: if the lower bound already reaches "moderate", reliability is fairly safe\n' +
        '3. The p-value tests κ ≠ 0; but a significant tiny κ is still poor agreement — focus on the magnitude\n' +
        '4. With highly imbalanced marginals (the kappa paradox) κ can be deflated; report Po and inspect the confusion table.',
    },
    narrative: {
      copyHint: 'Copy APA narrative',
      overall:
        "Cohen's Kappa ({weighting}) was used to assess agreement between two raters across k = {k} common categories. " +
        'Out of N = {n} paired ratings, observed agreement was Po = {po} and chance agreement Pe = {pe}, ' +
        'yielding κ = {kappa} (95% CI [{ciLow}, {ciHigh}]), z = {z}, p = {pStr}. ' +
        'Per Landis & Koch (1977), this corresponds to "{level}" agreement.',
    },
  },
  hierReg: {
    title: 'Hierarchical regression',
    config: {
      yLabel: 'Dependent (Y)',
      pickY: 'Pick a dependent variable',
      blocksLabel: 'Predictor blocks (entry order)',
      hint: 'Each block cumulatively adds to all earlier blocks. Typical: block 1 = controls, block 2+ = focal predictors.',
      addBlock: '+ Add block',
      removeBlock: '− Remove last',
      blockTitle: 'Block {n}',
      varsUnit: 'var(s)',
      pickYFirst: 'Pick Y first',
      noMoreVars: 'No remaining numeric variables (used by earlier blocks)',
    },
    result: {
      stepTitle: 'Step summary (cumulative model after each block is entered)',
      coefTitle: 'Final-step coefficients (all blocks entered)',
      nNote: 'All steps use the same N = {n} (listwise deletion across Y and all predictors).',
      cols: {
        step: 'Step', added: 'Added this step', r2: 'R²', adjR2: 'Adj. R²',
        f: 'F', df: 'df₁, df₂', p: 'p',
        deltaR2: 'ΔR²', deltaF: 'ΔF', deltaDf: 'Δdf₁, Δdf₂', deltaP: 'Δp',
        predictor: 'Predictor', b: 'b', se: 'SE', beta: 'β', t: 't', vif: 'VIF',
        intercept: 'Intercept',
      },
    },
    errors: {
      pickY: 'Pick a dependent variable',
      needBlock: 'At least 1 block is required',
      emptyBlock: 'Each block needs at least 1 predictor',
      dupPredictor: 'A predictor cannot appear in more than one block',
      yInX: 'The dependent variable cannot also be a predictor',
      tooFewN: 'Not enough valid cases (need n > number of predictors + 1)',
      'singular-matrix': "Predictors are too collinear to estimate (X'X is singular)",
      'length-mismatch': 'Data length mismatch',
      'need->=1-predictor': 'At least 1 predictor required',
      'need-n>k+1': 'Sample size must exceed number of predictors + 1',
    },
    interp: {
      header: 'Reading',
      sigYes: 'significant',
      sigNo: 'not significant',
      overall:
        'A {k}-step hierarchical regression was run (N = {n}). The final model was F({df1}, {df2}) = {fFinal}, p = {pFinal}, ' +
        'R² = {r2Final}, adjusted R² = {adjR2Final}.',
      deltaSection: 'Step-by-step contribution:',
      singleStepNote: 'Only one step, so no ΔR² is available.',
      firstStepLine:
        'Step 1 ({vars}): baseline model, R² = {r2}, F({df1}, {df2}) = {f}, p = {pStr}',
      stepLine:
        'Step {step} (added {vars}): ΔR² = {deltaR2}, ΔF({df1}, {df2}) = {deltaF}, p = {pStr} → {sigWord}',
      sigSummary: 'Steps that significantly improved fit (Δp < .05): step {steps}.',
    },
    notes: {
      purposeTitle: 'Purpose',
      purpose:
        'Enter predictors into the regression in theory-driven blocks and test whether each new block adds significantly to the explanation of Y after controlling for prior blocks.\nCommon uses:\n1. Block 1 = demographic controls, block 2 = focal/theoretical predictors — does theory still matter after controls?\n2. Comparing the incremental validity of competing theoretical sets.',
      assumpTitle: 'Assumptions',
      assumptions:
        'Same as ordinary OLS multiple regression:\n' +
        '1. Linear relationship between Y and Xs\n' +
        '2. Independent observations\n' +
        '3. Residuals normally distributed and homoscedastic\n' +
        '4. No severe multicollinearity\n' +
        'Additional notes:\n' +
        '5. Block entry order must be theory-driven, not data-driven (avoid stepwise pitfalls)\n' +
        '6. All steps must share the same sample (this tool enforces listwise deletion across all predictors)',
      formulasTitle: 'Core formulas',
      formulaDeltaR2: 'ΔR²_k = R²_k − R²_{k−1}',
      formulaDeltaF: 'ΔF = (ΔR²_k / dfNum) / ((1 − R²_k) / dfDen)',
      formulaDf: 'dfNum = predictors added at step k; dfDen = N − (cumulative predictors) − 1',
      readingTitle: 'How to read it',
      reading:
        '1. Look at R² / Adj. R² across steps — how does explained variance grow?\n' +
        '2. Look at ΔR² and Δp — does the new block contribute significantly after the prior blocks? This is the core question of hierarchical regression.\n' +
        '3. Look at the final coefficients — which individual predictors remain significant once all blocks are in?\n' +
        '4. Note: individual βs shift across steps — that is exactly how hierarchical regression visualizes "controlling for".\n\n' +
        'Common pitfalls:\n' +
        '- Letting data choose entry order → it should be theory-driven\n' +
        '- Different N at different steps → this tool enforces a common sample\n' +
        "- Reporting only the final R² → readers cannot see each block's unique contribution",
    },
    narrative: {
      sigYes: 'significant',
      sigNo: 'not significant',
      copyHint: 'Copy APA narrative',
      opener:
        'A hierarchical regression with {k} block(s) (N = {n}) was conducted to examine the incremental contribution of each predictor set to {yLabel}.',
      step1:
        'Step 1 entered {vars}; the model yielded R² = {r2} (adjusted R² = {adjR2}), F({df1}, {df2}) = {f}, p = {pStr}.',
      stepK:
        'Step {step} added {vars}, with ΔR² = {deltaR2}, ΔF({df1}, {df2}) = {deltaF}, p = {deltaP} ({sigWord}); cumulative R² = {r2} (adjusted R² = {adjR2}).',
    },
  },
  zProp: {
    title: 'z-test for proportions',
    types: {
      one: 'One-sample (vs. p₀)',
      two: 'Two-sample comparison',
    },
    typeHint: {
      one: 'Test whether the proportion of a level equals a specified p₀',
      two: 'Test whether two independent groups have the same proportion on an event',
    },
    config: {
      typeLabel: 'Test type',
      var1: 'Categorical variable',
      pickVar: 'Pick a categorical variable',
      varHint: 'Must be a categorical variable',
      successLevel: 'Success level',
      pickSuccess: 'Pick the level for which to compute the proportion',
      p0: 'Hypothesized p₀',
      p0Hint: 'Between 0 and 1, e.g. 0.5 for "no preference"',
      groupVar: 'Grouping variable',
      pickGroup: 'Pick a grouping variable (two groups)',
      groupHint: 'Only the first two groups are analyzed',
      valueVar: 'Event variable',
      pickValueVar: 'Pick the event variable',
      valueHint: '"Success" level within the event variable',
    },
    result: {
      summaryTitle: 'Descriptives',
      statsTitle: 'Test statistics',
      cols: {
        success: 'Success', n: 'n', x: 'x', phat: 'p̂', p0: 'p₀', ci95: '95% CI',
        z: 'z', p: 'p', group: 'Group', diff: 'p̂₁ − p̂₂', diffCi95: 'Diff 95% CI',
        h: "Cohen's h", effect: 'Effect',
      },
      effectInterp: {
        trivial: 'trivial', small: 'small', medium: 'medium', large: 'large',
      },
    },
    errors: {
      pickVar: 'Pick a categorical variable',
      pickSuccess: 'Pick a success level',
      pickGroup: 'Pick a grouping variable',
      pickValueVar: 'Pick an event variable',
      sameVar: 'Group and event variables must differ',
      badP0: 'p₀ must be between 0 and 1',
      tooFewN: 'Sample too small (n < 5)',
      needTwoGroups: 'Group variable needs two valid levels',
      tooManyGroups: 'Group variable has more than two levels — use Chi-square instead',
    },
    interp: {
      header: 'Interpretation',
      sigYes: 'significant',
      sigNo: 'not significant',
      oneOverall:
        'In N = {n} observations, "{success}" occurred {x} times (p̂ = {phat}). ' +
        'Compared with p₀ = {p0}, z = {z}, p = {pStr} → {sigWord}.',
      twoOverall:
        'Proportion of "{success}": {g1} = {p1}, {g2} = {p2}; difference = {diff}.\n' +
        'z = {z}, p = {pStr} → {sigWord}.\n' +
        "Cohen's h = {h}, indicating a {effect} effect.",
    },
    notes: {
      q1: 'When to use?',
      a1:
        'Two scenarios:\n' +
        '1. One-sample: test whether a proportion equals a target (e.g. is "agree" rate above 50%)\n' +
        '2. Two-sample: test whether two groups have the same proportion (e.g. support rate by gender)',
      q2: 'Assumptions',
      a2:
        '1. Independent observations\n' +
        '2. Large enough sample (np ≥ 5 and n(1−p) ≥ 5 per group)\n' +
        '3. Simple random sampling\n' +
        'If sample is small or expected counts low, use Fisher\'s exact test instead.',
      q3: 'Formulas',
      a3:
        'One-sample: z = (p̂ − p₀) / √(p₀(1−p₀)/n)\n' +
        'Two-sample: z = (p̂₁ − p̂₂) / √(p̄(1−p̄)(1/n₁ + 1/n₂)), p̄ = (x₁+x₂)/(n₁+n₂)\n' +
        "Effect size Cohen's h = 2(arcsin√p̂₁ − arcsin√p̂₂); |h| 0.2/0.5/0.8 = small/medium/large",
      q4: 'How to read',
      a4:
        '1. Compare p with .05 to decide on H₀\n' +
        '2. Use Cohen\'s h (or 95% CI of difference) to gauge practical significance\n' +
        '3. CI not containing 0 (two-sample) or p₀ (one-sample) ⇔ p < .05',
    },
    narrative: {
      copyHint: 'Copy APA narrative',
      one:
        'A one-sample proportion z-test was conducted to compare the observed proportion of "{success}" ' +
        'with p₀ = {p0}. Out of N = {n} observations, {x} were successes (p̂ = {phat}, ' +
        '95% CI [{ciLow}, {ciHigh}]). The test yielded z = {z}, p = {pStr}.',
      two:
        'A two-sample proportion z-test was conducted to compare "{g1}" (n₁ = {n1}, p̂₁ = {p1}) ' +
        'and "{g2}" (n₂ = {n2}, p̂₂ = {p2}) on the proportion of "{success}". ' +
        'The difference was {diff} (95% CI [{diffCiLow}, {diffCiHigh}]), z = {z}, p = {pStr}, ' +
        "Cohen's h = {h}.",
    },
  },
  chiSq: {
    title: 'Chi-square test',
    types: {
      independence: 'Test of independence',
      gof: 'Goodness-of-fit',
    },
    typeHint: {
      independence: 'Are two categorical variables independent? (contingency-table analysis)',
      gof: 'Do observed counts of a categorical variable match a theoretical distribution?',
    },
    config: {
      typeLabel: 'Test type',
      rowVar: 'Row variable',
      colVar: 'Column variable',
      gofVar: 'Categorical variable',
      pickRow: 'Pick a row variable',
      pickCol: 'Pick a column variable',
      pickGof: 'Pick a categorical variable',
      bothCategorical: 'Both variables must be categorical',
      varNeedCategorical: 'Must be a categorical variable',
      sameVar: 'Row and column cannot be the same variable',
      expectedProps: 'Expected proportions',
      expectedHint:
        'Default uniform (1/k); enter probabilities that sum to 1 (will be auto-normalized otherwise)',
    },
    result: {
      contingencyTitle: 'Contingency table (observed)',
      expectedTitle: 'Expected counts',
      stdResidualsTitle: 'Standardized residuals',
      statsTitle: 'Test statistics',
      assumpTitle: 'Assumptions',
      assumpExpected: 'Expected counts ≥ 5 ({ok}/{total} cells)',
      assumpExpectedDetail:
        "Cochran's rule: ≥ 80% cells should have expected count ≥ 5; minimum expected = {min}",
      assumpViolatedHint:
        'If violated, consider merging adjacent categories, switching to Fisher exact (2×2 mostly), or larger sample.',
      cols: {
        chi2: 'χ²', df: 'df', p: 'p', n: 'n', cramerV: "Cramer's V",
        category: 'Category', observed: 'Observed O', expected: 'Expected E', residual: 'Std. residual z',
      },
      total: 'Total',
      cramerHint: '|z| ≥ 1.96 corresponds to cell-level two-tailed p < .05',
      yatesRow: 'Yates correction',
      yatesNote: 'For 2×2 tables, Yates continuity correction is reported (matches SPSS default output); the uncorrected χ² is shown for comparison.',
      fisherSuggest: 'This is a 2×2 table with at least one expected count < 5 — consider Fisher exact test (small-sample exact test).',
      effectInterp: {
        trivial: 'trivial',
        small: 'small',
        medium: 'medium',
        large: 'large',
      },
    },
    notes: {
      purposeTitle: 'Purpose',
      purposeIndep:
        'Test whether two categorical variables are independent (unrelated).\nExample: Is gender related to preferred class format?\nH₀: independent / H₁: associated',
      purposeGof:
        'Test whether observed counts of a categorical variable match a theoretical distribution.\nExample: After 600 dice rolls, do face counts match a uniform 1/6?\nH₀: observed = expected / H₁: deviates',
      assumpTitle: 'Assumptions',
      assumptions:
        '1. Independent observations\n' +
        '2. Simple random sample\n' +
        "3. Expected counts ≥ 5 in at least 80% of cells (Cochran's rule)\n" +
        '4. Variables are categorical (not continuous)',
      formulasTitle: 'Core formulas',
      formulaChi2: 'χ² = Σ ((O − E)² / E)',
      formulaIndepE:
        'Independence: E_ij = (row_i total × col_j total) / N, df = (r − 1)(c − 1)',
      formulaGofE: 'Goodness-of-fit: E_i = N · p_i, df = k − 1',
      formulaCramer: "Cramer's V = √(χ² / (N · min(r − 1, c − 1)))",
      formulaResid: 'Standardized residual z_ij = (O_ij − E_ij) / √E_ij',
      readingTitle: 'How to read it',
      reading:
        '1. Look at the overall χ² p-value — are the variables related?\n' +
        "2. Look at Cramer's V — strength of association (< 0.1 trivial, < 0.3 weak, < 0.5 moderate, ≥ 0.5 strong)\n" +
        '3. Look at standardized residuals — which cells deviate most? |z| ≥ 1.96 → cell p < .05\n' +
        '4. Too many cells with expected < 5 (> 20%) → results unreliable; consider merging categories or using Fisher exact (mostly 2×2).',
    },
    apa: {
      indepSig:
        "A chi-square test of independence revealed a significant association between {rowVar} and {colVar}, χ²({df}, N = {n}) = {chi2}, p = {pStr}, Cramer's V = {v} ({effect} effect).",
      indepNs:
        '{rowVar} and {colVar} were not significantly associated in a chi-square test of independence, χ²({df}, N = {n}) = {chi2}, p = {pStr}.',
      gofSig:
        'A chi-square goodness-of-fit test revealed that the observed distribution of {var} differed {sig} from the expected distribution, χ²({df}, N = {n}) = {chi2}, p = {pStr}.',
      gofNs:
        'The observed distribution of {var} did not differ significantly from the expected distribution, χ²({df}, N = {n}) = {chi2}, p = {pStr}.',
      sigYes: 'significantly',
      sigNo: 'not significantly',
      sigYesDiff: 'significantly',
      copyHint: 'Copy APA narrative',
      yatesAppendix:
        'With Yates continuity correction for the 2×2 table: χ²({df}, N = {n}) = {chi2Yates}, p = {pYatesStr}.',
    },
    interp: {
      header: 'Reading',
      indepOverall:
        'Overall χ²({df}, N = {n}) = {chi2}, p = {pStr} → {sigWord}.' +
        "\nCramer's V = {v}, indicating a {effect} effect.",
      gofOverall:
        'Overall χ²({df}, N = {n}) = {chi2}, p = {pStr} → {sigWord}.',
      residSection: 'Cells with |z| ≥ 1.96 (notable deviation):',
      residLine: '{cellLabel}: z = {z}{flag}',
      flagHigh: ' notable',
      sigYes: 'significant',
      sigNo: 'not significant',
    },
  },
  logReg: {
    title: 'Logistic regression',
    config: {
      yLabel: 'Dependent (binary)',
      xLabel: 'Predictors (multi-select)',
      pickY: 'Pick a binary dependent variable',
      pickXs: 'Pick at least 1 predictor',
      yNeedBinary: 'This variable has {k} levels; logistic regression needs exactly 2 (binary)',
      positiveClass: 'Positive class (will be coded as 1)',
      hint: 'Y must be binary; X must be continuous or ordinal',
    },
    result: {
      modelTitle: 'Model summary',
      omnibusTitle: 'Omnibus model test',
      coefTitle: 'Coefficients (with OR and 95% CI)',
      classTitle: 'Classification table (threshold = 0.5)',
      rocTitle: 'ROC curve',
      converged: 'Converged ({n} iterations)',
      notConverged: 'Not converged! Results may be unreliable',
      cols: {
        n: 'n', k: 'k predictors',
        llNull: 'LL₀ (null)',
        ll: 'LL (full)',
        lrChi2: 'LR χ²',
        df: 'df',
        p: 'p',
        mcFadden: 'McFadden R²',
        nagelkerke: 'Nagelkerke R²',
        predictor: 'Predictor',
        b: 'b',
        se: 'SE',
        z: 'Wald z',
        or: 'OR',
        orCI: '95% CI for OR',
        intercept: 'Intercept',
        actual: 'Actual',
        predicted: 'Predicted',
        positive: 'Positive (1)',
        negative: 'Negative (0)',
        correctPercent: 'Correct %',
        auc: 'AUC',
        sensitivity: 'Sensitivity',
        specificity: 'Specificity',
      },
      aucInterp: {
        excellent: 'excellent', good: 'good', fair: 'fair', poor: 'poor',
      },
    },
    notes: {
      purposeTitle: 'Purpose',
      purpose:
        'Predict a binary outcome (yes/no, sick/healthy, churn/retain) from a set of predictors. Answers:\n' +
        '(1) Does the overall model predict significantly? (LR test)\n' +
        '(2) Does each predictor contribute independently after controlling for others? (Wald z)\n' +
        '(3) Odds ratio OR: by how many times do the odds change for a 1-unit increase in X?\n' +
        '(4) Classification performance: accuracy, ROC AUC',
      assumpTitle: 'Assumptions',
      assumptions:
        '1. Binary dependent variable (exactly 2 categories)\n' +
        '2. Independent observations\n' +
        '3. logit(p) is linear in the predictors\n' +
        '4. No severe multicollinearity\n' +
        '5. Sample: at least 10 positive and 10 negative events per predictor (rule of 10)',
      formulasTitle: 'Core formulas',
      formulaLogit: 'logit(p) = ln(p / (1 − p)) = β₀ + β₁X₁ + ... + βₖXₖ',
      formulaSigmoid: 'p = sigmoid(η) = 1 / (1 + exp(−η))',
      formulaOR: 'OR_i = exp(β_i) (multiplicative change in odds for unit increase in X_i)',
      formulaWald: 'Wald z = β / SE(β), p = 2(1 − Φ(|z|))',
      formulaLR: 'LR χ² = −2(LL_null − LL_full), df = k; p from right tail of χ²(df)',
      formulaNagelkerke:
        'Cox-Snell R² = 1 − exp(2/n · (LL_null − LL_full))\n' +
        'Nagelkerke R² = Cox-Snell / (1 − exp(2/n · LL_null)) (rescaled to [0, 1])',
      readingTitle: 'How to read it',
      reading:
        '1. Look at LR test p — is the overall model significant?\n' +
        '2. Look at Nagelkerke R² — model explanatory power (0.2 reasonable, 0.4 good, > 0.5 strong)\n' +
        '3. Look at each OR with 95% CI — if CI does not span 1, that predictor is significant\n' +
        '4. Look at AUC — < 0.6 poor, 0.6-0.7 fair, 0.7-0.8 good, ≥ 0.8 excellent\n' +
        '5. Look at the classification table — accuracy, plus sensitivity/specificity if classes are imbalanced\n\n' +
        'OR interpretation:\n' +
        '- OR = 2 → odds double for a 1-unit increase in X\n' +
        '- OR = 0.5 → odds halve for a 1-unit increase\n' +
        '- OR = 1 → no effect',
    },
    apa: {
      sentence:
        'A logistic regression with {predictors} as predictors of {yLabel} (positive class = {posClass}) was {sigWord} overall, χ²({df}, N = {n}) = {chi2}, p = {pStr}, Nagelkerke R² = {nagelkerke}. {coefList}Model AUC = {auc}; classification accuracy = {correctPct}%.',
      sentenceNs:
        'A logistic regression with {predictors} did not significantly predict {yLabel}, χ²({df}, N = {n}) = {chi2}, p = {pStr}, Nagelkerke R² = {nagelkerke}.',
      coefSig:
        '{name} (OR = {or}, 95% CI = [{ciLow}, {ciHigh}], z = {z}, p = {pStr})',
      coefOpener: 'Among the predictors, ',
      copyHint: 'Copy APA narrative',
    },
    interp: {
      header: 'Reading',
      overall:
        'Overall LR χ²({df}) = {chi2}, p = {pStr} → {sigWord}.' +
        '\nNagelkerke R² = {nagelkerke} ({strengthWord} fit), AUC = {auc} ({aucWord}), accuracy = {correctPct}%.',
      coefSection: 'Predictor odds ratios:',
      coefLine: '{name}: OR = {or} (CI = [{ciLow}, {ciHigh}]), p = {pStr} → {sigWord}',
      sigYes: 'significant',
      sigNo: 'not significant',
      strengthWeak: 'weak',
      strengthFair: 'moderate',
      strengthStrong: 'strong',
    },
  },
  multReg: {
    title: 'Multiple linear regression',
    config: {
      yLabel: 'Dependent (Y)',
      xLabel: 'Predictors (multi-select)',
      pickY: 'Pick a dependent variable',
      pickXs: 'Pick at least 1 predictor',
      hint: 'Tick numeric variables as predictors; cannot include Y',
    },
    result: {
      modelTitle: 'Model summary',
      anovaTitle: 'ANOVA (omnibus F-test)',
      coefTitle: 'Coefficients',
      assumpTitle: 'Residual normality',
      cols: {
        r: 'R', r2: 'R²', adjR2: 'Adj. R²', se: 'SE estimate', n: 'n',
        source: 'Source', ss: 'SS', df: 'df', ms: 'MS', f: 'F', p: 'p',
        regression: 'Regression', residual: 'Residual', total: 'Total',
        predictor: 'Predictor', b: 'b', stdErr: 'SE', beta: 'β', t: 't', vif: 'VIF',
        intercept: 'Intercept',
      },
      vifWarn:
        'Note: predictors with VIF > 5 indicate multicollinearity (VIF > 10 considered severe). Consider: dropping highly correlated variables, summing into a composite, or principal-component regression.',
    },
    notes: {
      purposeTitle: 'Purpose',
      purpose:
        'Predict a continuous Y from multiple continuous predictors jointly. Answers:\n(1) Does the overall model significantly predict Y? (F-test)\n(2) After controlling for other variables, does each predictor independently contribute? (per-coefficient t-test)\n(3) How much variance in Y does the model explain? (R² and Adj. R²)\n(4) Which predictor has the largest relative effect? (standardized β)',
      assumpTitle: 'Assumptions',
      assumptions:
        '1. Linear relationship between Y and Xs\n' +
        '2. Independent observations\n' +
        '3. Normally distributed residuals (Shapiro-Wilk auto-checked)\n' +
        '4. Homoscedasticity\n' +
        '5. No severe multicollinearity (VIF auto-computed; warn at > 5)\n' +
        '6. Adequate sample size: n ≥ 10–20 × number of predictors',
      formulasTitle: 'Core formulas',
      formulaBeta: "β = (X'X)⁻¹ X'y",
      formulaSE: "SE(β) = √( MSE · diag((X'X)⁻¹) )",
      formulaF: 'F = (R² / k) / ((1 − R²) / (n − k − 1)), df₁ = k, df₂ = n − k − 1',
      formulaAdjR2: 'Adj. R² = 1 − (1 − R²) · (n − 1) / (n − k − 1)',
      formulaStdBeta: 'Standardized β_i = b_i · SD(X_i) / SD(Y)',
      formulaVIF: 'VIF_i = 1 / (1 − R²_i), where R²_i is from regressing X_i on other predictors',
      readingTitle: 'How to read it',
      reading:
        '1. Look at the omnibus F-test — does the model predict significantly overall?\n' +
        '2. Look at R² and Adj. R² — how much variance is explained? (Report Adj. R² for multiple regression)\n' +
        '3. Look at individual p-values — which predictors remain significant after controlling for others?\n' +
        '4. Compare |standardized β| — which predictor has the largest relative effect?\n' +
        '5. Look at VIF — any multicollinearity? (warn at > 5, severe at > 10)\n' +
        '6. Check residual normality — inferential assumption met?\n\n' +
        'Common pitfalls:\n' +
        '- All individual ts non-significant but overall F significant → multicollinearity\n' +
        '- High R² but no significant coefficients → same as above\n' +
        '- Adding more predictors always raises R² → compare with Adj. R² instead',
    },
    apa: {
      sentence:
        '{predictors} jointly predicted {yLabel} {sigWord} in a multiple linear regression, F({df1}, {df2}) = {f}, p = {pStr}, R² = {r2}, adjusted R² = {adjR2}. {coefList}',
      sentenceNs:
        '{predictors} did not significantly predict {yLabel} in a multiple linear regression, F({df1}, {df2}) = {f}, p = {pStr}, R² = {r2}, adjusted R² = {adjR2}.',
      coefSig:
        '{name} (b = {b}, SE = {se}, β = {beta}, t = {t}, p = {pStr})',
      coefOpener: 'Among the predictors, ',
      copyHint: 'Copy APA narrative',
    },
    interp: {
      header: 'Reading',
      overall:
        'Omnibus model F({df1}, {df2}) = {f}, p = {pStr} → {sigWord}.' +
        ' R² = {r2} (explains {r2Pct}% of variance), Adj. R² = {adjR2}.',
      coefSection: 'Individual predictors:',
      coefLine:
        '{name}: b = {b} (SE = {se}, β = {beta}, t = {t}, p = {pStr}) → {sigWord}',
      vifSection: 'VIF check:',
      vifLine: '{name}: VIF = {vif} {warn}',
      vifWarnHigh: '⚠ warn',
      vifWarnSevere: '⚠ severe',
      sigYes: 'significantly',
      sigNo: 'not significantly',
    },
  },
  history: {
    title: 'Analysis history',
    saveCurrent: 'Pin current analysis to history',
    saveCurrentHint: 'Save the dataset, analysis, variable selection, mode and language together for later comparison',
    needSetup: 'Load a dataset and pick an analysis first',
    empty: 'No history yet',
    listTitle: 'Pinned snapshots (newest first)',
    restoreBtn: 'Restore',
    removeBtn: 'Remove',
    clearAllBtn: 'Clear all',
    clearConfirm: 'Clear all history?',
    timeAgo: {
      seconds: '{n}s ago',
      minutes: '{n}m ago',
      hours: '{n}h ago',
      days: '{n}d ago',
    },
  },
  transform: {
    title: 'Variable transformation',
    sourceLabel: 'Source variable',
    typeLabel: 'Transform type',
    nameLabel: 'New column name',
    nameHint: 'Letters, digits, underscore only; keep the default prefix for easy identification',
    nameInvalid: 'Letters/digits/underscore only; must not collide with existing columns',
    types: {
      log: 'Natural log ln(x)',
      log10: 'Log base 10 log₁₀(x)',
      zscore: 'Z-score standardization',
      recode_reverse: 'Reverse-code Likert',
    },
    typeHint: {
      log: 'x ≤ 0 becomes missing',
      log10: 'x ≤ 0 becomes missing',
      zscore: '(x − M) / SD using full-column M and SD over non-missing values',
      recode_reverse: 'new = max + min − x; typical for restoring reverse-coded items',
    },
    rangeMin: 'Min',
    rangeMax: 'Max',
    pickSource: 'Pick a source variable',
    addBtn: 'Add',
    removeBtn: 'Remove',
    closeBtn: 'Close',
  },
  modes: {
    teaching: 'Teaching mode',
    report: 'Report mode',
  },
  datasets: {
    none: 'No data loaded',
    employee: 'Employee satisfaction survey',
    intervention: 'Teaching intervention experiment',
    multigroup: 'Multi-group comparison study',
    categorical: 'Categorical survey data',
    employeeDesc: 'Likert + department + tenure — for correlation, regression, α',
    interventionDesc: 'Treatment/control + pre/post — for t-test',
    multigroupDesc: 'Three or more groups — for ANOVA',
    categoricalDesc: 'Cross-tab of categorical vars — for chi-square',
  },
  common: {
    comingSoon: 'Coming soon',
    placeholder: 'Placeholder content',
    copy: 'Copy',
    copied: 'Copied',
    collapse: 'Collapse',
    expand: 'Expand',
  },
  desc: {
    selectVarsTitle: 'Select variables for analysis',
    selectVarsHint: 'Tick numeric variables below (continuous or ordinal); multiple allowed',
    noVarsSelected: 'Tick at least one variable to start',
    cols: {
      variable: 'Variable',
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
      purposeTitle: 'Purpose',
      purpose:
        "Summarize each variable's central tendency (M, Median), spread (SD, SE, Min, Max), and shape (Skew, Kurt). Always run this first to get to know your data before any inferential analysis.",
      assumptionsTitle: 'Assumptions',
      assumptions: 'None — descriptive statistics involves no inference, so no assumptions to check.',
      formulasTitle: 'Core formulas',
      formulaM: 'M = ΣX / n',
      formulaSD: 'SD = √( Σ(X - M)² / (n - 1) )',
      formulaSE: 'SE = SD / √n',
      formulaSkew:
        'Skew = n / [(n-1)(n-2)] · Σ((X - M) / SD)³ (Fisher–Pearson type 2, matches SPSS)',
      formulaKurt:
        'Kurt = n(n+1) / [(n-1)(n-2)(n-3)] · Σ((X - M) / SD)⁴ - 3(n-1)² / [(n-2)(n-3)] (excess kurtosis)',
      readingTitle: 'How to read it',
      reading:
        'Skewness: >0 right-skewed (tail on right), <0 left-skewed (tail on left), ≈0 symmetric.' +
        ' Rule of thumb: |Skew| < 1 is approximately symmetric.' +
        '\n\nKurtosis: >0 leptokurtic (peaked, heavy-tailed), <0 platykurtic (flat), ≈0 near normal.' +
        ' Rule of thumb: |Kurt| < 1 is close to normal.',
    },
    apa: {
      sentence:
        '{label} (M = {m}, SD = {sd}, N = {n}, range {min}–{max}, Median = {median}), skewness = {skew}, kurtosis = {kurt}.',
      copyHint: 'Copy APA narrative',
    },
    interp: {
      sentence:
        '{label} has {n} valid observations, mean = {m}, SD = {sd}, range {minMaxRange}. Distribution shape: {skewWord}, {kurtWord}.',
      skewLeft: 'left-skewed',
      skewRight: 'right-skewed',
      skewSymmetric: 'approximately symmetric',
      kurtHigh: 'more peaked than normal',
      kurtLow: 'flatter than normal',
      kurtNormal: 'close to normal',
    },
  },
  ttest: {
    types: {
      independent: 'Independent samples',
      paired: 'Paired samples',
      oneSample: 'One sample',
    },
    typeHint: {
      independent: "Welch's correction (does not assume equal variances)",
      paired: 'Two variables on the same subjects (e.g., pre/post test)',
      oneSample: 'Compare to a specified value (μ₀)',
    },
    config: {
      typeLabel: 't-test type',
      depVar: 'Dependent variable',
      groupVar: 'Grouping variable',
      groupVarHint: 'Must be categorical with exactly 2 groups',
      groupVarBadGroups: 'This variable has {k} groups; needs exactly 2',
      var1: 'Variable 1',
      var2: 'Variable 2',
      mu0: 'Test value μ₀',
      pickDep: 'Pick a dependent variable',
      pickGroup: 'Pick a grouping variable',
      pickVar1: 'Pick variable 1',
      pickVar2: 'Pick variable 2',
      enterMu0: 'Enter a test value',
    },
    result: {
      groupStatsTitle: 'Group descriptives',
      groupCol: 'Group',
      ttestTitle: 't-test results',
      pairedDescTitle: 'Paired difference descriptives',
      oneSampleDescTitle: 'Sample descriptives',
      cols: {
        t: 't',
        df: 'df',
        p: 'p',
        meanDiff: 'Mean diff',
        se: 'SE',
        d: "Cohen's d",
        effect: 'Effect',
      },
      assumpTitle: 'Assumption checks',
      normality: 'Shapiro-Wilk normality',
      homogeneity: "Levene's homogeneity",
      assumpOk: 'OK (p ≥ .05)',
      assumpViolated: 'Violated (p < .05)',
      assumpViolationWarn:
        "Note: assumption violation detected. Welch's correction is already applied for independent t-test (robust to unequal variances). " +
        'For severe normality violation with small n (< 30), consider nonparametric alternatives (Mann-Whitney U / Wilcoxon).',
    },
    effectSize: {
      trivial: 'trivial',
      small: 'small',
      medium: 'medium',
      large: 'large',
    },
    notes: {
      purposeTitle: 'Purpose',
      independentPurpose:
        'Compare means of two independent groups (e.g., experimental vs control).',
      pairedPurpose:
        'Compare the same subjects across two time points or conditions (e.g., pre vs post).',
      oneSamplePurpose:
        'Compare a sample mean to a known population value (μ₀).',
      assumpTitle: 'Assumptions',
      independentAssump:
        '1. The two groups are independent\n2. Each population is normally distributed (relaxed by CLT for n ≥ 30)\n3. Equal population variances — if violated, use Welch (default in this tool)',
      pairedAssump: '1. The paired differences are normally distributed\n2. Pairs are independent',
      oneSampleAssump: '1. Sample comes from a normal population\n2. Observations are independent',
      formulasTitle: 'Core formulas',
      formulaIndepT: 't = (M₁ - M₂) / √(s₁²/n₁ + s₂²/n₂)',
      formulaIndepDf:
        'df = (s₁²/n₁ + s₂²/n₂)² / [ (s₁²/n₁)²/(n₁-1) + (s₂²/n₂)²/(n₂-1) ] (Welch–Satterthwaite)',
      formulaPairedT: 't = M_D / (SD_D / √n), where D = X₁ - X₂',
      formulaOneT: 't = (M - μ₀) / (SD / √n)',
      formulaCohenIndep:
        "Cohen's d = (M₁ - M₂) / s_pooled, s_pooled = √[((n₁-1)s₁² + (n₂-1)s₂²) / (n₁+n₂-2)]",
      formulaCohenPaired: "Cohen's d = M_D / SD_D",
      formulaCohenOne: "Cohen's d = (M - μ₀) / SD",
      readingTitle: 'How to read it',
      reading:
        'p < .05: the mean difference is statistically significant (reject H₀).\n\n' +
        "Cohen's d interpretation: |d| < 0.2 trivial, 0.2-0.5 small, 0.5-0.8 medium, > 0.8 large.\n\n" +
        'Statistical significance ≠ practical importance. Larger samples make significance easier to reach but small effects may have no practical meaning. Always interpret p alongside d.',
    },
    apa: {
      independent:
        "An independent samples t-test revealed a {sigWord} difference between {g1Name} (M = {m1}, SD = {sd1}, n = {n1}) and {g2Name} (M = {m2}, SD = {sd2}, n = {n2}), t({df}) = {t}, p = {pStr}, Cohen's d = {d} ({effectWord} effect).",
      paired:
        "A paired samples t-test revealed a {sigWord} difference between {var1Name} (M = {m1}, SD = {sd1}) and {var2Name} (M = {m2}, SD = {sd2}); mean of paired differences = {meanDiff} (SD = {sdDiff}), t({df}) = {t}, p = {pStr}, Cohen's d = {d} ({effectWord} effect).",
      oneSample:
        "A one-sample t-test revealed a {sigWord} difference between the sample mean (M = {m}, SD = {sd}, n = {n}) and the test value μ₀ = {mu0}, t({df}) = {t}, p = {pStr}, Cohen's d = {d} ({effectWord} effect).",
      sigYes: 'significant',
      sigNo: 'non-significant',
      copyHint: 'Copy APA narrative',
    },
    interp: {
      independent:
        'Conclusion: the mean difference between {g1Name} (M = {m1}) and {g2Name} (M = {m2}) is {sigWord} (t = {t}, p = {pStr}). ' +
        "Cohen's d = {d}, indicating a {effectWord} effect. {practical}",
      paired:
        'Conclusion: the paired difference between {var1Name} (M = {m1}) and {var2Name} (M = {m2}) is {sigWord} (t = {t}, p = {pStr}). ' +
        "Cohen's d = {d}, indicating a {effectWord} effect. {practical}",
      oneSample:
        'Conclusion: the difference between the sample mean (M = {m}) and μ₀ = {mu0} is {sigWord} (t = {t}, p = {pStr}). ' +
        "Cohen's d = {d}, indicating a {effectWord} effect. {practical}",
      practicalSig:
        'The difference is statistically meaningful; the effect size informs practical interpretation.',
      practicalNs:
        'Cannot reject the null hypothesis of no difference; this could be a true null, or insufficient power due to small sample.',
    },
  },
  corr: {
    title: 'Correlation matrix',
    methodLabel: 'Correlation method',
    methods: {
      pearson: 'Pearson r',
      spearman: 'Spearman ρ',
    },
    methodHint: {
      pearson: 'Linear correlation; assumes bivariate normality with continuous variables',
      spearman: 'Rank-based monotonic correlation; no normality assumption, ordinal scales OK',
    },
    symbol: {
      pearson: 'r',
      spearman: 'ρ',
    },
    methodLabelInline: {
      pearson: 'Pearson product-moment correlation',
      spearman: 'Spearman rank-order correlation',
    },
    selectVarsTitle: 'Select variables for analysis',
    selectVarsHint:
      'Tick at least 2 numeric variables (continuous or ordinal); all pairs computed',
    needAtLeastTwo: 'Tick at least 2 variables',
    cellHint:
      'Cells show {sym} (with significance stars), p, and n. * p < .05, ** p < .01, *** p < .001.',
    notes: {
      purposeTitle: 'Purpose',
      purposePearson:
        'Describe the direction and strength of linear association between two continuous/ordinal variables.\nPositive r: variables move together.\nNegative r: variables move in opposite directions.\nr ≈ 0: no linear association (non-linear relationship may still exist).',
      purposeSpearman:
        'Describe the direction and strength of monotonic association (need not be linear).\nAlgorithm: rank X and Y separately, then apply Pearson on ranks.\nAdvantages over Pearson: no normality assumption, robust to outliers, works with ordinal scales.',
      assumpTitle: 'Assumptions',
      assumptionsPearson:
        '1. Both variables are continuous (5+ point ordinal scales acceptable)\n2. Bivariate normality (relaxed by CLT for n ≥ 30)\n3. Linear relationship — do not use Pearson r for clearly curved scatterplots\n4. Independent observations\n5. Homoscedasticity — residuals should not vary systematically with X',
      assumptionsSpearman:
        '1. Both variables at least ordinal\n2. Monotonic relationship (need not be linear)\n3. Independent observations\n(No normality, no linearity, robust to outliers)',
      formulasTitle: 'Core formulas',
      formulaR: 'r = Σ((Xi - Mx)(Yi - My)) / √(Σ(Xi - Mx)² · Σ(Yi - My)²)',
      formulaT: 't = r √(n - 2) / √(1 - r²), df = n - 2',
      formulaRho: 'ρ = Pearson(rank(X), rank(Y)) (average ranks for ties)',
      formulaTSpearman: 't = ρ √(n - 2) / √(1 - ρ²), df = n - 2',
      readingTitle: 'How to read it',
      reading:
        '|{sym}| strength (Cohen, 1988): < 0.1 trivial, 0.1-0.3 weak, 0.3-0.5 moderate, > 0.5 strong.\n\n' +
        '{sym}² is the proportion of shared variance (coefficient of determination). E.g., {sym} = 0.5 → {sym}² = 0.25 → 25% of variance explained.\n\n' +
        'Correlation ≠ causation. Even if significant, you cannot infer direction or causality.',
    },
    apa: {
      methodPrefix: 'A {methodInline} was computed.',
      pairLine:
        '{labelA} and {labelB} showed a {strengthWord} {directionWord} correlation ({sym} = {r}, p = {pStr}, n = {n}).',
      noSig: 'No significant correlations were found in this dataset (α = .05).',
      copyHint: 'Copy APA narrative',
      strengthWord: { weak: 'weak', moderate: 'moderate', strong: 'strong' },
      directionWord: { positive: 'positive', negative: 'negative' },
    },
    interp: {
      header: 'Reading',
      pairLine:
        '{labelA} ↔ {labelB}: {sym} = {r} → {strengthWord} {directionWord} correlation, p = {pStr} → {sigWord}',
      noSig: 'No pair was significant at α = .05. Could be a true null, or insufficient power.',
      sigYes: 'significant',
      sigNo: 'not significant',
    },
  },
  simpleReg: {
    title: 'Simple linear regression',
    config: {
      yLabel: 'Dependent (Y)',
      xLabel: 'Predictor (X)',
      pickY: 'Pick a dependent variable',
      pickX: 'Pick a predictor',
      sameVar: 'X and Y cannot be the same variable',
    },
    result: {
      modelTitle: 'Model summary',
      anovaTitle: 'ANOVA',
      coefTitle: 'Coefficients',
      cols: {
        r: 'r', r2: 'R²', adjR2: 'Adj. R²', se: 'SE estimate',
        source: 'Source', ss: 'SS', df: 'df', ms: 'MS', f: 'F', p: 'p',
        regression: 'Regression', residual: 'Residual', total: 'Total',
        predictor: 'Predictor', b: 'b', stdErr: 'SE', beta: 'β', t: 't',
        intercept: 'Intercept', slope: 'Slope',
      },
      assumpTitle: 'Residual normality',
    },
    notes: {
      purposeTitle: 'Purpose',
      purpose:
        'Predict a continuous Y from a single continuous X. Answers:\n(1) Does X significantly predict Y? (F-test / t on b₁)\n(2) How much variance in Y does X explain? (R²)\n(3) For each unit increase in X, how does Y change? (slope b₁)',
      assumpTitle: 'Assumptions',
      assumptions:
        '1. Linearity: X and Y have a linear relationship (check scatterplot)\n2. Independence of observations\n3. Normally distributed residuals (Shapiro-Wilk auto-checked)\n4. Homoscedasticity: residual variance constant across X (Breusch-Pagan to be added in PR-3c.5)',
      formulasTitle: 'Core formulas',
      formulaB1: 'b₁ = Σ((Xi - Mx)(Yi - My)) / Σ(Xi - Mx)²',
      formulaB0: 'b₀ = My - b₁ · Mx',
      formulaR2: 'R² = SS_regression / SS_total = 1 - SS_residual / SS_total',
      formulaAdjR2: 'Adj. R² = 1 - (1 - R²)(n - 1)/(n - k - 1) (k = number of predictors, here k = 1)',
      formulaF: 'F = MS_regression / MS_residual, df₁ = 1, df₂ = n - 2',
      formulaBeta: 'Standardized β = b₁ · SD(X) / SD(Y) (= r in simple regression)',
      readingTitle: 'How to read it',
      reading:
        'Regression equation: Ŷ = b₀ + b₁ · X\n\n' +
        'Reading order:\n' +
        '1. F and its p — is the overall model significant?\n' +
        '2. R² — how much variance in Y is explained? (= r² in simple regression)\n' +
        '3. b₁ direction and magnitude — how does Y change per unit increase in X?\n' +
        '4. Standardized β — for comparing predictor strength across models.',
    },
    apa: {
      sentence:
        '{xLabel} significantly predicted {yLabel} in a simple linear regression, F({df1}, {df2}) = {f}, p = {pStr}, R² = {r2}, adjusted R² = {adjR2}. The regression equation was {yLabel} = {b0} + {b1} × {xLabel} (β = {beta}, t({df2}) = {t}, p = {pStrSlope}).',
      sentenceNs:
        '{xLabel} did not significantly predict {yLabel} in a simple linear regression, F({df1}, {df2}) = {f}, p = {pStr}, R² = {r2}, adjusted R² = {adjR2}.',
      copyHint: 'Copy APA narrative',
    },
    interp: {
      sentence:
        'Conclusion: {xLabel} {sigWord} predicts {yLabel} (F = {f}, p = {pStr}). The model explains {r2Pct}% of the variance (R² = {r2}). ' +
        'Equation: Ŷ = {b0} + {b1} × X — Y changes by {b1} per unit increase in X on average.' +
        ' Standardized coefficient β = {beta}, indicating a {strengthWord} effect.',
      sigYes: 'significantly',
      sigNo: 'does not significantly',
      strengthWeak: 'weak',
      strengthModerate: 'moderate',
      strengthStrong: 'strong',
    },
  },
  anova2: {
    title: 'Two-way ANOVA',
    config: {
      depVar: 'Dependent (continuous or ordinal)',
      factorA: 'Factor A',
      factorB: 'Factor B',
      pickDep: 'Pick a dependent variable',
      pickFactorA: 'Pick factor A',
      pickFactorB: 'Pick factor B',
      sameFactor: 'Factor A and B cannot be the same variable',
      hint: 'Both factors must be categorical with ≥ 2 levels each',
    },
    result: {
      cellMeansTitle: 'Cell means',
      anovaTitle: 'ANOVA table (Type III SS)',
      effectSizeTitle: 'Effect size',
      interactionPlotTitle: 'Interaction plot',
      cols: {
        source: 'Source',
        ss: 'SS',
        df: 'df',
        ms: 'MS',
        f: 'F',
        p: 'p',
        partialEta2: 'Partial η²',
        effectA: 'Main effect A',
        effectB: 'Main effect B',
        effectAB: 'A × B interaction',
        error: 'Error',
        total: 'Total',
        cell: 'Cell',
        marginalRow: 'Marginal A',
        marginalCol: 'Marginal B',
        grandMean: 'Grand mean',
        n: 'n',
        mean: 'M',
        sd: 'SD',
      },
      effectInterp: {
        small: 'small', medium: 'medium', large: 'large',
      },
    },
    notes: {
      purposeTitle: 'Purpose',
      purpose:
        'Examine the effects of two categorical IVs on a continuous DV simultaneously. Answers:\n' +
        '(1) Main effect of A: ignoring B, do A levels differ?\n' +
        '(2) Main effect of B: ignoring A, do B levels differ?\n' +
        "(3) A × B interaction: does A's effect on Y depend on B?\n" +
        'When the interaction is significant, main effects must be interpreted within levels of the other factor (not from the marginal alone).',
      assumpTitle: 'Assumptions',
      assumptions:
        '1. Independent observations\n' +
        '2. Normal distribution within each cell (relaxed for n ≥ 30 per cell)\n' +
        "3. Homogeneity of variances across cells (Levene's to be added later)\n" +
        '4. Correct categorization (no misclassification)\n' +
        '5. Sample: at least 5 per cell recommended',
      formulasTitle: 'Core formulas (Type III SS)',
      formulaSS:
        'For each effect E, fit OLS with effect coding:\n' +
        'SS_E = ESS(full model minus E) − ESS(full model)',
      formulaDf:
        'df_A = nA − 1, df_B = nB − 1, df_AB = (nA − 1)(nB − 1), df_error = N − nA · nB',
      formulaPartialEta2: 'Partial η² = SS_effect / (SS_effect + SS_error)',
      readingTitle: 'How to read it',
      reading:
        'Reading order:\n' +
        '1. Look at the A × B interaction p first — significant?\n' +
        '2. If significant → main effects must be interpreted within levels of the other factor (simple effects analysis), not via marginal means alone\n' +
        '3. If not significant → interpret main effects directly\n' +
        '4. Partial η²: < 0.06 small, 0.06-0.14 medium, ≥ 0.14 large\n\n' +
        'Interaction plot:\n' +
        '- Parallel lines → no interaction\n' +
        '- Lines cross → disordinal interaction\n' +
        '- Same direction but different slopes → ordinal interaction',
    },
    apa: {
      sentence:
        'A two-way ANOVA showed a {sigA} main effect of {factorA}, F({df1A}, {df2}) = {fA}, p = {pA}, partial η² = {peA}; ' +
        'a {sigB} main effect of {factorB}, F({df1B}, {df2}) = {fB}, p = {pB}, partial η² = {peB}; ' +
        'and a {sigAB} {factorA} × {factorB} interaction, F({df1AB}, {df2}) = {fAB}, p = {pAB}, partial η² = {peAB}.',
      sigYes: 'significant',
      sigNo: 'non-significant',
      copyHint: 'Copy APA narrative',
    },
    interp: {
      header: 'Reading',
      summary:
        'Main effect A ({factorA}): F({df1A}, {df2}) = {fA}, p = {pA} → {sigA} (partial η² = {peA}, {effectA})\n' +
        'Main effect B ({factorB}): F({df1B}, {df2}) = {fB}, p = {pB} → {sigB} (partial η² = {peB}, {effectB})\n' +
        'Interaction A × B: F({df1AB}, {df2}) = {fAB}, p = {pAB} → {sigAB} (partial η² = {peAB}, {effectAB})',
      interactionWarn:
        'Significant interaction: main effects can only be interpreted within specific levels of the other factor; pair with the interaction plot and simple-effects analysis.',
      sigYes: 'significant',
      sigNo: 'not significant',
    },
  },
  anova: {
    title: 'One-way ANOVA',
    config: {
      depVar: 'Dependent variable',
      factor: 'Factor (grouping variable)',
      pickDep: 'Pick a dependent variable',
      pickFactor: 'Pick a factor',
      factorHint: 'Must be categorical with at least 3 groups (for 2 groups, use t-test instead)',
      factorBadGroups: 'This factor has only {k} group(s); ANOVA cannot be performed (< 2 groups)',
      useTTestForTwoGroups: 'This factor has only 2 groups. ANOVA reduces to an independent-samples t-test in this case — please use the "Independent t-test" entry in the sidebar for a more direct result.',
    },
    result: {
      groupStatsTitle: 'Group descriptives',
      anovaTitle: 'ANOVA table',
      effectSizeTitle: 'Effect size',
      tukeyTitle: 'Tukey HSD post-hoc',
      bonferroniTitle: 'Bonferroni post-hoc',
      bonferroniHint: 'p_adj = min(1, p_raw × m), m = {m} (number of comparisons); more conservative but corroborates Tukey when results agree',
      assumpTitle: 'Assumption checks',
      groupCol: 'Group',
      cols: {
        source: 'Source',
        ss: 'SS',
        df: 'df',
        ms: 'MS',
        f: 'F',
        p: 'p',
        between: 'Between',
        within: 'Within',
        total: 'Total',
        eta2: 'η²',
        omega2: 'ω²',
        pair: 'Comparison',
        meanDiff: 'Mean diff',
        se: 'SE',
        q: 'q',
        t: 't',
        pRaw: 'p (raw)',
        pAdj: 'p (Bonferroni)',
      },
      effectInterp: {
        eta2Label: 'η² (within-sample effect):',
        omega2Label: 'ω² (unbiased estimate):',
        small: 'small',
        medium: 'medium',
        large: 'large',
      },
      assumpViolationWarn:
        'Note: assumption violation detected. Classic one-way ANOVA is moderately robust to mild violations, but for severe normality violation or large variance differences, consider Welch ANOVA or Kruskal-Wallis nonparametric test.',
    },
    notes: {
      purposeTitle: 'Purpose',
      purpose:
        'Compare means of three or more independent groups.\n' +
        'F-test answers "is at least one group different from the others?" (omnibus effect); if significant, use Tukey HSD to find "which specific pairs differ" (post-hoc).',
      assumpTitle: 'Assumptions',
      assumptions:
        '1. Groups are independent\n' +
        '2. Each population is normally distributed (relaxed by CLT for n ≥ 30)\n' +
        '3. Equal population variances (homogeneity) — if violated, use Welch ANOVA',
      formulasTitle: 'Core formulas',
      formulaSSb: 'SS_between = Σ n_i · (M_i - M̄)²',
      formulaSSw: 'SS_within = Σ_i Σ_j (X_ij - M_i)²',
      formulaF: 'F = (SS_between / df_between) / (SS_within / df_within), df_between = k-1, df_within = N-k',
      formulaEta2: 'η² = SS_between / SS_total',
      formulaOmega2: 'ω² = (SS_between - df_between · MS_within) / (SS_total + MS_within)',
      formulaTukey:
        'Tukey HSD: q_ij = |M_i - M_j| / √(MS_within · (1/n_i + 1/n_j) / 2), ' +
        'p-value from upper tail of studentized range distribution (k, df_within)',
      readingTitle: 'How to read it',
      reading:
        '1. F-test p < .05 → at least one pair differs (omnibus significant), proceed to post-hoc.\n' +
        '2. F-test p ≥ .05 → do not run post-hoc (inflates family-wise error).\n\n' +
        'η² (Cohen, 1988): < 0.06 small, 0.06-0.14 medium, ≥ 0.14 large.\n\n' +
        'ω² is less biased than η², especially with small samples.\n\n' +
        "Tukey HSD already controls the family-wise error rate; all pairwise comparisons share α = .05.",
    },
    apa: {
      sentence:
        'A one-way ANOVA showed a {sigWord} effect of {factor} on {depVar}, F({df1}, {df2}) = {f}, p = {pStr}, η² = {eta2} ({etaInterp} effect). {tukeySection}',
      sentenceNs:
        'A one-way ANOVA showed a {sigWord} effect of {factor} on {depVar}, F({df1}, {df2}) = {f}, p = {pStr}, η² = {eta2}.',
      tukeyOpener: 'Tukey HSD post-hoc revealed: ',
      tukeyPairLine:
        '{a} (M = {ma}) and {b} (M = {mb}) differed significantly (mean diff = {diff}, p = {pStr})',
      tukeyNoSig: 'Tukey HSD post-hoc found no pairs significantly different.',
      copyHint: 'Copy APA narrative',
    },
    interp: {
      header: 'Reading',
      overall:
        'Overall F-test is {sigWord}: F({df1}, {df2}) = {f}, p = {pStr}.' +
        '\nEffect size η² = {eta2}, indicating a {etaInterp} effect; ω² = {omega2} (unbiased).',
      tukeyOpener: 'Tukey HSD post-hoc results:',
      tukeyPair: '{a} vs {b}: mean diff = {diff}, q = {q}, p = {pStr} → {sigWord}',
      noPosthoc: 'Overall F is not significant; post-hoc not performed.',
      sigYes: 'significant',
      sigNo: 'not significant',
    },
  },
  efa: {
    title: 'Exploratory factor analysis',
    config: {
      selectVarsTitle: 'Select variables for analysis',
      selectVarsHint: 'At least 3 numeric variables (continuous or ordinal); ≥ 5 recommended',
      needAtLeastThree: 'Tick at least 3 variables',
      nFactorsTitle: 'Number of factors',
      nFactorsHint: 'Empty → Kaiser rule (eigenvalue > 1); positive integer → force that count',
      rotationTitle: 'Rotation',
      rotations: {
        varimax: 'Varimax (orthogonal)',
        none: 'No rotation',
      },
      rotationHint: {
        varimax: 'Orthogonal rotation: factors stay independent; cleaner structure',
        none: 'Raw principal components; usually harder to interpret',
      },
    },
    result: {
      suitabilityTitle: 'Suitability',
      eigenvaluesTitle: 'Eigenvalues and variance explained',
      screeTitle: 'Scree plot',
      loadingsTitle: 'Factor loadings matrix',
      communalitiesTitle: 'Communalities (h²)',
      cols: {
        kmo: 'KMO (sampling adequacy)',
        bartlett: "Bartlett's sphericity",
        chi2: 'χ²',
        df: 'df',
        p: 'p',
        factor: 'Factor',
        eigenvalue: 'Eigenvalue',
        percent: '% variance',
        cumulative: 'Cumulative %',
        variable: 'Variable',
        h2: 'h²',
        communalities: 'Communality',
      },
      kmoInterp: {
        unacceptable: 'unacceptable', miserable: 'miserable', mediocre: 'mediocre',
        middling: 'middling', meritorious: 'meritorious', marvelous: 'marvelous',
      },
      decisionRule: 'Retained {k} factors ({strategy})',
      strategyKaiser: 'Kaiser: eigenvalue > 1',
      strategyUser: 'user-specified',
      bartlettSig: 'Sphericity significant (rejects identity matrix; suitable for EFA)',
      bartlettNs: 'Sphericity not significant (weak inter-variable correlation; EFA may be unstable)',
      cumNote: 'Cumulative variance ≥ {pct}% — {k} factors retained',
    },
    notes: {
      purposeTitle: 'Purpose',
      purpose:
        'Uncover the latent "common factor" structure underlying multiple observed variables. Answers:\n' +
        '(1) How many latent constructs are there?\n' +
        '(2) Which factor does each variable mainly load on?\n' +
        '(3) How much variance does the model explain? (communalities + cumulative %)',
      assumpTitle: 'Assumptions',
      assumptions:
        '1. At least ordinal scale (5+ point Likert OK)\n' +
        '2. Sample size: 5N or N ≥ 100; KMO ≥ 0.6 for suitability\n' +
        "3. Bartlett's sphericity must be significant (variables have correlations)\n" +
        '4. Bivariate normality (for robust Pearson correlation matrix)\n' +
        '5. Linear relationships',
      formulasTitle: 'Core formulas',
      formulaR: 'Correlation matrix R (p × p)',
      formulaEig: 'R = V · diag(λ) · Vᵀ (Jacobi eigendecomposition)',
      formulaLoad: 'PC loadings: A = V · diag(√λ); take first k columns → A_k',
      formulaH2: 'Communality hᵢ² = Σⱼ aᵢⱼ² (proportion of variable i explained by k factors)',
      formulaVarimax:
        'Varimax: after Kaiser normalization, iteratively rotate factor pairs to maximize "squared loadings variance"\n' +
        'V(L) = (1/p) Σⱼ [Σᵢ lᵢⱼ⁴ − (1/p)(Σᵢ lᵢⱼ²)²]',
      formulaBartlett:
        "Bartlett's: χ² = -((n-1) - (2p+5)/6) · ln|R|, df = p(p-1)/2",
      readingTitle: 'How to read it',
      reading:
        '1. Check KMO (≥ 0.6 to be suitable) + Bartlett p (significant to be suitable)\n' +
        '2. Look at the scree plot for an "elbow" — keep factors above it\n' +
        '3. Compare with Kaiser rule (eigenvalue > 1)\n' +
        '4. Inspect the rotated loadings matrix — each variable belongs to the factor with the largest |loading|\n' +
        '5. Look at h² — if < 0.30, the variable is poorly explained; consider dropping\n\n' +
        'Loading interpretation thresholds (absolute value):\n' +
        '- ≥ 0.71 excellent\n' +
        '- ≥ 0.63 very good\n' +
        '- ≥ 0.55 good\n' +
        '- ≥ 0.45 fair\n' +
        '- ≥ 0.32 poor\n' +
        '- < 0.32 consider dropping',
    },
    apa: {
      sentence:
        'An exploratory factor analysis (PCA extraction, Varimax rotation) was conducted on {p} variables. ' +
        "KMO = {kmo} ({kmoInterp}); Bartlett's sphericity was significant, χ²({df}, N = {n}) = {chi2}, p = {pStr}. " +
        '{k} factors were retained by Kaiser rule, cumulatively explaining {cumPct}% of variance.',
      sentenceUnsuit:
        'KMO for the {p} variables was {kmo} ({kmoInterp}); EFA suitability was {suitWord}.',
      copyHint: 'Copy APA narrative',
    },
    interp: {
      header: 'Reading',
      summary:
        "Suitability: KMO = {kmo} ({kmoInterp}); Bartlett's χ²({df}) = {chi2}, p = {pStr}.\n" +
        '{k} factors retained, cumulative variance = {cumPct}%.\n' +
        '{rotationLine}',
      rotationLineYes: 'Varimax orthogonal rotation applied; loadings are easier to interpret.',
      rotationLineNo: 'No rotation applied; raw PC loadings shown directly.',
    },
  },
  alpha: {
    title: "Cronbach's α reliability",
    selectVarsTitle: 'Select scale items',
    selectVarsHint:
      'Tick items that belong to the same scale (≥ 3 items recommended; reverse-coded items should be recoded first in Step 4 variable transformation)',
    needAtLeast2: 'Pick at least 2 items',
    summaryTitle: 'Overall reliability',
    itemTitle: 'Item analysis',
    cols: {
      alpha: 'Cronbach α',
      kItems: 'Items',
      n: 'Valid n',
      meanInter: 'Mean inter-item r',
      item: 'Item',
      mean: 'M',
      sd: 'SD',
      itemTotalCorr: 'Corrected item-total r',
      alphaIfDeleted: 'α if deleted',
      interpretation: 'Reading',
    },
    interpretation: {
      excellent: 'Excellent',
      good: 'Good',
      acceptable: 'Acceptable',
      questionable: 'Questionable',
      poor: 'Poor',
      unacceptable: 'Unacceptable',
    },
    droppedNote: '{n} rows dropped (listwise deletion)',
    notes: {
      purposeTitle: 'Purpose',
      purpose:
        'Assess internal consistency reliability of a scale.\n' +
        'Answers: "Do these items measure the same construct? Does it make sense to sum them into a total score?"\n\n' +
        "Note: α is a measure of homogeneity, not validity. High α means items are internally consistent, not that they really measure what you intend (that's construct validity — needs EFA/CFA/convergent validity).",
      assumpTitle: 'Assumptions',
      assumptions:
        '1. Items measure the same latent construct (unidimensionality) — α is misleading for multidimensional scales\n' +
        '2. Items are conceptually summable (not ordinal-rank, not nominal)\n' +
        '3. Reverse-coded items have been recoded to the same direction\n' +
        '4. Item measurement errors are independent (tau-equivalence; if violated, α is a lower bound)',
      formulasTitle: 'Core formulas',
      formulaAlpha: 'α = (k / (k-1)) · (1 - Σσ²_i / σ²_t)',
      formulaItc:
        'Corrected item-total r_i = Pearson(X_i, Σ_{j≠i} X_j)',
      formulaAlphaDel: 'α if deleted (i) = α recomputed using k - 1 items (excluding X_i)',
      readingTitle: 'How to read it',
      reading:
        'α conventions (DeVellis 2017 / Nunnally 1978):\n' +
        '≥ 0.90 excellent, 0.80-0.89 good, 0.70-0.79 acceptable, 0.60-0.69 questionable, 0.50-0.59 poor, < 0.50 unacceptable.\n\n' +
        'Read corrected item-total r:\n' +
        '- ≥ 0.30: item shares reasonable common content with the scale\n' +
        '- < 0.30: item is weakly related to the rest, consider revision\n' +
        '- Near 0 or negative: possibly forgot reverse-coding, or item measures a different construct\n\n' +
        'Read α-if-deleted:\n' +
        '- α rises noticeably after deletion → that item hurts consistency\n' +
        '- All α-if-deleted are lower than overall → scale structure is sound\n\n' +
        'Note: α tends to rise with k (number of items) due to the k/(k-1) factor. Compare α across scales of similar length.',
    },
    apa: {
      sentence:
        "Internal consistency reliability of the scale was assessed via Cronbach's α. The scale included items {itemList} (k = {k}, n = {n}); α = {alpha} ({interp}), mean inter-item correlation = {meanInter}.",
      copyHint: 'Copy APA narrative',
    },
    interp: {
      header: 'Reading',
      summary:
        'The scale has {k} items with {n} valid respondents. Cronbach α = {alpha} ({interp} reliability). ' +
        'Mean inter-item correlation = {meanInter}. {recommendation}',
      recommendExcellent: 'Internal consistency is excellent; the scale can be used as is.',
      recommendGood: 'Internal consistency is good; the scale can be used.',
      recommendAcceptable:
        'Internal consistency is acceptable. Review items with corrected item-total r < 0.30, and consider revising/dropping items where α-if-deleted rises noticeably.',
      recommendLow:
        'Internal consistency is low. Steps to consider: (1) verify all reverse-coded items have been recoded; (2) inspect items with low corrected item-total r; (3) if α remains low, reconsider the construct definition and item wording.',
    },
  },
  pls: {
    title: 'PLS-SEM (partial least squares structural equation modeling)',
    config: {
      lvsTitle: 'Latent variables (constructs)',
      lvsHint: 'Name each latent variable, pick its measurement mode (reflective / formative) and tick its indicators (≥ 3 items per construct recommended, single-indicator allowed)',
      lvLabel: 'Construct',
      indicatorsLabel: 'Indicators',
      modeLabel: 'Measurement mode',
      modeReflective: 'Reflective',
      modeFormative: 'Formative',
      modeHint: 'Reflective (Mode A) = indicators manifest the construct; formative (Mode B) = indicators jointly form the construct — the report shows weight tests + outer VIF instead of reliability',
      addLv: 'Add latent variable',
      removeLv: 'Remove this construct',
      noIndicatorsLeft: 'All available indicators are used by other constructs',
      pathsTitle: 'Structural paths (from → to)',
      pathsHint: 'Declare the direction of influence between constructs; the path diagram must be acyclic (recursive model)',
      addPath: 'Add path',
      removePath: 'Remove this path',
      pickLv: 'Pick a construct',
      pathIncomplete: 'Path {i} is missing its from or to construct',
      bootstrapTitle: 'Bootstrap resamples',
      bootstrapHint: 'Journal convention is 5000; use 500 / 1000 for quick previews on large data (default 1000)',
      advancedTitle: 'Advanced options',
      schemeTitle: 'Weighting scheme',
      schemeNames: { path: 'Path', factorial: 'Factorial', centroid: 'Centroid' },
      schemeHint: 'Path is the SmartPLS 4 default; centroid / factorial are provided for methodological comparison and older literature.',
      plscLabel: 'Consistent PLS (PLSc)',
      plscHint: 'Corrects attenuation from measurement error in reflective constructs via rho_A (Dijkstra & Henseler, 2015); paths, loadings and CR / AVE all use corrected values, and the bootstrap runs the consistent procedure.',
      ciTypeTitle: 'Bootstrap confidence interval',
      ciPercentile: 'Percentile',
      ciBca: 'BCa',
      ciTypeHint: 'Percentile is the SmartPLS 4 default; BCa (bias-corrected and accelerated) additionally needs n jackknife re-estimations — slower but more accurate for skewed sampling distributions.',
      q2Label: 'Blindfolding Q²',
      q2Hint: 'Construct-level cross-validated redundancy (omission distance = 7) to assess predictive relevance of endogenous constructs; adds computation time.',
      run: 'Run analysis',
      rerun: 'Re-run analysis',
      staleNote: 'Model settings have changed — the current results reflect the previous run. Please re-run.',
      errorsTitle: 'Model validation failed:',
      modeNote: 'W4 release: moderation (two-stage aligned with SmartPLS 4; product indicator / orthogonalizing optional), quadratic effects, three-way interactions, higher-order constructs (repeated indicators / two-stage / disjoint), and mediation decomposition with bootstrap CIs. From W3: Mode A/B, three schemes, PLSc, percentile/BCa, model fit, Q². Limits: PLSc and Q² are unavailable for models with interactions / higher-order constructs. Missing data handled by casewise deletion.',
      viewForm: 'Form',
      viewCanvas: 'Canvas',
      viewFormHint: 'Declare the model with dropdowns and multi-select; best for precise edits and mobile.',
      viewCanvasHint: 'The main area switches to a drag-and-drop model canvas that shares the same model as the form.',
      canvasNarrowFallback: 'The canvas needs a wider screen; on mobile it falls back to the form automatically.',
      interactionsTitle: 'Moderation & quadratic effects (interaction terms)',
      interactionsHint: 'Declare an A × B interaction, then point it at a dependent construct in the structural paths. Pick the same construct twice for a quadratic effect (two-stage only). Missing main-effect paths (A → Y, B → Y) are added automatically (SmartPLS 4 behavior).',
      addInteraction: 'Add interaction',
      removeInteraction: 'Remove this interaction',
      intFactor1: 'Construct A',
      intFactor2: 'Construct B',
      intFactor3: 'Construct C (three-way, optional)',
      intMethodTitle: 'Interaction generation (shared by all interactions)',
      intMethodNames: { 'two-stage': 'Two-stage', 'product-indicator': 'Product indicator', orthogonal: 'Orthogonal' },
      intMethodHint: 'Two-stage is the only method in SmartPLS 4 and the one this tool aligns with (interaction term unstandardized); product indicator / orthogonalizing align with seminr for methodological comparison and support only two distinct reflective constructs.',
      intIncomplete: 'Interaction {i} still needs both constructs',
      hocTitle: 'Higher-order constructs (HOC)',
      hocHint: 'Combine several lower-order constructs into one higher-order construct. Lower-order constructs are absorbed: use the HOC name in structural paths and interactions.',
      addHoc: 'Add higher-order construct',
      removeHoc: 'Remove this higher-order construct',
      hocNameLabel: 'Name',
      hocComponentsLabel: 'Lower-order constructs (≥ 2)',
      hocMethodTitle: 'Estimation approach (shared by all HOCs)',
      hocMethodNames: { repeated: 'Repeated indicators', disjoint: 'Disjoint two-stage', 'two-stage': 'Embedded two-stage' },
      hocMethodHint: 'Disjoint two-stage is the current methodological recommendation (Becker et al., 2023); repeated indicators is a single, transparent estimation but inflates R² of the HOC→LOC paths.',
      hocIncomplete: 'Higher-order construct "{name}" needs a name and at least 2 components',
      w5Title: 'Groups & prediction (W5)',
      w5GroupColumn: 'Grouping column',
      w5PickColumn: 'Pick a column',
      w5PickValue: 'Pick a value',
      w5G1: 'Group 1',
      w5G2: 'Group 2',
      w5MgaLabel: 'PLS-MGA multigroup analysis',
      w5MgaHint: 'Three tests of path-coefficient differences between two groups (Henseler MGA / permutation / parametric); run MICOM first to establish measurement invariance.',
      w5MicomLabel: 'MICOM measurement invariance',
      w5MicomHint: 'Prerequisite for MGA: permutation tests of compositional invariance (step 2) and equal means/variances (step 3).',
      w5PermsTitle: 'Permutations',
      w5PermsHint: '1000 for formal reporting; 200 for quick exploration.',
      w5PredictLabel: 'PLSpredict (k-fold out-of-sample)',
      w5PredictHint: 'Includes the LM benchmark and CVPAT (Shmueli et al., 2019; Liengaard et al., 2021).',
      w5KTitle: 'k (folds)',
      w5IpmaLabel: 'IPMA importance–performance map',
      w5IpmaHint: 'Unstandardized total effects (importance) × mean of 0–100 rescaled scores (performance); pick the target construct.',
      w5CipmaLabel: 'cIPMA (combine with NCA necessity)',
      w5CipmaHint: 'Runs Necessary Condition Analysis on the 0–100 scores of the target\u2019s direct antecedents; necessity requires d \u2265 .1 and permutation p < .05 (Hauff et al., 2024).',
      w5Target: 'Target construct',
      w5NeedGroups: 'MGA / MICOM need a grouping column and two distinct group values',
      w5NeedTarget: 'IPMA needs a target construct (must be endogenous)',
      w5W4Note: 'Note: MICOM / PLSpredict / IPMA do not yet support models with interactions or higher-order constructs.',
    },
    canvas: {
      hint: 'Drag a construct to move it; drag from a construct’s bottom handle to another to add a path; click a path to delete it; click a construct to open its indicator panel (with reflective / formative toggle); double-click to rename.',
      legend: 'Ellipse = latent variable (R² inside; Mode B badge for formative); small rectangle = indicator (loading on the link; weight w for formative); arrow = structural path (β with significance stars). Green = significant, red = not significant.',
      empty: 'No latent variables yet; add a construct to start modeling.',
      exportBtn: 'Export diagram',
      exportHint: 'Export a white-background PNG (for papers)',
      exporting: 'Exporting…',
      modeBadge: 'Mode B (formative)',
    },
    result: {
      runFirst: 'Declare the latent variables and structural paths on the left, then press "Run analysis" (the bootstrap takes a few seconds).',
      computing: 'Computing… bootstrap {pct}% (runs on a background thread; the UI stays responsive)',
      computingShort: 'Computing… results will appear automatically.',
      cards: { n: 'Valid N', iterations: 'PLS iterations', bootstrap: 'Valid bootstrap draws', r2: 'R²' },
      converged: 'Converged',
      notConverged: 'Not converged',
      settingsLine: 'weighting scheme = {scheme}{plsc}',
      plscTag: ' | PLSc (consistent PLS) enabled — paths and loadings are corrected values',
      measurementTitle: 'Measurement model — outer loadings (reflective)',
      loadingNote: 'Loading thresholds: ≥ .708 good (green), .40 – .708 borderline (yellow), < .40 poor (red). SE / t / p come from the bootstrap.',
      formativeTitle: 'Measurement model — formative outer weights (bootstrap tests)',
      formativeNote: 'Weight SE / t / p / CI come from the bootstrap; outer VIF (indicator collinearity): < 3.3 good (green), 3.3 – 5 caution (yellow), ≥ 5 concern (red). When a weight is not significant, a loading ≥ .50 can still support retaining the indicator (fallback reading; Hair et al., 2017).',
      reliabilityTitle: 'Measurement model — reliability & convergent validity',
      reliabilityNote: 'Pass thresholds: α ≥ .70, rho_A ≥ .70, CR ≥ .70, AVE ≥ .50; the row LED = all four pass. Single-indicator constructs are 1 by definition ("—"). Formative constructs have no reliability/convergent validity — see the formative weights table.',
      discriminantFLTitle: 'Discriminant validity — Fornell-Larcker criterion',
      flNote: 'Diagonal (bold) is √AVE and must exceed every inter-construct correlation in its row/column (green = pass, red = violated); AVE is undefined for formative constructs (—).',
      discriminantHTMTTitle: 'Discriminant validity — HTMT',
      htmtNote: 'HTMT < .85 passes (green); ≥ .85 flags a discriminant-validity concern (red). Pairs involving single-indicator or formative constructs are undefined (—).',
      structuralTitle: 'Structural model — path coefficients (bootstrap inference)',
      bootstrapMeta: 'bootstrap {nValid} / {nRequested} valid resamples (seed = {seed}, {ciType} 95% CI, construct-level sign correction)',
      bootstrapUnavailable: 'Bootstrap failed; only point estimates are shown: {message}',
      r2Title: 'Structural model — explained variance',
      effectsTitle: 'Structural model — effect sizes f² & collinearity VIF',
      f2Note: 'f² conventions (Cohen, 1988): .02 small, .15 medium, .35 large. VIF: < 3.3 good (green), 3.3 – 5 caution (yellow), ≥ 5 collinearity concern (red).',
      fitTitle: 'Model fit — SRMR / d_ULS / d_G / NFI',
      fitNote: 'SRMR: < .08 good (green), .08 – .10 borderline (yellow), ≥ .10 poor (red); NFI ≥ .90 good. d_ULS / d_G are distance measures for model comparison (smaller is better). "Saturated" frees all construct correlations (measurement model only); "estimated" implies them from the structural paths. Computed from the original formulas (SmartPLS does not fully document its implementation) — cross-check with SmartPLS / seminr recommended.\nGoF (Tenenhaus et al., 2005) = sqrt(mean communality × mean R²): officially NOT recommended as a fit index, provided only for comparison with older literature; communality from reflective multi-item constructs.',
      q2Title: 'Predictive relevance — blindfolding Q²',
      q2Note: 'Q² > 0 indicates predictive relevance for that endogenous construct (green); ≤ 0 means no better than mean prediction (red). Construct-level cross-validated redundancy, omission distance D = {d}.',
      q2Unavailable: 'Q² computation failed: {message}',
      cols: {
        lv: 'Construct',
        indicator: 'Indicator',
        loading: 'Loading',
        weight: 'Weight',
        outerVif: 'Outer VIF',
        alpha: "Cronbach's α",
        rhoA: 'rho_A',
        cr: 'CR',
        ave: 'AVE',
        path: 'Path',
        beta: 'β',
        se: 'Bootstrap SE',
        t: 't',
        p: 'p',
        ci: '95% CI',
        r2: 'R²',
        adjR2: 'Adj. R²',
        f2: 'f²',
        vif: 'VIF',
        effect: 'Effect size',
        fitIndex: 'Fit index',
        saturated: 'Saturated model',
        estimated: 'Estimated model',
        q2: 'Q²',
      },
      f2Interp: { none: 'negligible', small: 'small', medium: 'medium', large: 'large' },
      stage1Note: 'Multi-stage model: the measurement statistics below (loadings, reliability, discriminant validity, fit) come from stage one (original indicators); the structural model (paths, R², f²) comes from the final stage (LV scores). Model fit is not reported for the final score-level model.',
      autoAddedLine: 'Main-effect paths added automatically: {paths} (SmartPLS 4 behavior)',
      interactionTitle: 'Moderation — interaction effects & simple slopes',
      interactionMethodLine: 'interaction generation = {method}',
      sdProductTag: ' | interaction term unstandardized (÷ SD of product)',
      quadraticTag: 'quadratic effect',
      slopesNote: 'Simple slopes (Aiken & West, 1991): conditional slopes at −1 SD / mean / +1 SD of the moderator; SE / t / p / CI are derived from the bootstrap path draws. Two-stage interaction coefficients are reported on the unstandardized-product scale (SmartPLS 4 convention); quadratic effects show tangent slopes at x = −1 / 0 / +1 SD. No simple slopes for product indicator / orthogonalizing (coefficients are on the standardized construct scale).',
      slopeLevelNames: { lo: '−1 SD', mid: 'Mean', hi: '+1 SD' },
      slopeCol: 'Conditional slope',
      slopeAxisX: '{iv} (SD)',
      slopeLegendModerator: 'Moderator {moderator}',
      mediationTitle: 'Mediation — effect decomposition (bootstrap CI)',
      mediationNote: 'A specific indirect effect whose bootstrap CI excludes 0 supports that mediating path (Preacher & Hayes, 2008). VAF = total indirect ÷ total effect (Hair et al., 2017): > 80% near-full mediation, 20% – 80% partial, < 20% limited (meaningful only when direct and indirect effects share the sign). Type classification (Zhao et al., 2010) appears in the report view.',
      effectCol: 'Effect',
      directLabel: 'Direct effect',
      indirectVia: 'Specific indirect: via {via}',
      totalIndirectLabel: 'Total indirect',
      totalLabel: 'Total effect',
      vafCol: 'VAF',
      derivedTitle: 'Stage-two data — LV scores data file',
      derivedNote: 'Input data of the final stage in two-stage procedures (construct scores and interaction products), matching the SmartPLS 4 "generate data file from LV scores" workflow; download for records or to reproduce stage two elsewhere.',
      downloadDerived: 'Download CSV',
      mgaTitle: 'Multigroup analysis — PLS-MGA (three tests)',
      mgaMeta: 'Groups: {g1} (n = {n1}) vs {g2} (n = {n2}) | bootstrap {b} per group | {np} valid permutations',
      mgaNote: 'Interpret primarily via the permutation test (Chin & Dibbern, 2010; distribution-free). Henseler MGA p is the one-tailed P(β₁ ≤ β₂) — values near 0 or 1 both signal a group difference; parametric tests (pooled / Welch) are shown for reference. Establish compositional invariance (MICOM) before MGA, otherwise differences may reflect measurement rather than structure.',
      mgaColG1: 'β ({g})',
      mgaColG2: 'β ({g})',
      mgaColDiff: 'Δβ',
      mgaColHenseler: 'p (Henseler)',
      mgaColPerm: 'p (permutation)',
      mgaColParam: 'p (pooled t)',
      mgaColWelch: 'p (Welch)',
      micomTitle: 'Measurement invariance — MICOM',
      micomNote: 'Step 1 (configural): identical model, indicators and treatment across groups — satisfied by construction here. Step 2 (compositional invariance): pass when c ≥ the 5% permutation quantile (green). Step 3: mean/variance differences inside the permutation 95% CI = full invariance; step 2 only = partial invariance (MGA is fine; comparing latent means is not).',
      micomColC: 'c (step 2)',
      micomColQ5: '5% quantile',
      micomColMean: 'Mean diff [95% CI]',
      micomColVar: 'Variance diff [95% CI]',
      predictTitle: 'Out-of-sample prediction — PLSpredict (k = {k})',
      predictNote: 'Interpretation (Shmueli et al., 2019): require Q²predict > 0 first; then compare PLS vs LM RMSE — all lower = high predictive power, majority lower = medium, minority = low, none = lacking. CVPAT (Liengaard et al., 2021): d̄ > 0 with p < .05 means the PLS average loss is significantly below the benchmark.',
      predictColQ2p: 'Q²predict',
      predictColRmsePls: 'RMSE (PLS)',
      predictColRmseLm: 'RMSE (LM)',
      predictColMae: 'MAE (PLS)',
      cvpatVsIA: 'CVPAT: PLS vs indicator average (IA)',
      cvpatVsLM: 'CVPAT: PLS vs linear model (LM)',
      ipmaTitle: 'Importance–performance map — IPMA (target: {target})',
      ipmaNote: 'Importance = unstandardized total effect on the target; performance = mean of 0–100 rescaled scores (Ringle & Sarstedt, 2016). The lower-right quadrant (important, low performance) is the priority area. Rescaling uses observed min/max (SmartPLS uses theoretical scale bounds — they differ when extremes are unobserved); target performance = {targetPerf}.',
      ipmaColImportance: 'Importance (total effect)',
      cipmaTitle: 'cIPMA — necessity analysis (NCA on 0\u2013100 scores)',
      cipmaColDCe: 'd (CE-FDH)',
      cipmaColDCr: 'd (CR-FDH)',
      cipmaColP: 'p (permutation)',
      cipmaColNecessary: 'Necessity',
      cipmaNecessaryYes: 'necessary',
      cipmaNecessaryNo: 'insufficient evidence',
      cipmaBottleneckTitle: 'Bottleneck (condition score required per target level)',
      cipmaColLevel: 'Target level',
      cipmaNote: 'Only the target\u2019s direct antecedents are tested (Hauff et al., 2024). Cells show the condition score (0\u2013100) required to reach each target level (% of range); parentheses give the share of cases below the required level; NN = no necessary threshold at that level. Necessity: d \u2265 .1 and p < .05, with theoretical support. The permutation test is a seed-fixed approximation (10,000 draws).',
      ipmaColPerformance: 'Performance (0–100)',
      ipmaIndicatorTitle: 'Indicator-level IPMA',
      w5ErrorPrefix: '{feature} unavailable: {message}',
    },
    notes: {
      purposeTitle: 'Purpose',
      purpose:
        'Partial least squares SEM (PLS-SEM) approximates latent constructs as weighted linear composites of their indicators, ' +
        'estimating the measurement model (construct ↔ indicators) and the structural model (paths among constructs) simultaneously.\n\n' +
        'Best suited to: prediction-oriented research, complex models (many constructs/paths), smaller samples, non-normal data, or theory still under development.\n\n' +
        'Versus CB-SEM: CB-SEM tests overall fit of the covariance structure (confirmatory); PLS-SEM maximizes explained variance of endogenous constructs (predictive). Fit indices such as SRMR are approximate checks, not χ²-type tests.',
      assumpTitle: 'Assumptions & scope',
      assumptions:
        '1. The measurement mode must be theory-driven: reflective (Mode A) indicators manifest the construct and should intercorrelate; formative (Mode B) indicators jointly form it, need not correlate, but must not be highly collinear (check outer VIF)\n' +
        '2. Recursive structural model: the path diagram is acyclic (no reciprocal causation)\n' +
        '3. Indicators are continuous or approximately continuous (5/7-point Likert is common)\n' +
        '4. Sample size lower bound via the "10-times rule": at least 10 × the largest number of paths aimed at any construct\n' +
        '5. Inference relies on bootstrap resampling — no normality assumption required\n' +
        '6. If the goal is estimating true construct correlations/paths (theory testing), enable PLSc to correct attenuation in reflective constructs',
      conceptsTitle: 'Key concepts',
      concepts:
        'Outer loading: correlation between indicator and construct; ≥ .708 means the construct explains ≥ 50% of the indicator variance\n' +
        'Outer weight: a formative indicator’s contribution to its construct (regression weight), tested via bootstrap\n' +
        "Reliability: Cronbach's α (lower bound), rho_A (less biased), CR composite reliability (upper bound); all ≥ .70 (reflective only)\n" +
        'AVE (average variance extracted): convergent validity, ≥ .50; Fornell-Larcker: √AVE should exceed inter-construct correlations\n' +
        'HTMT (heterotrait-monotrait ratio): discriminant validity, < .85 (conservative) or < .90 (liberal)\n' +
        'Weighting scheme: inner-proxy weighting — path (default) / factorial (correlations) / centroid (signs of correlations); practical differences are usually tiny\n' +
        'PLSc (consistent PLS): disattenuation via rho_A so reflective paths approach CB-SEM-consistent estimates\n' +
        'R²: explained variance of an endogenous construct; f²: change in R² when a predictor is removed; inner VIF: predictor collinearity\n' +
        'Model fit: SRMR (standardized root mean square residual, < .08), d_ULS / d_G (distance measures), NFI (≥ .90)\n' +
        'Q² (blindfolding): cross-validation by omitting and predicting data points; > 0 indicates predictive relevance\n' +
        'Bootstrap: SE, t, p and confidence intervals (percentile or BCa) from the empirical distribution of resampled estimates',
      readingTitle: 'How to read',
      reading:
        '1. Check convergence and sample-size warnings first\n' +
        '2. Measurement model: reflective — loadings ≥ .708, α / rho_A / CR ≥ .70, AVE ≥ .50; formative — significant weights and outer VIF < 3.3 (a non-significant weight with loading ≥ .50 can be retained)\n' +
        '3. Discriminant validity: Fornell-Larcker passes and HTMT < .85\n' +
        '4. Model fit: SRMR < .08 (saturated = measurement; estimated adds the structural model)\n' +
        '5. Only after the measurement model qualifies, read the structural model: path p-values and 95% CIs, f², VIF\n' +
        '6. Finally R² (.25 / .50 / .75 ≈ weak / moderate / substantial) and Q² (> 0 = predictive relevance)\n' +
        '7. CCA (confirmatory composite analysis) workflow: when constructs are positioned as composites rather than reflective factors — check in order (a) weight/loading significance (bootstrap), (b) outer VIF, (c) composite reliability rho_A/rho_c, (d) discriminant validity HTMT — the existing report covers every step; reading it in this order IS the CCA (Hair et al., 2020)',
      w5Title: 'Groups & prediction (W5)',
      w5:
        'PLS-MGA: estimate per group, then compare path coefficients. The permutation test is the primary criterion; Henseler MGA is a one-tailed bootstrap comparison; parametric tests carry stronger assumptions. Prerequisite: MICOM step 2 at least\n' +
        'MICOM: configural (by construction) → compositional (c vs the 5% permutation quantile) → equal means/variances (full invariance required for pooling or latent mean comparison)\n' +
        'PLSpredict: k-fold out-of-sample prediction; Q²predict > 0 is the baseline; compare RMSE against the LM benchmark for a four-level verdict; CVPAT gives an overall test\n' +
        'IT criteria (AIC/AICc/BIC/HQ): compare alternative predictor sets for the same endogenous construct — smaller is better; never compare across datasets\n' +
        'IPMA: importance (unstandardized total effects) × performance (0–100 means) locates constructs/indicators that matter but underperform\n' +
        'cIPMA: IPMA × NCA combined (Hauff et al., 2024) — Necessary Condition Analysis on the 0–100 scores of the target\u2019s direct antecedents; "important AND necessary but underperforming" is the top priority, and the bottleneck table gives the minimum condition score per target level\n' +
        'Limits: MICOM/PLSpredict/IPMA do not support interaction/HOC models; MGA does (each group runs the full pipeline)',
      w4Title: 'Moderation, higher-order constructs & mediation (W4)',
      w4:
        'Moderation (two-stage): stage one estimates the main-effects model to obtain LV scores; stage two uses the product of scores as the interaction term. Two SmartPLS 4 behaviors are replicated — main-effect paths are added automatically, and the interaction term is NOT standardized (coefficient = standardized coefficient ÷ SD of the product). For the interaction f², prefer Kenny (2018) thresholds: .005 / .01 / .025\n' +
        'Quadratic effects use the same mechanism with the squared score; three-way and higher interactions multiply the scores (include all lower-order terms to keep the specification hierarchical)\n' +
        'Product indicator / orthogonalizing build the interaction construct from indicator products (or their residuals); coefficients are on the standardized scale (aligned with seminr). Differences from two-stage are expected — pick one method and report it\n' +
        'Higher-order constructs: repeated indicators (HOC block = all LOC indicators, single estimation), disjoint two-stage (stage one links LOCs directly to the structure; recommended by recent literature) and embedded two-stage. Known repeated-indicators caveats: HTMT is undefined for HOC–LOC pairs (shown as —), model fit cannot be computed, and R² of HOC→LOC paths is mechanical rather than substantive\n' +
        'Mediation: decomposition into direct / specific indirect (products of path coefficients) / total indirect / total effects with bootstrap CIs (Preacher & Hayes, 2008); VAF and the Zhao et al. (2010) typology aid interpretation\n' +
        'Limits: PLSc and blindfolding Q² are unavailable for models with interactions / higher-order constructs; predictive assessment of such models arrives with PLSpredict (W5)',
    },
    apa: {
      intro:
        'The research model was tested with partial least squares structural equation modeling (PLS-SEM; {scheme} weighting scheme{plsc}; N = {n}), ' +
        'with inference based on {nValid} bootstrap resamples ({ciType} 95% confidence intervals).',
      introNoBoot:
        'The research model was tested with partial least squares structural equation modeling (PLS-SEM; {scheme} weighting scheme{plsc}; N = {n}).',
      plscClause: ', consistent PLS (PLSc)',
      schemeNames: { path: 'path', factorial: 'factorial', centroid: 'centroid' },
      ciNames: { percentile: 'percentile', bca: 'BCa' },
      measurement:
        "For the reflective measurement model, Cronbach's α ranged {alphaRange}, composite reliability (CR) ranged {crRange}, " +
        'and average variance extracted (AVE) ranged {aveRange}; {measVerdict}',
      measOk: 'reliability and convergent validity met the recommended thresholds (CR ≥ .70, AVE ≥ .50).',
      measBad: 'some constructs fell short of the recommended thresholds (CR ≥ .70, AVE ≥ .50), which should be borne in mind.',
      formative: 'Formative constructs ({lvs}) were assessed via bootstrap tests of outer weights and indicator collinearity, with a maximum outer VIF of {vifMax}.',
      htmt: 'Regarding discriminant validity, the maximum HTMT was {htmtMax}, {htmtVerdict}',
      htmtOk: 'below the .85 threshold, supporting discriminant validity.',
      htmtBad: 'above the .85 threshold, indicating a discriminant-validity concern for some construct pairs.',
      fit: 'Regarding model fit, the SRMR of the estimated model was {srmr}, {fitVerdict}',
      fitOk: 'below the .08 threshold.',
      fitBad: 'above the .08 threshold, so overall fit warrants attention.',
      q2: 'Blindfolding Q² for the endogenous constructs (D = {d}) ranged {q2Range}; {q2Verdict}',
      q2Ok: 'all values exceeded 0, indicating predictive relevance.',
      q2Bad: 'not all values exceeded 0, indicating limited predictive relevance.',
      structuralIntro: 'Structural model results: ',
      path: '{from} → {to} (β = {beta}, t = {t}, {pStr}, 95% CI [{lo}, {hi}], {sig})',
      pathNoBoot: '{from} → {to} (β = {beta})',
      sigYes: 'significant',
      sigNo: 'not significant',
      r2: 'R² for {lv} = {r2}',
      moderation: 'For moderation, the interaction effect of {name} ({method}) on {to} was β = {beta}{stat}, {sig}',
      moderationSlopes: '; simple slopes showed conditional slopes of {iv} of {lo} and {hi} at −1 SD and +1 SD of {moderator}, respectively.',
      quadraticSentence: 'The quadratic effect of {name} on {to} was β = {beta}{stat}, {sig}.',
      modStat: ' (t = {t}, {pStr}, 95% CI [{cl}, {ch}])',
      modSigYes: 'statistically significant',
      modSigNo: 'not statistically significant',
      modMethodNames: { 'two-stage': 'two-stage, unstandardized interaction term', 'product-indicator': 'product indicator', orthogonal: 'orthogonalizing' },
      mediationIntro: 'Mediation decomposition (bootstrap 95% CI): ',
      mediationSentence: '{from} → {to}: total effect = {total}, direct effect = {direct}, total indirect = {indirect}{ci}{vaf}{type}',
      mediationCi: ' (CI [{lo}, {hi}])',
      mediationVaf: ', VAF = {vaf}',
      mediationType: ', classified as {type} (Zhao et al., 2010)',
      medTypes: {
        complementary: 'complementary (partial) mediation',
        competitive: 'competitive (partial) mediation',
        indirectOnly: 'indirect-only (full) mediation',
        directOnly: 'direct-only (no mediation)',
        none: 'no effect',
      },
      noDirect: 'none (no direct path specified)',
      copyHint: 'Copy APA narrative to clipboard',
    },
  },
  nca: {
    title: 'Necessary Condition Analysis (NCA)',
    config: {
      xLabel: 'Condition X (necessary condition)',
      yLabel: 'Outcome Y',
      pickX: 'Select condition variable',
      pickY: 'Select outcome variable',
      sameVar: 'X and Y must differ',
      hint: 'NCA asks whether X is necessary for Y: if a high Y always requires a high X, the upper-left corner of the scatterplot is empty. Unlike regression’s average effect, NCA looks at the ceiling.',
    },
    result: {
      scopeTitle: 'Scope',
      scope: 'scope area',
      ceilingTitle: 'Ceiling line summary',
      ceilingHint: 'CE-FDH is a non-decreasing step function (envelopment), accuracy always 100%; CR-FDH is an OLS line through the ceiling points. d = ceiling zone / scope.',
      bottleneckTitle: 'Bottleneck table (CE-FDH)',
      readingTitle: 'Reading',
      nn: 'NN',
      nnHint: 'NN (Not Necessary) = the X required for that Y level is at or below the minimum, so X is not a bottleneck there. Required X is monotonically non-decreasing in Y.',
      cols: {
        dCe: 'd (CE-FDH)', dCr: 'd (CR-FDH)', p: 'p (permutation)', nPeers: 'ceiling points',
        ceiling: 'Ceiling', zone: 'Zone', d: 'd', effect: 'Effect', accuracy: 'Accuracy',
        yLevel: 'level', yValue: 'Y value', xRequired: 'required', xPercent: 'required %',
      },
    },
    effect: {
      small: 'small', medium: 'medium', large: 'large', veryLarge: 'very large',
    },
    notes: {
      purposeTitle: 'Purpose',
      purpose:
        'Necessary Condition Analysis (NCA; Dul, 2016) examines whether X is a necessary but not sufficient condition for Y.\n' +
        'It answers:\n(1) Does reaching a level of Y require reaching a level of X? (is the upper-left empty)\n' +
        '(2) How strong is the necessity? (effect size d)\n(3) What minimum X is required for each Y level? (bottleneck table)',
      assumpTitle: 'Assumptions & boundaries',
      assumptions:
        '1. NCA is necessity logic — complementary to (not a substitute for) regression’s average incremental effect; a significant slope does not imply necessity, and vice versa.\n' +
        '2. Sensitive to outliers (a single upper-left point can shift the ceiling) — always inspect the scatterplot and robustness.\n' +
        '3. Scope defaults to empirical min/max; effect size changes with theoretical bounds (report both when relevant).\n' +
        '4. The permutation test is an approximate significance test; claim necessity only when d ≥ .1 and p < .05.',
      formulasTitle: 'Core formulas',
      formulaCeiling: 'CE-FDH: ceiling(x) = max{ y_i : x_i ≤ x } (non-decreasing step)',
      formulaScope: 'scope S = (X_max − X_min)(Y_max − Y_min)',
      formulaD: 'effect size d = ceiling zone C / scope S, range 0–1',
      readingTitle: 'How to read',
      reading:
        '1. Check effect size d and permutation p — claim necessity only when d ≥ .1 and p < .05.\n' +
        '2. Effect benchmarks (Dul): 0<d<.1 small, .1≤d<.3 medium, .3≤d<.5 large, d≥.5 very large.\n' +
        '3. Read the bottleneck table — minimum X required for each Y level; NN means X is not a bottleneck there.\n' +
        '4. CE-FDH (step) and CR-FDH (linear) side by side — agreement indicates robustness.',
      refTitle: 'References',
      ref:
        'Dul, J. (2016). Necessary Condition Analysis (NCA). Organizational Research Methods, 19(1), 10–52.\n' +
        'Dul, J., van der Laan, E., & Kuik, R. (2020). A statistical significance test for NCA. Organizational Research Methods.\n' +
        'Implemented from the R NCA package’s closed-form definitions; convention alignment pending local R spot-check (see validation-report).',
    },
    apa: {
      sentence:
        'Necessary Condition Analysis (NCA; Dul, 2016) indicated that {xLabel} is necessary for {yLabel} (CE-FDH d = {dCe}, a {effectWord} effect; CR-FDH d = {dCr}), with the effect size significant by an approximate permutation test (p = {pStr}, n = {n}). The bottleneck analysis reports the minimum {xLabel} required to reach each level of {yLabel}.',
      sentenceNs:
        'Necessary Condition Analysis (NCA; Dul, 2016) found insufficient evidence that {xLabel} is necessary for {yLabel} (CE-FDH d = {dCe}; CR-FDH d = {dCr}), with the approximate permutation test not significant (p = {pStr}, n = {n}).',
      copyHint: 'Copy APA narrative to clipboard',
    },
    interp: {
      sentence:
        'Conclusion: {xLabel} {concl} a necessary condition for {yLabel} (CE-FDH d = {d}, a {effectWord} effect, permutation p = {pStr}). ' +
        'When necessity holds, falling short on {xLabel} caps {yLabel} at a lower level; but a high {xLabel} does not guarantee a high {yLabel} (necessary, not sufficient).',
      supported: 'is',
      notSupported: 'is not sufficiently',
    },
  },
}
