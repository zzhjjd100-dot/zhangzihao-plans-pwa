import test from "node:test";
import assert from "node:assert/strict";
import { extractPlans } from "../extractor.js";
import { dialogueCorpus } from "./dialogue-corpus-data.mjs";

const referenceDate = new Date(2026, 9, 25, 12, 0, 0);

test("contains 100 short dialogues across three planning categories", () => {
  assert.equal(dialogueCorpus.length, 100);
  assert.equal(dialogueCorpus.filter((item) => item.category === "学习规划").length, 40);
  assert.equal(dialogueCorpus.filter((item) => item.category === "健身规划").length, 35);
  assert.equal(dialogueCorpus.filter((item) => item.category === "练习规划").length, 25);
  for (const item of dialogueCorpus) {
    assert.ok(
      [...item.dialogue].length <= 100,
      `${item.id} exceeds 100 characters`
    );
  }
});

test("extracts actionable plans from all 100 dialogue samples", () => {
  for (const item of dialogueCorpus) {
    const result = extractPlans(item.dialogue, { referenceDate });
    assert.ok(result.plans.length > 0, `${item.id} produced no plan`);
    assert.ok(
      result.plans.every((plan) => !/[AB甲乙老师学生教练学员]:/.test(plan.text)),
      `${item.id} kept a speaker label`
    );
    assert.ok(
      result.plans.every((plan) => !/[？?]/.test(plan.text)),
      `${item.id} kept a question mark`
    );
    for (const keyword of item.keywords) {
      assert.ok(
        result.cleanedText.includes(keyword),
        `${item.id} missing keyword: ${keyword}`
      );
    }
  }
});

test("keeps the corrected date and replacement activity in multi-turn plans", () => {
  const rescheduled = extractPlans(
    "甲：周三练口语行吗？乙：周三不行，改周四晚上八点。",
    { referenceDate }
  );
  assert.deepEqual(rescheduled.plans.map((plan) => plan.text), ["练口语"]);
  assert.equal(new Date(rescheduled.plans[0].date).getDay(), 4);
  assert.equal(new Date(rescheduled.plans[0].date).getHours(), 20);

  const replaced = extractPlans(
    "A：今天跑五公里？B：膝盖不舒服，改成游泳三十分钟。",
    { referenceDate }
  );
  assert.deepEqual(replaced.plans.map((plan) => plan.text), ["游泳三十分钟"]);

  const sequenced = extractPlans(
    "教练：先热身十分钟，再做三组深蹲，最后拉伸。学员：明白。",
    { referenceDate }
  );
  assert.deepEqual(
    sequenced.plans.map((plan) => plan.text),
    ["热身十分钟", "做三组深蹲", "拉伸"]
  );
});
