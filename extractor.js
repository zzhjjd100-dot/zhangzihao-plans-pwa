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
  "看情况", "也可以", "尽量", "随便", "最不重要", "不重要",
  "低重要性", "次要"
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
  "到", "拿", "陪", "缴", "吃", "跑", "锻炼", "运动",
  "指导", "细化", "盘活", "推进", "完善", "支持", "落实", "建设",
  "打造", "保障", "拓展", "研发", "推出", "分类",
  "练", "训练", "游泳", "跑步", "慢跑", "骑行", "跳绳", "瑜伽",
  "拉伸", "热身", "深蹲", "平板支撑", "快走", "修改", "订正",
  "睡觉", "保持", "测", "学", "挑", "练习", "刷题", "复盘",
  "临摹", "投", "补", "列", "分配", "改错", "浏览", "打勾",
  "调整", "走", "骑", "恢复", "增加", "拆装", "模拟", "临帖",
  "拍", "选片", "压腿", "改稿", "计时", "录像", "记录", "翻",
  "标出", "调", "减重"
];

const AUTONOMOUS_TASKS = [
  "开会", "面试", "考试", "体检", "复盘", "汇报", "培训", "复诊",
  "上班", "休息", "运动", "锻炼", "跑步", "慢跑", "游泳", "骑行",
  "跳绳", "瑜伽", "拉伸", "热身", "快走", "睡觉", "深蹲", "平板支撑"
];

const STUDY_SUBJECTS = [
  "英语", "数学", "语文", "化学", "物理", "生物", "政治", "历史", "地理"
];

const STUDY_OBJECT_PATTERN_SOURCE =
  `(?:${STUDY_SUBJECTS.join("|")})?\\s*(?:的)?\\s*(?:` +
  "第[一二三四五六七八九十百\\d]+单元(?:的)?(?:知识|知识点|内容|作业|练习|测试)?|" +
  "课外班作业|课外班练习|课外班测试|半张卷子|课班作业|分项测试|古诗词|" +
  "卷子|试卷|测试|听说|单词|生词|词汇|" +
  "作文|范文|错题|作业)";

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

export function parsePlanningDate(text, referenceDate = new Date()) {
  return detectDate(String(text || ""), new Date(referenceDate)).date;
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
  const narrativeOnly = isNonActionableNarration(normalized);
  const fragments = narrativeOnly ? [] : splitIntoFragments(normalized);
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
        const targets = /(?:都|所有|全部)/.test(originalFragment)
          ? plans
          : [plans.at(-1)];
        for (const plan of targets) {
          if (
            importanceOnly === "high" &&
            plan.importanceExplicit &&
            plan.importance === "low"
          ) {
            continue;
          }
          plan.importance = importanceOnly;
          plan.importanceWasAutomaticallyInferred = true;
          plan.importanceExplicit = true;
        }
      } else {
        pendingImportanceContext = importanceOnly;
      }
      continue;
    }

    if (
      isPastStatement(originalFragment) ||
      isNonActionableNarration(originalFragment)
    ) {
      continue;
    }
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
    const summaries = summarizeTaskText(originalFragment, {
      subject: activeSubjectContext,
      action: activeActionContext
    });
    let createdFromFragment = false;

    for (const summary of summaries) {
      let enrichedSummary = enrichStudySummary(summary, activeSubjectContext);
      enrichedSummary = applyActionContext(
        enrichedSummary,
        activeActionContext,
        activeSubjectContext
      );
      enrichedSummary = sanitizePlanTitle(enrichedSummary);
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
        importanceWasAutomaticallyInferred: Boolean(importance || pendingImportanceContext),
        importanceExplicit: Boolean(importance || pendingImportanceContext)
      });
      createdFromFragment = true;
      pendingImportanceContext = null;
      pendingTimeContext = null;
    }

    if (!createdFromFragment && hasTimeExpression(originalFragment) && dateResult.date) {
      pendingTimeContext = dateResult.date;
    }
    if (!createdFromFragment && isStandaloneImportanceCue(originalFragment)) {
      pendingImportanceContext = detectImportance(originalFragment);
    }
  }

  if (plans.length === 0 && !narrativeOnly) {
    plans.push(
      ...extractFallbackPlans(
        normalized,
        referenceDate,
        fallbackDate,
        fallbackImportance
      )
    );
  }

  const deduped = deduplicatePlans(plans).map(
    ({ importanceExplicit, ...plan }) => plan
  );
  return {
    plans: deduped,
    keywords: extractKeywords(normalized),
    removedFillerCount,
    cleanedText: deduped.map((plan) => plan.text).join("；"),
    summary: buildOverview(deduped, referenceDate)
  };
}

function normalize(text) {
  return prepareDialogueText(String(text || ""))
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(
      /[，,]\s*(?:下[，,]\s*)?(?:这个|这段)?语段[\s\S]*$/g,
      ""
    )
    .replace(
      /[，,]?\s*这句话(?:的)?(?:识别结果|提取结果|整理结果)[\s\S]*$/g,
      ""
    )
    .replace(
      /[，,]?\s*(?:这段话|这段)(?:好|有|识别|提取|整理|计划)[\s\S]*$/g,
      ""
    )
    .replace(/[，,]?\s*这句话(?:识别出|提取出|整理出)[\s\S]*$/g, "")
    .replace(/英语箱子/g, "英语生词")
    .replace(/英语听说给作文/g, "英语听说给做完")
    .replace(/反相册试/g, "分项测试")
    .replace(/反测试/g, "分项测试")
    .replace(
      /((?:做|完成|写)(?:一点|一下)?[，,]?\s*)((?:英语|数学|语文|物理|化学|生物|政治|历史|地理)课外班)(?=$|[，,。；;])/gu,
      "$1$2作业"
    )
    .replace(/错题也(?:给)?错了/g, "错题也做了")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function prepareDialogueText(text) {
  const roles =
    "A|B|甲|乙|老师|学生|教练|学员|问|答|主持人|记者|受访者|运动员|嘉宾|跑者|舞者|棋手|乐手|求职者|我|你";
  const dialogue = String(text || "")
    .replace(
      new RegExp(`(^|\\n)\\s*(?:${roles})\\s*[：:]\\s*`, "gu"),
      "$1"
    )
    .replace(
      new RegExp(`([。！？!?；;])\\s*(?:${roles})\\s*[：:]\\s*`, "gu"),
      "$1\n"
    )
    .trim();

  if (!/[\n]/.test(dialogue)) return dialogue;

  const turns = dialogue
    .split(/\n+/)
    .map((turn) => turn.trim())
    .filter(Boolean);
  const kept = [];

  for (const turn of turns) {
    if (isDialogueAcknowledgement(turn)) continue;

    if (isDialogueCorrection(turn)) {
      const corrected = rewriteDialogueCorrection(turn, kept.at(-1));
      if (corrected && kept.length) {
        kept[kept.length - 1] = corrected;
      } else if (corrected) {
        kept.push(corrected);
      }
      continue;
    }

    const rewritten = rewriteDialogueQuestion(turn);
    if (rewritten) kept.push(rewritten);
  }

  return kept.join("；");
}

function isDialogueAcknowledgement(text) {
  return /^(?:好(?:的)?[，,]?\s*(?:就按这个来|听你的)?|行|可以|明白|收到|没问题|谢谢|知道了|OK)[。！!，,\s]*$/iu.test(
    String(text || "").trim()
  );
}

function isDialogueCorrection(text) {
  return /(?:算了|不(?:行|练|去|做|学)?了|改成|改为|换成|改到|换到|调整到|改(?:周[一二三四五六日天]|明天|后天|今天|晚上|早上|下午|\d{1,2}点))/u.test(
    String(text || "")
  );
}

function rewriteDialogueCorrection(text, previous) {
  const compact = String(text || "").replace(/^[，,\s]+|[，,\s]+$/g, "");
  const activityReplacement = compact.match(/(?:改成|改为|换成)(.+)$/u)?.[1]?.trim();
  if (activityReplacement) return activityReplacement;

  const scheduleReplacement = compact.match(
    /(?:改到|换到|调整到|改|换)((?:周[一二三四五六日天]|明天|后天|今天|今晚|明晚|早上|上午|中午|下午|晚上|\d{1,2}点).*)$/u
  )?.[1]?.trim();
  if (!scheduleReplacement || !previous) return "";

  const task = stripSchedulePrefixes(previous)
    .replace(/[？?]/g, "")
    .replace(/[，,。；;\s]+$/g, "")
    .trim();
  return task ? `${scheduleReplacement}${task}` : "";
}

function rewriteDialogueQuestion(text) {
  const value = String(text || "").trim();
  const isQuestion = /[？?]$/u.test(value);
  if (!isQuestion) return value;

  const withoutQuestion = value.replace(/[？?]+$/u, "").trim();
  if (
    /(?:几点|什么时候|怎么|如何|什么|谁|哪里|哪儿|多少|多久|几(?:次|个|篇|道|分钟|天|周)?|哪一种|哪个)/u.test(
      withoutQuestion
    )
  ) {
    return "";
  }

  const proposal = withoutQuestion
    .replace(/(?:行吗|可以吗|好不好|好吗|怎么样|行不行|可不可以)$/u, "")
    .replace(/^(?:能不能|可不可以|是否需要)/u, "")
    .trim();
  return ACTION_CUE_PATTERN.test(proposal) ? proposal : "";
}

function sanitizePlanTitle(text) {
  return String(text || "")
    .replace(/(?:一点|一下)/gu, "")
    .replace(
      /^(?:那个|这个|就是|然后|其实|可能|应该|怎么说呢)[，,。；;\s]*/gu,
      ""
    )
    .replace(
      /(?:那个|这个|就是|然后|其实|可能|应该|怎么说呢)[，,。；;\s]*$/gu,
      ""
    )
    .replace(/[，,。；;、：:…]+/gu, "")
    .replace(/\s+/gu, "")
    .replace(/和$/u, "")
    .trim();
}

function splitIntoFragments(text) {
  let prepared = text
    .replace(/(?:首先|其次|然后|接着|之后|最后|而且|并且|另外|还有|还要|同时|等会(?:儿)?|等一会(?:儿)?|稍后|对了|顺便说一下)[，,\s]+/g, "\n")
    .replace(/(?:我说完了|大概就是这样|你明白吧)[。！？!?]?$/g, "");

  prepared = prepared.replace(
    /((?:这个|这件|这项)?(?:真的|很|非常|特别|太)?不(?:太)?(?:重要|急)(?:的)?(?:任务|计划|事情)?)\s*(?=(?:前面(?:的)?所有|以上所有|全部|所有|这些).*?(?:重要|关键|紧急))/gu,
    "$1\n"
  );
  prepared = prepared.replace(
    /[，,]\s*(尽量|有空|可选|随便|低优先|看情况|以后再说)\s*(?=[，,])/gu,
    "\n$1\n"
  );

  prepared = prepared
    .replace(
      /(?:然后|接着|之后|而且|并且|另外|还有|还要|同时|再|等会(?:儿)?|等一会(?:儿)?|稍后|最后)(?=(?:我|你)?(?:要|需要|得|必须|记得|安排|准备|提交|完成|联系|预约|检查|开会|参加|整理|复习|学习|背|读|写|做|买|交|把|跟|和))/g,
      "\n"
    );

  prepared = insertStudyObjectBoundaries(prepared);
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

  const mergedFragments = [];
  for (let index = 0; index < fragments.length; index += 1) {
    const fragment = fragments[index];
    if (
      /^(?:(?:而且|并且|另外|对了|然后|接着|之后|还有|还要|同时|再|等会(?:儿)?|等一会(?:儿)?|稍后|最后)(?:把|给)?|把|给)$/.test(fragment) &&
      fragments[index + 1]
    ) {
      mergedFragments.push(`${fragment}${fragments[index + 1]}`);
      index += 1;
    } else {
      mergedFragments.push(fragment);
    }
  }

  return mergedFragments;
}

function insertStudyObjectBoundaries(text) {
  const matches = [...text.matchAll(new RegExp(STUDY_OBJECT_PATTERN_SOURCE, "gu"))];
  if (matches.length < 2) return text;

  const boundaries = [];
  for (let index = 1; index < matches.length; index += 1) {
    const objectIndex = matches[index].index;
    const before = text.slice(Math.max(0, objectIndex - 16), objectIndex);
    if (
      /(?:最|不)?(?:太)?重要(?:的)?(?:是)?(?:把|给)?[，,\s]*$/u.test(before) ||
      /(?:这个|这|它)?(?:真的|很|非常|特别)?(?:重要|关键|紧急)[，,\s]*$/u.test(before)
    ) {
      continue;
    }
    const attachedAction = before.match(
      /(?:完成|复习|温习|预习|背|读|默写|抄写|写|做|整理|学习|修改|订正|临摹|练|训练)(?:一点|一下)?[，,]?\s*$/u
    );
    if (attachedAction) {
      const actionStart = objectIndex - attachedAction[0].length;
      const precedingTask = text.slice(Math.max(0, actionStart - 28), actionStart);
      if (
        /(?:单词|作文|卷子|试卷|测试|错题|作业|单元|古诗词)(?:做完|写完|做了|完成|搞定)?[，,\s]*$/u.test(precedingTask)
      ) {
        boundaries.push(actionStart);
      }
      continue;
    }

    const connector = before.match(
      /(?:而且|并且|另外|然后|接着|之后|还有|还要|同时|以及|和)\s*(?:把|给)?\s*$/u
    );
    const boundary = connector
      ? objectIndex - connector[0].length
      : objectIndex;
    if (boundary > 0 && boundary !== boundaries.at(-1)) boundaries.push(boundary);
  }

  if (!boundaries.length) return text;
  let result = "";
  let cursor = 0;
  for (const boundary of boundaries) {
    result += `${text.slice(cursor, boundary).trim()}\n`;
    cursor = boundary;
  }
  return `${result}${text.slice(cursor).trim()}`;
}

function insertLooseTaskBoundaries(text) {
  const markerPattern =
    /(?:今天|明天|后天|大后天|明晚|今晚|下周[一二三四五六日天]|下星期[一二三四五六日天]|本周[一二三四五六日天]|这周[一二三四五六日天]|周[一二三四五六日天]|星期[一二三四五六日天]|上午|早上|中午|下午|傍晚|晚上|睡前|起床后|饭前|饭后|英语|数学|语文|化学|物理|生物|政治|历史|地理|然后|接着|之后|而且|并且|另外|还有|还要|同时|再|等会(?:儿)?|等一会(?:儿)?|稍后|最后)/g;
  const actionPattern =
    /(?:要|需要|得|必须|记得|安排|准备|提交|完成|联系|预约|检查|开会|参加|整理|学习|复习|背|读|写|做|买|交|确认|继续|处理|跟|和|把)/;
  const boundaries = [];

  for (const match of text.matchAll(markerPattern)) {
    const index = match.index;
    if (index <= 0) continue;
    const marker = match[0];
    const before = text.slice(0, index);
    if (/每$/u.test(before) && /^周[一二三四五六日天]/u.test(marker)) {
      continue;
    }
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
      const isLeadIn = /(?:要|需要|得|应该|准备|打算|计划|想|把|给|完成|复习|温习|预习|背|读|写|做|整理|学习)(?:一点|一下|一些)?$/.test(preceding);
      const isCompletedPrevious =
        /(?:做了|做完|写完|完成|搞定|范文|生词|卷子|单词|词汇|知识|作业)$/.test(preceding);
      const isPendingLookup = /(?:看看|查看|最近)$/.test(preceding);
      const isImportanceLeadIn =
        /(?:这个|这|它)?(?:真的|很|非常|特别)?(?:重要|关键|紧急)$/.test(preceding);
      if (!isLeadIn && !isPendingLookup && !isImportanceLeadIn && (preceding.includes(marker) || isCompletedPrevious)) {
        boundaries.push(index);
      }
      continue;
    }

    const isTimeWithinDate = /^(?:上午|早上|中午|下午|傍晚|晚上)$/.test(marker) &&
      /(?:今天|明天|后天|大后天|明晚|今晚|下周[一二三四五六日天]|下星期[一二三四五六日天]|本周[一二三四五六日天]|这周[一二三四五六日天]|周[一二三四五六日天]|星期[一二三四五六日天])$/.test(before.slice(-10));
    if (isTimeWithinDate) continue;

    const ahead = text.slice(index, index + 34);
    if (
      marker === "再" &&
      /^(?:开发|利用|贷款|贴现|保险|就业|规划|生产)/u.test(ahead.slice(1))
    ) {
      continue;
    }
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
  if (
    /^(?:这个|这件|这项|前面|以上|全部|所有|这些).*?(?:重要|关键|紧急)/u.test(text)
  ) {
    return true;
  }
  const actionKeywords = [
    "要", "需要", "必须", "记得", "安排", "完成", "准备", "做", "写",
    "发", "提交", "联系", "预约", "检查", "处理", "参加", "开会",
    "买", "交", "见", "整理", "提醒", "确认", "继续", "学习", "复习",
    "背", "读", "写", "做", "练", "训练", "游泳", "跑步", "慢跑",
    "快走", "骑行", "跳绳", "瑜伽", "拉伸", "热身", "深蹲",
    "平板支撑", "修改", "订正", "睡觉", "保持", "测", "学", "挑",
    "复盘", "临摹", "投", "补", "列", "分配", "改错", "浏览",
    "打勾", "调整", "走", "骑", "恢复", "增加", "拆装", "模拟",
    "临帖", "拍", "选片", "压腿", "改稿", "计时", "录像", "记录"
  ];
  const datePrefixes = [
    "今天", "明天", "后天", "大后天", "下周", "本周", "这周",
    "周一", "周二", "周三", "周四", "周五", "周六", "周日",
    "上午", "下午", "中午", "晚上", "明晚", "今晚",
    "睡前", "起床后", "饭前", "饭后", "每天", "每周", "周末",
    "每月", "早上"
  ];
  const connectorPrefixes = [
    "而且", "并且", "然后", "接着", "之后", "另外", "还有", "还要",
    "同时", "再", "等会", "等会儿", "等一会", "等一会儿", "稍后", "最后"
  ];
  const studyPrefixes = STUDY_SUBJECTS;
  const startsWithAction = actionKeywords.some((keyword) =>
    text.startsWith(keyword)
  );
  const startsWithTime = /^(?:\d{1,2}|[一二三四五六七八九十两]{1,3})(?:点|时)/u.test(
    text
  );
  return (
    actionKeywords.some((keyword) => text.includes(keyword)) &&
    (
      startsWithAction ||
      startsWithTime ||
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
      /^(?:(?:嗯+|啊+|呃+|额+|哦+|唉+|那个|就是说|也就是|也就是说|就是|其实吧?|然后呢|怎么说呢|你知道吗|我跟你说一下|我和你说一下|我说一下|我跟你说|我和你说)[，,、.…\s]*)+/g,
      ""
    )
    .replace(/(?:然后|这个|那个|就是|其实|可能|应该)\1+/g, "$1")
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

function isStandaloneImportanceCue(text) {
  return /^(?:尽量|有空|可选|随便|低优先|看情况|以后再说)$/u.test(
    String(text || "").trim()
  );
}

function detectImportanceOnly(text) {
  const compact = text
    .replace(/[\s，,。！？!?；;、.…]/g, "")
    .replace(/^(?:前面(?:的)?所有|前面|以上所有|全部|所有|这些)(?:都)?/, "")
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

function summarizeTaskText(text, context = {}) {
  const withoutImportanceComment = stripImportanceComment(text);
  const withoutSchedule = stripSchedulePrefixes(withoutImportanceComment);
  const withoutTrailingImportance = stripImportanceComment(withoutSchedule);
  const normalized = normalizeTaskTitle(withoutTrailingImportance);
  if (!normalized) return [];

  const mistakeSummaries = summarizeMistakes(normalized);
  if (mistakeSummaries.length) return mistakeSummaries;

  const studySummary = summarizeStudyObjectTask(normalized, context);
  if (studySummary) return [studySummary];

  const learningSummaries = summarizeLearningItems(normalized);
  if (learningSummaries.length) return learningSummaries;

  return [normalized];
}

function summarizeStudyObjectTask(text, { subject, action } = {}) {
  const matches = [...text.matchAll(new RegExp(STUDY_OBJECT_PATTERN_SOURCE, "gu"))];
  if (!matches.length) return null;

  const rawObject = matches.at(-1)[0];
  const detectedSubject = STUDY_SUBJECTS.find((name) => rawObject.includes(name));
  const resolvedSubject = detectedSubject || subject || "";
  const resolvedAction = detectStudyAction(text) || action || "完成";
  const timingPrefix = /睡前/u.test(text) ? "睡前" : "";

  let object = rawObject
    .replace(/^(英语|数学|语文|化学|物理|生物|政治|历史|地理)的/u, "$1")
    .replace(/^的/u, "")
    .replace(/(?:给)?(?:做完|写完|做了|完成)$/u, "")
    .replace(/[，,。；;、：:…]/gu, "")
    .trim();

  if (!object) return null;
  if (
    resolvedSubject &&
    !STUDY_SUBJECTS.some((name) => object.includes(name))
  ) {
    object = `${resolvedSubject}${object}`;
  }

  return `${timingPrefix}${resolvedAction}${object}`;
}

function detectStudyAction(text) {
  if (/预习/u.test(text)) return "预习";
  if (/(?:复习|温习)/u.test(text)) return "复习";
  if (/修改/u.test(text)) return "修改";
  if (/(?:订正|改正)/u.test(text)) return "订正";
  if (/默写/u.test(text)) return "默写";
  if (/抄写/u.test(text)) return "抄写";
  if (/(?:背诵|背)/u.test(text)) return "背";
  if (/(?:朗读|读)/u.test(text)) return "读";
  if (/(?:做完|写完|做了|完成|搞定)/u.test(text)) return "完成";
  if (/(?:做|写)/u.test(text)) return "完成";
  return null;
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
  if (/(?:做|写)(?:一点|一下|一遍)?(?=[\p{Script=Han}])/u.test(text)) {
    return "完成";
  }
  if (/(?:修改)/.test(text)) return "修改";
  if (/(?:订正|改正)/.test(text)) return "订正";
  if (/(?:复习|温习)/.test(text)) return "复习";
  if (/预习/.test(text)) return "预习";
  if (/默写/.test(text)) return "默写";
  if (/抄写/.test(text)) return "抄写";
  if (/临摹/.test(text)) return "临摹";
  if (/刷题/.test(text)) return "刷题";
  if (/复盘/.test(text)) return "复盘";
  if (/(?:练习|练|训练)/.test(text)) return "练";
  if (/(?:背诵|背)/.test(text)) return "背";
  if (/(?:朗读|读)/.test(text)) return "读";
  return null;
}

function summarizeMistakes(text) {
  if (!text.includes("错题")) return [];
  const subject = STUDY_SUBJECTS.find((name) => text.includes(name));
  const wantsCompletion = /(?:做|改|整理|错|完成).*(?:题|了|吧)|错题也/.test(text);
  const wantsReview = /(?:看看|查看|有哪些|有什么)/.test(text);
  const wantsCorrection = /(?:订正|改正)/.test(text);
  const wantsSelection = /(?:挑|选)/.test(text);
  const wantsNotebook = /(?:翻|标出).*(?:错题本|重复错误)/.test(text);

  if (wantsNotebook) return [`整理${subject || ""}错题本`];
  if (wantsCorrection) return [`订正${subject || ""}错题`];
  if (wantsSelection) {
    const important = /高频/.test(text) ? "高频" : "";
    return [`挑选${important}${subject || ""}错题`];
  }
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
    if (isPastStatement(clause) || isNonActionableNarration(clause)) continue;
    const dateResult = resolveTaskDate(clause, referenceDate, activeDate);
    activeDate = dateResult.contextDate || activeDate;
    const importance = detectImportance(clause);
    const summaries = summarizeTaskText(clause);
    const condensed = summaries.length
      ? summaries
      : [condenseLooseClause(clause)];
    for (const rawSummary of condensed.filter(Boolean)) {
      const summary = sanitizePlanTitle(rawSummary);
      if (!summary || !isFeasiblePlanText(summary)) continue;
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
  if (isNonActionableNarration(cleaned)) return [];
  const condensed = sanitizePlanTitle(condenseLooseClause(cleaned));
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

function isNonActionableNarration(text) {
  const compact = String(text || "")
    .replace(/[\s，,。！？!?；;、.…]/g, "")
    .trim();
  if (!compact) return true;

  const explicitFuture =
    /(?:下一步|接下来|后续|从今以后|明天|后天|下周|下个月|到时候|计划|打算|准备要|将要|想要|想去|想出去|我要|我们需要|(?:我|我们|我现在|我们现在)(?:需要|要|得)|(?:目前|现在|当前)(?:要|需要|得|必须|先|准备|打算|计划|开始)|提醒我|记得|必须|在那之前|之前要|之前完成|截止到|截至|(?:我|我们)就(?:去|往|开始|做))/u.test(compact);
  if (explicitFuture) return false;

  if (/^(?:目前|现在|当前|如今)/u.test(compact)) return true;
  if (/^近期有(?:居民|市民|网友|群众).*(?:反映|投诉|表示)/u.test(compact)) {
    return true;
  }
  if (/^(?:早年|当年|当时|之前|过去|原来|此前)/u.test(compact)) return true;
  if (
    /(?:当年|早年|之前|过去|后来|其后|那时候)/u.test(compact) &&
    /(?:我|我们|他|她|朋友|家人|母亲|父亲)/u.test(compact)
  ) {
    return true;
  }
  if (
    /^(?:我(?:老公|老婆|妈妈|母亲|爸爸|父亲|孩子|朋友|同事|同学)|他|她|专家|医生|居民|工作人员)/u.test(compact)
  ) {
    return true;
  }
  if (
    /(?:认为|以为|觉得|发现|表示|说明|意味着|核心原则|关键是|问题是|原因是|属于|指的是|有没有|是否|最常见|最难|(?:比较|非常|很)(?:熟悉|了解|容易|复杂))/u.test(compact)
  ) {
    return true;
  }
  if (/(?:其后|后来).*(?:到场|发生|成为|完成|看到)/u.test(compact)) {
    return true;
  }
  if (
    /(?:建议|最好|可以.*(?:也可以|再来))/u.test(compact) &&
    !/(?:我要|我需要|提醒我|帮我|明天|下周)/u.test(compact)
  ) {
    return true;
  }
  return false;
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
  const vocabularyMatch = text.match(/英语\s*的?\s*(生词|单词|词汇)/);
  const hasVocabulary = Boolean(vocabularyMatch);
  const hasEssay = /英语\s*的?\s*(?:范文|作文)|(?:读|背|看|学习)(?:一篇|一些)?\s*范文/.test(text);
  const hasCompletion = /(?:做完|写完|完成)/.test(text);
  if (!hasVocabulary && !hasEssay) return [];

  const residual = text
    .replace(/英语\s*的?\s*(?:生词|单词|词汇|范文|作文)/g, "")
    .replace(/(?:做完|写完|完成)/g, "")
    .replace(/(?:背|读|看|学习|复习|预习|温习|整理|记|默写|抄写|交|完成|准备)/g, "")
    .replace(/(?:一篇|一些|一点|十个|十个?)/g, "")
    .replace(/(?:生词|单词|词汇|范文|作文)/g, "")
    .replace(/[和与及、,，以及]/g, "")
    .replace(/[的了呢吧啊呀。！？!?\s]/g, "");

  if (residual.length > 0) return [];

  const summaries = [];
  if (hasVocabulary) {
    const vocabulary = vocabularyMatch?.[1] || "生词";
    summaries.push(hasCompletion ? `完成英语${vocabulary}` : `英语${vocabulary}`);
  }
  if (hasEssay) summaries.push(hasCompletion ? "完成范文" : "范文");
  return summaries;
}

function stripImportanceComment(text) {
  return text
    .replace(
      /^(?:这个|这件事|这|它)?(?:任务|计划|事情)?(?:真的|很|非常|特别|太)?(?:最)?不(?:太)?(?:重要|急)(?:的)?(?:是|任务|计划|事情)?[，,\s]*/g,
      ""
    )
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
    /^(?:在?那(?:一天)?之前|在这?之前|在此之前|之前)(?:要|需要|得|必须)?\s*/,
    /^(?:截止到|截至)(?:今天|明天|后天|\d{1,2}月\d{1,2}(?:日|号))?\s*/,
    /^(?:下一步|接下来|后续|从现在开始)[，,\s]*(?:我们|我)?(?:将|会|要|需要|计划|准备|打算)?\s*/,
    /^(?:我们|我)(?:将|会|计划|准备|打算)\s*/,
    /^(?:目前|现在|当前)(?:先|准备|打算|计划|开始)?\s*/,
    /^(?:先|首先|再|其次|最后)\s*/,
    /^(?:有空(?:的时候)?|看情况|尽量)\s*/,
    /^(?:提醒我|帮我|请|麻烦你?|记得|别忘了|我要|我需要|我得|我想|你要|你需要|你得|他要|他得|她要|她得|得)\s*/,
    /^(?:我|你)(?=[\p{Script=Han}])/u,
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
  const actionObject = normalizeActionObjectPhrase(text);
  return actionObject
    .replace(/(?:而且|并且|然后|接着|之后|另外|还有|还要|同时|等会(?:儿)?|等一会(?:儿)?|稍后)[，,\s]*/g, "")
    .replace(/^(?:说[，,\s]*)+(?:我|你|他|她)?(?:要|需要|想|打算)?[，,\s]*/u, "")
    .replace(/^(?:先|首先|再|其次|最后)\s*/u, "")
    .replace(/^(?:需要|应该|必须)(?=[\p{Script=Han}])/u, "")
    .replace(/(?:这个|那个)(?=[\p{Script=Han}])/gu, "")
    .replace(
      /^.*?种完(.+?)[，,]\s*我就(?:往|去)(.+?)(?:走|旅行)?$/u,
      (_, crop, direction) => {
        const harvest = crop === "麦子" ? "麦收" : `${crop}收获`;
        const destination =
          direction === "南" ? "南方" : direction === "北" ? "北方" : direction;
        return `完成${harvest}后去${destination}旅行`;
      }
    )
    .replace(
      /^指导各地结合.+?盘活(.+?)(?:的)?(?:路径|工作|任务)?$/u,
      "指导各地盘活$1"
    )
    .replace(/^把(.+?)(?:给)?(?:写完|做完|做了|完成|搞定|做)$/g, "完成$1")
    .replace(/^(.{2,36}?)(?:给)?(?:写完|做完|做了|完成|搞定|做)$/g, "完成$1")
    .replace(/^(英语|数学|语文|化学|物理|生物|政治|历史|地理)\s*(复习|预习)\s*(第[一二三四五六七八九十百\d]+单元)$/g, "$2$1$3")
    .replace(/^(复习|预习)(英语|数学|语文|化学|物理|生物|政治|历史|地理)\s*(第[一二三四五六七八九十百\d]+单元)$/g, "$1$2$3")
    .replace(/^复习(第[一二三四五六七八九十百\d]+单元)(英语|数学|语文|化学|物理|生物|政治|历史|地理)(?:的)?(知识|知识点|内容)?$/g, "复习$2$1$3")
    .replace(/^完成(.+?)的(第[一二三四五六七八九十百\d]+单元)(作业|练习|试卷)$/g, "完成$1$2$3")
    .replace(/^完成(第[一二三四五六七八九十百\d]+单元)的?(作业|练习|试卷)$/g, "完成$1$2")
    .replace(/^完成(.+?)的(作业|练习|试卷)$/g, "完成$1$2")
    .replace(/^(英语|数学|语文|化学|物理|生物|政治|历史|地理)的(生词|单词|词汇|范文|作文|错题|作业|卷子|试卷|练习|知识点)$/g, "$1$2")
    .replace(/^完成(英语|数学|语文|化学|物理|生物|政治|历史|地理)的(生词|单词|词汇|范文|作文|错题|作业|卷子|试卷|练习|知识点)$/g, "完成$1$2")
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

function normalizeActionObjectPhrase(text) {
  const match = text.match(
    /^(.+?(?:作业|练习|卷子|试卷|错题|生词|单词|词汇|范文|作文|知识点))\s*(?:要|需要|得|必须|应该)\s*(做完|写完|做|写|完成|复习|预习|背|读)(?:一下|一遍|了|的)?$/u
  );
  if (!match) return text;

  const object = match[1].replace(
    /^(英语|数学|语文|化学|物理|生物|政治|历史|地理)的/u,
    "$1"
  );
  const verb = match[2];
  const action = /^(?:复习|预习|背|读)$/u.test(verb) ? verb : "完成";
  return `${action}${object}`;
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
  if (LOW_KEYWORDS.some((keyword) => text.includes(keyword))) return "low";
  if (HIGH_KEYWORDS.some((keyword) => text.includes(keyword))) return "high";
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
