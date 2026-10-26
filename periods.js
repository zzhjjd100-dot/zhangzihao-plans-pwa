export const PLAN_SCOPES = ["day", "week", "month", "year"];
export const SCOPE_BASES = ["calendar", "rolling"];

export function normalizeScope(value) {
  return PLAN_SCOPES.includes(value) ? value : "day";
}

export function normalizeScopeBasis(value, scope = "day") {
  if (scope === "day") return "calendar";
  return SCOPE_BASES.includes(value) ? value : "calendar";
}

export function scopeLabel(scope) {
  return {
    day: "日计划",
    week: "周计划",
    month: "月计划",
    year: "年计划"
  }[normalizeScope(scope)];
}

export function scopeBasisLabel(basis, scope) {
  if (normalizeScope(scope) === "day") return "单日";
  return normalizeScopeBasis(basis, scope) === "rolling"
    ? "从今天起"
    : "按日历";
}

export function periodRange(scope, basis, referenceDate = new Date()) {
  const normalizedScope = normalizeScope(scope);
  const normalizedBasis = normalizeScopeBasis(basis, normalizedScope);
  const anchor = startOfDay(referenceDate);

  if (normalizedScope === "day") {
    return withKeys(anchor, anchor);
  }

  if (normalizedBasis === "rolling") {
    if (normalizedScope === "week") {
      return withKeys(anchor, addDays(anchor, 6));
    }
    if (normalizedScope === "month") {
      return withKeys(anchor, addDays(addMonthsClamped(anchor, 1), -1));
    }
    return withKeys(anchor, addDays(addYearsClamped(anchor, 1), -1));
  }

  if (normalizedScope === "week") {
    const mondayOffset = (anchor.getDay() + 6) % 7;
    const start = addDays(anchor, -mondayOffset);
    return withKeys(start, addDays(start, 6));
  }

  if (normalizedScope === "month") {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    return withKeys(start, end);
  }

  return withKeys(
    new Date(anchor.getFullYear(), 0, 1),
    new Date(anchor.getFullYear(), 11, 31)
  );
}

export function formatPeriodRange(range) {
  const start = new Date(range.start);
  const end = new Date(range.end);
  const startLabel = `${start.getMonth() + 1}月${start.getDate()}日`;
  const endLabel = `${end.getMonth() + 1}月${end.getDate()}日`;
  return startLabel === endLabel ? startLabel : `${startLabel} 至 ${endLabel}`;
}

function withKeys(start, end) {
  const startDate = startOfDay(start);
  const endDate = startOfDay(end);
  return {
    start: startDate,
    end: endDate,
    startKey: dayKey(startDate),
    endKey: dayKey(endDate)
  };
}

function startOfDay(value) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(value, amount) {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
}

function addMonthsClamped(value, amount) {
  const date = new Date(value);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + amount);
  const lastDay = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0
  ).getDate();
  date.setDate(Math.min(day, lastDay));
  return date;
}

function addYearsClamped(value, amount) {
  const date = new Date(value);
  const month = date.getMonth();
  const day = date.getDate();
  date.setDate(1);
  date.setFullYear(date.getFullYear() + amount);
  date.setMonth(month);
  const lastDay = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0
  ).getDate();
  date.setDate(Math.min(day, lastDay));
  return date;
}

function dayKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
