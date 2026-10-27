import { importanceLabel } from "./extractor.js";
import { extractPlannerInput } from "./intent.js";
import {
  formatPeriodRange,
  normalizeScope,
  normalizeScopeBasis,
  periodRange,
  scopeBasisLabel,
  scopeLabel
} from "./periods.js";
import {
  PlanStore,
  dateFromDayKey,
  dayKey
} from "./store.js";
import {
  toggledDaySet,
  visibleTasksForDay
} from "./ui-state.js";
import {
  appendFinalTranscript,
  chooseBestTranscript,
  refineSpeechTranscript
} from "./speech-text.js";

const APP_VERSION = "1.14.1";

const elements = {
  header: document.querySelector("#appHeader"),
  content: document.querySelector("#appContent"),
  draft: document.querySelector("#draftInput"),
  mic: document.querySelector("#micButton"),
  recording: document.querySelector("#recordingIndicator"),
  date: document.querySelector("#dateInput"),
  importance: document.querySelector("#importanceInput"),
  importanceControl: document.querySelector(".importance-control"),
  save: document.querySelector("#saveButton"),
  reviewModal: document.querySelector("#reviewModal"),
  reviewTitle: document.querySelector("#reviewTitle"),
  reviewSummary: document.querySelector("#reviewSummary"),
  eventReviewList: document.querySelector("#eventReviewList"),
  reviewList: document.querySelector("#reviewList"),
  keywordWrap: document.querySelector("#keywordWrap"),
  originalTranscript: document.querySelector("#originalTranscript"),
  confirmReview: document.querySelector("#confirmReview"),
  actionModal: document.querySelector("#actionModal"),
  actionTitle: document.querySelector("#actionTitle"),
  actionMessage: document.querySelector("#actionMessage"),
  actionButtons: document.querySelector("#actionButtons"),
  installModal: document.querySelector("#installModal"),
  toast: document.querySelector("#toast")
};

const store = new PlanStore(window.localStorage);
const appState = {
  route: "home",
  day: null,
  mode: "smart",
  review: null,
  actionButtons: [],
  recognition: null,
  speechSupported: false,
  recording: false,
  speechHandled: false,
  finalTranscript: "",
  recordingIntent: false,
  silenceTimer: 0,
  restartTimer: 0,
  maxDurationTimer: 0,
  recordingStartedAt: 0,
  lastSpeechAt: 0,
  lastFinalAt: 0,
  pauseBeforeNextFinal: false,
  expandedDays: new Set(),
  homePanels: {
    dates: false,
    big: false
  },
  toastTimer: 0
};

init();

function init() {
  elements.date.value = dayKey(new Date());
  parseRoute();
  setupSpeechRecognition();
  bindEvents();
  store.subscribe(() => render());
  render();
  registerServiceWorker();
}

function bindEvents() {
  window.addEventListener("hashchange", () => {
    parseRoute();
    syncDateToRoute();
    render();
    window.scrollTo({ top: 0 });
    elements.content.scrollTop = 0;
  });

  document.addEventListener("click", handleClick);
  elements.draft.addEventListener("input", () => {
    resizeDraft();
    updateComposerState();
  });
  elements.importance.addEventListener("change", () => {
    elements.importanceControl.dataset.importance = elements.importance.value;
  });
  elements.reviewModal.addEventListener("input", syncReviewField);
  elements.reviewModal.addEventListener("change", syncReviewField);
  window.addEventListener("online", () => showToast("网络已恢复"));
  window.addEventListener("offline", () => showToast("已离线，数据仍保存在本机"));
}

function handleClick(event) {
  const actionElement = event.target.closest("[data-action]");
  if (actionElement) {
    event.preventDefault();
    const action = actionElement.dataset.action;
    if (action === "open-day") navigateToDay(actionElement.dataset.day);
    if (action === "toggle-day") toggleDayExpanded(actionElement.dataset.day);
    if (action === "go-home") goHome();
    if (action === "install") openInstallHelp();
    if (action === "toggle-complete") handleToggleComplete(actionElement.dataset.id);
    if (action === "delete") handleDelete(actionElement.dataset.id);
    if (action === "quick-complete-delete") {
      store.complete(actionElement.dataset.id, false);
      showToast("已完成并删除");
    }
    if (action === "toggle-home-panel") {
      toggleHomePanel(actionElement.dataset.panel);
    }
    return;
  }

  const modeButton = event.target.closest("[data-mode]");
  if (modeButton) {
    setMode(modeButton.dataset.mode);
    return;
  }

  if (event.target.closest("[data-close-review]")) {
    closeReview();
    return;
  }

  if (event.target.closest("[data-close-install]")) {
    elements.installModal.hidden = true;
    return;
  }

  const reviewRemove = event.target.closest("[data-remove-review]");
  if (reviewRemove) {
    const index = Number(reviewRemove.dataset.removeReview);
    appState.review.plans.splice(index, 1);
    renderReview();
    return;
  }

  const eventRemove = event.target.closest("[data-remove-event]");
  if (eventRemove) {
    const index = Number(eventRemove.dataset.removeEvent);
    appState.review.events.splice(index, 1);
    for (const plan of appState.review.plans) {
      if (!Number.isInteger(plan.deadlineEventIndex)) continue;
      if (plan.deadlineEventIndex === index) {
        plan.deadlineEventIndex = null;
      } else if (plan.deadlineEventIndex > index) {
        plan.deadlineEventIndex -= 1;
      }
    }
    renderReview();
    return;
  }

  const actionChoice = event.target.closest("[data-action-choice]");
  if (actionChoice) {
    const choice = appState.actionButtons[Number(actionChoice.dataset.actionChoice)];
    closeActionModal();
    choice?.handler();
    return;
  }

  if (event.target === elements.reviewModal) closeReview();
  if (event.target === elements.actionModal) closeActionModal();
  if (event.target === elements.installModal) elements.installModal.hidden = true;

  if (event.target.closest("#micButton")) toggleRecording();
  if (event.target.closest("#saveButton")) submitDraft();
  if (event.target.closest("#confirmReview")) confirmReview();
}

function render() {
  renderHeader();
  renderContent();
  updateComposerState();
}

function renderHeader() {
  const standalone =
    window.navigator.standalone ||
    window.matchMedia("(display-mode: standalone)").matches;
  const installButton = standalone
    ? ""
    : `<button class="header-button" type="button" data-action="install" aria-label="安装到主屏幕" title="安装到主屏幕">
         ${icon("download")}
       </button>`;

  if (appState.route === "day" && appState.day) {
    const day = dateFromDayKey(appState.day);
    elements.header.innerHTML = `
      <div class="header-row">
        <button class="header-button" type="button" data-action="go-home" aria-label="返回主页">
          ${icon("chevron-left")}
        </button>
        <div class="header-copy">
          <h1 class="header-title">当天计划</h1>
          <p class="header-subtitle">
            <strong>${escapeHTML(formatDayHeader(day))}</strong>
            <span>${escapeHTML(relativeDayLabel(day))}</span>
          </p>
        </div>
        ${installButton}
      </div>
    `;
    return;
  }

  const now = new Date();
  elements.header.innerHTML = `
    <div class="header-row">
      <div class="header-copy">
        <div class="header-title-row">
          <h1 class="header-title">张梓濠的小计划</h1>
          <span class="header-version">v${APP_VERSION}</span>
        </div>
        <p class="header-subtitle">
          <strong>${escapeHTML(formatMonthDay(now))} · ${escapeHTML(formatWeekday(now))}</strong>
          <span>把说过的事变成能推进的步骤</span>
        </p>
      </div>
      ${installButton}
    </div>
  `;
}

function renderContent() {
  if (appState.route === "day" && appState.day) {
    renderDayDetail();
  } else {
    renderHome();
  }
}

function renderHome() {
  const groups = store.groupedByDayNewestFirst();
  const statuses = homeStatusHTML();
  const summary = summaryBarHTML([
    ["待完成", store.pendingCount(), ""],
    ["高重要", store.highPendingCount(), "high"],
    ["今天", store.todayCount(), "medium"]
  ]);

  if (groups.length === 0) {
    elements.content.innerHTML = `
      ${statuses}
      ${summary}
      <div class="empty-state">
        ${icon("mic")}
        <strong>还没有计划</strong>
        <span>说一句或写一句，重要信息会留在计划里</span>
      </div>
    `;
    return;
  }

  elements.content.innerHTML = `
    ${statuses}
    ${summary}
    <div class="day-list">
      ${groups.map(dayCardHTML).join("")}
    </div>
  `;
}

function homeStatusHTML() {
  const events = store.upcomingEvents();
  const bigPlans = store.bigPlans();
  const nextEvent = events[0];
  const eventSummary = nextEvent
    ? `${formatMonthDay(nextEvent.date)} · ${nextEvent.title}`
    : "暂无重要日期";
  const bigSummary = bigPlans.length
    ? `${bigPlans.length} 项进行中`
    : "暂无大计划";

  return `
    <section class="home-status-row" aria-label="计划概览">
      <aside
        class="home-status-card${appState.homePanels.dates ? " is-expanded" : ""}"
        data-home-status="dates"
      >
        <button
          class="status-trigger"
          type="button"
          data-action="toggle-home-panel"
          data-panel="dates"
          aria-expanded="${appState.homePanels.dates}"
        >
          <span class="status-icon">${icon("flag")}</span>
          <span class="status-copy">
            <strong>重要日期${events.length > 1 ? ` · ${events.length}` : ""}</strong>
            <small>${escapeHTML(eventSummary)}</small>
          </span>
          <span class="status-chevron">${icon("chevron-down")}</span>
        </button>
        <div class="status-panel">
          <div class="status-panel-inner">
            ${events.length
              ? events.map(importantEventStatusHTML).join("")
              : `<p class="status-empty">说出日期和重要事件后，会在这里汇总截止计划。</p>`}
          </div>
        </div>
      </aside>

      <aside
        class="home-status-card big-status-card${appState.homePanels.big ? " is-expanded" : ""}"
        data-home-status="big"
      >
        <button
          class="status-trigger"
          type="button"
          data-action="toggle-home-panel"
          data-panel="big"
          aria-expanded="${appState.homePanels.big}"
        >
          <span class="status-icon">${icon("calendar")}</span>
          <span class="status-copy">
            <strong>大计划</strong>
            <small>${escapeHTML(bigSummary)}</small>
          </span>
          <span class="status-chevron">${icon("chevron-down")}</span>
        </button>
        <div class="status-panel">
          <div class="status-panel-inner">
            ${["week", "month", "year"].map((scope) =>
              bigPlanGroupHTML(scope)
            ).join("")}
          </div>
        </div>
      </aside>
    </section>
  `;
}

function importantEventStatusHTML(event) {
  const duePlans = store.plansDueByEvent(event);
  return `
    <article class="event-status-item">
      <div class="event-status-head">
        <span>
          <strong>${escapeHTML(formatMonthDay(event.date))}</strong>
          <small>${escapeHTML(relativeDayLabel(event.date))}</small>
        </span>
        <b>${escapeHTML(event.title)}</b>
      </div>
      <div class="event-plan-list">
        ${duePlans.length
          ? duePlans.slice(0, 8).map((plan) => `
              <div class="event-plan-item" data-importance="${plan.importance}">
                <span>${escapeHTML(plan.text)}</span>
                <small>${escapeHTML(formatMonthDay(plan.date))}</small>
              </div>
            `).join("")
          : `<p class="status-empty">暂无截止到该日期的计划</p>`}
      </div>
    </article>
  `;
}

function bigPlanGroupHTML(scope) {
  const items = store.bigPlansByScope(scope);
  return `
    <section class="big-plan-group">
      <header>
        <strong>${scopeLabel(scope)}</strong>
        <span>${items.length} 项</span>
      </header>
      ${items.length
        ? items.map((plan) => `
            <article class="big-plan-item" data-importance="${plan.importance}">
              <div class="big-plan-head">
                <button
                  class="task-check quick-complete"
                  type="button"
                  data-action="quick-complete-delete"
                  data-id="${plan.id}"
                  aria-label="完成并删除${scopeLabel(scope)}"
                  title="完成并删除"
                >${icon("circle")}</button>
                <span>${escapeHTML(plan.text)}</span>
              </div>
              <small>
                ${escapeHTML(scopeBasisLabel(plan.scopeBasis, plan.scope))}
                · ${escapeHTML(formatPeriodRange({
                  start: plan.scopeStart,
                  end: plan.scopeEnd
                }))}
              </small>
            </article>
          `).join("")
        : `<p class="status-empty">暂无${scopeLabel(scope)}</p>`}
    </section>
  `;
}

function toggleHomePanel(panel) {
  if (!["dates", "big"].includes(panel)) return;
  appState.homePanels[panel] = !appState.homePanels[panel];
  const card = document.querySelector(`[data-home-status="${panel}"]`);
  const trigger = card?.querySelector(".status-trigger");
  card?.classList.toggle("is-expanded", appState.homePanels[panel]);
  trigger?.setAttribute("aria-expanded", String(appState.homePanels[panel]));
}

function renderDayDetail() {
  const items = store.plansForDay(appState.day);
  const highCount = items.filter(
    (item) => !item.isCompleted && item.importance === "high"
  ).length;
  const pendingCount = items.filter((item) => !item.isCompleted).length;
  const summary = summaryBarHTML([
    ["待完成", pendingCount, ""],
    ["高重要", highCount, "high"],
    ["全部", items.length, "medium"]
  ]);

  const list = items.length
    ? `<div class="task-list detail-list">${items.map((item) => taskRowHTML(item, true)).join("")}</div>`
    : `<div class="empty-state">
         ${icon("calendar")}
         <strong>这一天还没有计划</strong>
         <span>可以从下方继续补充</span>
       </div>`;

  elements.content.innerHTML = `
    ${summary}
    ${list}
  `;
}

function summaryBarHTML(items) {
  return `
    <section class="summary-bar" aria-label="计划统计">
      ${items.map(([label, number, tone]) => `
        <div class="summary-item" ${tone ? `data-tone="${tone}"` : ""}>
          <span class="summary-number">${number}</span>
          <span class="summary-label">${label}</span>
        </div>
      `).join("")}
    </section>
  `;
}

function dayCardHTML(group) {
  const expanded = appState.expandedDays.has(group.key);
  const visibleItems = visibleTasksForDay(group.items, expanded);
  const taskContent = visibleItems.length
    ? `<div class="task-list">${visibleItems.map((item) => taskRowHTML(item, false, expanded)).join("")}</div>`
    : `<div class="no-high-row">${expanded ? "当天没有任务" : "暂无高重要任务"}</div>`;

  return `
    <article class="day-card${expanded ? " is-expanded" : ""}">
      <div class="day-card-header">
        <button
          class="day-toggle"
          type="button"
          data-action="toggle-day"
          data-day="${group.key}"
          aria-expanded="${expanded}"
        >
          <span class="day-card-date">
            <strong>${escapeHTML(formatDayHeader(group.date))}</strong>
            <small>${escapeHTML(relativeDayLabel(group.date))}</small>
          </span>
          <span class="day-card-count">${group.items.length} 项</span>
          <span class="day-chevron">${icon("chevron-down")}</span>
        </button>
        <button
          class="day-card-open"
          type="button"
          data-action="open-day"
          data-day="${group.key}"
          aria-label="查看当天全部计划"
        >${icon("chevron-right")}</button>
      </div>
      ${taskContent}
    </article>
  `;
}

function toggleDayExpanded(key) {
  if (!key) return;
  appState.expandedDays = toggledDaySet(appState.expandedDays, key);
  renderContent();
}

function taskRowHTML(item, detailed, quickComplete = false) {
  const completedClass = item.isCompleted ? " is-completed" : "";
  const detailClass = detailed ? " is-detailed" : "";
  const completionControl = detailed
    ? `<button
         class="task-check"
         type="button"
         data-action="toggle-complete"
         data-id="${item.id}"
         aria-label="${item.isCompleted ? "恢复任务" : "完成任务"}"
       >${icon(item.isCompleted ? "check-circle" : "circle")}</button>`
    : quickComplete && !item.isCompleted
      ? `<button
           class="task-check quick-complete"
           type="button"
           data-action="quick-complete-delete"
           data-id="${item.id}"
           aria-label="完成并删除计划"
           title="完成并删除"
         >${icon("circle")}</button>`
    : `<span class="task-check" aria-hidden="true">${icon(item.isCompleted ? "check-circle" : "circle")}</span>`;

  const time = formatTime(item.date);
  const meta = `
    <div class="task-meta">
      <span class="importance-pill">${escapeHTML(importanceLabel(item.importance))}</span>
      ${detailed ? `<span class="task-date-label">${escapeHTML(formatMonthDay(item.date))}</span>` : ""}
      ${detailed && time ? `<span class="task-time">${escapeHTML(time)}</span>` : ""}
      ${item.isCompleted ? `<span class="task-time">已完成</span>` : ""}
    </div>
  `;

  return `
    <article
      class="task-row${completedClass}${detailClass}"
      data-importance="${item.importance}"
      data-id="${item.id}"
    >
      ${completionControl}
      <div class="task-copy">
        <div class="task-text" title="${escapeHTML(item.text)}">${escapeHTML(item.text)}</div>
        ${meta}
      </div>
      ${detailed ? `
        <div class="task-actions">
          <button class="task-action" type="button" data-action="delete" data-id="${item.id}" aria-label="删除计划">
            ${icon("trash")}
          </button>
        </div>
      ` : "<span></span>"}
    </article>
  `;
}

function setMode(mode) {
  if (!["smart", "raw"].includes(mode)) return;
  appState.mode = mode;
  for (const button of document.querySelectorAll("[data-mode]")) {
    button.classList.toggle("is-active", button.dataset.mode === mode);
  }
  updateComposerState();
}

function submitDraft() {
  const text = elements.draft.value.trim();
  if (!text) return;

  if (appState.recording) stopRecording();
  elements.draft.blur();

  if (appState.mode === "smart") {
    prepareReview(text);
  } else {
    const date = dateAtNoon(elements.date.value || dayKey(new Date()));
    store.addRaw(text, date, elements.importance.value);
    finishComposer("已按原样加入");
  }
}

function prepareReview(text) {
  const result = extractPlannerInput(text, {
    referenceDate: new Date(),
    defaultDate: dateAtNoon(elements.date.value || dayKey(new Date())),
    defaultImportance: elements.importance.value
  });

  if (!result.plans.length && !result.events.length) {
    clearDraftInput();
    openNoPlanNotice();
    return;
  }

  appState.review = {
    originalText: text,
    summary: result.summary,
    keywords: result.keywords,
    removedFillerCount: result.removedFillerCount,
    events: result.events.map((event) => ({
      title: event.title,
      date: event.date.toISOString(),
      dateInput: toDateInput(event.date)
    })),
    plans: result.plans.map((plan) => ({
      ...plan,
      scope: normalizeScope(plan.scope),
      scopeBasis: normalizeScopeBasis(plan.scopeBasis, plan.scope),
      dateInput: toLocalDateTimeInput(
        normalizeScope(plan.scope) === "day" ? plan.date : plan.scopeStart
      )
    }))
  };
  renderReview();
  elements.reviewModal.hidden = false;
  requestAnimationFrame(() => {
    elements.reviewModal.querySelector(".review-text")?.focus();
  });
}

function openNoPlanNotice() {
  openActionModal({
    title: "没有提取出计划",
    message: "这句话更像描述、感受或补充信息。请补充具体动作和对象，例如“提交报告”。",
    buttons: [
      {
        label: "继续修改",
        handler: () => {
          elements.draft.focus();
        }
      }
    ]
  });
}

function renderReview() {
  const review = appState.review;
  if (!review) return;

  elements.reviewTitle.textContent =
    `确认整理结果 · ${review.plans.length} 项计划` +
    (review.events.length ? ` · ${review.events.length} 个重要日期` : "");
  elements.reviewSummary.textContent =
    review.summary ||
    (review.removedFillerCount > 0
      ? `已清理语气词，可继续调整`
      : `计划范围、日期与重要性可继续调整`);

  elements.eventReviewList.hidden = review.events.length === 0;
  elements.eventReviewList.innerHTML = review.events
    .map((event, index) => eventReviewItemHTML(event, index))
    .join("");

  elements.reviewList.innerHTML = review.plans.length
    ? review.plans.map((plan, index) => reviewItemHTML(plan, index)).join("")
    : `<div class="empty-state"><strong>没有待加入的项目</strong><span>关闭窗口后可以重新输入</span></div>`;

  elements.keywordWrap.hidden = review.keywords.length === 0;
  elements.keywordWrap.innerHTML = review.keywords
    .map((keyword) => `<span class="keyword">${escapeHTML(keyword)}</span>`)
    .join("");
  elements.originalTranscript.textContent = review.originalText;
  elements.confirmReview.disabled =
    review.plans.length === 0 && review.events.length === 0;
}

function eventReviewItemHTML(event, index) {
  return `
    <article class="event-review-item">
      <div class="event-review-head">
        <span class="review-section-label">${icon("flag")}重要日期</span>
        <button class="review-remove" type="button" data-remove-event="${index}" aria-label="移除重要日期">
          ${icon("x")}
        </button>
      </div>
      <input
        class="event-title-input"
        type="text"
        value="${escapeHTML(event.title)}"
        data-event-title="${index}"
        aria-label="重要事件"
      >
      <label class="review-control">
        ${icon("calendar")}
        <input
          type="date"
          value="${event.dateInput}"
          data-event-date="${index}"
          aria-label="重要日期"
        >
      </label>
    </article>
  `;
}

function reviewItemHTML(plan, index) {
  const dateAuto = plan.dateWasAutomaticallyInferred
    ? `<span class="auto-badge">日期已推断</span>`
    : "";
  const importanceAuto = plan.importanceWasAutomaticallyInferred
    ? `<span class="auto-badge">重要性已推断</span>`
    : "";
  const scope = normalizeScope(plan.scope);
  const scopeBasis = normalizeScopeBasis(plan.scopeBasis, scope);
  return `
    <article class="review-item" data-review-index="${index}" data-importance="${plan.importance}" data-scope="${scope}">
      <div class="review-item-head">
        <textarea class="review-text" data-review-text="${index}">${escapeHTML(plan.text)}</textarea>
        <button class="review-remove" type="button" data-remove-review="${index}" aria-label="移除这一项">
          ${icon("x")}
        </button>
      </div>
      <div class="review-controls">
        <label class="review-control">
          ${icon("calendar")}
          <input type="datetime-local" value="${plan.dateInput}" data-review-date="${index}" aria-label="日期和时间">
        </label>
        <label class="review-control">
          ${icon("flag")}
          <select data-review-importance="${index}" aria-label="重要性">
            <option value="high" ${plan.importance === "high" ? "selected" : ""}>高重要</option>
            <option value="medium" ${plan.importance === "medium" ? "selected" : ""}>中重要</option>
            <option value="low" ${plan.importance === "low" ? "selected" : ""}>低重要</option>
          </select>
        </label>
      </div>
      <div class="review-scope-row">
        <label class="review-control">
          ${icon("calendar")}
          <select data-review-scope="${index}" aria-label="计划范围">
            <option value="day" ${scope === "day" ? "selected" : ""}>日计划</option>
            <option value="week" ${scope === "week" ? "selected" : ""}>周计划</option>
            <option value="month" ${scope === "month" ? "selected" : ""}>月计划</option>
            <option value="year" ${scope === "year" ? "selected" : ""}>年计划</option>
          </select>
        </label>
        <label class="review-control">
          ${icon("clock")}
          <select data-review-basis="${index}" aria-label="计划计算方式" ${scope === "day" ? "disabled" : ""}>
            <option value="calendar" ${scopeBasis === "calendar" ? "selected" : ""}>按日历</option>
            <option value="rolling" ${scopeBasis === "rolling" ? "selected" : ""}>从今天起</option>
          </select>
        </label>
      </div>
      <div>${dateAuto} ${importanceAuto}</div>
    </article>
  `;
}

function syncReviewField(event) {
  const target = event.target;
  if (target.matches("[data-review-text]")) {
    const index = Number(target.dataset.reviewText);
    appState.review.plans[index].text = target.value;
  }
  if (target.matches("[data-review-date]")) {
    const index = Number(target.dataset.reviewDate);
    appState.review.plans[index].dateInput = target.value;
    appState.review.plans[index].dateWasAutomaticallyInferred = false;
  }
  if (target.matches("[data-review-importance]")) {
    const index = Number(target.dataset.reviewImportance);
    appState.review.plans[index].importance = target.value;
    appState.review.plans[index].importanceWasAutomaticallyInferred = false;
    const item = target.closest(".review-item");
    if (item) item.dataset.importance = target.value;
  }
  if (target.matches("[data-review-scope]")) {
    const index = Number(target.dataset.reviewScope);
    const plan = appState.review.plans[index];
    plan.scope = normalizeScope(target.value);
    plan.scopeBasis = normalizeScopeBasis(plan.scopeBasis, plan.scope);
    const item = target.closest(".review-item");
    const basis = item?.querySelector("[data-review-basis]");
    if (item) item.dataset.scope = plan.scope;
    if (basis) {
      basis.disabled = plan.scope === "day";
      if (plan.scope === "day") basis.value = "calendar";
    }
  }
  if (target.matches("[data-review-basis]")) {
    const index = Number(target.dataset.reviewBasis);
    appState.review.plans[index].scopeBasis = normalizeScopeBasis(
      target.value,
      appState.review.plans[index].scope
    );
  }
  if (target.matches("[data-event-title]")) {
    const index = Number(target.dataset.eventTitle);
    appState.review.events[index].title = target.value;
  }
  if (target.matches("[data-event-date]")) {
    const index = Number(target.dataset.eventDate);
    appState.review.events[index].dateInput = target.value;
  }
}

function confirmReview() {
  if (!appState.review) return;
  syncAllReviewFields();
  const eventIds = [];
  for (const event of appState.review.events) {
    if (!event.title.trim() || !event.dateInput) {
      eventIds.push(null);
      continue;
    }
    const created = store.addEvent({
      title: event.title.trim(),
      date: new Date(`${event.dateInput}T12:00:00`).toISOString()
    });
    eventIds.push(created.id);
  }
  const events = eventIds.filter(Boolean);

  const plans = appState.review.plans
    .filter((plan) => plan.text.trim())
    .map((plan) => {
      const scope = normalizeScope(plan.scope);
      const scopeBasis = normalizeScopeBasis(plan.scopeBasis, scope);
      const anchor = new Date(plan.dateInput || plan.date);
      const range = periodRange(scope, scopeBasis, anchor);
      return {
        ...plan,
        scope,
        scopeBasis,
        scopeStart: range.start.toISOString(),
        scopeEnd: range.end.toISOString(),
        date: (scope === "day" ? anchor : range.end).toISOString(),
        deadlineEventId:
          Number.isInteger(plan.deadlineEventIndex)
            ? eventIds[plan.deadlineEventIndex] || null
            : null
      };
    });
  if (!plans.length && !events.length) {
    showToast("没有可加入的计划或重要日期");
    return;
  }
  store.addPlans(plans, appState.review.originalText);
  const count = plans.length;
  closeReview();
  finishComposer(
    events.length
      ? `已加入 ${count} 项计划和 ${events.length} 个重要日期`
      : `已加入 ${count} 项`
  );
}

function syncAllReviewFields() {
  if (!appState.review) return;
  for (const [index, plan] of appState.review.plans.entries()) {
    const text = elements.reviewList.querySelector(`[data-review-text="${index}"]`);
    const date = elements.reviewList.querySelector(`[data-review-date="${index}"]`);
    const importance = elements.reviewList.querySelector(`[data-review-importance="${index}"]`);
    const scope = elements.reviewList.querySelector(`[data-review-scope="${index}"]`);
    const basis = elements.reviewList.querySelector(`[data-review-basis="${index}"]`);
    if (text) plan.text = text.value;
    if (date) plan.dateInput = date.value;
    if (importance) plan.importance = importance.value;
    if (scope) plan.scope = normalizeScope(scope.value);
    if (basis) plan.scopeBasis = normalizeScopeBasis(basis.value, plan.scope);
  }
  for (const [index, event] of appState.review.events.entries()) {
    const title = elements.eventReviewList.querySelector(`[data-event-title="${index}"]`);
    const date = elements.eventReviewList.querySelector(`[data-event-date="${index}"]`);
    if (title) event.title = title.value;
    if (date) event.dateInput = date.value;
  }
}

function closeReview() {
  elements.reviewModal.hidden = true;
  appState.review = null;
}

function finishComposer(message) {
  clearDraftInput();
  elements.importance.value = "medium";
  elements.importanceControl.dataset.importance = "medium";
  updateComposerState();
  render();
  showToast(message);
}

function clearDraftInput() {
  elements.draft.value = "";
  elements.draft.style.height = "";
  resizeDraft();
  updateComposerState();
}

function handleToggleComplete(id) {
  const item = store.items.find((entry) => entry.id === id);
  if (!item) return;
  if (item.isCompleted) {
    store.reopen(id);
    showToast("已恢复为待完成");
    return;
  }

  openActionModal({
    title: "完成这项计划？",
    message: "可以保留为已完成，或完成后直接删除。",
    buttons: [
      {
        label: "保留已完成",
        handler: () => {
          store.complete(id, true);
          showToast("已标记完成");
        }
      },
      {
        label: "完成并删除",
        tone: "danger",
        handler: () => {
          store.complete(id, false);
          showToast("已完成并删除");
        }
      },
      {
        label: "取消",
        tone: "secondary",
        handler: () => {}
      }
    ]
  });
}

function handleDelete(id) {
  openActionModal({
    title: "永久删除这项计划？",
    message: "删除后不会保留计划和任务。",
    buttons: [
      {
        label: "删除且不保留",
        tone: "danger",
        handler: () => {
          store.delete(id);
          showToast("已删除");
        }
      },
      {
        label: "取消",
        tone: "secondary",
        handler: () => {}
      }
    ]
  });
}

function openActionModal({ title, message, buttons }) {
  appState.actionButtons = buttons;
  elements.actionTitle.textContent = title;
  elements.actionMessage.textContent = message;
  elements.actionButtons.innerHTML = buttons.map((button, index) => `
    <button
      class="${index === 0 ? "primary-button" : "secondary-button"}"
      type="button"
      data-action-choice="${index}"
      ${button.tone ? `data-tone="${button.tone}"` : ""}
    >${escapeHTML(button.label)}</button>
  `).join("");
  elements.actionModal.hidden = false;
}

function closeActionModal() {
  elements.actionModal.hidden = true;
  appState.actionButtons = [];
}

function openInstallHelp() {
  elements.installModal.hidden = false;
}

function updateComposerState() {
  const hasText = Boolean(elements.draft.value.trim());
  elements.save.disabled = !hasText;
  elements.save.querySelector("span").textContent =
    appState.mode === "smart" ? "整理并加入" : "加入计划";
  elements.save.querySelector("use").setAttribute(
    "href",
    appState.mode === "smart" ? "#icon-sparkles" : "#icon-plus"
  );
  elements.mic.classList.toggle("is-recording", appState.recording);
  elements.mic.innerHTML = appState.recording
    ? icon("stop")
    : icon("mic");
  elements.mic.setAttribute(
    "aria-label",
    appState.recording
      ? "停止录音"
      : appState.speechSupported
        ? "开始语音输入"
        : "打开输入框使用键盘听写"
  );
  elements.recording.hidden = !appState.recording;
  elements.importanceControl.dataset.importance = elements.importance.value;
}

function resizeDraft() {
  elements.draft.style.height = "auto";
  elements.draft.style.height = `${Math.min(84, elements.draft.scrollHeight)}px`;
}

function setupSpeechRecognition() {
  const Recognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;
  if (!Recognition) {
    appState.speechSupported = false;
    elements.draft.placeholder = "输入计划，或使用键盘麦克风听写…";
    return;
  }

  appState.speechSupported = true;
  const recognition = new Recognition();
  recognition.lang = "zh-CN";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 5;

  recognition.onstart = () => {
    appState.recording = true;
    appState.speechHandled = false;
    appState.lastSpeechAt = Date.now();
    scheduleSilenceStop();
    updateComposerState();
  };

  recognition.onresult = (event) => {
    let finalText = "";
    let interimText = "";
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const transcript = refineSpeechTranscript(
        chooseBestTranscript(event.results[index])
      );
      if (event.results[index].isFinal) finalText += transcript;
      else interimText += transcript;
    }
    if (finalText) {
      appState.finalTranscript = appendFinalTranscript(
        appState.finalTranscript,
        finalText,
        {
          gapMs: appState.lastFinalAt
            ? Date.now() - appState.lastFinalAt
            : 0,
          pauseBefore: appState.pauseBeforeNextFinal
        }
      );
      appState.lastFinalAt = Date.now();
      appState.pauseBeforeNextFinal = false;
    }
    elements.draft.value = `${appState.finalTranscript}${interimText}`.trim();
    appState.lastSpeechAt = Date.now();
    scheduleSilenceStop();
    resizeDraft();
    updateComposerState();
  };

  recognition.onerror = (event) => {
    if (["not-allowed", "audio-capture", "service-not-allowed"].includes(event.error)) {
      appState.recordingIntent = false;
      finishRecognitionSession();
    } else if (event.error !== "no-speech") {
      showToast("语音识别暂时不可用，请使用键盘听写");
    }
  };

  recognition.onend = () => {
    appState.recording = false;
    if (appState.recordingIntent) {
      appState.pauseBeforeNextFinal = Boolean(
        appState.finalTranscript.trim() || elements.draft.value.trim()
      );
      appState.recording = true;
      appState.restartTimer = setTimeout(() => startRecognitionAttempt(false), 380);
      updateComposerState();
    } else {
      finishRecognitionSession();
    }
  };

  appState.recognition = recognition;
}

function toggleRecording() {
  if (!appState.speechSupported) {
    elements.draft.focus();
    elements.draft.scrollIntoView({ block: "center", behavior: "smooth" });
    showToast("已打开输入框，可使用键盘麦克风听写");
    return;
  }

  if (appState.recording) {
    stopRecording();
    return;
  }

  appState.recordingIntent = true;
  appState.finalTranscript = "";
  appState.recordingStartedAt = Date.now();
  appState.lastFinalAt = 0;
  appState.pauseBeforeNextFinal = false;
  elements.draft.value = "";
  updateComposerState();
  showToast("录音已开始，停顿 75 秒后自动整理");
  startRecognitionAttempt(true);
}

function stopRecording() {
  appState.recordingIntent = false;
  appState.recording = false;
  clearRecognitionTimers();
  updateComposerState();
  try {
    appState.recognition?.stop();
  } catch {
    finishRecognitionSession();
  }
}

function startRecognitionAttempt(isFirstAttempt) {
  if (!appState.recordingIntent) {
    finishRecognitionSession();
    return;
  }

  try {
    appState.recognition.start();
    if (isFirstAttempt) {
      clearTimeout(appState.maxDurationTimer);
      appState.maxDurationTimer = setTimeout(() => {
        if (appState.recordingIntent) stopRecording();
      }, 10 * 60 * 1000);
    }
  } catch {
    appState.recordingIntent = false;
    finishRecognitionSession();
  }
}

function scheduleSilenceStop() {
  clearTimeout(appState.silenceTimer);
  appState.silenceTimer = setTimeout(() => {
    if (appState.recordingIntent) stopRecording();
  }, 75_000);
}

function clearRecognitionTimers() {
  clearTimeout(appState.silenceTimer);
  clearTimeout(appState.restartTimer);
  clearTimeout(appState.maxDurationTimer);
  appState.silenceTimer = 0;
  appState.restartTimer = 0;
  appState.maxDurationTimer = 0;
}

function finishRecognitionSession() {
  clearRecognitionTimers();
  appState.recordingIntent = false;
  appState.recording = false;
  updateComposerState();
  const finalText = elements.draft.value.trim();
  if (
    appState.mode === "smart" &&
    finalText &&
    !appState.speechHandled
  ) {
    appState.speechHandled = true;
    const refinedText = refineSpeechTranscript(finalText);
    setTimeout(() => prepareReview(refinedText), 120);
  }
}

function navigateToDay(key) {
  window.location.hash = `day=${key}`;
}

function goHome() {
  if (window.location.hash) {
    history.pushState(null, "", `${window.location.pathname}${window.location.search}`);
  }
  appState.route = "home";
  appState.day = null;
  elements.date.value = dayKey(new Date());
  render();
}

function parseRoute() {
  const hash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
  const day = hash.startsWith("day=") ? hash.slice(4) : "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    appState.route = "day";
    appState.day = day;
  } else {
    appState.route = "home";
    appState.day = null;
  }
}

function syncDateToRoute() {
  elements.date.value = appState.day || dayKey(new Date());
}

function showToast(message) {
  clearTimeout(appState.toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  appState.toastTimer = setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 2200);
}

function registerServiceWorker() {
  if (
    "serviceWorker" in navigator &&
    ["http:", "https:"].includes(window.location.protocol)
  ) {
    navigator.serviceWorker
      .register("./sw.js")
      .then((registration) => registration.update())
      .catch(() => {});
  }
}

function icon(name) {
  return `<svg class="icon" aria-hidden="true"><use href="#icon-${name}"></use></svg>`;
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function dateAtNoon(key) {
  return dateFromDayKey(key);
}

function toLocalDateTimeInput(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toDateInput(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMonthDay(value) {
  const date = new Date(value);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatWeekday(value) {
  const date = new Date(value);
  return ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][date.getDay()];
}

function formatDayHeader(value) {
  return `${formatMonthDay(value)} ${formatWeekday(value)}`;
}

function formatTime(value) {
  const date = new Date(value);
  if (date.getHours() === 0 && date.getMinutes() === 0) return "";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function relativeDayLabel(value) {
  const date = new Date(value);
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.round((dateStart - todayStart) / 86_400_000);
  if (days === 0) return "今天";
  if (days === 1) return "明天";
  if (days === -1) return "昨天";
  return days > 0 ? `${days} 天后` : `${Math.abs(days)} 天前`;
}
