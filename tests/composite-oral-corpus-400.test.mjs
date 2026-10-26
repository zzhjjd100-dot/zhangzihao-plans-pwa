import test from "node:test";
import assert from "node:assert/strict";
import { extractPlannerInput } from "../intent.js";
import {
  compositeOralCorpus400,
  countAnomalyOccurrences,
  countFillers,
  HARD_FILLER_TOKENS
} from "./composite-oral-corpus-400-data.mjs";

const referenceDate = new Date(2026, 9, 26, 12, 0, 0);

test("contains 400 composite samples with the requested difficulty", () => {
  assert.equal(compositeOralCorpus400.length, 400);
  const complex = compositeOralCorpus400.filter((item) => item.complex);
  assert.equal(complex.length, 100);
  for (const item of compositeOralCorpus400) {
    assert.ok(countFillers(item.input) >= 3, `${item.id} too few fillers`);
    assert.ok(countAnomalyOccurrences(item.input) >= 2, `${item.id} too few anomalies`);
  }
  for (const item of complex) {
    assert.ok([...item.input].length >= 100, `${item.id} shorter than 100 chars`);
    assert.ok(countFillers(item.input) >= 10, `${item.id} fewer than 10 fillers`);
    assert.ok(countAnomalyOccurrences(item.input) >= 20, `${item.id} fewer than 20 anomalies`);
  }
});

test("extracts both daily and scoped plans from all 400 composites", () => {
  for (const item of compositeOralCorpus400) {
    const result = extractPlannerInput(item.input, { referenceDate });
    assert.ok(
      result.plans.some((plan) => plan.scope === "day"),
      `${item.id} missing daily plan`
    );
    assert.ok(
      result.plans.some((plan) => plan.scope === item.expectedScope),
      `${item.id} missing scoped plan`
    );
    if (item.expectedEvent) {
      assert.ok(result.events.length > 0, `${item.id} missing event`);
      assert.equal(result.events[0].title, item.expectedEventTitle);
      assert.ok(
        result.plans.some((plan) => Number.isInteger(plan.deadlineEventIndex)),
        `${item.id} missing deadline plan`
      );
    }
    for (const keyword of item.keywords) {
      assert.ok(result.cleanedText.includes(keyword), `${item.id} missing ${keyword}`);
    }
    for (const plan of result.plans) {
      for (const filler of HARD_FILLER_TOKENS) {
        assert.ok(!plan.text.includes(filler), `${item.id} kept filler ${filler}`);
      }
    }
  }
});
