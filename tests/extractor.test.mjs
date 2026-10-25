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
  assert.match(report.text, /提交项目报告，很重要/);
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
