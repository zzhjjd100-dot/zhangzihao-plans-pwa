#!/bin/zsh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RESULTS="$ROOT/TestResults"

mkdir -p "$RESULTS"
cd "$ROOT"

echo "Round 1: advanced extraction and speech pipeline"
TZ=Asia/Shanghai node --test tests/corpus.test.mjs tests/dialogue-corpus.test.mjs tests/extractor.test.mjs \
  | tee "$RESULTS/round1.txt"

echo "Round 2: persistence, completion, deletion, and expandable day cards"
TZ=Asia/Shanghai node --test tests/store.test.mjs tests/ui-state.test.mjs \
  | tee "$RESULTS/round2.txt"

echo "Round 3: PWA metadata, local assets, offline shell, recording duration"
node --test tests/pwa.test.mjs tests/speech-text.test.mjs \
  | tee "$RESULTS/round3.txt"

for asset in \
  index.html \
  styles.css \
  app.js \
  extractor.js \
  store.js \
  ui-state.js \
  speech-text.js \
  sw.js \
  manifest.webmanifest \
  icons/icon-180.png \
  icons/icon-192.png \
  icons/icon-512.png \
  icons/icon-512-maskable.png
do
  test -f "$ROOT/$asset"
  echo "present ${asset}" | tee -a "$RESULTS/round3.txt"
done

jq -e '.display == "standalone" and .theme_color == "#17191d" and (.icons | length == 3)' \
  "$ROOT/manifest.webmanifest" >/dev/null
node --check "$ROOT/app.js"
node --check "$ROOT/extractor.js"
node --check "$ROOT/store.js"
node --check "$ROOT/ui-state.js"
node --check "$ROOT/sw.js"

echo "Round 3: PASSED" | tee -a "$RESULTS/round3.txt"
