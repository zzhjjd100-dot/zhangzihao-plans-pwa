import test from "node:test";
import assert from "node:assert/strict";
import { extractPlans } from "../extractor.js";
import { dialogueCorpus } from "./dialogue-corpus-data.mjs";
import { interviewDialogueCorpus } from "./interview-dialogue-corpus-data.mjs";

const referenceDate = new Date(2026, 9, 25, 12, 0, 0);

test("contains 100 additional domestic-interview dialogue samples", () => {
  assert.equal(interviewDialogueCorpus.length, 100);
  assert.equal(dialogueCorpus.length + interviewDialogueCorpus.length, 200);
  assert.equal(
    interviewDialogueCorpus.filter((item) => item.category === "学习规划").length,
    35
  );
  assert.equal(
    interviewDialogueCorpus.filter((item) => item.category === "健身规划").length,
    35
  );
  assert.equal(
    interviewDialogueCorpus.filter((item) => item.category === "练习规划").length,
    30
  );
  for (const item of interviewDialogueCorpus) {
    assert.ok([...item.dialogue].length <= 100, `${item.id} exceeds 100 characters`);
  }
});

test("extracts plans from all domestic-interview dialogue samples", () => {
  for (const item of interviewDialogueCorpus) {
    const result = extractPlans(item.dialogue, { referenceDate });
    assert.ok(result.plans.length > 0, `${item.id} produced no plan`);
    assert.ok(
      result.plans.every((plan) => !/(?:记者|受访者)[：:]/.test(plan.text)),
      `${item.id} kept an interview label`
    );
    for (const keyword of item.keywords) {
      assert.ok(
        result.cleanedText.includes(keyword),
        `${item.id} missing keyword: ${keyword}`
      );
    }
  }
});
