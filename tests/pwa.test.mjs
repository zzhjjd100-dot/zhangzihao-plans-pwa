import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const readBuffer = (relative) => fs.readFileSync(path.join(root, relative));

test("manifest declares an installable dark standalone PWA", () => {
  const manifest = JSON.parse(read("manifest.webmanifest"));
  assert.equal(manifest.name, "张梓濠的小计划");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.orientation, "portrait");
  assert.equal(manifest.theme_color, "#17191d");
  assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192"));
  assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512"));
  assert.ok(manifest.icons.some((icon) => icon.purpose === "maskable"));
});

test("HTML includes iOS standalone metadata and required controls", () => {
  const html = read("index.html");
  assert.match(html, /apple-mobile-web-app-capable/);
  assert.match(html, /apple-mobile-web-app-title/);
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /id="draftInput"/);
  assert.match(html, /id="micButton"/);
  assert.match(html, /data-mode="smart"/);
  assert.match(html, /data-mode="raw"/);
  assert.match(html, /id="reviewModal"/);
});

test("service worker caches the full local app shell", () => {
  const sw = read("sw.js");
  for (const asset of [
    "./index.html",
    "./styles.css",
    "./app.js",
    "./extractor.js",
    "./store.js",
    "./speech-text.js",
    "./manifest.webmanifest",
    "./icons/icon-192.png"
  ]) {
    assert.ok(sw.includes(asset), `missing ${asset}`);
  }
  assert.match(sw, /self\.addEventListener\("install"/);
  assert.match(sw, /self\.addEventListener\("fetch"/);
});

test("speech has Web Speech support and keyboard dictation fallback", () => {
  const app = read("app.js");
  const speechText = read("speech-text.js");
  assert.match(app, /webkitSpeechRecognition/);
  assert.match(app, /appState\.recording/);
  assert.match(app, /elements\.draft\.focus\(\)/);
  assert.match(app, /键盘麦克风听写/);
  assert.match(app, /recognition\.lang = "zh-CN"/);
  assert.match(app, /recognition\.continuous = true/);
  assert.match(app, /75_000/);
  assert.match(app, /10 \* 60 \* 1000/);
  assert.match(app, /startRecognitionAttempt\(false\)/);
  assert.match(app, /appState\.recordingIntent/);
  assert.match(app, /appendFinalTranscript/);
  assert.match(speechText, /pauseThresholdMs = 1000/);
});

test("UI fonts stay compact and cards limit home lines", () => {
  const css = read("styles.css");
  const sizes = [...css.matchAll(/font-size:\s*([0-9.]+)px/g)]
    .map((match) => Number(match[1]))
    .filter(Number.isFinite);
  assert.ok(Math.max(...sizes) <= 23);
  assert.match(css, /-webkit-line-clamp:\s*2/);
  assert.match(css, /text-overflow:\s*ellipsis/);
});

test("PWA icons are valid PNGs with expected dimensions", () => {
  const expected = new Map([
    ["icons/icon-180.png", 180],
    ["icons/icon-192.png", 192],
    ["icons/icon-512.png", 512],
    ["icons/icon-512-maskable.png", 512]
  ]);
  for (const [file, size] of expected) {
    const data = readBuffer(file);
    assert.equal(data.readUInt32BE(0), 0x89504e47);
    assert.equal(data.readUInt32BE(16), size);
    assert.equal(data.readUInt32BE(20), size);
  }
});

test("local date and task persistence code is included", () => {
  const store = read("store.js");
  const app = read("app.js");
  assert.match(store, /localStorage/);
  assert.match(store, /groupedByDayNewestFirst/);
  assert.match(app, /store\.addRaw/);
  assert.match(app, /store\.complete/);
  assert.match(app, /store\.delete/);
});

test("review screen receives and displays the generated overview", () => {
  const app = read("app.js");
  assert.match(app, /summary: result\.summary/);
  assert.match(app, /review\.summary/);
});

test("home day cards can collapse to high-priority items only", () => {
  const app = read("app.js");
  const uiState = read("ui-state.js");
  assert.match(app, /data-action="toggle-day"/);
  assert.match(app, /visibleTasksForDay/);
  assert.match(uiState, /importance === "high"/);
  assert.match(uiState, /if \(expanded\) return \[\.\.\.items\]/);
});
