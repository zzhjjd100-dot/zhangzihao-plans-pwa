import test from "node:test";
import assert from "node:assert/strict";
import { toggledDaySet, visibleTasksForDay } from "../ui-state.js";

const items = [
  { id: "high", importance: "high", text: "高重要任务" },
  { id: "medium", importance: "medium", text: "中重要任务" },
  { id: "low", importance: "low", text: "低重要任务" }
];

test("collapsed day shows only high-priority tasks", () => {
  assert.deepEqual(
    visibleTasksForDay(items, false).map((item) => item.id),
    ["high"]
  );
});

test("expanded day shows all tasks in original sorted order", () => {
  assert.deepEqual(
    visibleTasksForDay(items, true).map((item) => item.id),
    ["high", "medium", "low"]
  );
});

test("day expansion toggles independently", () => {
  let expanded = new Set();
  expanded = toggledDaySet(expanded, "2026-10-25");
  assert.equal(expanded.has("2026-10-25"), true);
  expanded = toggledDaySet(expanded, "2026-10-25");
  assert.equal(expanded.has("2026-10-25"), false);
});
