import test from "node:test";
import assert from "node:assert/strict";
import { extractPlans } from "../extractor.js";

const referenceDate = new Date(2026, 9, 23, 9, 0, 0);

test("removes fillers, preserves importance, and extracts multiple plans", () => {
  const text = "嗯……那个，明天下午三点要提交项目报告，很重要，后天记得预约牙医。大概就是这样。";
  const result = extractPlans(text, { referenceDate });

  assert.equal(result.plans.length, 2);
  assert.ok(result.removedFillerCount > 0);
  assert.ok(!result.cleanedText.includes("嗯"));
  assert.ok(!result.cleanedText.includes("那个"));
  assert.ok(!result.cleanedText.includes("大概就是这样"));

  const report = result.plans[0];
  const dentist = result.plans[1];
  assert.equal(report.text, "提交项目报告");
  assert.equal(report.importance, "high");
  assert.equal(new Date(report.date).getHours(), 15);
  assert.equal(new Date(dentist.date).getDate(), 25);
});

test("does not drop conditional, person, deadline, or attachment details", () => {
  const text = "如果不方便就改成周四下午，但报告必须在周五前发给王老师，不能漏掉附件。";
  const result = extractPlans(text, { referenceDate });
  assert.equal(result.plans.length, 1);
  for (const keyword of ["不方便", "周四", "周五", "王老师", "附件"]) {
    assert.ok(result.plans[0].text.includes(keyword), `missing ${keyword}`);
  }
  assert.equal(result.plans[0].importance, "high");
  assert.equal(new Date(result.plans[0].date).getDay(), 5);
});

test("classifies low and high importance", () => {
  const low = extractPlans("有空的时候可以整理书架，不急。", { referenceDate });
  const high = extractPlans("立刻缴纳房租，否则会逾期。", { referenceDate });
  assert.equal(low.plans[0].importance, "low");
  assert.equal(high.plans[0].importance, "high");
});

test("parses next week, next month, and colloquial two o'clock", () => {
  const nextWeek = extractPlans("下周一上午十点给客户发方案，务必准时。", { referenceDate });
  const nextMonth = extractPlans("下个月五号下午两点交水电费。", { referenceDate });

  const monday = new Date(nextWeek.plans[0].date);
  assert.equal(monday.getMonth(), 9);
  assert.equal(monday.getDate(), 26);
  assert.equal(monday.getHours(), 10);

  const payment = new Date(nextMonth.plans[0].date);
  assert.equal(payment.getMonth(), 10);
  assert.equal(payment.getDate(), 5);
  assert.equal(payment.getHours(), 14);
});

test("mock speech transcript completes extraction pipeline", () => {
  const mockedSpeech = "嗯，明天下午两点和产品经理开会，非常重要。";
  const result = extractPlans(mockedSpeech, { referenceDate });
  assert.equal(result.plans.length, 1);
  assert.ok(result.plans[0].text.includes("产品经理"));
  assert.equal(result.plans[0].importance, "high");
  assert.equal(new Date(result.plans[0].date).getHours(), 14);
});

test("moves relative date out of title and trailing importance into priority", () => {
  const result = extractPlans("明天下午三点提交项目报告，这个很重要。", {
    referenceDate
  });
  assert.equal(result.plans.length, 1);
  assert.equal(result.plans[0].text, "提交项目报告");
  assert.equal(result.plans[0].importance, "high");
  assert.equal(new Date(result.plans[0].date).getDate(), 24);
  assert.equal(new Date(result.plans[0].date).getHours(), 15);
});

test("a standalone importance comment upgrades the prior task and creates no extra item", () => {
  const result = extractPlans("提交项目报告。这个很重要。", {
    referenceDate
  });
  assert.equal(result.plans.length, 1);
  assert.equal(result.plans[0].text, "提交项目报告");
  assert.equal(result.plans[0].importance, "high");
});

test("summarizes English vocabulary and sample essay into compact items", () => {
  const result = extractPlans("明天要背英语生词和英语范文。", {
    referenceDate
  });
  assert.deepEqual(result.plans.map((plan) => plan.text), ["英语生词", "范文"]);
  assert.ok(result.plans.every((plan) => new Date(plan.date).getDate() === 24));
});

test("keeps meaningful preparation verb while removing scheduling filler", () => {
  const result = extractPlans("提醒我明天记得准备资料。", {
    referenceDate
  });
  assert.equal(result.plans[0].text, "准备资料");
  assert.ok(!result.plans[0].text.includes("明天"));
});

test("summarizes a long passage into independent tasks with per-task metadata", () => {
  const text = "嗯，我跟你说一下，明天上午十点先把项目周报写完，这个特别重要。下午三点和产品经理开会确认发布时间。后天有空整理书架，不急。另外下周一交英语生词和英语范文。";
  const result = extractPlans(text, { referenceDate });

  assert.deepEqual(
    result.plans.map((plan) => plan.text),
    ["完成项目周报", "和产品经理开会确认发布时间", "整理书架", "英语生词", "范文"]
  );
  assert.deepEqual(
    result.plans.map((plan) => plan.importance),
    ["high", "medium", "low", "medium", "medium"]
  );
  assert.equal(new Date(result.plans[0].date).getDate(), 24);
  assert.equal(new Date(result.plans[0].date).getHours(), 10);
  assert.equal(new Date(result.plans[1].date).getDate(), 24);
  assert.equal(new Date(result.plans[1].date).getHours(), 15);
  assert.equal(new Date(result.plans[2].date).getDate(), 25);
  assert.equal(new Date(result.plans[3].date).getDate(), 26);
  assert.match(result.summary, /明天：完成项目周报/);
  assert.match(result.summary, /后天：整理书架/);
});

test("recovers multiple tasks from a long speech without punctuation", () => {
  const text = "我今天得把报告写完这个很重要下午三点和产品经理开会确认发布时间后天有空整理书架另外下周一交英语生词和英语范文";
  const result = extractPlans(text, { referenceDate });

  assert.deepEqual(
    result.plans.map((plan) => plan.text),
    ["完成报告", "和产品经理开会确认发布时间", "整理书架", "英语生词", "范文"]
  );
  assert.deepEqual(
    result.plans.map((plan) => plan.importance),
    ["high", "medium", "low", "medium", "medium"]
  );
  assert.equal(new Date(result.plans[1].date).getHours(), 15);
  assert.equal(new Date(result.plans[2].date).getDate(), 25);
  assert.ok(result.plans.every((plan) => !plan.text.includes("我今天得")));
});

test("removes meaningless connectors while preserving meaningful relational words", () => {
  const result = extractPlans(
    "明天写报告而且还要联系客户，等一会儿整理书架，并且和产品经理确认时间。",
    { referenceDate }
  );

  assert.deepEqual(
    result.plans.map((plan) => plan.text),
    ["写报告", "联系客户", "整理书架", "和产品经理确认时间"]
  );
  for (const connector of ["而且", "还要", "等会", "等一会儿", "并且"]) {
    assert.ok(result.cleanedText.includes(connector) === false, `connector remained: ${connector}`);
  }
  assert.ok(result.plans[3].text.startsWith("和产品经理"));
});
