import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { oralPlanCorpus300 } from "../tests/oral-plan-corpus-300-data.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "DAILY_ORAL_PLANS_300.md");
const grouped = new Map();

for (const item of oralPlanCorpus300) {
  if (!grouped.has(item.category)) grouped.set(item.category, []);
  grouped.get(item.category).push(item);
}

let markdown = `# 300 份日常口头计划语料

整理日期：2026-10-26

说明：本语料依据公开媒体中的日常、学习、健身、工作和技能训练计划表达整理为规范化测试句，不是逐字转载。每条不超过 100 个字符，用于验证日计划、周计划、月计划、年计划、重要日期和截止计划。
`;

for (const [category, items] of grouped) {
  markdown += `\n## ${category}（${items.length} 条）\n\n`;
  markdown += "| 编号 | 口头计划 |\n| --- | --- |\n";
  for (const item of items) {
    markdown += `| ${item.id} | ${item.input} |\n`;
  }
}

markdown += `
## 覆盖范围

1. 日计划 60 条。
2. 按日历和从今天起计算的周计划 60 条。
3. 按日历和从今天起计算的月计划 60 条。
4. 按日历和从今天起计算的年计划 60 条。
5. 带重要事件和截止计划的语料 60 条。
6. 覆盖学习、工作、健身、家务、技能练习、家庭安排和项目管理。

## 公开参考方向

1. 人民网《我的寒假这么过》：<http://edu.people.com.cn/n1/2026/0205/c1006-40659830.html>
2. 人民网《北京高考评卷工作预计24日结束》：<http://edu.people.com.cn/n1/2026/0616/c1006-40741700.html>
3. 人民网《重庆“小孩哥”夺得街舞全球总冠军》：<http://cq.people.com.cn/n2/2026/0313/c365402-41522280.html>
4. 中国新闻网《2026体育文化全国行浙江杭州站走进华师桐庐学校》：<http://www.chinanews.com.cn/ty/2026/10-24/10720354.shtml>
5. 中国新闻网《拼搏、热爱、并肩同行……盘点亚残运会上的动人瞬间》：<http://www.chinanews.com.cn/ty/2026/10-24/10720197.shtml>
6. 中国新闻网《费德勒：来中国书写给网球的情书》：<http://www.chinanews.com.cn/ty/2026/10-21/10718260.shtml>
7. 央视网《面对超21万种故障可能 重型车辆维修选手如何做到“一眼准”？》：<https://news.cctv.com/2026/09/25/ARTITdDr84WOWZ3DFHZvh5hL260924.shtml>
8. 央视网《血管年轻，人长寿 这份护心运动行动指南请收好》：<https://news.cctv.com/2026/05/10/ARTICGuQp9mtB4YNBXgWJ2VO260510.shtml>
9. 新华网新华访谈栏目：<https://www.news.cn/talking/index.html>
10. 设计研究参考：<https://www.atlassian.com/agile/agile-at-scale/okr>、<https://www.todoist.com/productivity-methods/weekly-review>、<https://www.nngroup.com/articles/progressive-disclosure/>
`;

fs.writeFileSync(target, markdown);
console.log(`generated ${target}`);
