import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dialogueCorpus } from "../tests/dialogue-corpus-data.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "DIALOGUE_CORPUS_100.md");

const sourceList = [
  "S01 央视网《面对超21万种故障可能 重型车辆维修选手如何做到“一眼准”？》：https://news.cctv.com/2026/09/25/ARTITdDr84WOWZ3DFHZvh5hL260924.shtml",
  "S02 央视网《这所高校老师集体上秤，还跟学生学摔跤，为啥？》：https://news.cctv.com/2026/04/16/ARTIBeNHfg4JsyPufXQSBRU5260416.shtml",
  "S03 央视网《45天暴瘦40斤后住进ICU AI减重暗藏哪些风险》：https://news.cctv.com/2026/08/08/ARTIn0MpbBAJrXzPYMqmaG47260808.shtml",
  "S04 央视网《更高水平、更精细化……“十五五”时期全民健身事业高质量发展有了“新计划”》：https://news.cctv.com/2026/07/24/ARTIc5LOa4XnOE85w2M8MXLP260724.shtml",
  "S05 央视网《“速成”健身暗藏危机 别让“健身”变“伤身”》：https://news.cctv.com/2026/05/16/ARTIKyTeS3aHGGQFWvaiWhSB260516.shtml",
  "S06 央视网《“上门带老人锻炼”走红 需要注意啥？》：https://news.cctv.com/2026/05/03/ARTIT2J98HT3MOzL52dCeWMK260503.shtml",
  "S07 央视网《暑假进入倒计时 大学新生开学全攻略已就位》：https://news.cctv.com/2026/08/17/ARTIAvYjb5JneSxZ7oa1PBvH260817.shtml",
  "S08 央视网《碎片化运动很管用？避开误区，才能动得健康》：https://news.cctv.com/2026/08/13/ARTIYDotKEPkiuhzkR5raG3g260813.shtml",
  "S09 央视网《血管年轻，人长寿 这份护心运动行动指南请收好》：https://news.cctv.com/2026/05/10/ARTICGuQp9mtB4YNBXgWJ2VO260510.shtml",
  "S10 央视网《儿童、青少年如何科学分龄运动？这份指南给家长划重点》：https://news.cctv.com/2026/04/27/ARTIMRMZzEUBgBEv4pBn3HHc260427.shtml",
  "S11 央视网《一项被低估的“防病王牌运动” 每周2次就够 不是跑步走路》：https://news.cctv.com/2026/04/19/ARTIC0QS7gElzsJsmnInOFv3260419.shtml",
  "S12 央视网《内部绝密押题？国家安全部提示 这类“上岸捷径”全是骗局！》：https://news.cctv.com/2026/07/09/ARTIp4HSvmM3IzkBw5FhGAlC260709.shtml",
  "S13 央视网《特殊教育，从“有学可上”到“精准施教”》：https://news.cctv.com/2026/09/01/ARTILk6rgveX8kDSEJU7CjRb260901.shtml",
  "S14 央视网《成功卫冕！中国盲人足球队成就亚残运会“三冠王”》：https://sports.cctv.com/2026/10/24/ARTIIWq19WSv82o6Xw9BOurI261024.shtml"
];

const grouped = new Map();
for (const item of dialogueCorpus) {
  if (!grouped.has(item.category)) grouped.set(item.category, []);
  grouped.get(item.category).push(item);
}

let markdown = `# 100 份普通话规划对话语料

采集与整理日期：2026-10-25

说明：以下对话依据公开的学习、健身和技能训练资料中的计划要素改写为规范化测试语料，不是对网页原文的逐字转载。每条均不超过 100 个字符，用于验证多轮对话中的提问、确认、调整、优先级和任务拆分。

## 语料
`;

for (const [category, items] of grouped) {
  markdown += `\n### ${category}（${items.length} 条）\n\n`;
  markdown += "| 编号 | 类型 | 对话 |\n| --- | --- | --- |\n";
  for (const item of items) {
    markdown += `| ${item.id} | ${item.category} | ${item.dialogue} |\n`;
  }
}

markdown += "\n## 公开参考来源\n\n";
markdown += `${sourceList.join("\n\n")}\n`;
markdown += `
## 对话中覆盖的计划要素

1. 学习科目、章节、题量、阅读篇数和单词数量。
2. 健身动作、组数、次数、时长、每周频率和休息日。
3. 技能练习的段落、动作、目标、录音回听和复盘。
4. 日期、时间、先后顺序、重要性和截止条件。
5. 改期、降强度、替换动作、停止训练和只做最小任务。
6. 纯提问、确认语和角色标签不能进入最终计划。
`;

fs.writeFileSync(target, markdown);
console.log(`generated ${target}`);
