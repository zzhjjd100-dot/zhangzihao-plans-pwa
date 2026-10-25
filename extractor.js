const IMPORTANCE_RANK = {
  low: 0,
  medium: 1,
  high: 2
};

const HIGH_KEYWORDS = [
  "紧急", "必须", "务必", "立刻", "马上", "重要", "关键", "截止",
  "最后期限", "不能忘", "别忘", "千万", "否则", "逾期", "面试",
  "考试", "签合同", "付款", "交房租", "医院",
  "不能漏", "不能迟", "不要漏", "发错"
];

const LOW_KEYWORDS = [
  "不急", "有空", "顺便", "可选", "以后再说", "低优先", "不着急",
  "看情况", "也可以", "尽量", "随便"
];

const FILLER_WORDS = new Set([
  "嗯", "啊", "呃", "额", "哦", "唉", "那个", "就是说", "然后呢",
  "你知道吗", "我跟你说", "好的", "好", "行", "可以", "知道了",
  "明白了", "收到", "就这样", "我说完了", "大概就是这样",
  "一下", "我跟你说一下", "我和你说一下", "我说一下"
]);

const STOP_WORDS = new Set([
  "今天", "明天", "后天", "然后", "那个", "就是", "我们", "你们", "他们",
  "这个", "一个", "一下", "需要", "可以", "记得", "事情", "时候", "计划",
  "任务", "进行", "以及", "如果", "但是", "因为", "所以"
]);

export function importanceRank(value) {
  return IMPORTANCE_RANK[value] ?? 1;
}

export function importanceLabel(value) {
  return value === "high" ? "高重要" : value === "low" ? "低重要" : "中重要";
}

export function extractPlans(rawText, options = {}) {
  const referenceDate = options.referenceDate
    ? new Date(options.referenceDate)
    : new Date();
  const fallbackDate = options.defaultDate
    ? new Date(options.defaultDate)
    : referenceDate;
  const fallbackImportance = options.defaultImportance || "medium";
  const normalized = normalize(rawText);
  const fragments = splitIntoFragments(normalized);
  const plans = [];
  let removedFillerCount = 0;
  let activeDateContext = null;

  for (const fragment of fragments) {
    const sanitized = removeFiller(fragment);
    removedFillerCount += sanitized.removedCount;
    const originalFragment = sanitized.text.trim();
    if (!originalFragment || isPureFiller(originalFragment)) continue;

    const importanceOnly = detectImportanceOnly(originalFragment);
    if (importanceOnly) {
      if (plans.length > 0) {
        const targets = originalFragment.includes("都")
          ? plans
          : [plans.at(-1)];
        for (const plan of targets) {
          plan.importance = importanceOnly;
          plan.importanceWasAutomaticallyInferred = true;
        }
      }
      continue;
    }

    const dateResult = resolveTaskDate(
      originalFragment,
      referenceDate,
      activeDateContext
    );
    activeDateContext = dateResult.contextDate || activeDateContext;
    const importance = detectImportance(originalFragment);
    const summaries = summarizeTaskText(originalFragment);

    for (const summary of summaries) {
      plans.push({
        id: createId(),
        text: summary,
        date: (dateResult.date || activeDateContext || fallbackDate).toISOString(),
        importance: importance || fallbackImportance,
        dateWasAutomaticallyInferred: Boolean(dateResult.date || activeDateContext),
        importanceWasAutomaticallyInferred: Boolean(importance)
      });
    }
  }

  if (plans.length === 0) {
    const fallback = removeFiller(normalized).text.trim();
    if (fallback) {
      plans.push({
        id: createId(),
        text: fallback,
        date: fallbackDate.toISOString(),
        importance: fallbackImportance,
        dateWasAutomaticallyInferred: false,
        importanceWasAutomaticallyInferred: false
      });
    }
  }

  const deduped = deduplicatePlans(plans);
  return {
    plans: deduped,
    keywords: extractKeywords(normalized),
    removedFillerCount,
    cleanedText: deduped.map((plan) => plan.text).join("；"),
    summary: buildOverview(deduped, referenceDate)
  };
}

function normalize(text) {
  return String(text || "")
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitIntoFragments(text) {
  let prepared = text
    .replace(/(?:首先|其次|然后|接着|之后|最后|另外|还有|还要|同时|对了|顺便说一下)[，,\s]+/g, "\n")
    .replace(/(?:我说完了|大概就是这样|你明白吧)[。！？!?]?$/g, "");

  const strongParts = prepared.split(/[。！？!?；;\n…]+/);
  const fragments = [];

  for (const part of strongParts) {
    const commaParts = part
      .split(/[，,]+/)
      .map((value) => value.trim())
      .filter(Boolean);
    let current = "";

    for (const commaPart of commaParts) {
      if (!current) {
        current = commaPart;
      } else if (shouldStartNewCommaClause(commaPart)) {
        fragments.push(current);
        current = commaPart;
      } else {
        current += `，${commaPart}`;
      }
    }

    if (current) fragments.push(current);
  }

  return fragments;
}

function shouldStartNewCommaClause(text) {
  const actionKeywords = [
    "要", "需要", "必须", "记得", "安排", "完成", "准备", "做", "写",
    "发", "提交", "联系", "预约", "检查", "处理", "参加", "开会",
    "买", "交", "见", "整理", "提醒"
  ];
  const datePrefixes = [
    "今天", "明天", "后天", "大后天", "下周", "本周", "这周",
    "周一", "周二", "周三", "周四", "周五", "周六", "周日",
    "上午", "下午", "中午", "晚上", "明晚", "今晚"
  ];
  return (
    actionKeywords.some((keyword) => text.includes(keyword)) &&
    datePrefixes.some((prefix) => text.startsWith(prefix))
  );
}

function removeFiller(text) {
  const original = text.trim();
  let result = original
    .replace(
      /^(?:(?:嗯+|啊+|呃+|额+|哦+|唉+|那个|就是说|然后呢|怎么说呢|其实吧|你知道吗|我跟你说一下|我和你说一下|我说一下|我跟你说|我和你说)[，,、.…\s]*)+/g,
      ""
    )
    .replace(
      /(?<=[，,。；;！？!?.…\s])(?:嗯+|啊+|呃+|额+|哦+|那个|就是说|你知道吗|我跟你说)[，,、.…\s]*/g,
      ""
    )
    .replace(/(?:大概就是这样|我说完了|你明白吧|能听懂吗)[。！？!?]?$/g, "")
    .replace(
      /^(?:我今天|我)?(?:想|要|来)?(?:跟你说|和你说|说一下|讲一下|聊一下)(?:一件事|一下)?[，,：:\s]*/g,
      ""
    )
    .replace(/[，,\s]+/g, "，")
    .replace(/。+/g, "。")
    .replace(/^[，,。；;\s]+/g, "")
    .replace(/[，,。；;\s]+$/g, "")
    .trim();

  return {
    text: result,
    removedCount: result === original ? 0 : Math.max(1, original.length - result.length)
  };
}

function isPureFiller(text) {
  const compact = text.replace(/[\s，,。！？!?；;、.…]/g, "");
  return (
    FILLER_WORDS.has(compact) ||
    (compact.length <= 3 && [...compact].every((char) => "嗯啊呃额哦唉".includes(char)))
  );
}

function detectImportanceOnly(text) {
  const compact = text
    .replace(/[\s，,。！？!?；;、.…]/g, "")
    .replace(/^(?:这个|这件事|这|它)/, "")
    .replace(/^(?:任务|计划|事情)/, "");

  if (/^(?:真的|非常|特别|很|十分)?重要(?:的)?(?:任务|计划|事情)?$/.test(compact)) {
    return "high";
  }
  if (/^(?:真的|非常|特别|很|十分)?(?:关键|紧急)(?:的)?(?:任务|计划|事情)?$/.test(compact)) {
    return "high";
  }
  if (/^(?:真的|很|非常|特别|太)?不(?:太)?(?:重要|急)(?:的)?(?:任务|计划|事情)?$/.test(compact)) {
    return "low";
  }
  return null;
}

function summarizeTaskText(text) {
  const withoutImportanceComment = stripImportanceComment(text);
  const withoutSchedule = stripSchedulePrefixes(withoutImportanceComment);
  const normalized = normalizeTaskTitle(withoutSchedule);
  if (!normalized) return [];

  const learningSummaries = summarizeLearningItems(normalized);
  if (learningSummaries.length) return learningSummaries;

  return [normalized];
}

function summarizeLearningItems(text) {
  const hasVocabulary = /英语\s*(?:生词|单词|词汇)/.test(text);
  const hasEssay = /英语\s*(?:范文|作文)|(?:读|背|看|学习)(?:一篇|一些)?\s*范文/.test(text);
  if (!hasVocabulary && !hasEssay) return [];

  const residual = text
    .replace(/英语\s*(?:生词|单词|词汇|范文|作文)/g, "")
    .replace(/(?:背|读|看|学习|复习|预习|温习|整理|记|默写|抄写|交|完成|准备)/g, "")
    .replace(/(?:一篇|一些|一点|十个|十个?)/g, "")
    .replace(/(?:生词|单词|词汇|范文|作文)/g, "")
    .replace(/[和与及、,，以及]/g, "")
    .replace(/[的了呢吧啊呀。！？!?\s]/g, "");

  if (residual.length > 0) return [];

  const summaries = [];
  if (hasVocabulary) summaries.push("英语生词");
  if (hasEssay) summaries.push("范文");
  return summaries;
}

function stripImportanceComment(text) {
  return text
    .replace(
      /[\s，,]*(?:这个|这件事|这|它)?(?:任务|计划|事情)?(?:真的|非常|特别|很|十分)?(?:重要|关键|紧急)(?:的)?(?:任务|计划|事情)?[。！!]*$/g,
      ""
    )
    .replace(
      /[\s，,]*(?:这个|这件事|这|它)?(?:任务|计划|事情)?(?:真的|很|非常|特别|太)?不(?:太)?(?:重要|急)(?:的)?(?:任务|计划|事情)?[。！!]*$/g,
      ""
    )
    .trim();
}

function stripSchedulePrefixes(text) {
  let result = text.trim();
  const prefixes = [
    /^(?:另外|对了|然后|接着|之后|顺便(?:说一下)?)\s*/,
    /^(?:先|首先|再|其次|最后)\s*/,
    /^(?:有空(?:的时候)?|看情况|尽量)\s*/,
    /^(?:提醒我|帮我|请|麻烦你?|记得|别忘了|我要|我需要|我得|我想)\s*/,
    /^(?:今天|明天|后天|大后天|明晚|今晚|昨天)(?:的)?\s*/,
    /^(?:下周|下星期|本周|这周|周|星期)[一二三四五六日天](?:的)?\s*/,
    /^(?:下个月|本月|这个月)\s*(?:\d{1,2}|[一二三四五六七八九十两]{1,3})(?:日|号)\s*/,
    /^(?:\d{1,2}|[一二三四五六七八九十两]{1,3})月(?:\d{1,2}|[一二三四五六七八九十两]{1,3})(?:日|号)\s*/,
    /^(?:凌晨|早上|上午|中午|下午|傍晚|晚上)?\s*(?:\d{1,2}|[一二三四五六七八九十两]{1,3})(?:点|时|:|：)(?:\d{1,2}|[一二三四五六七八九十两]{1,3})?(?:分)?\s*/,
    /^(?:我)?要(?=去|把|交|提|写|做|买|联|预|检|处|参|开|整|复|背|读|学|准|完|发|跟|和)\s*/
  ];

  for (let pass = 0; pass < 8; pass += 1) {
    let changed = false;
    for (const expression of prefixes) {
      const next = result.replace(expression, "").trim();
      if (next !== result) {
        result = next;
        changed = true;
      }
    }
    if (!changed) break;
  }

  return result.replace(/^[，,：:\s]+/, "").trim();
}

function normalizeTaskTitle(text) {
  return text
    .replace(/^把(.+?)(写完|做完)$/g, "完成$1")
    .replace(/[，,]\s*(?:这个|这|它)?(?:真的|非常|特别|很|十分)?(?:重要|关键|紧急)(?:的)?(?:任务|计划|事情)?$/g, "")
    .replace(/(讨论|考虑|检查|确认|整理|处理)一下$/g, "$1")
    .replace(/看一下$/g, "看")
    .replace(/[，,\s]+/g, "，")
    .replace(/(?:就行了|就好|即可|就行|吧|啊|呀|哈)+$/g, "")
    .replace(/^[，,。；;\s]+/g, "")
    .replace(/[，,。；;\s]+$/g, "")
    .trim();
}

function detectDate(text, referenceDate) {
  const relative = detectRelativeDate(text, referenceDate);
  if (relative) return { date: relative };

  const detector = detectAbsoluteDate(text, referenceDate);
  if (detector) return { date: detector };

  return { date: null };
}

function resolveTaskDate(text, referenceDate, activeDate) {
  const detected = detectDate(text, referenceDate);
  const hasExplicitDate = hasExplicitDateExpression(text);
  const hasTime = hasTimeExpression(text);

  if (detected.date && hasExplicitDate) {
    return {
      date: detected.date,
      contextDate: startOfDay(detected.date)
    };
  }

  if (hasTime) {
    const inheritedTime = detectTime(
      text,
      activeDate || referenceDate,
      Boolean(activeDate)
    );
    if (inheritedTime) {
      return {
        date: inheritedTime,
        contextDate: activeDate ? startOfDay(activeDate) : startOfDay(inheritedTime)
      };
    }
  }

  return {
    date: activeDate,
    contextDate: activeDate
  };
}

function hasExplicitDateExpression(text) {
  return /(?:今天|明天|后天|大后天|明晚|今晚|昨天|下周[一二三四五六日天]|下星期[一二三四五六日天]|本周[一二三四五六日天]|这周[一二三四五六日天]|周[一二三四五六日天]|星期[一二三四五六日天]|下个月\s*(?:\d{1,2}|[一二三四五六七八九十两]{1,3})(?:日|号)|(?:\d{1,2}|[一二三四五六七八九十两]{1,3})月(?:\d{1,2}|[一二三四五六七八九十两]{1,3})(?:日|号))/g.test(text);
}

function hasTimeExpression(text) {
  return /(?:凌晨|早上|上午|中午|下午|傍晚|晚上)?\s*(?:\d{1,2}|[一二三四五六七八九十两]{1,3})(?:点|时|:|：)(?:\d{1,2}|[一二三四五六七八九十两]{1,3})?(?:分)?/g.test(text);
}

function buildOverview(plans, referenceDate) {
  if (!plans.length) return "";
  const groups = new Map();
  for (const plan of plans) {
    const key = overviewDayKey(plan.date);
    if (!groups.has(key)) groups.set(key, []);
    const titles = groups.get(key);
    if (!titles.includes(plan.text)) titles.push(plan.text);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, titles]) => {
      const label = overviewDateLabel(key, referenceDate);
      const visible = titles.slice(0, 4).join("、");
      const suffix = titles.length > 4 ? `等 ${titles.length} 项` : "";
      return `${label}：${visible}${suffix}`;
    })
    .join("；");
}

function overviewDayKey(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function overviewDateLabel(key, referenceDate) {
  const [year, month, day] = key.split("-").map(Number);
  const target = new Date(year, month - 1, day);
  const todayStart = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );
  const delta = Math.round((target - todayStart) / 86_400_000);
  if (delta === 0) return "今天";
  if (delta === 1) return "明天";
  if (delta === 2) return "后天";
  return `${month}月${day}日`;
}

function detectRelativeDate(text, referenceDate) {
  const base = startOfDay(referenceDate);
  const relativeDays = [
    ["大后天", 3],
    ["后天", 2],
    ["明天", 1],
    ["今天", 0],
    ["今晚", 0],
    ["明晚", 1],
    ["昨天", -1]
  ];
  const candidates = relativeDays
    .filter(([term]) => text.includes(term))
    .map(([, offset]) => addDays(base, offset))
    .sort((a, b) => a - b);
  let foundDate = candidates.at(-1) || null;

  if (!foundDate) {
    const weekdayMatch = lastMatch(
      text,
      /(下周|下星期|本周|这周|周|星期)([一二三四五六日天])/g
    );
    if (weekdayMatch) {
      const prefix = weekdayMatch[1];
      const weekday = weekdayNumber(weekdayMatch[2]);
      const currentWeekday = referenceDate.getDay();
      const mondayOffset = (currentWeekday + 6) % 7;
      const targetOffset = (weekday + 6) % 7;

      if (prefix.includes("下周") || prefix.includes("下星期")) {
        const currentMonday = addDays(base, -mondayOffset);
        foundDate = addDays(currentMonday, 7 + targetOffset);
      } else if (prefix.includes("本周") || prefix.includes("这周")) {
        const currentMonday = addDays(base, -mondayOffset);
        foundDate = addDays(currentMonday, targetOffset);
      } else {
        foundDate = addDays(base, (weekday - currentWeekday + 7) % 7);
      }
    }
  }

  if (!foundDate) {
    const nextMonthMatch = lastMatch(text, /下个月\s*(\d{1,2}|[一二三四五六七八九十两]{1,3})(?:日|号)/g);
    if (nextMonthMatch) {
      const nextMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1);
      foundDate = localDate(
        nextMonth.getFullYear(),
        nextMonth.getMonth(),
        chineseNumber(nextMonthMatch[1])
      );
    }
  }

  if (!foundDate) {
    const monthDay = lastMatch(
      text,
      /(\d{1,2}|[一二三四五六七八九十两]{1,3})月(\d{1,2}|[一二三四五六七八九十两]{1,3})(?:日|号)/g
    );
    if (monthDay) {
      const month = chineseNumber(monthDay[1]);
      const day = chineseNumber(monthDay[2]);
      foundDate = localDate(referenceDate.getFullYear(), month - 1, day);
      if (foundDate < startOfDay(referenceDate)) {
        foundDate = localDate(referenceDate.getFullYear() + 1, month - 1, day);
      }
    }
  }

  const time = detectTime(text, foundDate || referenceDate, Boolean(foundDate));
  if (time) foundDate = time;
  return foundDate;
}

function detectAbsoluteDate(text, referenceDate) {
  const datePattern =
    /(\d{4}[年/-]\d{1,2}[月/-]\d{1,2}日?|\d{1,2}月\d{1,2}日?)/;
  const match = text.match(datePattern);
  if (!match) return null;
  const parts = match[1].match(/\d+/g)?.map(Number);
  if (!parts) return null;
  const date = parts.length === 3
    ? localDate(parts[0], parts[1] - 1, parts[2])
    : localDate(referenceDate.getFullYear(), parts[0] - 1, parts[1]);
  if (parts.length === 2 && date < startOfDay(referenceDate)) {
    return localDate(referenceDate.getFullYear() + 1, parts[0] - 1, parts[1]);
  }
  return date;
}

function detectTime(text, date, hasExplicitDate) {
  const match = lastMatch(
    text,
    /(凌晨|早上|上午|中午|下午|傍晚|晚上)?\s*(\d{1,2}|[一二三四五六七八九十两]{1,3})(?:点|时|:|：)(\d{1,2}|[一二三四五六七八九十两]{1,3})?(?:分)?/g
  );
  if (!match) return null;
  let hour = chineseNumber(match[2]);
  const minute = chineseNumber(match[3] || "0");
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return null;
  if (!Number.isFinite(minute) || minute < 0 || minute > 59) return null;

  const period = match[1] || "";
  if ((period.includes("下午") || period.includes("傍晚") || period.includes("晚上")) && hour < 12) {
    hour += 12;
  } else if (period.includes("中午") && hour < 11) {
    hour += 12;
  } else if (period.includes("凌晨") && hour === 12) {
    hour = 0;
  }

  const result = new Date(date);
  result.setHours(hour, minute, 0, 0);
  if (!hasExplicitDate && result < new Date()) {
    result.setDate(result.getDate() + 1);
  }
  return result;
}

function detectImportance(text) {
  if (HIGH_KEYWORDS.some((keyword) => text.includes(keyword))) return "high";
  if (LOW_KEYWORDS.some((keyword) => text.includes(keyword))) return "low";
  return null;
}

function extractKeywords(text) {
  const keywords = [];
  try {
    const segmenter = new Intl.Segmenter("zh-CN", { granularity: "word" });
    for (const part of segmenter.segment(text)) {
      const value = part.segment.trim();
      if (
        part.isWordLike &&
        value.length >= 2 &&
        !STOP_WORDS.has(value) &&
        !/^[0-9年月日点分秒]+$/.test(value)
      ) {
        keywords.push(value);
      }
    }
  } catch {
    keywords.push(
      ...text
        .split(/[\s，,。！？!?；;、]+/)
        .filter((value) => value.length >= 2 && !STOP_WORDS.has(value))
    );
  }

  return [...new Set(keywords)].slice(0, 8);
}

function deduplicatePlans(plans) {
  const seen = new Set();
  return plans.filter((plan) => {
    const key = plan.text.replace(/[\s，,。！？!?；;、]/g, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function weekdayNumber(text) {
  return {
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    日: 0,
    天: 0
  }[text];
}

function chineseNumber(value) {
  if (value == null) return NaN;
  const text = String(value);
  if (/^\d+$/.test(text)) return Number(text);
  const digits = {
    零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5,
    六: 6, 七: 7, 八: 8, 九: 9
  };
  if (text === "十") return 10;
  if (text.startsWith("十") && text.length === 2) return 10 + digits[text[1]];
  if (text.endsWith("十") && text.length === 2) return digits[text[0]] * 10;
  if (text.length === 3 && text[1] === "十") return digits[text[0]] * 10 + digits[text[2]];
  return Number([...text].map((char) => digits[char] ?? "").join(""));
}

function lastMatch(text, expression) {
  const flags = expression.flags.includes("g") ? expression.flags : `${expression.flags}g`;
  const matches = [...text.matchAll(new RegExp(expression.source, flags))];
  return matches.at(-1) || null;
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ||
    `plan-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, count) {
  const result = new Date(date);
  result.setDate(result.getDate() + count);
  return result;
}

function localDate(year, monthIndex, day) {
  return new Date(year, monthIndex, day, 0, 0, 0, 0);
}
