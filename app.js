(function () {
  "use strict";

  const rawData = window.LEMMA_KNOWLEDGE || { summary: {}, records: [] };
  const categoryOrder = [
    "数论结论",
    "组合计数",
    "图论定理",
    "博弈结论",
    "字符串周期",
    "几何结论",
    "代数/多项式",
    "概率期望",
    "构造不变量",
    "其他非显然结论",
  ];


  const lemmaNameZh = new Map([
    ["Bayes' theorem", "贝叶斯定理"],
    ["Bertrand's postulate", "伯特兰猜想"],
    ["Burnside lemma / Pólya enumeration", "伯恩赛德引理 / 波利亚计数定理"],
    ["Bézout identity / gcd solvability", "裴蜀恒等式 / 最大公约数可解性判定"],
    ["Catalan structure / Catalan numbers", "卡特兰结构 / 卡特兰数"],
    ["Chinese remainder theorem / CRT", "中国剩余定理"],
    ["Convex DP difference Minkowski merge", "凸动态规划差分的闵可夫斯基合并"],
    ["Convex feasible-region intersection", "凸可行域交判定"],
    ["Cycle lemma / minimum-prefix rotation", "循环引理 / 最小前缀旋转"],
    ["Cyclotomic polynomial divisibility", "分圆多项式整除判定"],
    ["Deterministic strategy path-counting transform", "确定性策略路径计数转换"],
    ["Dilworth-style path cover / antichain duality", "狄尔沃斯型路径覆盖 / 反链对偶"],
    ["Dirichlet convolution", "狄利克雷卷积"],
    ["Discrete intermediate value theorem for submedians", "子中位数离散介值定理"],
    ["Erdős-Gallai theorem", "厄尔多什-加莱定理"],
    ["Euler's totient counting formula", "欧拉 φ 函数计数公式"],
    ["Eulerian numbers", "欧拉数"],
    ["Eulerian trail/circuit degree criterion", "欧拉路径/回路度数判定"],
    ["Functional graph cycle decomposition", "函数图环分解"],
    ["Generating-function coefficient extraction", "生成函数系数提取"],
    ["Geometric distribution expectation", "几何分布期望公式"],
    ["Graphic incidence matrix acyclicity determinant criterion", "图关联矩阵无环行列式判定"],
    ["Hall's marriage theorem", "霍尔婚姻定理"],
    ["Intersecting palindromes imply border structure", "相交回文推出字符串边界结构"],
    ["Lagrange's four-square theorem / 四平方定理", "拉格朗日四平方定理"],
    ["Legendre's formula for factorial valuations", "勒让德阶乘质因子指数公式"],
    ["Leibniz determinant expansion as cycle covers", "莱布尼茨行列式展开的环覆盖解释"],
    ["Linear basis k-th xor value criterion", "线性基第 k 小异或值判定"],
    ["Lucas / Kummer parity criterion", "卢卡斯/库默尔二项式奇偶判定"],
    ["Matrix determinant lemma", "矩阵行列式引理"],
    ["Max-flow min-cut theorem", "最大流最小割定理"],
    ["Maximal entangled set interval theorem", "极大纠缠集合区间定理"],
    ["Median condition as ±1 prefix-sum criterion", "中位数条件的正负一前缀和判定"],
    ["Minimum path cover via bipartite matching", "二分图匹配最小路径覆盖定理"],
    ["Minkowski sum", "闵可夫斯基和"],
    ["Misère Nim parity rule", "反常 Nim 奇偶规则"],
    ["Monotone lattice path binomial count", "单调格路二项式计数公式"],
    ["Multiplicative order / radical criterion", "乘法阶 / 根基判定"],
    ["Multivariate Lagrange inversion", "多元拉格朗日反演"],
    ["Möbius inversion", "莫比乌斯反演"],
    ["Nim xor winning criterion", "Nim 异或和胜负判定"],
    ["Nontrivial binomial identity", "非平凡二项式恒等式"],
    ["Odd divisor count iff perfect square", "约数个数为奇数当且仅当完全平方数"],
    ["Palindrome radius / boundary-crossing lemma", "回文半径 / 跨边界引理"],
    ["Period divisor inclusion-exclusion", "周期因子容斥"],
    ["Pigeonhole principle", "抽屉原理"],
    ["Principle of inclusion-exclusion", "容斥原理"],
    ["Prüfer code degree formula", "普吕弗序列度数公式"],
    ["Reflection principle for lattice paths", "格路反射原理"],
    ["Rooted-tree hook-length / topological order formula", "根树钩长 / 拓扑序计数公式"],
    ["Same-parent attachment theorem", "同父节点挂接定理"],
    ["Singleton latest theorem", "单点最晚条件可行性定理"],
    ["Sprague-Grundy theorem", "斯普拉格-格兰迪定理"],
    ["Stars and bars", "隔板法"],
    ["Stirling numbers of the second kind parity", "第二类斯特林数奇偶性判定"],
    ["String border transitivity / border-chain lemma", "字符串边界传递性 / 边界链引理"],
    ["Submask-supermask reachability criterion", "子集掩码到超集掩码可达性判定"],
    ["Totient-ratio jump bound", "欧拉函数比值跳变界"],
    ["Unique unbordered-prefix partition theorem", "唯一无边界前缀分解定理"],
    ["Variance as sum-of-squares identity", "方差转平方和恒等式"],
  ]);

  const state = {
    query: "",
    category: "all",
    usage: "all",
    highOnly: false,
    sort: "count",
    selectedLemma: "",
  };

  const elements = {
    summaryGrid: document.getElementById("summaryGrid"),
    searchInput: document.getElementById("searchInput"),
    categoryList: document.getElementById("categoryList"),
    highOnlyToggle: document.getElementById("highOnlyToggle"),
    sortSelect: document.getElementById("sortSelect"),
    resultTitle: document.getElementById("resultTitle"),
    resultSubtitle: document.getElementById("resultSubtitle"),
    lemmaList: document.getElementById("lemmaList"),
    detailPanel: document.getElementById("detailPanel"),
  };

  const entries = rawData.records.flatMap((record) =>
    (record.lemmas || []).map((lemma) => ({
      problemKey: record.problem_key,
      title: record.title,
      rating: record.rating,
      problemUrl: record.problem_url,
      editorialUrl: record.editorial_url,
      editorialQuality: record.editorial_quality,
      lemmaName: lemmaNameZh.get(lemma.lemma_name) || lemma.lemma_name,
      originalLemmaName: lemma.original_lemma_name || lemma.lemma_name,
      category: lemma.lemma_category,
      usageType: lemma.usage_type,
      statement: lemma.lemma_statement,
      whyNontrivial: lemma.why_nontrivial,
      evidenceBasis: lemma.evidence_basis,
      evidenceExcerpt: lemma.evidence_excerpt,
      sourceProvenance: lemma.source_provenance,
      confidence: lemma.confidence,
      searchText: [
        record.problem_key,
        record.title,
        record.rating,
        lemmaNameZh.get(lemma.lemma_name) || lemma.lemma_name,
        lemma.original_lemma_name || lemma.lemma_name,
        lemma.lemma_category,
        lemma.usage_type,
        lemma.lemma_statement,
        lemma.why_nontrivial,
        lemma.evidence_basis,
        lemma.evidence_excerpt,
        lemma.source_provenance,
        lemma.confidence,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    }))
  );

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatRating(value) {
    return value === null || value === undefined ? "未评级" : String(value);
  }

  function categoryRank(category) {
    const index = categoryOrder.indexOf(category);
    return index === -1 ? categoryOrder.length : index;
  }

  function summarizeByLemma(filteredEntries) {
    const groups = new Map();
    for (const entry of filteredEntries) {
      if (!groups.has(entry.lemmaName)) {
        groups.set(entry.lemmaName, {
          name: entry.lemmaName,
          category: entry.category,
          categories: new Set(),
          entries: [],
          directCount: 0,
          relatedCount: 0,
          highCount: 0,
          maxRating: 0,
        });
      }
      const group = groups.get(entry.lemmaName);
      group.entries.push(entry);
      group.categories.add(entry.category);
      group.directCount += entry.usageType === "directly_used" ? 1 : 0;
      group.relatedCount += entry.usageType === "related_underlying_lemma" ? 1 : 0;
      group.highCount += entry.confidence === "high" ? 1 : 0;
      group.maxRating = Math.max(group.maxRating, Number(entry.rating || 0));
    }
    return Array.from(groups.values());
  }

  function filteredEntries() {
    const query = state.query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (state.category !== "all" && entry.category !== state.category) return false;
      if (state.usage !== "all" && entry.usageType !== state.usage) return false;
      if (state.highOnly && entry.confidence !== "high") return false;
      if (query && !entry.searchText.includes(query)) return false;
      return true;
    });
  }

  function sortedLemmaGroups(groups) {
    return groups.slice().sort((left, right) => {
      if (state.sort === "name") {
        return left.name.localeCompare(right.name, "zh-CN");
      }
      if (state.sort === "rating") {
        return right.maxRating - left.maxRating || left.name.localeCompare(right.name, "zh-CN");
      }
      return right.entries.length - left.entries.length || left.name.localeCompare(right.name, "zh-CN");
    });
  }

  function categoryCounts() {
    const counts = new Map();
    for (const entry of entries) {
      counts.set(entry.category, (counts.get(entry.category) || 0) + 1);
    }
    return counts;
  }

  function renderSummary() {
    const summary = rawData.summary || {};
    const metrics = [
      ["扫描题目", summary.total_problems_scanned],
      ["有引理题", summary.problems_with_lemma_level_knowledge],
      ["引理条目", summary.lemma_entries],
      ["唯一引理", summary.unique_lemmas],
      ["直接使用", summary.directly_used],
      ["相关底层", summary.related_underlying_lemma],
      ["仅链接题解跳过", summary.url_only_skipped],
      ["低/中置信", `${summary.low_confidence_entries || 0}/${summary.medium_confidence_entries || 0}`],
    ];
    elements.summaryGrid.innerHTML = metrics
      .map(
        ([label, value]) => `
          <div class="metric">
            <div class="metric-value">${escapeHtml(value)}</div>
            <div class="metric-label">${escapeHtml(label)}</div>
          </div>
        `
      )
      .join("");
  }

  function renderCategories() {
    const counts = categoryCounts();
    const categories = Array.from(counts.keys()).sort((a, b) => {
      return categoryRank(a) - categoryRank(b) || a.localeCompare(b, "zh-CN");
    });
    const allCount = entries.length;
    elements.categoryList.innerHTML = [
      { name: "all", label: "全部", count: allCount },
      ...categories.map((name) => ({ name, label: name, count: counts.get(name) })),
    ]
      .map(
        (item) => `
          <button class="category-button ${state.category === item.name ? "is-active" : ""}" data-category="${escapeHtml(item.name)}" type="button">
            <span>${escapeHtml(item.label)}</span>
            <span class="count-pill">${escapeHtml(item.count)}</span>
          </button>
        `
      )
      .join("");
  }


  function usageText(value) {
    if (value === "directly_used") return "直接使用";
    if (value === "related_underlying_lemma") return "相关底层引理";
    return value;
  }

  function confidenceText(value) {
    if (value === "high") return "高置信";
    if (value === "medium") return "中置信";
    if (value === "low") return "低置信";
    return value;
  }

  function usageLabel(value) {
    return value === "directly_used" ? "direct" : "related";
  }

  function renderLemmaList(groups) {
    if (!groups.length) {
      elements.lemmaList.innerHTML = '<div class="empty-state">没有匹配的引理/定理。</div>';
      return;
    }
    if (!groups.some((group) => group.name === state.selectedLemma)) {
      state.selectedLemma = groups[0].name;
    }
    elements.lemmaList.innerHTML = groups
      .map((group) => {
        const categoryText = Array.from(group.categories).sort((a, b) => categoryRank(a) - categoryRank(b)).join(" / ");
        return `
          <button class="lemma-row ${group.name === state.selectedLemma ? "is-active" : ""}" data-lemma="${escapeHtml(group.name)}" type="button">
            <div class="lemma-name">${escapeHtml(group.name)}</div>
            <div class="lemma-meta">
              <span class="tag">${escapeHtml(categoryText)}</span>
              <span class="tag direct">${group.directCount} 直接使用</span>
              <span class="tag related">${group.relatedCount} 相关底层</span>
              <span class="tag high">${group.highCount} 高置信</span>
              <span class="tag">${group.entries.length} 题次</span>
            </div>
          </button>
        `;
      })
      .join("");
  }

  function renderDetail(groups) {
    const group = groups.find((item) => item.name === state.selectedLemma);
    if (!group) {
      elements.detailPanel.innerHTML = '<div class="empty-state">选择一个引理/定理查看题目。</div>';
      return;
    }
    const sortedEntries = group.entries.slice().sort((left, right) => {
      return Number(right.rating || 0) - Number(left.rating || 0) || left.problemKey.localeCompare(right.problemKey);
    });
    const first = sortedEntries[0];
    const categories = Array.from(group.categories).sort((a, b) => categoryRank(a) - categoryRank(b)).join(" / ");
    elements.detailPanel.innerHTML = `
      <div class="detail-header">
        <h2>${escapeHtml(group.name)}</h2>
        <div class="lemma-meta">
          <span class="tag">${escapeHtml(categories)}</span>
          <span class="tag direct">${group.directCount} 直接使用</span>
          <span class="tag related">${group.relatedCount} 相关底层</span>
          <span class="tag">${sortedEntries.length} 条记录</span>
        </div>
        <p class="statement">${escapeHtml(first.statement)}</p>
      </div>
      <div class="problem-list">
        ${sortedEntries.map(renderProblemCard).join("")}
      </div>
    `;
  }

  function renderProblemCard(entry) {
    const usageClass = usageLabel(entry.usageType);
    const confidenceClass = entry.confidence === "high" ? "high" : entry.confidence;
    return `
      <article class="problem-card">
        <div class="problem-head">
          <div>
            <div class="problem-title">${escapeHtml(entry.problemKey)} · ${escapeHtml(entry.title)}</div>
            <div class="problem-links">
              <a href="${escapeHtml(entry.problemUrl)}" target="_blank" rel="noreferrer">原题</a>
              <a href="${escapeHtml(entry.editorialUrl)}" target="_blank" rel="noreferrer">题解</a>
            </div>
          </div>
          <div class="rating">${escapeHtml(formatRating(entry.rating))}</div>
        </div>
        <div class="lemma-meta">
          <span class="tag ${usageClass}">${escapeHtml(usageText(entry.usageType))}</span>
          <span class="tag ${confidenceClass}">${escapeHtml(confidenceText(entry.confidence))}</span>
          <span class="tag">${escapeHtml(entry.evidenceBasis)}</span>
        </div>
        <div class="detail-grid">
          <div class="detail-label">为何非平凡</div>
          <div>${escapeHtml(entry.whyNontrivial)}</div>
          <div class="detail-label">证据来源</div>
          <div>${escapeHtml(entry.sourceProvenance)}</div>
        </div>
        <div class="excerpt"><strong>原文证据：</strong>${escapeHtml(entry.evidenceExcerpt)}</div>
      </article>
    `;
  }

  function render() {
    const currentEntries = filteredEntries();
    const groups = sortedLemmaGroups(summarizeByLemma(currentEntries));
    const categoryLabel = state.category === "all" ? "全部分类" : state.category;
    elements.resultTitle.textContent = categoryLabel;
    elements.resultSubtitle.textContent = `${groups.length} 个引理/定理，${currentEntries.length} 条题目记录`;
    renderCategories();
    renderLemmaList(groups);
    renderDetail(groups);
  }

  function bindEvents() {
    elements.searchInput.addEventListener("input", (event) => {
      state.query = event.target.value;
      state.selectedLemma = "";
      render();
    });
    elements.highOnlyToggle.addEventListener("change", (event) => {
      state.highOnly = event.target.checked;
      state.selectedLemma = "";
      render();
    });
    elements.sortSelect.addEventListener("change", (event) => {
      state.sort = event.target.value;
      render();
    });
    document.addEventListener("click", (event) => {
      const categoryButton = event.target.closest("[data-category]");
      if (categoryButton) {
        state.category = categoryButton.dataset.category;
        state.selectedLemma = "";
        render();
        return;
      }
      const usageButton = event.target.closest("[data-usage]");
      if (usageButton) {
        state.usage = usageButton.dataset.usage;
        state.selectedLemma = "";
        document.querySelectorAll("[data-usage]").forEach((button) => button.classList.remove("is-active"));
        usageButton.classList.add("is-active");
        render();
        return;
      }
      const lemmaButton = event.target.closest("[data-lemma]");
      if (lemmaButton) {
        state.selectedLemma = lemmaButton.dataset.lemma;
        render();
      }
    });
  }

  renderSummary();
  bindEvents();
  render();
})();
