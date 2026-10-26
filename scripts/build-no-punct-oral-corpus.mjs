import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { noPunctOralCorpus100 } from "../tests/no-punct-oral-corpus-100-data.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "NO_PUNCT_ORAL_PLANS_100.md");

let markdown = `# 100 份无断句新旧功能复合语料

整理日期：2026-10-26

说明：100 份语料都不使用逗号、句号等断句标点，每条不超过 80 字。每条同时包含日计划和大计划，其中一半包含重要日期和截止计划。语气词最多 2 个，保留 1 至 2 个语法漏洞。

| 编号 | 无断句语料 | 语气词 | 语法漏洞 |
| --- | --- | --- | --- |
`;

for (const item of noPunctOralCorpus100) {
  markdown += `| ${item.id} | ${item.input} | ${item.fillerCount} | ${item.anomalyCount} |\n`;
}

markdown += `
## 测试目标

1. 日计划与大计划必须分离。
2. 周月年计划按范围正确分类。
3. 重要日期和截止计划正确关联。
4. 无断句情况下不能把两项计划合并成一项。
5. 新旧功能不能混淆。
`;

fs.writeFileSync(target, markdown);
console.log(`generated ${target}`);
