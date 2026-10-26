import { extractPlans, parsePlanningDate } from "./extractor.js";
import { periodRange } from "./periods.js";

const SCOPE_DIRECTIVES = [
  {
    scope: "week",
    basis: "rolling",
    pattern: /(?:从今天起|从明天起|未来|接下来)(?:的)?(?:七|7)天(?:的)?(?:计划|目标|任务)?(?:是|为|[:：])?/u
  },
  {
    scope: "month",
    basis: "rolling",
    pattern: /(?:从今天起|从明天起|未来|接下来)(?:的)?(?:一个月|30天|三十天)(?:的)?(?:计划|目标|任务)?(?:是|为|[:：])?/u
  },
  {
    scope: "year",
    basis: "rolling",
    pattern: /(?:从今天起|从明天起|未来|接下来)(?:的)?(?:一年|12个月|十二个月|365天)(?:的)?(?:计划|目标|任务)?(?:是|为|[:：])?/u
  },
  {
    scope: "week",
    basis: "calendar",
    pattern: /(?:本周|这周|这一周)(?:的)?(?:周)?(?:计划|目标|任务)?(?:是|为|[:：])?/u
  },
  {
    scope: "month",
    basis: "calendar",
    pattern: /(?:本月|这个月|这月)(?:的)?(?:月)?(?:计划|目标|任务)?(?:是|为|[:：])?/u
  },
  {
    scope: "year",
    basis: "calendar",
    pattern: /(?:今年|本年|这一年)(?:的)?(?:年)?(?:计划|目标|任务)?(?:是|为|[:：])?/u
  }
];

const EVENT_DATE_PATTERN =
  /(?:\d{4}年)?(?:\d{1,2}月\d{1,2}(?:日|号)|今天|明天|后天|大后天|下周[一二三四五六日天]|下星期[一二三四五六日天]|本周[一二三四五六日天]|这周[一二三四五六日天]|周[一二三四五六日天]|星期[一二三四五六日天])/gu;

const EVENT_CUE_PATTERN =
  /(?:重要事件|重要日子|截止日期|截止日|生日|纪念日|考试|面试|婚礼|发布会|答辩|比赛|体检|报名截止|提交截止|项目评审|活动日)/u;

export function extractPlannerInput(rawText, options = {}) {
  const referenceDate = options.referenceDate
    ? new Date(options.referenceDate)
    : new Date();
  const analysis = detectScopeDirective(String(rawText || ""));
  const events = detectImportantEvents(analysis.text, referenceDate);
  const deadlineMarker = analysis.text.search(
    /(?:在那之前|在这之前|之前要|前要|前完成|截止到|截至)/u
  );
  const deadlineEventIndex = deadlineMarker === -1 || !events.length
    ? null
    : Math.max(
        0,
        events.findLastIndex((event) => event.position < deadlineMarker)
      );
  const result = extractPlans(analysis.text, {
    ...options,
    referenceDate
  });
  const range = analysis.scope
    ? periodRange(analysis.scope, analysis.basis, referenceDate)
    : null;
  const plans = result.plans.map((plan) => {
    const scopedPlan = analysis.scope
      ? {
          ...plan,
          scope: analysis.scope,
          scopeBasis: analysis.basis,
          scopeStart: range.start.toISOString(),
          scopeEnd: range.end.toISOString(),
          date: range.end.toISOString()
        }
      : {
          ...plan,
          scope: "day",
          scopeBasis: "calendar",
          scopeStart: plan.date,
          scopeEnd: plan.date
        };
    if (deadlineEventIndex != null) {
      const eventDate = events[deadlineEventIndex].date;
      return {
        ...scopedPlan,
        date: eventDate.toISOString(),
        deadlineEventIndex
      };
    }
    return scopedPlan;
  });

  return {
    ...result,
    plans,
    events,
    scopeDirective: analysis.scope
      ? { scope: analysis.scope, basis: analysis.basis }
      : null
  };
}

export function detectScopeDirective(text) {
  for (const directive of SCOPE_DIRECTIVES) {
    const match = text.match(directive.pattern);
    if (!match) continue;
    return {
      scope: directive.scope,
      basis: directive.basis,
      text: text.replace(match[0], "").replace(/^[，,：:\s]+/u, "")
    };
  }
  return { scope: null, basis: null, text };
}

export function detectImportantEvents(text, referenceDate = new Date()) {
  const events = [];
  for (const match of text.matchAll(EVENT_DATE_PATTERN)) {
    const dateText = match[0];
    const clauseEnd = findClauseEnd(text, match.index + dateText.length);
    const clause = text.slice(match.index, clauseEnd).trim();
    if (!EVENT_CUE_PATTERN.test(clause)) continue;

    const date = parsePlanningDate(dateText, referenceDate);
    if (!date) continue;
    const title = normalizeEventTitle(
      clause
        .replace(dateText, "")
        .split(/(?:之前要|前要|之前完成|前完成|截止到|截至)/u)[0]
    );
    if (!title) continue;
    if (
      events.some(
        (event) =>
          event.title === title &&
          event.date.getTime() === date.getTime()
      )
    ) {
      continue;
    }
    events.push({ title, date, position: match.index });
  }
  return events;
}

function normalizeEventTitle(text) {
  return String(text || "")
    .replace(/^[，,：:\s]*(?:有|是|为|安排了|将在|定在)?\s*/u, "")
    .replace(/(?:重要事件|重要日子|截止日期|截止日)[：:，,\s]*/gu, "")
    .replace(/(?:这个|这件事)?(?:真的|很|非常|特别)?重要[。！!，,\s]*/gu, "")
    .replace(/[，,。；;：:\s]+$/gu, "")
    .trim()
    .slice(0, 80);
}

function findClauseEnd(text, start) {
  const next = text.slice(start).search(/[。；;\n]/u);
  return next === -1 ? text.length : start + next;
}
