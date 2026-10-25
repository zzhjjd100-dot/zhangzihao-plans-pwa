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
  "一下", "我跟你说一下", "我和你说一下", "我说一下",
  "而且", "并且", "等会", "等会儿", "等一会", "等一会儿", "稍后",
  "把", "给"
]);

const STOP_WORDS = new Set([
  "今天", "明天", "后天", "然后", "那个", "就是", "我们", "你们", "他们",
  "这个", "一个", "一下", "需要", "可以", "记得", "事情", "时候", "计划",
  "任务", "进行", "以及", "如果", "但是", "因为", "所以"
]);

const ACTION_CUES = [
  "提交", "完成", "联系", "预约", "检查", "开会", "参加", "整理",
  "学习", "复习", "预习", "温习", "背", "读", "默写", "抄写", "写",
  "做", "买", "交", "发", "准备", "确认", "处理", "继续", "跟", "和",
  "把", "取", "送", "预订", "报名", "缴费", "付款", "打扫", "洗",
  "修", "打印", "下载", "更新", "安装", "订", "安排", "提醒", "面试",
  "考试", "体检", "复盘", "汇报", "讨论", "沟通", "申请", "上传",
  "寄", "领取", "核对", "跟进", "拜访", "看", "听", "带", "去",
  "到", "拿", "陪", "缴", "吃", "跑", "锻炼", "运动"
];

const AUTONOMOUS_TASKS = [
  "开会", "面试", "考试", "体检", "复盘", "汇报", "培训", "复诊",
  "上班", "休息", "运动", "锻炼"
];

const STUDY_SUBJECTS = [
  "英语", "数学", "语文", "化学", "物理", "生物", "政治", "历史", "地理"
];

const ACTION_CUE_PATTERN = new RegExp(
  `(?:${[...ACTION_CUES].sort((left, right) => right.length - left.length).join("|")})`
);

const NON_PLAN_PATTERNS = [
  /^(?:我)?(?:今天|明天|后天|现在)?(?:真的|很|有点|好|特别|太)?(?:累|忙|困|饿|开心|难过|无聊|热|冷|烦|焦虑|舒服)$/,
  /^(?:我)?(?:觉得|感觉|认为|发现|看到|知道|听说|担心|希望)/,
  /(?:做什么|干什么|怎么安排|有什么计划|有什么任务|如何安排|要不要|是否要)/,
  /[吗么呢][？?]?$/,
  /(?:大概就是这样|反正就是这样|你明白吧|你知道吗)/,
  /^(?:看看|查看|看看最近|查看最近)$/,
  /^(?:这个|那个|这件事|那件事)?(?:真的|非常|特别|很)?(?:重要|关键|紧急|麻烦|复杂)(?:的)?(?:事情|任务|计划)?$/,
  /^(?:做)?题错$/,
  /^(?:把|给)?[\p{Script=Han}]{1,6}的$/u
];

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
  let pendingImportanceContext = null;
  let pendingTimeContext = null;
  let activeSubjectContext = null;
  let activeActionContext = null;

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
      } else {
        pendingImportanceContext = importanceOnly;
      }
      continue;
    }

    if (isPastStatement(originalFragment)) continue;
    const explicitSubject = STUDY_SUBJECTS.find((subject) =>
      originalFragment.includes(subject)
    );
    if (explicitSubject) activeSubjectContext = explicitSubject;
    const fragmentAction = detectTaskActionContext(originalFragment);
    if (fragmentAction) activeActionContext = fragmentAction;

    const dateResult = resolveTaskDate(
      originalFragment,
      referenceDate,
      activeDateContext
    );
    const hasCurrentTemporal =
      hasExplicitDateExpression(originalFragment) ||
      hasTimeExpression(originalFragment);
    activeDateContext = dateResult.contextDate || activeDateContext;
    const importance = detectImportance(originalFragment);
    const summaries = summarizeTaskText(originalFragment);
    let createdFromFragment = false;

    for (const summary of summaries) {
      let enrichedSummary = enrichStudySummary(summary, activeSubjectContext);
      enrichedSummary = applyActionContext(
        enrichedSummary,
        activeActionContext,
        activeSubjectContext
      );
      if (!isFeasiblePlanText(enrichedSummary)) continue;
      const taskDate =
        (hasCurrentTemporal ? dateResult.date : null) ||
        pendingTimeContext ||
        activeDateContext ||
        fallbackDate;
      plans.push({
        id: createId(),
        text: enrichedSummary,
        date: taskDate.toISOString(),
        importance: importance || pendingImportanceContext || fallbackImportance,
        dateWasAutomaticallyInferred: Boolean(dateResult.date || pendingTimeContext || activeDateContext),
        importanceWasAutomaticallyInferred: Boolean(importance || pendingImportanceContext)
      });
      createdFromFragment = true;
      pendingImportanceContext = null;
      pendingTimeContext = null;
    }

    if (!createdFromFragment && hasTimeExpression(originalFragment) && dateResult.date) {
      pendingTimeContext = dateResult.date;
    }
  }

  if (plans.length === 0) {
    plans.push(
      ...extractFallbackPlans(
        normalized,
        referenceDate,
        fallbackDate,
        fallbackImportance
      )
    );
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
    .replace(/英语箱子/g, "英语生词")
    .replace(/错题也(?:给)?错了/g, "错题也做了")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitIntoFragments(text) {
  let prepared = text
    .replace(/(?:首先|其次|然后|接着|之后|最后|而且|并且|另外|还有|还要|同时|等会(?:儿)?|等一会(?:儿)?|稍后|对了|顺便说一下)[，,\s]+/g, "\n")
    .replace(/(?:我说完了|大概就是这样|你明白吧)[。！？!?]?$/g, "");

  prepared = prepared
    .replace(
      /(?:然后|接着|之后|而且|并且|另外|还有|还要|同时|再|等会(?:儿)?|等一会(?:儿)?|稍后|最后)(?=(?:我|你)?(?:要|需要|得|必须|记得|安排|准备|提交|完成|联系|预约|检查|开会|参加|整理|复习|学习|背|读|写|做|买|交|把|跟|和))/g,
      "\n"
    );

  prepared = insertLooseTaskBoundaries(prepared);

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

function insertLooseTaskBoundaries(text) {
  const markerPattern =
    /(?:今天|明天|后天|大后天|明晚|今晚|下周[一二三四五六日天]|下星期[一二三四五六日天]|本周[一二三四五六日天]|这周[一二三四五六日天]|周[一二三四五六日天]|星期[一二三四五六日天]|上午|早上|中午|下午|傍晚|晚上|英语|数学|语文|化学|物理|生物|政治|历史|地理|然后|接着|之后|而且|并且|另外|还有|还要|同时|再|等会(?:儿)?|等一会(?:儿)?|稍后|最后)/g;
  const actionPattern =
    /(?:要|需要|得|必须|记得|安排|准备|提交|完成|联系|预约|检查|开会|参加|整理|学习|复习|背|读|写|做|买|交|确认|继续|处理|跟|和|把)/;
  const boundaries = [];

  for (const match of text.matchAll(markerPattern)) {
    const index = match.index;
    if (index <= 0) continue;
    const marker = match[0];
    const before = text.slice(0, index);
    if (/[。！？!?；;\n，,]$/.test(before)) continue;
    if (/[的与及和]$/.test(before)) continue;
    if (/(?:在|于|到|改成|改到|改为|推迟到|提前到|安排在|必须在)$/.test(before.trim())) {
      continue;
    }
    if (/^(?:我|你|他|她|它)(?:觉得|打算|计划|想要|准备)?$/.test(before.trim())) {
      continue;
    }

    const isStudySubject = STUDY_SUBJECTS.includes(marker);
    if (isStudySubject) {
      const preceding = before.trim();
      const isLeadIn = /(?:要|需要|得|应该|准备|打算|计划|想|把|给)$/.test(preceding);
      const isCompletedPrevious =
        /(?:做了|做完|写完|完成|搞定|范文|生词|卷子|单词|词汇|知识|作业)$/.test(preceding);
      const isPendingLookup = /(?:看看|查看|最近)$/.test(preceding);
      if (!isLeadIn && !isPendingLookup && (preceding.includes(marker) || isCompletedPrevious)) {
        boundaries.push(index);
      }
      continue;
    }

    const isTimeWithinDate = /^(?:上午|早上|中午|下午|傍晚|晚上)$/.test(marker) &&
      /(?:今天|明天|后天|大后天|明晚|今晚|下周[一二三四五六日天]|下星期[一二三四五六日天]|本周[一二三四五六日天]|这周[一二三四五六日天]|周[一二三四五六日天]|星期[一二三四五六日天])$/.test(before.slice(-10));
    if (isTimeWithinDate) continue;

    const ahead = text.slice(index, index + 34);
    const isConnector = /^(?:然后|接着|之后|而且|并且|另外|还有|还要|同时|再|等会(?:儿)?|等一会(?:儿)?|稍后|最后)$/.test(marker);
    if (!isConnector && !actionPattern.test(ahead)) continue;
    if (boundaries.at(-1) != null && index - boundaries.at(-1) < 3) continue;
    boundaries.push(index);
  }

  if (!boundaries.length) return text;
  let result = "";
  let cursor = 0;
  for (const index of boundaries) {
    result += `${text.slice(cursor, index).trim()}\n`;
    cursor = index;
  }
  result += text.slice(cursor).trim();
  return result.replace(/\n{2,}/g, "\n");
}

function shouldStartNewCommaClause(text) {
  const actionKeywords = [
    "要", "需要", "必须", "记得", "安排", "完成", "准备", "做", "写",
    "发", "提交", "联系", "预约", "检查", "处理", "参加", "开会",
    "买", "交", "见", "整理", "提醒", "确认", "继续", "学习", "复习",
    "背", "读", "写", "做"
  ];
  const datePrefixes = [
    "今天", "明天", "后天", "大后天", "下周", "本周", "这周",
    "周一", "周二", "周三", "周四", "周五", "周六", "周日",
    "上午", "下午", "中午", "晚上", "明晚", "今晚"
  ];
  const connectorPrefixes = [
    "而且", "并且", "然后", "接着", "之后", "另外", "还有", "还要",
    "同时", "再", "等会", "等会儿", "等一会", "等一会儿", "稍后", "最后"
  ];
  const studyPrefixes = STUDY_SUBJECTS;
  return (
    actionKeywords.some((keyword) => text.includes(keyword)) &&
    (
      datePrefixes.some((prefix) => text.startsWith(prefix)) ||
      connectorPrefixes.some((prefix) => text.startsWith(prefix)) ||
      studyPrefixes.some((prefix) => text.startsWith(prefix)) ||
      /^(?:做)?题错$/.test(text) ||
      /^(?:这个|这件事|这|它)/.test(text) && /(?:重要|关键|紧急)/.test(text)
    )
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
    .replace(/^(?:任务|计划|事情|开会|会议|面试|考试|体检|项目)/, "");

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

  const mistakeSummaries = summarizeMistakes(normalized);
  if (mistakeSummaries.length) return mistakeSummaries;

  const learningSummaries = summarizeLearningItems(normalized);
  if (learningSummaries.length) return learningSummaries;

  return [normalized];
}

function enrichStudySummary(summary, subject) {
  if (!summary || !subject) return summary;
  if (STUDY_SUBJECTS.some((name) => summary.includes(name))) return summary;

  if (
    /^(?:完成|复习|预习)(?:第[一二三四五六七八九十百\d]+单元)?(?:作业|练习|试卷|卷子|生词|范文|错题)$/.test(summary)
  ) {
    return summary.replace(/^(完成|复习|预习)/, `$1${subject}`);
  }
  if (summary === "错题") return `完成${subject}错题`;
  return summary;
}

function applyActionContext(summary, actionContext, subject) {
  if (!summary || !actionContext) return summary;
  if (ACTION_CUE_PATTERN.test(summary)) return summary;
  const isStudyObject =
    /^(?:(?:英语|数学|语文|化学|物理|生物|政治|历史|地理))?(?:第[一二三四五六七八九十百\d]+单元)?(?:作业|练习|试卷|卷子|生词|单词|词汇|范文|作文|错题|知识点)$/.test(summary);
  if (!isStudyObject) return summary;
  const subjectPrefix = subject && !summary.includes(subject) ? subject : "";
  return `${actionContext}${subjectPrefix}${summary}`;
}

function detectTaskActionContext(text) {
  if (/(?:做完|做了|写完|写了|完成|搞定)/.test(text)) return "完成";
  if (/(?:复习|温习)/.test(text)) return "复习";
  if (/预习/.test(text)) return "预习";
  return null;
}

function summarizeMistakes(text) {
  if (!text.includes("错题")) return [];
  const subject = STUDY_SUBJECTS.find((name) => text.includes(name));
  const wantsCompletion = /(?:做|改|整理|错|完成).*(?:题|了|吧)|错题也/.test(text);
  const wantsReview = /(?:看看|查看|有哪些|有什么)/.test(text);

  if (wantsCompletion) return [`完成${subject || ""}错题`];
  if (wantsReview) return [`查看${subject || ""}错题`];
  return [];
}

function extractFallbackPlans(text, referenceDate, fallbackDate, fallbackImportance) {
  const cleaned = removeFiller(text).text
    .replace(/(?:嗯+|啊+|呃+|额+|哦+|你知道吗|我跟你说|说白了|其实吧|然后呢)[，,。！？!?；;\s]*/g, "，")
    .replace(/(?:然后|接着|之后|而且|并且|另外|还有|还要|同时|再|等会(?:儿)?|等一会(?:儿)?|稍后|最后)(?=(?:我|你)?(?:要|需要|得|必须|记得|安排|准备|提交|完成|联系|预约|检查|开会|参加|整理|复习|学习|背|读|写|做|买|交|把|跟|和))/g, "，")
    .replace(/(?:今天|明天|后天|大后天|下周[一二三四五六日天])(?=(?:上午|下午|晚上)?(?:我|你)?(?:要|需要|得|必须|记得|安排|准备|提交|完成|联系|预约|检查|开会|参加|整理|复习|学习|背|读|写|做|买|交))/g, "，")
    .replace(/[，,\s]+/g, "，")
    .replace(/^[，,。；;\s]+|[，,。；;\s]+$/g, "");

  const clauses = cleaned
    .split(/[。！？!?；;\n，,]+/)
    .map((clause) => clause.trim())
    .filter((clause) => clause && !isPureFiller(clause));

  const fallbackPlans = [];
  let activeDate = null;

  for (const clause of clauses) {
    if (isPastStatement(clause)) continue;
    const dateResult = resolveTaskDate(clause, referenceDate, activeDate);
    activeDate = dateResult.contextDate || activeDate;
    const importance = detectImportance(clause);
    const summaries = summarizeTaskText(clause);
    const condensed = summaries.length
      ? summaries
      : [condenseLooseClause(clause)];
    for (const summary of condensed.filter(Boolean)) {
      if (!isFeasiblePlanText(summary)) continue;
      fallbackPlans.push({
        id: createId(),
        text: summary,
        date: (dateResult.date || activeDate || fallbackDate).toISOString(),
        importance: importance || fallbackImportance,
        dateWasAutomaticallyInferred: Boolean(dateResult.date || activeDate),
        importanceWasAutomaticallyInferred: Boolean(importance)
      });
    }
  }

  if (fallbackPlans.length) return deduplicatePlans(fallbackPlans);

  if (isPastStatement(cleaned)) return [];
  const condensed = condenseLooseClause(cleaned);
  return condensed && isFeasiblePlanText(condensed)
    ? [{
        id: createId(),
        text: condensed,
        date: fallbackDate.toISOString(),
        importance: detectImportance(cleaned) || fallbackImportance,
        dateWasAutomaticallyInferred: false,
        importanceWasAutomaticallyInferred: Boolean(detectImportance(cleaned))
      }]
    : [];
}

function isFeasiblePlanText(text) {
  const normalized = String(text || "")
    .replace(/[\s，,。！？!?；;、.…]/g, "")
    .trim();
  if (normalized.length < 2) return false;
  if (normalized === "英语生词" || normalized === "范文") return true;
  if (NON_PLAN_PATTERNS.some((pattern) => pattern.test(normalized))) return false;

  if (
    /^(?:昨天|上周|之前|刚刚|已经)/.test(normalized) &&
    /(?:了|过|完)$/.test(normalized)
  ) {
    return false;
  }

  if (
    /^(?:也许|可能|大概|看情况)/.test(normalized) &&
    !/(?:必须|务必|记得|一定要|截止)/.test(normalized)
  ) {
    return false;
  }

  if (new RegExp(`${ACTION_CUE_PATTERN.source}(?:了|过)`).test(normalized)) {
    return false;
  }

  const actionMatch = normalized.match(ACTION_CUE_PATTERN);
  const hasAutonomousTask = AUTONOMOUS_TASKS.some((task) => normalized.includes(task));
  if (!actionMatch && !hasAutonomousTask) return false;

  if (hasAutonomousTask) return true;
  if (!actionMatch) return false;

  let residual = normalized;
  for (const cue of [...ACTION_CUES].sort((left, right) => right.length - left.length)) {
    residual = residual.replaceAll(cue, "");
  }
  residual = residual
    .replace(
      /(?:我们|你们|他们|我|你|他|她|它|这个|那个|这件事|那件事|事情|东西|一下|一点|一些|的|了|着|过|要|想|想要|希望|打算|需要|得|可以|应该|准备要|可能|也许|大概|就是|然后|接着|之后|因为|所以|但是|而且|并且|还要|等会|稍后|时候)/g,
      ""
    )
    .replace(/[^\p{L}\p{N}]/gu, "");

  return residual.length >= 1;
}

function isPastStatement(text) {
  const compact = String(text || "")
    .replace(/[\s，,。！？!?；;、.…]/g, "");
  if (
    /^(?:我|你|他|她|它)?(?:昨天|上周|之前|刚刚|已经)/.test(compact) &&
    /(?:了|过|完)$/.test(compact)
  ) {
    return true;
  }
  if (/(?:给做了|把.+做了|要.+做了)$/.test(compact)) {
    return false;
  }
  if (/(?:错题|作业|卷子|范文|生词|单词|词汇|知识|练习|试卷).*做了$/.test(compact)) {
    return false;
  }
  return /(?:提交|完成|写|做|买|联系|整理|开会|参加|发|交|付款|缴费|处理|确认|复习|学习|背|读)(?:了|过)/.test(compact);
}

function condenseLooseClause(text) {
  let result = stripSchedulePrefixes(stripImportanceComment(text))
    .replace(/^(?:我|你)?(?:觉得|感觉|想着|想说|说一下|说一下就是)/g, "")
    .replace(/(?:而且|并且|然后|接着|之后|另外|还有|还要|同时|等会(?:儿)?|等一会(?:儿)?|稍后)[，,\s]*/g, "")
    .replace(/(?:你看|你懂吧|你知道吗|说白了|大概就是这样|反正)/g, "")
    .replace(/[，,\s]+/g, "，")
    .replace(/^[，,。；;\s]+|[，,。；;\s]+$/g, "")
    .trim();

  if (!result) return "";
  if (result.length <= 42) return result;

  const actionWindow = result.match(
    /(?:要|需要|得|必须|记得|安排|准备|提交|完成|联系|预约|检查|开会|参加|整理|复习|学习|背|读|写|做|买|交)[^，,。；;]{2,42}/
  );
  if (actionWindow) return actionWindow[0].trim();

  return `${result.slice(0, 40).replace(/[，,。；;\s]+$/g, "")}…`;
}

function summarizeLearningItems(text) {
  const hasVocabulary = /英语\s*(?:生词|单词|词汇)/.test(text);
  const hasEssay = /英语\s*(?:范文|作文)|(?:读|背|看|学习)(?:一篇|一些)?\s*范文/.test(text);
  const hasCompletion = /(?:做完|写完|完成)/.test(text);
  if (!hasVocabulary && !hasEssay) return [];

  const residual = text
    .replace(/英语\s*(?:生词|单词|词汇|范文|作文)/g, "")
    .replace(/(?:做完|写完|完成)/g, "")
    .replace(/(?:背|读|看|学习|复习|预习|温习|整理|记|默写|抄写|交|完成|准备)/g, "")
    .replace(/(?:一篇|一些|一点|十个|十个?)/g, "")
    .replace(/(?:生词|单词|词汇|范文|作文)/g, "")
    .replace(/[和与及、,，以及]/g, "")
    .replace(/[的了呢吧啊呀。！？!?\s]/g, "");

  if (residual.length > 0) return [];

  const summaries = [];
  if (hasVocabulary) summaries.push(hasCompletion ? "完成英语生词" : "英语生词");
  if (hasEssay) summaries.push(hasCompletion ? "完成范文" : "范文");
  return summaries;
}

function stripImportanceComment(text) {
  return text
    .replace(
      /^(?:这个|这件事|这|它)?(?:任务|计划|事情)?(?:真的|非常|特别|很|十分)?(?:重要|关键|紧急)(?:的)?(?:任务|计划|事情)?[，,\s]*/g,
      ""
    )
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
    /^(?:而且|并且|另外|对了|然后|接着|之后|还有|还要|同时|等会(?:儿)?|等一会(?:儿)?|稍后|顺便(?:说一下)?)\s*/,
    /^(?:就是|其实就是|主要是|今天就是)\s*/,
    /^(?:先|首先|再|其次|最后)\s*/,
    /^(?:有空(?:的时候)?|看情况|尽量)\s*/,
    /^(?:提醒我|帮我|请|麻烦你?|记得|别忘了|我要|我需要|我得|我想|你要|你需要|你得|他要|他得|她要|她得|得)\s*/,
    /^(?:我|你|他|她|它)?(?:觉得|感觉|认为|发现|希望)\s*/,
    /^(?:我|你|他|她|它)?(?:今天|明天|后天|大后天|明晚|今晚|昨天)(?:的)?\s*/,
    /^(?:我|你|他|她|它)?(?:下周|下星期|本周|这周|周|星期)[一二三四五六日天](?:的)?\s*/,
    /^(?:我|你|他|她|它)?(?:下个月|本月|这个月)\s*(?:\d{1,2}|[一二三四五六七八九十两]{1,3})(?:日|号)\s*/,
    /^(?:我|你|他|她|它)?(?:\d{1,2}|[一二三四五六七八九十两]{1,3})月(?:\d{1,2}|[一二三四五六七八九十两]{1,3})(?:日|号)\s*/,
    /^(?:凌晨|早上|上午|中午|下午|傍晚|晚上)?\s*(?:\d{1,2}|[一二三四五六七八九十两]{1,3})(?:点|时|:|：)(?:\d{1,2}|[一二三四五六七八九十两]{1,3})?(?:分)?\s*前?\s*/,
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
    .replace(/(?:而且|并且|然后|接着|之后|另外|还有|还要|同时|等会(?:儿)?|等一会(?:儿)?|稍后)[，,\s]*/g, "")
    .replace(/^把(.+?)(?:给)?(写完|做完|做了|完成|搞定)$/g, "完成$1")
    .replace(/^(.{2,36}?)(?:给)?(写完|做完|做了|完成|搞定)$/g, "完成$1")
    .replace(/^(英语|数学|语文|化学|物理|生物|政治|历史|地理)\s*(复习|预习)\s*(第[一二三四五六七八九十百\d]+单元)$/g, "$2$1$3")
    .replace(/^(复习|预习)(英语|数学|语文|化学|物理|生物|政治|历史|地理)\s*(第[一二三四五六七八九十百\d]+单元)$/g, "$1$2$3")
    .replace(/^复习(第[一二三四五六七八九十百\d]+单元)(英语|数学|语文|化学|物理|生物|政治|历史|地理)(?:的)?(知识|知识点|内容)?$/g, "复习$2$1$3")
    .replace(/^完成(.+?)的(第[一二三四五六七八九十百\d]+单元)(作业|练习|试卷)$/g, "完成$1$2$3")
    .replace(/^完成(第[一二三四五六七八九十百\d]+单元)的?(作业|练习|试卷)$/g, "完成$1$2")
    .replace(/^完成(.+?)的(作业|练习|试卷)$/g, "完成$1$2")
    .replace(/^(.+?)的错题$/g, "完成$1错题")
    .replace(/^错题$/g, "完成错题")
    .replace(/[，,]\s*(?:这个|这|它)?(?:真的|非常|特别|很|十分)?(?:重要|关键|紧急)(?:的)?(?:任务|计划|事情)?$/g, "")
    .replace(/(讨论|考虑|检查|确认|整理|处理)一下$/g, "$1")
    .replace(/看一下$/g, "看")
    .replace(/的话$/g, "")
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
  } else if (!period && hour >= 1 && hour <= 6) {
    hour += 12;
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
