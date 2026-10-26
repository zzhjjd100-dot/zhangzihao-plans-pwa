import {
  countAnomalyOccurrences,
  countFillers
} from "./hard-oral-corpus-300-data.mjs";

const scopedPlans = [
  ["完成课程作业", "month", "calendar"],
  ["复习全部错题", "week", "calendar"],
  ["读完一本书", "month", "rolling"],
  ["跑步三次", "week", "calendar"],
  ["准备职业考试", "year", "calendar"],
  ["完成十二次模拟", "year", "rolling"],
  ["完成项目方案", "month", "calendar"]
];

const dailyPlans = [
  "完成数学卷子",
  "背20个英语单词",
  "整理化学错题",
  "复习生物第五单元",
  "提交工作周报",
  "联系项目客户",
  "准备会议材料",
  "练琴三十分钟"
];

const eventTitles = [
  "项目评审",
  "资格考试",
  "论文答辩",
  "产品发布",
  "妈妈生日"
];

const deadlinePlans = [
  "修改论文和幻灯片",
  "准备礼物并订蛋糕",
  "复习全部错题",
  "完成方案和预算",
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

function applyAnomalies(text, seed) {
  const transformers = [
    (value) => (value.includes("我要")
      ? value.replace(/我要/u, "我我")
      : `我我${value}`),
    (value) => (/完成|复习|背/u.test(value)
      ? value.replace(/完成/u, "完成完")
        .replace(/复习/u, "复习习")
        .replace(/背/u, "背背")
      : `完成完${value}`),
    (value) => (/20个|三次/u.test(value)
      ? value.replace(/20个/u, "20").replace(/三次/u, "三")
      : `背背${value}`),
    (value) => `明天下周${value}`
  ];
  const first = transformers[seed % transformers.length](text);
  return seed % 2 === 0
    ? transformers[(seed + 1) % transformers.length](first)
    : first;
}

function injectFiller(text, seed) {
  return seed % 2 === 0 ? `嗯${text}` : `${text}嗯`;
}

function makeItem(seed, includeEvent) {
  const [scopedTask, scope, basis] = scopedPlans[seed % scopedPlans.length];
  const dailyTask = dailyPlans[seed % dailyPlans.length];
  let text = `${scopePrefix(scope, basis)}${scopedTask}明天下午${dailyTask}`;
  let expectedEvent = false;
  let expectedEventTitle = "";
  if (includeEvent) {
    const title = eventTitles[seed % eventTitles.length];
    const deadline = deadlinePlans[(seed + 1) % deadlinePlans.length];
    const date = ["11月5日", "11月12日", "11月20日", "12月1日", "12月15日"][seed % 5];
    text += `${date}有重要事件${title}在那之前${deadline}`;
    expectedEvent = true;
    expectedEventTitle = title;
  }
  text = injectFiller(applyAnomalies(text, seed), seed);
  return {
    id: `NP${String(seed + 1).padStart(3, "0")}`,
    input: text,
    expectedScope: scope,
    expectedBasis: basis,
    expectedEvent,
    expectedEventTitle,
    fillerCount: countFillers(text),
    anomalyCount: countAnomalyOccurrences(text)
  };
}

export const noPunctOralCorpus100 = Array.from({ length: 100 }, (_, index) =>
  makeItem(index, index % 2 === 0)
);
export { countAnomalyOccurrences, countFillers };
