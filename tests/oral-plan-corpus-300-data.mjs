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

const daily = Array.from({ length: 60 }, (_, index) => {
  const [task, keyword] = dailyTasks[index % dailyTasks.length];
  const second = dailyTasks[(index + 7) % dailyTasks.length];
  const prefix = dailyPrefixes[index % dailyPrefixes.length];
  return {
    id: `D${String(index + 1).padStart(3, "0")}`,
    category: "日计划",
    input: `${prefix}${task}，再${second[0]}${index % 9 === 0 ? "，这个很重要" : ""}`,
    keywords: [keyword, second[1]],
    expectedScope: "day",
    expectedBasis: "calendar",
    expectedEvent: false
  };
});

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

const weekly = Array.from({ length: 60 }, (_, index) => {
  const basis = index < 30 ? "calendar" : "rolling";
  const [task, keyword] = focusedTasks[index % focusedTasks.length];
  const prefix = basis === "calendar" ? "本周计划是" : "从今天起七天我要";
  return {
    id: `W${String(index + 1).padStart(3, "0")}`,
    category: "周计划",
    input: `${prefix}${task}${index % 7 === 0 ? `，再${focusedTasks[(index + 3) % focusedTasks.length][0]}` : ""}`,
    keywords: [keyword],
    expectedScope: "week",
    expectedBasis: basis,
    expectedEvent: false
  };
});

const monthly = Array.from({ length: 60 }, (_, index) => {
  const basis = index < 30 ? "calendar" : "rolling";
  const [task, keyword] = focusedTasks[(index + 6) % focusedTasks.length];
  const prefix = basis === "calendar" ? "这个月的计划是" : "从今天起一个月我要";
  return {
    id: `M${String(index + 1).padStart(3, "0")}`,
    category: "月计划",
    input: `${prefix}${task}${index % 6 === 0 ? `，并且${focusedTasks[(index + 9) % focusedTasks.length][0]}` : ""}`,
    keywords: [keyword],
    expectedScope: "month",
    expectedBasis: basis,
    expectedEvent: false
  };
});

const yearly = Array.from({ length: 60 }, (_, index) => {
  const basis = index < 30 ? "calendar" : "rolling";
  const [task, keyword] = focusedTasks[(index + 11) % focusedTasks.length];
  const prefix = basis === "calendar" ? "今年的计划是" : "未来一年的计划是";
  return {
    id: `Y${String(index + 1).padStart(3, "0")}`,
    category: "年计划",
    input: `${prefix}${task}`,
    keywords: [keyword],
    expectedScope: "year",
    expectedBasis: basis,
    expectedEvent: false
  };
});

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

const events = Array.from({ length: 60 }, (_, index) => {
  const title = eventTitles[index % eventTitles.length];
  const [task, keyword] = deadlineTasks[(index + 2) % deadlineTasks.length];
  const date = eventDates[index % eventDates.length];
  return {
    id: `E${String(index + 1).padStart(3, "0")}`,
    category: "重要日期",
    input: `${date}有重要事件，${title}。在那之前${task}。`,
    keywords: [keyword],
    expectedScope: "day",
    expectedBasis: "calendar",
    expectedEvent: true,
    expectedEventTitle: title
  };
});

export const oralPlanCorpus300 = [
  ...daily,
  ...weekly,
  ...monthly,
  ...yearly,
  ...events
];
