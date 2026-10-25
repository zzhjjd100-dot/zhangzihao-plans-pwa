import test from "node:test";
import assert from "node:assert/strict";
import { appendFinalTranscript } from "../speech-text.js";

test("adds a comma after a long pause", () => {
  assert.equal(
    appendFinalTranscript("明天上午写报告", "下午三点开会", {
      gapMs: 1200
    }),
    "明天上午写报告，下午三点开会"
  );
});

test("adds a comma before a restarted recognition segment", () => {
  assert.equal(
    appendFinalTranscript("先提交周报", "再联系客户", {
      pauseBefore: true
    }),
    "先提交周报，再联系客户"
  );
});

test("does not duplicate existing punctuation", () => {
  assert.equal(
    appendFinalTranscript("提交报告，", "预约牙医", {
      gapMs: 1600
    }),
    "提交报告，预约牙医"
  );
  assert.equal(
    appendFinalTranscript("提交报告", "，预约牙医", {
      pauseBefore: true
    }),
    "提交报告，预约牙医"
  );
});
