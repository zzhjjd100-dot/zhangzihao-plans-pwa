import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { interviewDialogueCorpus } from "../tests/interview-dialogue-corpus-data.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "INTERVIEW_DIALOGUES_100.md");

const sources = {
  P1: "人民网《我的寒假这么过》：http://edu.people.com.cn/n1/2026/0205/c1006-40659830.html",
  P2: "人民网《北京高考评卷工作预计24日结束 成绩25日公布》：http://edu.people.com.cn/n1/2026/0616/c1006-40741700.html",
  P3: "人民网《多地宣布生物地理不再计入中考总分 记者实探济南学校》：http://sd.people.com.cn/n2/2026/0323/c166192-41530861.html",
  P4: "人民网《全国短池游泳锦标赛：徐嘉余一晚两破仰泳纪录》：http://ent.people.com.cn/n1/2026/1025/c1012-40820983.html",
  P5: "人民网《全国短池游泳锦标赛》相关训练采访与人物报道：http://ent.people.com.cn/n1/2026/1025/c1012-40820983.html",
  P6: "人民网《重庆“小孩哥”夺得街舞全球总冠军》：http://cq.people.com.cn/n2/2026/0313/c365402-41522280.html",
  C1: "中国新闻网《2026体育文化全国行浙江杭州站走进华师桐庐学校》：http://www.chinanews.com.cn/ty/2026/10-24/10720354.shtml",
  C2: "中国新闻网《拼搏、热爱、并肩同行……盘点亚残运会上的动人瞬间》：http://www.chinanews.com.cn/ty/2026/10-24/10720197.shtml",
  C3: "中国新闻网《费德勒：来中国书写给网球的情书》：http://www.chinanews.com.cn/ty/2026/10-21/10718260.shtml",
  C5: "中国新闻网《2026三明·闯世界火场生存挑战赛开赛》：http://www.chinanews.com.cn/sh/2026/10-21/10718508.shtml",
  V1: "央视网《面对超21万种故障可能 重型车辆维修选手如何做到“一眼准”？》：https://news.cctv.com/2026/09/25/ARTITdDr84WOWZ3DFHZvh5hL260924.shtml",
  V3: "央视网《血管年轻，人长寿 这份护心运动行动指南请收好》：https://news.cctv.com/2026/05/10/ARTICGuQp9mtB4YNBXgWJ2VO260510.shtml",
  X1: "新华网新华访谈栏目：https://www.news.cn/talking/index.html"
};

const grouped = new Map();
for (const item of interviewDialogueCorpus) {
  if (!grouped.has(item.category)) grouped.set(item.category, []);
  grouped.get(item.category).push(item);
}

let markdown = `# 第二批 100 条国内新闻采访规划对话

整理日期：2026-10-25

说明：以下对话依据人民网、中国新闻网、央视网和新华访谈等国内媒体的公开采访议题与计划要素改写，用于测试多轮对话中的提问、确认、改期、训练安排和练习复盘。不是对采访原文的逐字转载。每条均不超过 100 个字符。
`;

for (const [category, items] of grouped) {
  markdown += `\n## ${category}（${items.length} 条）\n\n`;
  markdown += "| 编号 | 来源 | 对话 |\n| --- | --- | --- |\n";
  for (const item of items) {
    markdown += `| ${item.id} | ${item.source} | ${item.dialogue} |\n`;
  }
}

markdown += "\n## 公开参考来源\n\n";
for (const [id, source] of Object.entries(sources)) {
  markdown += `- ${id}：${source}\n`;
}
markdown += `
## 覆盖场景

1. 学习计划：课表、复习、真题、阅读、作文、听力和错题复盘。
2. 健身计划：训练频率、动作替换、伤病调整、休息和恢复。
3. 练习计划：音乐、体育、舞蹈、驾驶、维修、演讲、急救和职业技能。
4. 多轮表达：提问、确认、拒绝、改期、降低强度和最小任务。
5. 采访表达：记者提问和受访者回答中的角色标签不能进入计划。
`;

fs.writeFileSync(target, markdown);
console.log(`generated ${target}`);
