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

  const state = {
    query: "",
    category: "all",
    usage: "all",
    highOnly: false,
    sort: "count",
    selectedParent: "",
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
    (record.lemmas || []).map((lemma) => {
      const parentName = lemma.parent_lemma_name || lemma.lemma_name;
      const sublemmaName = lemma.sublemma_name || lemma.lemma_name;
      const searchText = [
        record.problem_key,
        record.title,
        record.rating,
        parentName,
        sublemmaName,
        lemma.lemma_category,
        lemma.usage_type,
        lemma.confidence,
        lemma.strict_level,
        lemma.lemma_statement,
        lemma.why_nontrivial,
        lemma.evidence_basis,
        lemma.evidence_excerpt,
        lemma.source_provenance,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return {
        problemKey: record.problem_key,
        title: record.title,
        rating: record.rating,
        problemUrl: record.problem_url,
        editorialUrl: record.editorial_url,
        editorialQuality: record.editorial_quality,
        parentName,
        sublemmaName,
        parentStatement: lemma.parent_lemma_statement || lemma.lemma_statement,
        category: lemma.lemma_category,
        usageType: lemma.usage_type,
        statement: lemma.lemma_statement,
        whyNontrivial: lemma.why_nontrivial,
        evidenceBasis: lemma.evidence_basis,
        evidenceExcerpt: lemma.evidence_excerpt,
        sourceProvenance: lemma.source_provenance,
        confidence: lemma.confidence,
        strictLevel: lemma.strict_level || "core_theorem",
        searchText,
      };
    })
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

  function usageText(value) {
    if (value === "directly_used") return "直接使用";
    if (value === "related_underlying_lemma") return "相关底层";
    return value;
  }

  function confidenceText(value) {
    if (value === "high") return "高置信";
    if (value === "medium") return "中置信";
    if (value === "low") return "低置信";
    return value;
  }

  function levelText(value) {
    if (value === "core_theorem") return "核心定理";
    if (value === "named_formula") return "命名公式";
    if (value === "deep_structural_lemma") return "结构引理";
    return value;
  }

  function usageClass(value) {
    return value === "directly_used" ? "direct" : "related";
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

  function summarizeByParent(filtered) {
    const groups = new Map();
    for (const entry of filtered) {
      if (!groups.has(entry.parentName)) {
        groups.set(entry.parentName, {
          name: entry.parentName,
          statement: entry.parentStatement,
          categories: new Set(),
          entries: [],
          sublemmas: new Map(),
          directCount: 0,
          relatedCount: 0,
          highCount: 0,
          mediumCount: 0,
          maxRating: 0,
        });
      }
      const group = groups.get(entry.parentName);
      group.entries.push(entry);
      group.categories.add(entry.category);
      group.directCount += entry.usageType === "directly_used" ? 1 : 0;
      group.relatedCount += entry.usageType === "related_underlying_lemma" ? 1 : 0;
      group.highCount += entry.confidence === "high" ? 1 : 0;
      group.mediumCount += entry.confidence === "medium" ? 1 : 0;
      group.maxRating = Math.max(group.maxRating, Number(entry.rating || 0));
      if (!group.sublemmas.has(entry.sublemmaName)) {
        group.sublemmas.set(entry.sublemmaName, []);
      }
      group.sublemmas.get(entry.sublemmaName).push(entry);
    }
    return Array.from(groups.values());
  }

  function sortedParentGroups(groups) {
    return groups.slice().sort((left, right) => {
      if (state.sort === "name") return left.name.localeCompare(right.name, "zh-CN");
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
      ["无引理题", summary.problems_without_lemma_level_knowledge],
      ["严格条目", summary.lemma_entries],
      ["大引理", summary.unique_parent_lemmas],
      ["子引理", summary.unique_sublemmas],
      ["已剔除", summary.removed_trivial_or_broad_entries],
      ["中/低置信", `${summary.medium_confidence_entries || 0}/${summary.low_confidence_entries || 0}`],
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
    elements.categoryList.innerHTML = [
      { name: "all", label: "全部", count: entries.length },
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

  function renderParentList(groups) {
    if (!groups.length) {
      elements.lemmaList.innerHTML = '<div class="empty-state">没有匹配的非平凡引理/定理。</div>';
      return;
    }
    if (!groups.some((group) => group.name === state.selectedParent)) {
      state.selectedParent = groups[0].name;
    }
    elements.lemmaList.innerHTML = groups
      .map((group) => {
        const categoryText = Array.from(group.categories).sort((a, b) => categoryRank(a) - categoryRank(b)).join(" / ");
        return `
          <button class="lemma-row ${group.name === state.selectedParent ? "is-active" : ""}" data-parent="${escapeHtml(group.name)}" type="button">
            <div class="lemma-name">${escapeHtml(group.name)}</div>
            <div class="lemma-meta">
              <span class="tag">${escapeHtml(categoryText)}</span>
              <span class="tag">${group.sublemmas.size} 个子引理</span>
              <span class="tag">${group.entries.length} 题次</span>
              <span class="tag direct">${group.directCount} 直接</span>
              <span class="tag related">${group.relatedCount} 相关</span>
            </div>
          </button>
        `;
      })
      .join("");
  }

  function renderDetail(groups) {
    const group = groups.find((item) => item.name === state.selectedParent);
    if (!group) {
      elements.detailPanel.innerHTML = '<div class="empty-state">选择一个大引理/定理查看子引理和题目。</div>';
      return;
    }
    const categories = Array.from(group.categories).sort((a, b) => categoryRank(a) - categoryRank(b)).join(" / ");
    const sublemmaSections = Array.from(group.sublemmas.entries())
      .sort((left, right) => {
        const leftRating = Math.max(...left[1].map((entry) => Number(entry.rating || 0)));
        const rightRating = Math.max(...right[1].map((entry) => Number(entry.rating || 0)));
        return rightRating - leftRating || left[0].localeCompare(right[0], "zh-CN");
      })
      .map(([sublemmaName, subEntries]) => renderSublemmaSection(sublemmaName, subEntries))
      .join("");

    elements.detailPanel.innerHTML = `
      <div class="detail-header">
        <h2>${escapeHtml(group.name)}</h2>
        <div class="lemma-meta">
          <span class="tag">${escapeHtml(categories)}</span>
          <span class="tag">${group.sublemmas.size} 个子引理</span>
          <span class="tag">${group.entries.length} 条记录</span>
          <span class="tag high">${group.highCount} 高置信</span>
          <span class="tag medium">${group.mediumCount} 中置信</span>
        </div>
        <p class="statement">${escapeHtml(group.statement)}</p>
      </div>
      <div class="sublemma-list">${sublemmaSections}</div>
    `;
  }

  function renderSublemmaSection(sublemmaName, subEntries) {
    const sortedEntries = subEntries.slice().sort((left, right) => {
      return Number(right.rating || 0) - Number(left.rating || 0) || left.problemKey.localeCompare(right.problemKey);
    });
    const first = sortedEntries[0];
    return `
      <section class="sublemma-section">
        <div class="sublemma-head">
          <div>
            <h3>${escapeHtml(sublemmaName)}</h3>
            <p>${escapeHtml(first.statement)}</p>
          </div>
          <span class="tag">${sortedEntries.length} 题次</span>
        </div>
        <div class="problem-list">
          ${sortedEntries.map(renderProblemCard).join("")}
        </div>
      </section>
    `;
  }

  function renderProblemCard(entry) {
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
          <span class="tag ${usageClass(entry.usageType)}">${escapeHtml(usageText(entry.usageType))}</span>
          <span class="tag ${confidenceClass}">${escapeHtml(confidenceText(entry.confidence))}</span>
          <span class="tag">${escapeHtml(levelText(entry.strictLevel))}</span>
          <span class="tag">${escapeHtml(entry.evidenceBasis)}</span>
        </div>
        <div class="detail-grid">
          <div class="detail-label">为何非平凡</div>
          <div>${escapeHtml(entry.whyNontrivial)}</div>
          <div class="detail-label">证据来源</div>
          <div>${escapeHtml(entry.sourceProvenance)}</div>
        </div>
        <div class="excerpt"><strong>证据：</strong>${escapeHtml(entry.evidenceExcerpt)}</div>
      </article>
    `;
  }

  function render() {
    const currentEntries = filteredEntries();
    const groups = sortedParentGroups(summarizeByParent(currentEntries));
    elements.resultTitle.textContent = state.category === "all" ? "全部非平凡引理/定理" : state.category;
    elements.resultSubtitle.textContent = `${groups.length} 个大引理/定理，${currentEntries.length} 条题目记录`;
    renderCategories();
    renderParentList(groups);
    renderDetail(groups);
  }

  function bindEvents() {
    elements.searchInput.addEventListener("input", (event) => {
      state.query = event.target.value;
      state.selectedParent = "";
      render();
    });
    elements.highOnlyToggle.addEventListener("change", (event) => {
      state.highOnly = event.target.checked;
      state.selectedParent = "";
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
        state.selectedParent = "";
        render();
        return;
      }
      const usageButton = event.target.closest("[data-usage]");
      if (usageButton) {
        state.usage = usageButton.dataset.usage;
        state.selectedParent = "";
        document.querySelectorAll("[data-usage]").forEach((button) => button.classList.remove("is-active"));
        usageButton.classList.add("is-active");
        render();
        return;
      }
      const parentButton = event.target.closest("[data-parent]");
      if (parentButton) {
        state.selectedParent = parentButton.dataset.parent;
        render();
      }
    });
  }

  renderSummary();
  renderCategories();
  bindEvents();
  render();
})();
