export function appendFinalTranscript(
  existing,
  chunk,
  {
    gapMs = 0,
    pauseBefore = false,
    pauseThresholdMs = 900
  } = {}
) {
  const current = String(existing || "").trim();
  const addition = String(chunk || "").trim();
  if (!addition) return current;

  const shouldAddComma =
    Boolean(current) &&
    (pauseBefore || gapMs >= pauseThresholdMs) &&
    !/[，,。！？!?；;：:\s]$/.test(current) &&
    !/^[，,。！？!?；;：:]/.test(addition);

  return `${current}${current && shouldAddComma ? "，" : ""}${addition}`.trim();
}
