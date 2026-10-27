import test from "node:test";
import assert from "node:assert/strict";
import { extractPlannerInput } from "../intent.js";
import {
  countAnomalyOccurrences,
  countFillers,
  diverseOverlapOralCorpus100
} from "./diverse-overlap-oral-corpus-100-data.mjs";

const referenceDate = new Date(2026, 9, 26, 12, 0, 0);

test("contains 100 diverse multi-scope samples over 60 characters", () => {
  assert.equal(diverseOverlapOralCorpus100.length, 100);
  const ids = new Set(diverseOverlapOralCorpus100.map((item) => item.id));
  assert.equal(ids.size, 100);
  for (const item of diverseOverlapOralCorpus100) {
    assert.ok([...item.input].length >= 60, `${item.id} too short`);
    assert.ok(countFillers(item.input) >= 2, `${item.id} too few fillers`);
    assert.ok(countAnomalyOccurrences(item.input) >= 2, `${item.id} too few anomalies`);
  }
});

test("classifies every scope and keeps importance separate from important dates", () => {
  for (const item of diverseOverlapOralCorpus100) {
    const result = extractPlannerInput(item.input, { referenceDate });
    assert.ok(result.plans.some((plan) => plan.scope === "day"), `${item.id} missing daily`);
    for (const scope of item.scopes) {
      assert.ok(
        result.plans.some((plan) => plan.scope === scope),
        `${item.id} missing ${scope}`
      );
    }
    assert.ok(result.events.length > 0, `${item.id} missing important event`);
    assert.ok(
      result.plans.some((plan) => Number.isInteger(plan.deadlineEventIndex)),
      `${item.id} missing deadline association`
    );
    assert.ok(
      result.plans.some((plan) => plan.importance === "high"),
      `${item.id} missing high importance`
    );
    assert.ok(
      result.plans.every((plan) => !/(?:计划是|从今天起|有重要的事)/u.test(plan.text)),
      `${item.id} leaked marker`
    );
    assert.ok(
      result.plans.every((plan) => !/(?:另外|然后|还有|再)/u.test(plan.text)),
      `${item.id} merged plans`
    );
  }
});
