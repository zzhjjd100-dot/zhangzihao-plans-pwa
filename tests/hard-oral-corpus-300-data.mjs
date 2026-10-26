export const HARD_FILLER_TOKENS = [
  "嗯",
  "啊",
  "就是",
  "然后",
  "那个",
  "其实",
  "这个",
  "怎么说呢",
  "可能",
  "应该"
];

export const ANOMALY_MARKERS = [
  /我我|你你|要要/u,
  /完成完|做完完|写完完|复习习|读完完|练练习|拉伸伸|修改改|做做|整理整理|联系联系|提交提交|准备准备|快走快走|练琴练琴|检查检查|打扫打扫|背背|跑跑步/u,
  /[，,]\s*不是[，,]/u,
  /然后然后|就是就是|这个这个|那个那个/u,
  /嗯嗯嗯|啊啊啊/u,
  /明天下周|下周明天|后天天/u,
  /(?:英语单词|数学卷子|化学错题|语文练习)(?:背|做|整理|复习|完成)/u
];

const dailyTasks = [
  ["背20个英语单词", "单词"],
  ["完成数学卷子", "数学"],
  ["整理化学错题", "化学"],
  ["复习生物第五单元", "生物"],
  ["做两页语文练习", "语文"],
  ["完成课程笔记", "笔记"],
  ["练琴三十分钟", "琴"],
  ["做三组深蹲", "深蹲"],
  ["快走半小时", "快走"],
  ["联系项目客户", "客户"],
  ["提交工作周报", "周报"],
  ["整理资料", "资料"],
  ["完成模拟面试", "面试"],
  ["练习口语录音", "口语"],
  ["打扫房间", "房间"],
  ["准备家庭晚餐", "晚餐"],
  ["复习历史时间线", "历史"],
  ["做一套地理题", "地理"],
  ["完成编程练习", "编程"],
  ["练习投篮五十次", "投篮"],
  ["拉伸十分钟", "拉伸"],
  ["整理错题本", "错题"],
  ["背一首古诗", "古诗"],
  ["做一组平板支撑", "平板支撑"],
  ["检查项目预算", "预算"],
  ["准备会议材料", "会议"],
  ["练习英语听力", "听力"],
  ["复习政治框架", "政治"],
  ["完成读书摘要", "摘要"],
  ["整理桌面文件", "文件"]
];

const dailyPrefixes = [
  "今天上午我要",
  "今天下午我要",
  "今天晚上我要",
  "明天早上我要",
  "明天下午我要",
  "明天晚上我要",
  "后天上午我要",
  "今天先",
  "明天先",
  "晚饭后我要"
];

const focusedTasks = [
  ["每天背20个英语单词", "单词"],
  ["完成三套数学真题", "真题"],
  ["读完一本书", "书"],
  ["整理一次化学错题", "错题"],
  ["复习生物第五单元", "生物"],
  ["练琴五次", "琴"],
  ["跑步三次", "跑步"],
  ["完成课程作业", "作业"],
  ["整理学习笔记", "笔记"],
  ["练习口语录音", "口语"],
  ["完成项目方案", "方案"],
  ["准备汇报材料", "汇报"],
  ["完成模拟面试", "面试"],
  ["复习历史时间线", "历史"],
  ["做一套地理题", "地理"],
  ["完成编程练习", "编程"],
  ["练习投篮一百次", "投篮"],
  ["每天拉伸十分钟", "拉伸"],
  ["复习错题本", "错题"],
  ["背两首古诗", "古诗"]
];

const eventTitles = [
  "项目评审",
  "妈妈生日",
  "资格考试",
  "产品发布",
  "论文答辩",
  "体检预约",
  "报名截止",
  "家庭聚会",
  "篮球比赛",
  "演出彩排"
];

const deadlineTasks = [
  ["完成方案和预算", "方案"],
  ["准备礼物并订蛋糕", "礼物"],
  ["复习全部错题", "错题"],
  ["准备发布材料", "材料"],
  ["修改论文和幻灯片", "论文"],
  ["整理体检资料", "体检"],
  ["提交报名表", "报名"],
  ["准备晚餐和饮料", "晚餐"],
  ["练习投篮和体能", "投篮"],
  ["完成节目排练", "排练"]
];

const eventDates = [
  "11月5日",
  "11月12日",
  "11月20日",
  "12月1日",
  "12月15日",
  "1月8日",
  "1月20日",
  "2月3日",
  "2月18日",
  "3月2日"
];

const anomalyPairs = [
  [applyRepeatPronoun, applyDoubleVerb],
  [applySelfCorrect, applyDoubleVerb],
  [applyFillerOverflow, applyDoubleVerb],
  [applyDanglingTime, applyDoubleVerb],
  [applyReduplicatedConnector, applyDoubleVerb],
  [applyInversion, applyDoubleVerb]
];

function buildDaily(index) {
  const [task, keyword] = dailyTasks[index % dailyTasks.length];
  const second = dailyTasks[(index + 7) % dailyTasks.length];
  const prefix = dailyPrefixes[index % dailyPrefixes.length];
  const base = `${prefix}${task}，再${second[0]}`;
  return {
    id: `HD${String(index + 1).padStart(3, "0")}`,
    category: "日计划",
    base,
    keywords: [keyword, second[1]],
    expectedScope: "day",
    expectedBasis: "calendar",
    expectedEvent: false
  };
}

function buildScoped(scope, basis, index) {
  const [task, keyword] = focusedTasks[
    (index + scopeOffset(scope)) % focusedTasks.length
  ];
  const prefix =
    scope === "week"
      ? basis === "calendar"
        ? "本周计划是"
        : "从今天起七天我要"
      : scope === "month"
        ? basis === "calendar"
          ? "这个月的计划是"
          : "从今天起一个月我要"
        : basis === "calendar"
          ? "今年的计划是"
          : "未来一年的计划是";
  return {
    id: `H${scope === "week" ? "W" : scope === "month" ? "M" : "Y"}${String(index + 1).padStart(3, "0")}`,
    category: scope === "week" ? "周计划" : scope === "month" ? "月计划" : "年计划",
    base: `${prefix}${task}`,
    keywords: [keyword],
    expectedScope: scope,
    expectedBasis: basis,
    expectedEvent: false
  };
}

function buildEvent(index) {
  const title = eventTitles[index % eventTitles.length];
  const [task, keyword] = deadlineTasks[(index + 2) % deadlineTasks.length];
  const date = eventDates[index % eventDates.length];
  return {
    id: `HE${String(index + 1).padStart(3, "0")}`,
    category: "重要日期",
    base: `${date}有重要事件，${title}。在那之前${task}。`,
    keywords: [keyword],
    expectedScope: "day",
    expectedBasis: "calendar",
    expectedEvent: true,
    expectedEventTitle: title
  };
}

function scopeOffset(scope) {
  return { day: 0, week: 0, month: 6, year: 11 }[scope] ?? 0;
}

function harden(raw, index) {
  const pair = anomalyPairs[index % anomalyPairs.length];
  let text = raw.base;
  text = pair[0](text);
  text = pair[1](text);
  text = injectFillers(text, index);
  return {
    ...raw,
    input: text,
    fillerCount: countFillers(text),
    anomalyCount: countAnomalies(text)
  };
}

function injectFillers(text, index) {
  const first = HARD_FILLER_TOKENS[index % HARD_FILLER_TOKENS.length];
  const second = HARD_FILLER_TOKENS[(index + 3) % HARD_FILLER_TOKENS.length];
  const third = HARD_FILLER_TOKENS[(index + 7) % HARD_FILLER_TOKENS.length];
  const commaIndex = text.indexOf("，");
  let result = commaIndex > -1
    ? `${text.slice(0, commaIndex + 1)}${second}，${text.slice(commaIndex + 1)}`
    : `${text}，${second}`;
  result = `${first}，${result}`;
  result = result.replace(/[。！？!?]*$/u, "");
  result = `${result}，${third}`;
  return result;
}

function applyRepeatPronoun(text) {
  if (text.includes("我要")) return text.replace(/我要/u, "我我");
  if (text.includes("计划是")) return text.replace(/计划是/u, "计划是我我");
  if (text.includes("在那之前")) return text.replace(/在那之前/u, "在那之前我我");
  return `我我，${text}`;
}

function applyDoubleVerb(text) {
  let result = text
    .replace(/完成/u, "完成完")
    .replace(/做完/u, "做完完")
    .replace(/复习/u, "复习习")
    .replace(/读完/u, "读完完")
    .replace(/练习/u, "练练习")
    .replace(/拉伸/u, "拉伸伸")
    .replace(/修改/u, "修改改")
    .replace(/跑步/u, "跑跑步")
    .replace(/背/u, "背背");
  if (result === text) {
    result = result.replace(
      /(做|整理|联系|提交|准备|快走|练琴|检查|打扫)(?!(?:完|习|练习))/u,
      "$1$1"
    );
  }
  return result;
}

function applySelfCorrect(text) {
  if (/跑步/u.test(text)) {
    return text.replace(/跑步/u, "跑步，不是，游泳");
  }
  if (/整理资料/u.test(text)) {
    return text.replace(/整理资料/u, "整理资料，不是，整理文件");
  }
  const corrected = text.replace(
    /(做|整理|联系|提交|准备|快走|练琴|完成|复习|练习|修改|拉伸|背)(?!(?:完|习|练习))/u,
    "$1，不是，$1"
  );
  if (corrected !== text) return corrected;
  return text.replace(/计划是/u, "计划是完成，不是，继续");
}

function applyReduplicatedConnector(text) {
  return text.includes("，再")
    ? text.replace("，再", "，然后然后再")
    : text.includes("。在那之前")
      ? text.replace("。在那之前", "。然后然后在那之前")
      : text.includes("计划是")
        ? text.replace("计划是", "计划是，然后然后")
        : text.replace("我要", "我要，然后然后");
}

function applyOmitMeasure(text) {
  return text
    .replace(/20个/u, "20")
    .replace(/三套/u, "三")
    .replace(/两页/u, "两")
    .replace(/一次/u, "");
}

function applyInversion(text) {
  const replaced = text.replace(
    /(背|做|整理|复习|完成)(20个英语单词|数学卷子|化学错题|语文练习)/u,
    "$2$1"
  );
  return replaced === text ? applySelfCorrect(text) : replaced;
}

function applyFillerOverflow(text) {
  return text.includes("嗯")
    ? text.replace(/嗯/u, "嗯嗯嗯")
    : `嗯嗯嗯，${text}`;
}

function applyDanglingTime(text) {
  return `明天下周，${text}`;
}

export function countFillers(text) {
  return HARD_FILLER_TOKENS.reduce(
    (total, filler) => total + countOccurrences(text, filler),
    0
  );
}

export function countAnomalies(text) {
  return ANOMALY_MARKERS.filter((marker) => marker.test(text)).length;
}

function countOccurrences(text, token) {
  let count = 0;
  let cursor = 0;
  while (true) {
    const index = text.indexOf(token, cursor);
    if (index === -1) break;
    count += 1;
    cursor = index + token.length;
  }
  return count;
}

const daily = Array.from({ length: 60 }, (_, index) =>
  harden(buildDaily(index), index)
);
const weekly = Array.from({ length: 60 }, (_, index) =>
  harden(
    buildScoped("week", index < 30 ? "calendar" : "rolling", index),
    index + 60
  )
);
const monthly = Array.from({ length: 60 }, (_, index) =>
  harden(
    buildScoped("month", index < 30 ? "calendar" : "rolling", index),
    index + 120
  )
);
const yearly = Array.from({ length: 60 }, (_, index) =>
  harden(
    buildScoped("year", index < 30 ? "calendar" : "rolling", index),
    index + 180
  )
);
const events = Array.from({ length: 60 }, (_, index) =>
  harden(buildEvent(index), index + 240)
);

export const hardOralCorpus300 = [
  ...daily,
  ...weekly,
  ...monthly,
  ...yearly,
  ...events
];
