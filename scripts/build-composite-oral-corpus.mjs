import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compositeOralCorpus400 } from "../tests/composite-oral-corpus-400-data.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "COMPOSITE_ORAL_PLANS_400.md");
const complex = compositeOralCorpus400.filter((item) => item.complex);
const standard = compositeOralCorpus400.filter((item) => !item.complex);

let markdown = `# 400 份新旧功能复合口头计划语料

整理日期：2026-10-26

说明：400 份语料都同时包含日计划和周/月/年计划，其中部分还包含重要日期和截止计划。前 100 份为复杂语料，超过 100 字，至少包含 10 个语气词和 20 个语法漏洞；其余 300 份为增强难度复合语料。
`;

markdown += `\n## 复杂语料（100 份）\n\n`;
markdown += "| 编号 | 语料 | 语气词 | 语法漏洞 |\n| --- | --- | --- | --- |\n";
for (const item of complex) {
  markdown += `| ${item.id} | ${item.input} | ${item.fillerCount} | ${item.anomalyCount} |\n`;
}

markdown += `\n## 增强复合语料（300 份）\n\n`;
markdown += "| 编号 | 语料 | 语气词 | 语法漏洞 |\n| --- | --- | --- | --- |\n";
for (const item of standard) {
  markdown += `| ${item.id} | ${item.input} | ${item.fillerCount} | ${item.anomalyCount} |\n`;
}

markdown += `
## 复合测试目标

1. 每条都同时提取日计划和大计划。
2. 每条都覆盖旧功能：去填词、标点、重要性和可行性判断。
3. 每条都覆盖新功能：周月年范围、按日历或从今天起计算、重要日期和截止关联。
4. 复杂语料额外覆盖长文本、连续纠正和多任务合并。
`;

fs.writeFileSync(target, markdown);
console.log(`generated ${target}`);
