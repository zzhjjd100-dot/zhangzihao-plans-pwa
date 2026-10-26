#!/bin/zsh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RESULTS="$ROOT/TestResults"
PORT=4175
LOG="/private/tmp/zhangzihao-pwa-server.log"

mkdir -p "$RESULTS"
cd "$ROOT"

echo "Round 1: extraction, speech pipeline, sorting, persistence"
TZ=Asia/Shanghai node --test tests/periods.test.mjs tests/intent.test.mjs tests/corpus.test.mjs tests/dialogue-corpus.test.mjs tests/interview-dialogue-corpus.test.mjs tests/oral-plan-corpus-300.test.mjs tests/extractor.test.mjs tests/store.test.mjs \
  | tee "$RESULTS/round1.txt"

echo "Round 2: PWA metadata, assets, HTTP delivery, responsive constraints"
node --test tests/pwa.test.mjs | tee "$RESULTS/round2.txt"

python3 -m http.server "$PORT" --bind 127.0.0.1 >"$LOG" 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT

for _ in {1..30}; do
  if curl -fsS "http://127.0.0.1:${PORT}/" >/dev/null; then break; fi
  sleep 0.2
done

for asset in \
  index.html \
  styles.css \
  app.js \
  extractor.js \
  store.js \
  sw.js \
  manifest.webmanifest \
  icons/icon-180.png \
  icons/icon-192.png \
  icons/icon-512.png \
  icons/icon-512-maskable.png
do
  STATUS=$(curl -fsS -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}/${asset}")
  [[ "$STATUS" == "200" ]]
  echo "200 ${asset}" | tee -a "$RESULTS/round2.txt"
done

curl -fsS "http://127.0.0.1:${PORT}/manifest.webmanifest" \
  | jq -e '.display == "standalone" and .theme_color == "#17191d" and (.icons | length == 3)' >/dev/null

echo "Round 2: PASSED" | tee -a "$RESULTS/round2.txt"
