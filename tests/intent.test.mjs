import test from "node:test";
import assert from "node:assert/strict";
import { extractPlannerInput } from "../intent.js";

const referenceDate = new Date(2026, 9, 26, 12, 0, 0);

test("detects calendar month and rolling month plans", () => {
  const calendar = extractPlannerInput(
    "这个月的计划是每周读一本书，每天背20个单词",
    { referenceDate }
  );
  const rolling = extractPlannerInput(
    "从今天起一个月的计划是完成课程，每周复盘一次",
    { referenceDate }
  );

  assert.deepEqual(calendar.scopeDirective, {
    scope: "month",
    basis: "calendar"
  });
  assert.ok(calendar.plans.every((plan) => plan.scope === "month"));
  assert.ok(calendar.plans.every((plan) => plan.scopeBasis === "calendar"));
  assert.equal(new Date(calendar.plans[0].scopeStart).getDate(), 1);
  assert.equal(new Date(calendar.plans[0].scopeEnd).getDate(), 31);

  assert.deepEqual(rolling.scopeDirective, {
    scope: "month",
    basis: "rolling"
  });
  assert.ok(rolling.plans.every((plan) => plan.scopeBasis === "rolling"));
  assert.equal(new Date(rolling.plans[0].scopeStart).getDate(), 26);
});

test("extracts important dates separately from deadline plans", () => {
  const result = extractPlannerInput(
    "10月30日是妈妈的生日，这个很重要，之前要完成买礼物和订蛋糕",
    { referenceDate }
  );

  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].title, "妈妈的生日");
  assert.equal(result.events[0].date.getDate(), 30);
  assert.equal(result.plans.length, 1);
  assert.equal(result.plans[0].deadlineEventIndex, 0);
  assert.ok(!result.plans[0].text.startsWith("之前"));
});

test("organizes a deadline plan under a named important event", () => {
  const result = extractPlannerInput(
    "11月5日有重要事件，项目评审。在那之前完成方案和预算。",
    { referenceDate }
  );

  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].title, "项目评审");
  assert.equal(result.plans.length, 1);
  assert.equal(result.plans[0].deadlineEventIndex, 0);
  assert.match(result.plans[0].text, /方案和预算/);
  assert.equal(
    new Date(result.plans[0].date).toDateString(),
    result.events[0].date.toDateString()
  );
});

test("associates a deadline with the nearest preceding important event", () => {
  const result = extractPlannerInput(
    "10月30日有重要事件，妈妈生日。11月5日有重要事件，项目评审。在11月5日之前完成方案和预算。",
    { referenceDate }
  );

  assert.equal(result.events.length, 2);
  assert.equal(result.plans[0].deadlineEventIndex, 1);
});
