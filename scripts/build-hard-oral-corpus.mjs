import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  countAnomalies,
  countFillers,
  hardOralCorpus300
} from "../tests/hard-oral-corpus-300-data.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "HARD_ORAL_PLANS_300.md");
const grouped = new Map();

for (const item of hardOralCorpus300) {
  if (!grouped.has(item.category)) grouped.set(item.category, []);
  grouped.get(item.category).push(item);
}

let markdown = `# 300 份高难度口头计划语料

整理日期：2026-10-26

说明：每条语料都随机注入至少 3 个语气词，并保留至少 2 个常见语法漏洞，包括自我纠正、动作重复、代词重复、日期冲突和量词省略。内容用于回归测试日计划、周月年计划和重要日期功能，不逐字转载新闻原文。
`;

for (const [category, items] of grouped) {
  markdown += `\n## ${category}（${items.length} 条）\n\n`;
  markdown += "| 编号 | 口头计划 | 语气词 | 语法漏洞 |\n| --- | --- | --- | --- |\n";
  for (const item of items) {
    markdown += `| ${item.id} | ${item.input} | ${countFillers(item.input)} | ${countAnomalies(item.input)} |\n`;
  }
}

markdown += `
## 覆盖内容

1. 日计划 60 条。
2. 周计划 60 条，覆盖按日历和从今天起。
3. 月计划 60 条，覆盖按日历和从今天起。
4. 年计划 60 条，覆盖按日历和从今天起。
5. 重要日期和截止计划 60 条。
6. 语气词覆盖“嗯、啊、就是、然后、那个、其实、这个、怎么说呢、可能、应该”。
7. 语法漏洞覆盖“我我、完成完、复习习、跑跑步、，不是，、然后然后、明天下周、量词省略、宾语倒装”。

## 参考方向

- 前期整理的人民网、中国新闻网、央视网和新华访谈公开采访。
- 周月年计划与重要日期设计研究，见 \`PLANNING_DESIGN_RESEARCH.md\`。
`;

fs.writeFileSync(target, markdown);
console.log(`generated ${target}`);
