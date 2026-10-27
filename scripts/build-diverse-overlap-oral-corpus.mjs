import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { diverseOverlapOralCorpus100 } from "../tests/diverse-overlap-oral-corpus-100-data.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "DIVERSE_OVERLAP_ORAL_PLANS_100.md");

let markdown = `# 100 份多元重叠计划语料

整理日期：2026-10-27

说明：100 份语料都超过 60 字，混合日计划、周计划、月计划、年计划和重要日期，并加入语气词、日常语法漏洞和多任务同时输入。用于训练新旧功能重叠时的计划分离、范围分类和重要性区分。

| 编号 | 多元重叠语料 | 语气词 | 语法漏洞 |
| --- | --- | --- | --- |
`;

for (const item of diverseOverlapOralCorpus100) {
  markdown += `| ${item.id} | ${item.input} | ${item.fillerCount} | ${item.anomalyCount} |\n`;
}

markdown += `
## 测试目标

1. 日周月年和重要日期可以同时出现。
2. 每个范围都独立分类，不能互相覆盖。
3. “这个很重要”只提升重要性，不创建重要日期。
4. 有明确日期和事件线索时才创建重要日期。
5. 多任务不会合并成一条计划。
`;

fs.writeFileSync(target, markdown);
console.log(`generated ${target}`);
