import test from "node:test";
import assert from "node:assert/strict";
import {
  formatPeriodRange,
  normalizeScopeBasis,
  periodRange
} from "../periods.js";

const reference = new Date(2026, 9, 26, 12, 0, 0);

test("calendar periods follow the current week, month, and year", () => {
  const week = periodRange("week", "calendar", reference);
  const month = periodRange("month", "calendar", reference);
  const year = periodRange("year", "calendar", reference);

  assert.equal(week.startKey, "2026-10-26");
  assert.equal(week.endKey, "2026-11-01");
  assert.equal(month.startKey, "2026-10-01");
  assert.equal(month.endKey, "2026-10-31");
  assert.equal(year.startKey, "2026-01-01");
  assert.equal(year.endKey, "2026-12-31");
  assert.equal(formatPeriodRange(week), "10月26日 至 11月1日");
});

test("rolling periods start on the reference day", () => {
  const week = periodRange("week", "rolling", reference);
  const month = periodRange("month", "rolling", reference);
  const year = periodRange("year", "rolling", reference);

  assert.equal(week.startKey, "2026-10-26");
  assert.equal(week.endKey, "2026-11-01");
  assert.equal(month.startKey, "2026-10-26");
  assert.equal(month.endKey, "2026-11-25");
  assert.equal(year.startKey, "2026-10-26");
  assert.equal(year.endKey, "2027-10-25");
});

test("rolling ranges clamp month and leap-day endpoints", () => {
  const month = periodRange("month", "rolling", new Date(2027, 0, 31, 9));
  const year = periodRange("year", "rolling", new Date(2028, 1, 29, 9));

  assert.equal(month.endKey, "2027-02-27");
  assert.equal(year.endKey, "2029-02-27");
  assert.equal(normalizeScopeBasis("rolling", "day"), "calendar");
});
