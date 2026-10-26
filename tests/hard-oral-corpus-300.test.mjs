import test from "node:test";
import assert from "node:assert/strict";
import { extractPlannerInput } from "../intent.js";
import {
  countAnomalies,
  countFillers,
  hardOralCorpus300,
  HARD_FILLER_TOKENS
} from "./hard-oral-corpus-300-data.mjs";

const referenceDate = new Date(2026, 9, 26, 12, 0, 0);

test("contains 300 hard oral samples with fillers and grammar gaps", () => {
  assert.equal(hardOralCorpus300.length, 300);
  for (const item of hardOralCorpus300) {
    assert.ok([...item.input].length <= 100, `${item.id} too long`);
    assert.ok(
      countFillers(item.input) >= 3,
      `${item.id} needs at least three fillers`
    );
    assert.ok(
      countAnomalies(item.input) >= 2,
      `${item.id} needs at least two grammar anomalies`
    );
  }
});

test("extracts scope, important dates, and cleaned titles from hard samples", () => {
  for (const item of hardOralCorpus300) {
    const result = extractPlannerInput(item.input, { referenceDate });
    assert.ok(result.plans.length > 0, `${item.id} produced no plan`);
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
    for (const keyword of item.keywords) {
      assert.ok(result.cleanedText.includes(keyword), `${item.id} missing ${keyword}`);
    }
    if (item.expectedEvent) {
      assert.ok(result.events.length > 0, `${item.id} missing event`);
      assert.equal(result.events[0].title, item.expectedEventTitle);
    }
    for (const plan of result.plans) {
      for (const filler of HARD_FILLER_TOKENS) {
        assert.ok(!plan.text.includes(filler), `${item.id} kept filler ${filler}`);
      }
      assert.ok(!plan.text.includes("不是"), `${item.id} kept self-correction`);
    }
  }
});
