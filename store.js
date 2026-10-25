import { importanceRank } from "./extractor.js";

export const STORAGE_KEY = "zhangzihao-plans-v1";

export function dayKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateFromDayKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export class PlanStore {
  constructor(storage = globalThis.localStorage, storageKey = STORAGE_KEY) {
    this.storage = storage || new MemoryStorage();
    this.storageKey = storageKey;
    this.items = [];
    this.listeners = new Set();
    this.load();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit() {
    for (const listener of this.listeners) listener(this.items);
  }

  load() {
    try {
      const raw = this.storage.getItem(this.storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      this.items = Array.isArray(parsed)
        ? parsed.filter(isValidPlan).map(normalizePlan)
        : [];
    } catch {
      this.items = [];
    }
  }

  persist() {
    try {
      this.storage.setItem(this.storageKey, JSON.stringify(this.items));
    } catch {
      // Storage can be unavailable in private browsing; in-memory state still works.
    }
    this.emit();
  }

  addPlans(plans, originalText) {
    const now = new Date().toISOString();
    const created = plans
      .filter((plan) => plan.text.trim())
      .map((plan) => ({
        id: plan.id || createId(),
        text: plan.text.trim(),
        originalText,
        date: new Date(plan.date).toISOString(),
        importance: plan.importance || "medium",
        createdAt: now,
        updatedAt: now,
        isCompleted: false,
        dateWasAutomaticallyInferred: Boolean(plan.dateWasAutomaticallyInferred),
        importanceWasAutomaticallyInferred: Boolean(plan.importanceWasAutomaticallyInferred)
      }));
    this.items.push(...created);
    this.persist();
    return created;
  }

  addRaw(text, date, importance) {
    return this.addPlans(
      [{
        text,
        date: new Date(date).toISOString(),
        importance,
        dateWasAutomaticallyInferred: false,
        importanceWasAutomaticallyInferred: false
      }],
      text
    )[0];
  }

  delete(id) {
    const previousLength = this.items.length;
    this.items = this.items.filter((item) => item.id !== id);
    if (this.items.length !== previousLength) this.persist();
  }

  complete(id, keepCompleted) {
    if (!keepCompleted) {
      this.delete(id);
      return;
    }
    const item = this.items.find((entry) => entry.id === id);
    if (!item) return;
    item.isCompleted = true;
    item.updatedAt = new Date().toISOString();
    this.persist();
  }

  reopen(id) {
    const item = this.items.find((entry) => entry.id === id);
    if (!item) return;
    item.isCompleted = false;
    item.updatedAt = new Date().toISOString();
    this.persist();
  }

  plansForDay(key) {
    return this.items
      .filter((item) => dayKey(item.date) === key)
      .sort(sortPlans);
  }

  groupedByDayNewestFirst() {
    const groups = new Map();
    for (const item of this.items) {
      const key = dayKey(item.date);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    }
    return [...groups.entries()]
      .sort(([left], [right]) => right.localeCompare(left))
      .map(([key, items]) => ({
        key,
        date: dateFromDayKey(key),
        items: items.sort(sortPlans)
      }));
  }

  pendingCount() {
    return this.items.filter((item) => !item.isCompleted).length;
  }

  highPendingCount() {
    return this.items.filter(
      (item) => !item.isCompleted && item.importance === "high"
    ).length;
  }

  todayCount() {
    return this.plansForDay(dayKey(new Date())).length;
  }
}

function sortPlans(left, right) {
  const leftDay = dayKey(left.date);
  const rightDay = dayKey(right.date);
  if (leftDay !== rightDay) return rightDay.localeCompare(leftDay);
  const importanceDifference = importanceRank(right.importance) - importanceRank(left.importance);
  if (importanceDifference !== 0) return importanceDifference;
  if (left.isCompleted !== right.isCompleted) return left.isCompleted ? 1 : -1;
  return String(right.createdAt).localeCompare(String(left.createdAt));
}

function normalizePlan(plan) {
  return {
    ...plan,
    importance: ["high", "medium", "low"].includes(plan.importance)
      ? plan.importance
      : "medium",
    isCompleted: Boolean(plan.isCompleted),
    dateWasAutomaticallyInferred: Boolean(plan.dateWasAutomaticallyInferred),
    importanceWasAutomaticallyInferred: Boolean(plan.importanceWasAutomaticallyInferred)
  };
}

function isValidPlan(plan) {
  return (
    plan &&
    typeof plan.id === "string" &&
    typeof plan.text === "string" &&
    !Number.isNaN(new Date(plan.date).getTime())
  );
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ||
    `plan-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }
}
