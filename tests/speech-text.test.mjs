import test from "node:test";
import assert from "node:assert/strict";
import {
  appendFinalTranscript,
  chooseBestTranscript,
  refineSpeechTranscript
} from "../speech-text.js";

test("adds a comma after a long pause", () => {
  assert.equal(
    appendFinalTranscript("明天上午写报告", "下午三点开会", {
      gapMs: 1200
    }),
    "明天上午写报告，下午三点开会"
  );
});

test("pause punctuation window is one second", () => {
  assert.equal(
    appendFinalTranscript("写报告", "联系客户", {
      gapMs: 999
    }),
    "写报告联系客户"
  );
  assert.equal(
    appendFinalTranscript("写报告", "联系客户", {
      gapMs: 1001
    }),
    "写报告，联系客户"
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

test("chooses the most task-like speech alternative", () => {
  const alternatives = Object.assign([
    { transcript: "化学作业要坐", confidence: 0.42 },
    { transcript: "化学作业要做", confidence: 0.4 },
    { transcript: "化学作业", confidence: 0.3 }
  ], { isFinal: true });

  assert.equal(chooseBestTranscript(alternatives), "化学作业要做");
});

test("repairs common study-term speech recognition errors", () => {
  assert.equal(
    refineSpeechTranscript("画学错提，英语泛文，英语单子，生物复习第五单员，化学作业要坐，英语听说给作文，语文反相册试"),
    "化学错题，英语范文，英语单词，生物复习第五单元，化学作业要做，英语听说给做完，语文分项测试"
  );
});

test("does not append a repeated recognition result", () => {
  assert.equal(
    appendFinalTranscript("化学作业要做", "化学作业要做", {
      pauseBefore: true
    }),
    "化学作业要做"
  );
  assert.equal(
    appendFinalTranscript("明天完成化学作业", "完成化学作业", {
      pauseBefore: true
    }),
    "明天完成化学作业"
  );
  assert.equal(
    appendFinalTranscript("稍后完成化学作业", "完成化学作业，还有数学作业", {
      pauseBefore: true
    }),
    "稍后完成化学作业，还有数学作业"
  );
});
