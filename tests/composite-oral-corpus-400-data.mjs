import {
  countAnomalyOccurrences,
  countFillers,
  HARD_FILLER_TOKENS
} from "./hard-oral-corpus-300-data.mjs";

const dailyTasks = [
  ["完成数学卷子", "数学"],
  ["背20个英语单词", "单词"],
  ["整理化学错题", "化学"],
  ["复习生物第五单元", "生物"],
  ["提交工作周报", "周报"],
  ["联系项目客户", "客户"],
  ["准备会议材料", "会议"],
  ["练琴三十分钟", "琴"]
];

const scopedTasks = [
  ["完成课程作业", "课程", "month", "calendar"],
  ["读完一本书", "书", "month", "calendar"],
  ["复习全部错题", "错题", "week", "calendar"],
  ["跑步三次", "跑步", "week", "calendar"],
  ["完成项目方案", "方案", "month", "rolling"],
  ["准备职业考试", "考试", "year", "calendar"],
  ["完成十二次模拟", "模拟", "year", "rolling"]
];

const eventTitles = [
  "项目评审",
  "妈妈生日",
  "资格考试",
  "论文答辩",
  "产品发布"
];

const deadlineTasks = [
  "完成方案和预算",
  "准备礼物并订蛋糕",
  "复习全部错题",
  "修改论文和幻灯片",
  "准备发布材料"
];

function scopePrefix(scope, basis) {
  if (scope === "week") {
    return basis === "calendar" ? "本周计划是" : "从今天起七天我要";
  }
  if (scope === "month") {
    return basis === "calendar" ? "这个月的计划是" : "从今天起一个月我要";
  }
  return basis === "calendar" ? "今年的计划是" : "未来一年的计划是";
}

function buildComposite(seed, includeEvent) {
  const [dailyTask, dailyKeyword] = dailyTasks[seed % dailyTasks.length];
  const [scopedTask, scopedKeyword, scope, basis] =
    scopedTasks[seed % scopedTasks.length];
  let text = `明天下午我要${dailyTask}，另外${scopePrefix(scope, basis)}${scopedTask}`;
  const keywords = [dailyKeyword];
  let expectedEvent = false;
  let expectedEventTitle = "";
  if (includeEvent) {
    const title = eventTitles[(seed + 2) % eventTitles.length];
    const deadlineTask = deadlineTasks[(seed + 3) % deadlineTasks.length];
    const date = ["11月5日", "11月12日", "11月20日", "12月1日", "12月15日"][seed % 5];
    text += `，${date}有重要事件，${title}，在那之前${deadlineTask}`;
    expectedEvent = true;
    expectedEventTitle = title;
  }
  return {
    text,
    keywords,
    expectedScope: scope,
    expectedBasis: basis,
    expectedEvent,
    expectedEventTitle
  };
}

function applyAnomalies(text, count, seed) {
  let result = text;
  for (let index = 0; index < count; index += 1) {
    result = anomalyTransforms[(seed + index) % anomalyTransforms.length](result);
  }
  return result;
}

const anomalyTransforms = [
  (text) => (text.includes("我要")
    ? text.replace(/我要/u, "我我")
    : `我我，${text}`),
  (text) => {
    const doubled = text.replace(/完成/u, "完成完")
      .replace(/做完/u, "做完完")
      .replace(/复习/u, "复习习")
      .replace(/读完/u, "读完完")
      .replace(/练习/u, "练练习")
      .replace(/修改/u, "修改改")
      .replace(/背/u, "背背")
      .replace(/跑/u, "跑跑步");
    return doubled === text ? `那个那个，${text}` : doubled;
  },
  (text) => {
    if (text.includes("，不是，")) return text;
    const corrected = text.replace(
      /(准备|完成|复习|练习|修改|提交|联系|整理|练琴|背|跑)/u,
      "$1，不是，$1"
    );
    return corrected === text ? `那个那个，不是，这个这个${text}` : corrected;
  },
  (text) => `明天下周，${text}`,
  (text) => (text.includes("，再")
    ? text.replace("，再", "，然后然后再")
    : text.includes("，另外")
      ? text.replace("，另外", "，然后然后另外")
      : `然后然后，${text}`),
  (text) => `嗯嗯嗯，${text}`,
  (text) => {
    const inverted = text.replace(/背/u, "背背").replace(/跑/u, "跑跑步");
    return inverted === text ? `那个那个，不是，这个这个${text}` : inverted;
  }
];

function injectManyFillers(text, count, seed) {
  let result = text;
  for (let index = 0; index < count; index += 1) {
    const token = HARD_FILLER_TOKENS[(seed + index) % HARD_FILLER_TOKENS.length];
    const points = [...result.matchAll(/[，,。；;]/gu)];
    if (!points.length) {
      result = `${token}，${result}`;
      continue;
    }
    const point = points[(seed + index) % points.length];
    const insertAt = point.index + 1;
    result = `${result.slice(0, insertAt)}${token}，${result.slice(insertAt)}`;
  }
  return result;
}

function makeItem(seed, complex, includeEvent) {
  const raw = buildComposite(seed, includeEvent);
  const anomalies = complex ? 30 : 4;
  const fillers = complex ? 10 : 4;
  let input = applyAnomalies(raw.text, anomalies, seed);
  input = injectManyFillers(input, fillers, seed);
  if (complex && [...input].length < 100) {
    input = `${input}，然后我我明天下周还要整理桌面文件，嗯，那个，其实，可能，应该，怎么说呢，就是`;
  }
  return {
    id: complex
      ? `CC${String(seed + 1).padStart(3, "0")}`
      : `CS${String(seed + 1).padStart(3, "0")}`,
    complex,
    input,
    fillerCount: countFillers(input),
    anomalyCount: countAnomalyOccurrences(input),
    ...raw
  };
}

const complex = Array.from({ length: 100 }, (_, index) =>
  makeItem(index, true, index % 2 === 0)
);
const standard = Array.from({ length: 300 }, (_, index) =>
  makeItem(index, false, index % 2 === 1)
);

export const compositeOralCorpus400 = [...complex, ...standard];
export { countAnomalyOccurrences, countFillers, HARD_FILLER_TOKENS };
