import { importanceRank } from "./extractor.js";
import {
  normalizeScope,
  normalizeScopeBasis,
  periodRange
} from "./periods.js";

export const STORAGE_KEY = "zhangzihao-plans-v1";
export const EVENT_STORAGE_KEY = "zhangzihao-events-v1";

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
    this.eventStorageKey = `${storageKey}-events`;
    this.items = [];
    this.events = [];
    this.listeners = new Set();
    this.load();
    this.loadEvents();
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

  loadEvents() {
    try {
      const raw = this.storage.getItem(this.eventStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      this.events = Array.isArray(parsed)
        ? parsed.filter(isValidEvent).map(normalizeEvent)
        : [];
    } catch {
      this.events = [];
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

  persistEvents() {
    try {
      this.storage.setItem(this.eventStorageKey, JSON.stringify(this.events));
    } catch {
      // Keep in-memory events usable when storage is unavailable.
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
        scope: normalizeScope(plan.scope),
        scopeBasis: normalizeScopeBasis(plan.scopeBasis, plan.scope),
        scopeStart: toISOStringOrDefault(plan.scopeStart, plan.date),
        scopeEnd: toISOStringOrDefault(plan.scopeEnd, plan.date),
        importance: plan.importance || "medium",
        deadlineEventId: plan.deadlineEventId || null,
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
      .filter((item) => item.scope === "day" && dayKey(item.date) === key)
      .sort(sortPlans);
  }

  groupedByDayNewestFirst() {
    const groups = new Map();
    for (const item of this.items) {
      if (item.scope !== "day") continue;
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

  addEvent(event) {
    const now = new Date().toISOString();
    const created = {
      id: event.id || createId(),
      title: String(event.title || "").trim(),
      date: new Date(event.date).toISOString(),
      createdAt: now,
      updatedAt: now
    };
    if (!created.title) throw new Error("Important event title is required");
    this.events.push(created);
    this.persistEvents();
    return created;
  }

  updateEvent(id, changes) {
    const event = this.events.find((entry) => entry.id === id);
    if (!event) return;
    if (typeof changes.title === "string") event.title = changes.title.trim();
    if (changes.date && !Number.isNaN(new Date(changes.date).getTime())) {
      event.date = new Date(changes.date).toISOString();
    }
    event.updatedAt = new Date().toISOString();
    this.persistEvents();
  }

  deleteEvent(id) {
    this.events = this.events.filter((event) => event.id !== id);
    for (const item of this.items) {
      if (item.deadlineEventId === id) item.deadlineEventId = null;
    }
    this.persistEvents();
    this.persist();
  }

  upcomingEvents() {
    return [...this.events].sort(
      (left, right) => new Date(left.date) - new Date(right.date)
    );
  }

  eventById(id) {
    return this.events.find((event) => event.id === id) || null;
  }

  bigPlans() {
    return this.items
      .filter((item) => item.scope !== "day" && !item.isCompleted)
      .sort(sortBigPlans);
  }

  bigPlansByScope(scope) {
    return this.bigPlans().filter((item) => item.scope === normalizeScope(scope));
  }

  plansDueByEvent(event) {
    if (!event) return [];
    const deadline = endOfDay(event.date);
    return this.items
      .filter((item) => !item.isCompleted)
      .filter(
        (item) =>
          item.deadlineEventId === event.id ||
          new Date(item.date) <= deadline
      )
      .sort(sortPlans);
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
  const scope = normalizeScope(plan.scope);
  const scopeBasis = normalizeScopeBasis(plan.scopeBasis, scope);
  const fallbackRange = periodRange(scope, scopeBasis, new Date(plan.date));
  return {
    ...plan,
    scope,
    scopeBasis,
    scopeStart: toISOStringOrDefault(plan.scopeStart, fallbackRange.start),
    scopeEnd: toISOStringOrDefault(plan.scopeEnd, fallbackRange.end),
    deadlineEventId:
      typeof plan.deadlineEventId === "string" ? plan.deadlineEventId : null,
    importance: ["high", "medium", "low"].includes(plan.importance)
      ? plan.importance
      : "medium",
    isCompleted: Boolean(plan.isCompleted),
    dateWasAutomaticallyInferred: Boolean(plan.dateWasAutomaticallyInferred),
    importanceWasAutomaticallyInferred: Boolean(plan.importanceWasAutomaticallyInferred)
  };
}

function sortBigPlans(left, right) {
  const scopeOrder = { week: 0, month: 1, year: 2 };
  const scopeDifference =
    (scopeOrder[left.scope] ?? 9) - (scopeOrder[right.scope] ?? 9);
  if (scopeDifference !== 0) return scopeDifference;
  const endDifference = new Date(left.scopeEnd) - new Date(right.scopeEnd);
  if (endDifference !== 0) return endDifference;
  return importanceRank(right.importance) - importanceRank(left.importance);
}

function toISOStringOrDefault(value, fallback) {
  const candidate = new Date(value ?? fallback);
  return Number.isNaN(candidate.getTime())
    ? new Date(fallback).toISOString()
    : candidate.toISOString();
}

function endOfDay(value) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function isValidPlan(plan) {
  return (
    plan &&
    typeof plan.id === "string" &&
    typeof plan.text === "string" &&
    !Number.isNaN(new Date(plan.date).getTime())
  );
}

function normalizeEvent(event) {
  return {
    ...event,
    title: String(event.title || "").trim(),
    date: new Date(event.date).toISOString()
  };
}

function isValidEvent(event) {
  return (
    event &&
    typeof event.id === "string" &&
    typeof event.title === "string" &&
    event.title.trim() &&
    !Number.isNaN(new Date(event.date).getTime())
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
