(function () {
  "use strict";

  const rawData = window.CF_INSIGHTS_DATA || { summary: {}, contests: [], topics: [], columns: [] };
  const state = {
    query: "",
    topic: "all",
    minRating: "all",
    status: "all",
    contestType: "all",
    sort: "date-desc",
    view: "contests",
    selectedKey: "",
  };

  const elements = {
    summaryPanel: document.getElementById("summaryPanel"),
    searchInput: document.getElementById("searchInput"),
    topicSelect: document.getElementById("topicSelect"),
    minRatingSelect: document.getElementById("minRatingSelect"),
    statusSelect: document.getElementById("statusSelect"),
    contestTypes: document.getElementById("contestTypes"),
    randomButton: document.getElementById("randomButton"),
    sortSelect: document.getElementById("sortSelect"),
    resultTitle: document.getElementById("resultTitle"),
    resultSubtitle: document.getElementById("resultSubtitle"),
    contestTable: document.getElementById("contestTable"),
    detailPanel: document.getElementById("detailPanel"),
    navButtons: Array.from(document.querySelectorAll(".nav-button")),
  };

  const allProblems = rawData.contests.flatMap((contest) =>
    contest.problems.map((problem) => ({
      ...problem,
      contestId: contest.id,
      contestName: contest.name,
      contestDate: contest.date,
      contestType: contest.type,
      contestUrl: contest.url,
      searchText: [
        problem.key,
        problem.index,
        problem.title,
        problem.rating,
        problem.primaryTopic,
        ...(problem.secondaryTopics || []),
        ...(problem.originalTags || []),
        problem.statementBrief,
        problem.transformedStatement,
        ...(problem.keyObservations || []),
        problem.solutionBrief,
        contest.id,
        contest.name,
        contest.date,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    }))
  );

  const problemByKey = new Map(allProblems.map((problem) => [problem.key, problem]));
  const topicRank = new Map((rawData.topics || []).map((topic, index) => [topic, index]));

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderMath(root) {
    if (typeof window.renderMathInElement !== "function") return;
    window.renderMathInElement(root, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "\\[", right: "\\]", display: true },
        { left: "\\(", right: "\\)", display: false },
        { left: "$", right: "$", display: false },
      ],
      throwOnError: false,
      strict: "ignore",
    });
  }

  function ratingClass(rating) {
    if (!Number.isFinite(rating)) return "rating-gray";
    if (rating < 1200) return "rating-gray";
    if (rating < 1400) return "rating-green";
    if (rating < 1600) return "rating-cyan";
    if (rating < 1900) return "rating-blue";
    if (rating < 2100) return "rating-violet";
    if (rating < 2400) return "rating-orange";
    return "rating-red";
  }

  function statusText(status) {
    if (status === "missing_editorial") return "缺题解正文";
    if (status === "statement_only_missing_editorial") return "仅题意";
    if (status === "statement_derived") return "题面推导";
    if (status === "manual_override") return "有本地题解";
    if (status === "ai_generated_with_editorial") return "AI 题解摘要";
    if (status === "ai_generated_partial_editorial") return "AI 部分题解";
    if (status === "low_confidence") return "低置信度";
    return status || "未知";
  }

  function problemMatches(problem) {
    const query = state.query.trim().toLowerCase();
    if (state.topic !== "all" && problem.primaryTopic !== state.topic) return false;
    if (state.status !== "all" && problem.extractionStatus !== state.status) return false;
    if (state.minRating !== "all" && Number(problem.rating || 0) < Number(state.minRating)) return false;
    if (query && !problem.searchText.includes(query)) return false;
    return true;
  }

  function visibleContests() {
    const rows = rawData.contests
      .filter((contest) => state.contestType === "all" || contest.type === state.contestType)
      .map((contest) => ({
        ...contest,
        problems: contest.problems.filter((problem) => problemMatches({ ...problem, contestName: contest.name, contestDate: contest.date, contestType: contest.type, searchText: problemByKey.get(problem.key)?.searchText || "" })),
      }))
      .filter((contest) => contest.problems.length > 0);

    rows.sort((left, right) => {
      if (state.sort === "date-asc") return left.date.localeCompare(right.date) || left.id - right.id;
      if (state.sort === "max-rating") return Number(right.maxRating || 0) - Number(left.maxRating || 0) || right.id - left.id;
      if (state.sort === "problem-count") return right.problems.length - left.problems.length || right.id - left.id;
      return right.date.localeCompare(left.date) || right.id - left.id;
    });
    return rows;
  }

  function visibleProblems() {
    return allProblems.filter(problemMatches);
  }

  function renderSummary() {
    const summary = rawData.summary || {};
    const metrics = [
      ["竞赛", summary.contest_count],
      ["题目", summary.total_problems],
      ["有本地题解", summary.with_editorial_brief],
      ["缺题解正文", summary.missing_editorial_brief],
      ["人工覆写", summary.manual_override_count],
      ["AI 摘要", summary.ai_override_count || 0],
      ["大知识点", summary.primary_topic_count],
      ["难度范围", `${summary.rating_min || "-"}-${summary.rating_max || "-"}`],
    ];
    elements.summaryPanel.innerHTML = metrics
      .map(
        ([label, value]) => `
          <div class="metric">
            <div class="metric-value">${escapeHtml(value)}</div>
            <div class="metric-label">${escapeHtml(label)}</div>
          </div>
        `,
      )
      .join("");
  }

  function renderControls() {
    elements.topicSelect.innerHTML = [
      '<option value="all">全部</option>',
      ...rawData.topics.map((topic) => `<option value="${escapeHtml(topic)}">${escapeHtml(topic)} (${escapeHtml(rawData.topicCounts[topic] || 0)})</option>`),
    ].join("");
    elements.topicSelect.value = state.topic;
    elements.minRatingSelect.innerHTML = ["all", 800, 1200, 1600, 1900, 2100, 2400, 2700, 3000]
      .map((rating) => `<option value="${rating}">${rating === "all" ? "全部" : `${rating}+`}</option>`)
      .join("");
    elements.minRatingSelect.value = state.minRating;
    elements.statusSelect.value = state.status;
    const typeCounts = new Map();
    for (const contest of rawData.contests) typeCounts.set(contest.type, (typeCounts.get(contest.type) || 0) + 1);
    const items = [{ type: "all", label: "全部", count: rawData.contests.length }].concat(
      rawData.contestTypes.map((type) => ({ type, label: type, count: typeCounts.get(type) || 0 })).filter((item) => item.count > 0),
    );
    elements.contestTypes.innerHTML = items
      .map(
        (item) => `
          <button class="type-button ${state.contestType === item.type ? "is-active" : ""}" type="button" data-type="${escapeHtml(item.type)}">
            ${escapeHtml(item.label)}<span class="count-pill">${escapeHtml(item.count)}</span>
          </button>
        `,
      )
      .join("");
  }

  function renderContestView() {
    const rows = visibleContests();
    const problemCount = rows.reduce((sum, contest) => sum + contest.problems.length, 0);
    elements.resultTitle.textContent = "Contests";
    elements.resultSubtitle.textContent = `Showing ${problemCount} of ${allProblems.length} problems in ${rows.length} contests`;
    elements.contestTable.style.display = "";
    if (!rows.length) {
      elements.contestTable.innerHTML = '<tbody><tr><td class="empty-state">没有匹配的题目。</td></tr></tbody>';
      renderDetail();
      return;
    }

    if (!problemByKey.has(state.selectedKey) || !visibleProblems().some((problem) => problem.key === state.selectedKey)) {
      state.selectedKey = rows[0].problems[0].key;
    }

    const columns = rawData.columns || ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
    const head = `
      <thead>
        <tr>
          <th class="rank-head">#</th>
          <th class="contest-head">Contest</th>
          ${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}
        </tr>
      </thead>
    `;
    const body = rows
      .map((contest, rowIndex) => {
        const bySlot = new Map();
        for (const problem of contest.problems) {
          if (!bySlot.has(problem.slot)) bySlot.set(problem.slot, []);
          bySlot.get(problem.slot).push(problem);
        }
        return `
          <tr>
            <td class="rank-cell">${rowIndex + 1}</td>
            <td class="contest-cell">
              <a class="contest-name" href="${escapeHtml(contest.url)}" target="_blank" rel="noreferrer">CF ${escapeHtml(contest.id)}</a>
              <div>${escapeHtml(contest.name)}</div>
              <div class="contest-meta">${escapeHtml(contest.date || "无日期")} · ${escapeHtml(contest.type)} · ${escapeHtml(contest.problemCount)} 题</div>
            </td>
            ${columns.map((column) => `<td class="problem-cell">${renderProblemStack(bySlot.get(column) || [])}</td>`).join("")}
          </tr>
        `;
      })
      .join("");
    elements.contestTable.innerHTML = head + `<tbody>${body}</tbody>`;
    renderDetail();
  }

  function renderProblemStack(problems) {
    if (!problems.length) return "";
    return `
      <div class="problem-stack">
        ${problems
          .map((problem) => {
            const full = problemByKey.get(problem.key) || problem;
            return `
              <button class="problem-chip ${state.selectedKey === problem.key ? "is-active" : ""} ${problem.extractionStatus === "missing_editorial" ? "is-missing" : ""}"
                type="button" data-problem-key="${escapeHtml(problem.key)}" title="${escapeHtml(problem.title)}">
                <div><span class="chip-index">${escapeHtml(problem.index)}</span> <span class="${ratingClass(problem.rating)}">${escapeHtml(problem.rating || "N/A")}</span></div>
                <div class="chip-title">${escapeHtml(problem.title)}</div>
                <div class="chip-meta"><span>${escapeHtml(full.primaryTopic)}</span><span>${escapeHtml(statusText(problem.extractionStatus))}</span></div>
              </button>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderTopicsView() {
    const problems = visibleProblems().slice().sort((left, right) => {
      const rank = (topicRank.get(left.primaryTopic) ?? 999) - (topicRank.get(right.primaryTopic) ?? 999);
      return rank || Number(right.rating || 0) - Number(left.rating || 0) || left.key.localeCompare(right.key);
    });
    elements.resultTitle.textContent = "Topics";
    elements.resultSubtitle.textContent = `Showing ${problems.length} of ${allProblems.length} problems`;
    const groups = new Map();
    for (const problem of problems) {
      if (!groups.has(problem.primaryTopic)) groups.set(problem.primaryTopic, []);
      groups.get(problem.primaryTopic).push(problem);
    }
    if (!problems.length) {
      elements.contestTable.innerHTML = '<tbody><tr><td class="empty-state">没有匹配的题目。</td></tr></tbody>';
      renderDetail();
      return;
    }
    const html = `
      <tbody><tr><td class="topic-view">
        ${Array.from(groups.entries())
          .map(
            ([topic, items]) => `
              <section class="topic-block">
                <h2>${escapeHtml(topic)} <span class="count-pill">${escapeHtml(items.length)}</span></h2>
                <div class="topic-problems">
                  ${items
                    .map((problem) => `<button type="button" data-problem-key="${escapeHtml(problem.key)}">${escapeHtml(problem.key)} · ${escapeHtml(problem.title)} · ${escapeHtml(problem.rating || "N/A")}</button>`)
                    .join("")}
                </div>
              </section>
            `,
          )
          .join("")}
      </td></tr></tbody>
    `;
    elements.contestTable.innerHTML = html;
    if (!problemByKey.has(state.selectedKey) || !problems.some((problem) => problem.key === state.selectedKey)) {
      state.selectedKey = problems[0].key;
    }
    renderDetail();
  }

  function renderDetail() {
    const problem = problemByKey.get(state.selectedKey);
    if (!problem) {
      elements.detailPanel.innerHTML = '<div class="detail-empty">选择一道题查看题意、转换和关键观察。</div>';
      return;
    }
    const observationHtml = problem.keyObservations.length
      ? `<ul class="observations">${problem.keyObservations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
      : '<p class="muted">本地题解正文不足，未补写关键观察。</p>';
    const tags = [problem.primaryTopic, ...(problem.secondaryTopics || [])];
    elements.detailPanel.innerHTML = `
      <article class="detail-content">
        <div class="detail-top">
          <div>
            <h2 class="detail-title">${escapeHtml(problem.key)} · ${escapeHtml(problem.title)}</h2>
            <div class="contest-meta">${escapeHtml(problem.contestName)} · ${escapeHtml(problem.contestDate || "无日期")}</div>
          </div>
          <div class="detail-rating ${ratingClass(problem.rating)}">${escapeHtml(problem.rating || "N/A")}</div>
        </div>
        <div class="detail-links">
          <a href="${escapeHtml(problem.problemUrl)}" target="_blank" rel="noreferrer">原题</a>
          <a href="${escapeHtml(problem.editorialUrl)}" target="_blank" rel="noreferrer">题解</a>
          <a href="${escapeHtml(problem.contestUrl)}" target="_blank" rel="noreferrer">竞赛</a>
        </div>
        <div class="tag-row">
          ${tags.map((tag, index) => `<span class="tag ${index === 0 ? "topic" : ""}">${escapeHtml(tag)}</span>`).join("")}
          <span class="tag ${problem.extractionStatus === "missing_editorial" ? "missing" : ""}">${escapeHtml(statusText(problem.extractionStatus))}</span>
        </div>
        <section class="detail-section">
          <h3>题意</h3>
          <p>${escapeHtml(problem.statementBrief)}</p>
        </section>
        <section class="detail-section">
          <h3>转换</h3>
          <p>${escapeHtml(problem.transformedStatement)}</p>
        </section>
        <section class="detail-section">
          <h3>关键观察</h3>
          ${observationHtml}
        </section>
        <section class="detail-section">
          <h3>简要题解</h3>
          <p>${escapeHtml(problem.solutionBrief)}</p>
        </section>
        <section class="detail-section">
          <h3>原始标签</h3>
          <p>${escapeHtml((problem.originalTags || []).join(", ") || "无")}</p>
        </section>
      </article>
    `;
    renderMath(elements.detailPanel);
  }

  function render() {
    renderControls();
    for (const button of elements.navButtons) {
      button.classList.toggle("is-active", button.dataset.view === state.view);
    }
    if (state.view === "topics") renderTopicsView();
    else renderContestView();
  }

  function bindEvents() {
    elements.searchInput.addEventListener("input", () => {
      state.query = elements.searchInput.value;
      render();
    });
    elements.topicSelect.addEventListener("change", () => {
      state.topic = elements.topicSelect.value;
      render();
    });
    elements.minRatingSelect.addEventListener("change", () => {
      state.minRating = elements.minRatingSelect.value;
      render();
    });
    elements.statusSelect.addEventListener("change", () => {
      state.status = elements.statusSelect.value;
      render();
    });
    elements.sortSelect.addEventListener("change", () => {
      state.sort = elements.sortSelect.value;
      render();
    });
    elements.contestTypes.addEventListener("click", (event) => {
      const button = event.target.closest("[data-type]");
      if (!button) return;
      state.contestType = button.dataset.type;
      render();
    });
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-problem-key]");
      if (!button) return;
      state.selectedKey = button.dataset.problemKey;
      render();
    });
    elements.randomButton.addEventListener("click", () => {
      const problems = visibleProblems();
      if (!problems.length) return;
      const next = problems[Math.floor(Math.random() * problems.length)];
      state.selectedKey = next.key;
      state.view = "contests";
      render();
    });
    for (const button of elements.navButtons) {
      button.addEventListener("click", () => {
        state.view = button.dataset.view;
        render();
      });
    }
  }

  renderSummary();
  renderControls();
  bindEvents();
  render();
})();
