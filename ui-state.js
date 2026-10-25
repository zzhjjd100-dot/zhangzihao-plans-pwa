export function visibleTasksForDay(items, expanded) {
  if (expanded) return [...items];
  return items.filter((item) => item.importance === "high");
}

export function toggledDaySet(current, key) {
  const next = new Set(current);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}
