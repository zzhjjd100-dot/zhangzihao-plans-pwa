import test from "node:test";
import assert from "node:assert/strict";
import { PlanStore, MemoryStorage } from "../store.js";

test("sorts days newest first and high importance first within a day", () => {
  const store = new PlanStore(new MemoryStorage(), "test-a");
  const dayOne = new Date(2026, 9, 24, 9);
  const dayTwo = new Date(2026, 9, 25, 9);

  const low = store.addRaw("两天后的低重要任务", dayTwo, "low");
  const high = store.addRaw("两天后的高重要任务", dayTwo, "high");
  store.addRaw("明天的中重要任务", dayOne, "medium");

  const groups = store.groupedByDayNewestFirst();
  assert.equal(groups.length, 2);
  assert.equal(groups[0].key, "2026-10-25");
  assert.equal(groups[0].items[0].id, high.id);
  assert.equal(groups[0].items[1].id, low.id);
});

test("completion can retain or remove and deletion is permanent", () => {
  const storage = new MemoryStorage();
  const store = new PlanStore(storage, "test-b");
  const keep = store.addRaw("保留完成", new Date(2026, 9, 24), "medium");
  const remove = store.addRaw("完成删除", new Date(2026, 9, 24), "medium");
  const deleteItem = store.addRaw("永久删除", new Date(2026, 9, 24), "medium");

  store.complete(keep.id, true);
  store.complete(remove.id, false);
  store.delete(deleteItem.id);

  assert.equal(store.items.find((item) => item.id === keep.id)?.isCompleted, true);
  assert.equal(store.items.some((item) => item.id === remove.id), false);
  assert.equal(store.items.some((item) => item.id === deleteItem.id), false);
});

test("persists completion state and raw text", () => {
  const storage = new MemoryStorage();
  const store = new PlanStore(storage, "test-c");
  const item = store.addRaw("嗯，原样保留", new Date(2026, 9, 24), "high");
  store.complete(item.id, true);

  const reloaded = new PlanStore(storage, "test-c");
  const loaded = reloaded.items.find((entry) => entry.id === item.id);
  assert.equal(loaded?.text, "嗯，原样保留");
  assert.equal(loaded?.importance, "high");
  assert.equal(loaded?.isCompleted, true);
});

test("reopens completed plans", () => {
  const store = new PlanStore(new MemoryStorage(), "test-d");
  const item = store.addRaw("恢复测试", new Date(2026, 9, 24), "low");
  store.complete(item.id, true);
  store.reopen(item.id);
  assert.equal(store.items.find((entry) => entry.id === item.id)?.isCompleted, false);
});
