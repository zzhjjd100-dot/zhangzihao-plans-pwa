import test from "node:test";
import assert from "node:assert/strict";
import { extractPlannerInput } from "../intent.js";
import {
  countAnomalyOccurrences,
  countFillers,
  noPunctOralCorpus100
} from "./no-punct-oral-corpus-100-data.mjs";

const referenceDate = new Date(2026, 9, 26, 12, 0, 0);

test("contains 100 no-punctuation composite samples under 80 characters", () => {
  assert.equal(noPunctOralCorpus100.length, 100);
  for (const item of noPunctOralCorpus100) {
    assert.ok([...item.input].length <= 80, `${item.id} too long`);
    assert.ok(!/[，,。；;！？!?；;、]/u.test(item.input), `${item.id} contains punctuation`);
    assert.ok(countFillers(item.input) <= 2, `${item.id} too many fillers`);
    assert.ok(countAnomalyOccurrences(item.input) >= 1, `${item.id} missing anomaly`);
  }
});

test("separates daily and scoped plans without merging old and new features", () => {
  for (const item of noPunctOralCorpus100) {
    const result = extractPlannerInput(item.input, { referenceDate });
    const scoped = result.plans.filter((plan) => plan.scope === item.expectedScope);
    const daily = result.plans.filter((plan) => plan.scope === "day");

    assert.ok(scoped.length >= 1, `${item.id} missing scoped plan`);
    assert.ok(daily.length >= 1, `${item.id} missing daily plan`);
    assert.ok(
      result.plans.every((plan) => !/(?:计划是|从今天起|有重要事件)/u.test(plan.text)),
      `${item.id} leaked scope or event marker into a plan`
    );
    assert.ok(
      result.plans.every((plan) => !/(?:另外|然后|还有|再)/u.test(plan.text)),
      `${item.id} merged multiple plans`
    );

    if (item.expectedEvent) {
      assert.ok(result.events.length > 0, `${item.id} missing event`);
      assert.equal(result.events[0].title, item.expectedEventTitle);
      assert.ok(
        result.plans.some((plan) => Number.isInteger(plan.deadlineEventIndex)),
        `${item.id} missing deadline association`
      );
    }
  }
});
