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
  /(?:重要事件|重要的事|重要事情|重要日子|截止日期|截止日|截止|生日|纪念日|考试|面试|婚礼|发布会|答辩|比赛|体检|报名截止|提交截止|项目评审|项目验收|家长会|演出|演唱会|毕业典礼|签约|活动日)/u;

export function extractPlannerInput(rawText, options = {}) {
  const referenceDate = options.referenceDate
    ? new Date(options.referenceDate)
    : new Date();
  const cleaned = cleanSpokenFillers(
    cleanGrammarGlitches(String(rawText || ""))
  );
  const events = detectImportantEvents(cleaned, referenceDate);
  const segments = splitMixedSegments(findScopeSegments(cleaned));
  const segmentResults = segments.map((segment) =>
    extractPlans(segment.text, {
      ...options,
      referenceDate
    })
  );
  const plans = segments.flatMap((segment, segmentIndex) => {
    const result = segmentResults[segmentIndex];
    const range = segment.scope
      ? periodRange(segment.scope, segment.basis, referenceDate)
      : null;
    const deadlineMarker = segment.text.search(
      /(?:在那之前|在这之前|之前要|前要|前完成|截止到|截至)/u
    );
    const deadlineEventIndex = deadlineMarker === -1 || !events.length
      ? null
      : Math.max(
          0,
          events.findLastIndex(
            (event) => event.position < segment.start + deadlineMarker
          )
        );
    return result.plans.map((plan) => {
      const scopedPlan = segment.scope
        ? {
            ...plan,
            scope: segment.scope,
            scopeBasis: segment.basis,
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
        return {
          ...scopedPlan,
          date: events[deadlineEventIndex].date.toISOString(),
          deadlineEventIndex
        };
      }
      return scopedPlan;
    });
  });
  const base = segmentResults[0] || {
    keywords: [],
    removedFillerCount: 0,
    summary: ""
  };
  const scopedDirective =
    segments.find((segment) => segment.scope) || null;
  const keywords = [
    ...new Set(segmentResults.flatMap((result) => result.keywords || []))
  ].slice(0, 8);
  const summary = segmentResults
    .filter((result) => result.summary)
    .map((result) => result.summary)
    .join("；");

  return {
    ...base,
    plans,
    events,
    keywords,
    removedFillerCount: segmentResults.reduce(
      (total, result) => total + (result.removedFillerCount || 0),
      0
    ),
    cleanedText: [...new Set(plans.map((plan) => plan.text))].join("；"),
    summary,
    scopeDirective: scopedDirective?.scope
      ? { scope: scopedDirective.scope, basis: scopedDirective.basis }
      : null
  };
}

function findScopeSegments(text) {
  const matches = [];
  for (const directive of SCOPE_DIRECTIVES) {
    const expression = new RegExp(
      directive.pattern.source,
      directive.pattern.flags.includes("g")
        ? directive.pattern.flags
        : `${directive.pattern.flags}g`
    );
    for (const match of text.matchAll(expression)) {
      matches.push({
        index: match.index,
        length: match[0].length,
        scope: directive.scope,
        basis: directive.basis
      });
    }
  }
  matches.sort((left, right) => left.index - right.index || left.length - right.length);
  if (!matches.length) {
    return [{ start: 0, scope: null, basis: null, text }];
  }

  const segments = [];
  let cursor = 0;
  for (const match of matches) {
    if (match.index < cursor) continue;
    if (match.index > cursor) {
      segments.push({
        start: cursor,
        scope: null,
        basis: null,
        text: text.slice(cursor, match.index)
      });
    }
    const segmentStart = match.index + match.length;
    let segmentEnd = text.length;
    for (const next of matches) {
      if (next.index >= segmentStart) {
        segmentEnd = next.index;
        break;
      }
    }
    segments.push({
      start: segmentStart,
      scope: match.scope,
      basis: match.basis,
      text: text.slice(segmentStart, segmentEnd)
    });
    cursor = segmentEnd;
  }
  if (cursor < text.length) {
    segments.push({
      start: cursor,
      scope: null,
      basis: null,
      text: text.slice(cursor)
    });
  }
  return segments.length ? segments : [{ start: 0, scope: null, basis: null, text }];
}

function splitMixedSegments(segments) {
  const expanded = [];
  for (const segment of segments) {
    if (!segment.scope) {
      expanded.push(segment);
      continue;
    }
    const parts = splitAtTaskDate(segment.text);
    if (parts.length <= 1) {
      expanded.push(segment);
      continue;
    }
    let cursor = segment.start;
    parts.forEach((part, index) => {
      expanded.push({
        start: cursor,
        scope: index === 0 ? segment.scope : null,
        basis: index === 0 ? segment.basis : null,
        text: part
      });
      cursor += part.length;
    });
  }
  return expanded;
}

function splitAtTaskDate(text) {
  const pattern =
    /(?=(?:今天|明天|后天|大后天|明晚|今晚|下周[一二三四五六日天]|下星期[一二三四五六日天]|周[一二三四五六日天]|星期[一二三四五六日天]|\d{1,2}月\d{1,2}(?:日|号)))/gu;
  const parts = [];
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index === 0) continue;
    if (match.index > cursor) parts.push(text.slice(cursor, match.index));
    cursor = match.index;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts.length ? parts : [text];
}

export function cleanGrammarGlitches(text) {
  const protectedText = String(text || "").replace(/在那之前/g, "\u0001");
  return protectedText
    .replace(
      /(^|[，,。；;])([^，,。；;]{1,24}?)[，,]\s*不是[，,]\s*/gu,
      (_, separator, segment) =>
        segment.includes("\u0001") ? `${separator || ""}\u0001` : "，"
    )
    .replace(/^[，,\s]+/u, "")
    .replace(/(然后|就是|这个|那个|其实|可能|应该|要|把|给)\1+/gu, "$1")
    .replace(/(做|整理|联系|提交|准备|快走|练琴|检查|打扫|背|跑)\1+/gu, "$1")
    .replace(/我我/g, "我")
    .replace(/你你/g, "你")
    .replace(/明天下周/g, "下周")
    .replace(/后天天/g, "后天")
    .replace(/(完成|做完|写完)(?:完|了)+/gu, "$1")
    .replace(/复习习+/gu, "复习")
    .replace(/读完完+/gu, "读完")
    .replace(/练练习/g, "练习")
    .replace(/拉伸伸+/gu, "拉伸")
    .replace(/修改改+/gu, "修改")
    .replace(/跑跑步/g, "跑步")
    .replace(/\u0001/g, "在那之前");
}

export function cleanSpokenFillers(text) {
  return String(text || "")
    .replace(
      /(^|，|,|。|；|;)(?:嗯+|啊+|呃+|那个|这个|就是|然后|其实|可能|应该|怎么说呢)(?=，|,|。|；|;|$)/gu,
      "$1"
    )
    .replace(/[，,]{2,}/gu, "，")
    .replace(/^[，,\s]+/u, "")
    .trim();
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
    const immediateClause = text.slice(
      match.index,
      Math.min(text.length, match.index + 12)
    );
    if (!EVENT_CUE_PATTERN.test(immediateClause)) continue;

    const clauseEnd = findClauseEnd(text, match.index + dateText.length);
    const clause = text.slice(match.index, clauseEnd).trim();
    if (!EVENT_CUE_PATTERN.test(clause)) continue;

    const date = parsePlanningDate(dateText, referenceDate);
    if (!date) continue;
    const title = normalizeEventTitle(
      clause
        .replace(dateText, "")
        .split(/(?:在那之前|在这之前|之前要|前要|之前完成|前完成|截止到|截至)/u)[0]
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

function findImmediateClauseEnd(text, start) {
  const next = text.slice(start).search(/[，,。；;\n]/u);
  return next === -1 ? text.length : start + next + 1;
}

function normalizeEventTitle(text) {
  return String(text || "")
    .replace(/^[，,：:\s]*(?:有|是|为|安排了|将在|定在)?\s*/u, "")
    .replace(/(?:重要事件|重要的事|重要事情|重要日子|截止日期|截止日)[：:，,\s]*/gu, "")
    .replace(/(?:这个|这件事)?(?:真的|很|非常|特别)?重要[。！!，,\s]*/gu, "")
    .replace(/(?:那个|这个|就是|然后|其实|可能|应该|怎么说呢|嗯+|啊+)/gu, "")
    .replace(/[，,。；;：:\s]+$/gu, "")
    .trim()
    .slice(0, 80);
}

function findClauseEnd(text, start) {
  const next = text.slice(start).search(/[。；;\n]/u);
  return next === -1 ? text.length : start + next;
}
