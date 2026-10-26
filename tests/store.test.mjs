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

test("keeps big plans out of daily groups and returns them by scope", () => {
  const store = new PlanStore(new MemoryStorage(), "test-e");
  store.addPlans([
    {
      text: "本月完成课程",
      date: new Date(2026, 9, 31, 20),
      scope: "month",
      scopeBasis: "calendar",
      scopeStart: new Date(2026, 9, 1),
      scopeEnd: new Date(2026, 9, 31),
      importance: "high"
    },
    {
      text: "今天背单词",
      date: new Date(2026, 9, 26, 20),
      importance: "medium"
    }
  ], "测试");

  assert.equal(store.groupedByDayNewestFirst().length, 1);
  assert.equal(store.bigPlansByScope("month").length, 1);
  assert.equal(store.bigPlansByScope("week").length, 0);
});

test("persists important events and associates deadline plans", () => {
  const storage = new MemoryStorage();
  const store = new PlanStore(storage, "test-f");
  const event = store.addEvent({
    title: "项目评审",
    date: new Date(2026, 10, 5, 12)
  });
  const plan = store.addPlans([{
    text: "完成方案和预算",
    date: new Date(2026, 10, 5, 12),
    importance: "high",
    deadlineEventId: event.id
  }], "11月5日项目评审")[0];

  const reloaded = new PlanStore(storage, "test-f");
  assert.equal(reloaded.events.length, 1);
  assert.equal(reloaded.eventById(event.id)?.title, "项目评审");
  assert.equal(
    reloaded.plansDueByEvent(reloaded.eventById(event.id))[0].id,
    plan.id
  );

  reloaded.deleteEvent(event.id);
  assert.equal(reloaded.events.length, 0);
  assert.equal(reloaded.items[0].deadlineEventId, null);
});
