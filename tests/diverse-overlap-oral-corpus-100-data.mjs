import {
  countAnomalyOccurrences,
  countFillers,
  HARD_FILLER_TOKENS
} from "./hard-oral-corpus-300-data.mjs";

const scopeTasks = {
  week: [
    "复习全部错题",
    "跑步三次",
    "完成课程作业",
    "练习口语录音",
    "整理学习笔记",
    "完成项目方案"
  ],
  month: [
    "读完一本书",
    "完成课程作业",
    "整理化学错题",
    "准备职业考试",
    "完成项目方案",
    "练习投篮一百次"
  ],
  year: [
    "准备职业考试",
    "完成十二次模拟",
    "提升英语口语",
    "完成全年读书计划",
    "坚持每周锻炼",
    "完成职业资格认证"
  ]
};

const dailyTasks = [
  "完成数学卷子",
  "背20个英语单词",
  "整理化学错题",
  "复习生物第五单元",
  "提交工作周报",
  "联系项目客户",
  "准备会议材料",
  "练琴三十分钟",
  "快走半小时",
  "整理桌面文件",
  "检查项目预算",
  "准备家庭晚餐",
  "练习英语听力",
  "复习政治框架",
  "完成读书摘要",
  "做一组平板支撑",
  "准备汇报材料",
  "修改论文提纲",
  "完成模拟面试",
  "练习投篮五十次"
];

const eventTitles = [
  "项目评审",
  "资格考试",
  "论文答辩",
  "产品发布",
  "妈妈生日",
  "家长会",
  "毕业典礼",
  "项目验收",
  "演出彩排",
  "签约仪式",
  "体检预约",
  "纪念日"
];

const deadlineTasks = [
  "修改论文和幻灯片",
  "准备礼物并订蛋糕",
  "复习全部错题",
  "完成方案和预算",
  "准备发布材料",
  "整理体检资料",
  "提交报名表",
  "准备晚餐和饮料",
  "练习投篮和体能",
  "完成节目排练",
  "整理项目文件",
  "准备答辩提纲"
];

function scopePrefix(scope) {
  if (scope === "week") return "本周计划是";
  if (scope === "month") return "这个月的计划是";
  return "今年的计划是";
}

function buildBase(seed) {
  const scopes = seed % 3 === 0
    ? ["week", "month", "year"]
    : seed % 3 === 1
      ? ["week", "month"]
      : ["week", "year"];
  const parts = scopes.map((scope, index) =>
    `${scopePrefix(scope)}${scopeTasks[scope][(seed + index * 3) % scopeTasks[scope].length]}`
  );
  const daily = dailyTasks[seed % dailyTasks.length];
  const secondDaily = dailyTasks[(seed + 5) % dailyTasks.length];
  const title = eventTitles[seed % eventTitles.length];
  const deadline = deadlineTasks[(seed + 4) % deadlineTasks.length];
  return {
    text: `${parts.join("另外")}另外明天${daily}晚上${secondDaily}11月5日有重要的事${title}在那之前${deadline}这个很重要`,
    scopes
  };
}

function applyAnomalies(text, seed) {
  const transformers = [
    (value) => value.replace(/我要/u, "我我"),
    (value) => value.replace(/完成/u, "完成完")
      .replace(/复习/u, "复习习")
      .replace(/练习/u, "练练习"),
    (value) => value.replace(/20个/u, "20").replace(/三次/u, "三"),
    (value) => value.replace(/明天/u, "明天下周"),
    (value) => `嗯嗯嗯${value}`
  ];
  let result = text;
  for (let index = 0; index < 5; index += 1) {
    result = transformers[(seed + index) % transformers.length](result);
  }
  return result;
}

function injectFillers(text, seed) {
  let result = text;
  const points = ["另外", "明天", "11月5日", "在那之前"];
  for (let index = 0; index < 3; index += 1) {
    const token = HARD_FILLER_TOKENS[(seed + index * 2) % HARD_FILLER_TOKENS.length];
    const point = points[(seed + index) % points.length];
    result = result.includes(point)
      ? result.replace(point, `${token}${point}`)
      : `${token}${result}`;
  }
  return result;
}

function makeItem(seed) {
  const raw = buildBase(seed);
  const input = injectFillers(applyAnomalies(raw.text, seed), seed);
  return {
    id: `DV${String(seed + 1).padStart(3, "0")}`,
    input,
    scopes: raw.scopes,
    fillerCount: countFillers(input),
    anomalyCount: countAnomalyOccurrences(input)
  };
}

export const diverseOverlapOralCorpus100 = Array.from({ length: 100 }, (_, index) =>
  makeItem(index)
);
export { countAnomalyOccurrences, countFillers };
