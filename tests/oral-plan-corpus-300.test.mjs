import test from "node:test";
import assert from "node:assert/strict";
import { extractPlannerInput } from "../intent.js";
import { oralPlanCorpus300 } from "./oral-plan-corpus-300-data.mjs";

const referenceDate = new Date(2026, 9, 26, 12, 0, 0);

test("contains 300 short daily oral-planning samples", () => {
  assert.equal(oralPlanCorpus300.length, 300);
  for (const category of ["日计划", "周计划", "月计划", "年计划", "重要日期"]) {
    assert.equal(
      oralPlanCorpus300.filter((item) => item.category === category).length,
      60
    );
  }
  for (const item of oralPlanCorpus300) {
    assert.ok([...item.input].length <= 100, `${item.id} exceeds 100 characters`);
  }
});

test("extracts scope, basis, and important events from all 300 samples", () => {
  for (const item of oralPlanCorpus300) {
    const result = extractPlannerInput(item.input, { referenceDate });
    assert.ok(result.plans.length > 0, `${item.id} produced no plan`);
    for (const keyword of item.keywords) {
      assert.ok(result.cleanedText.includes(keyword), `${item.id} missing ${keyword}`);
    }
    assert.ok(
      result.plans.every((plan) => plan.scope === item.expectedScope),
      `${item.id} scope mismatch`
    );
    if (item.expectedScope !== "day") {
      assert.ok(
        result.plans.every((plan) => plan.scopeBasis === item.expectedBasis),
        `${item.id} basis mismatch`
      );
    }
    if (item.expectedEvent) {
      assert.ok(result.events.length > 0, `${item.id} missing important event`);
      assert.equal(result.events[0].title, item.expectedEventTitle);
      assert.ok(
        result.plans.some((plan) => plan.deadlineEventIndex === 0),
        `${item.id} missing deadline association`
      );
    }
  }
});
