import test from "node:test";
import assert from "node:assert/strict";
import { extractPlans } from "../extractor.js";

const referenceDate = new Date(2026, 9, 23, 9, 0, 0);

test("removes fillers, preserves importance, and extracts multiple plans", () => {
  const text = "嗯……那个，明天下午三点要提交项目报告，很重要，后天记得预约牙医。大概就是这样。";
  const result = extractPlans(text, { referenceDate });

  assert.equal(result.plans.length, 2);
  assert.ok(result.removedFillerCount > 0);
  assert.ok(!result.cleanedText.includes("嗯"));
  assert.ok(!result.cleanedText.includes("那个"));
  assert.ok(!result.cleanedText.includes("大概就是这样"));

  const report = result.plans[0];
  const dentist = result.plans[1];
  assert.equal(report.text, "提交项目报告");
  assert.equal(report.importance, "high");
  assert.equal(new Date(report.date).getHours(), 15);
  assert.equal(new Date(dentist.date).getDate(), 25);
});

test("does not drop conditional, person, deadline, or attachment details", () => {
  const text = "如果不方便就改成周四下午，但报告必须在周五前发给王老师，不能漏掉附件。";
  const result = extractPlans(text, { referenceDate });
  assert.equal(result.plans.length, 1);
  for (const keyword of ["不方便", "周四", "周五", "王老师", "附件"]) {
    assert.ok(result.plans[0].text.includes(keyword), `missing ${keyword}`);
  }
  assert.equal(result.plans[0].importance, "high");
  assert.equal(new Date(result.plans[0].date).getDay(), 5);
});

test("classifies low and high importance", () => {
  const low = extractPlans("有空的时候可以整理书架，不急。", { referenceDate });
  const high = extractPlans("立刻缴纳房租，否则会逾期。", { referenceDate });
  assert.equal(low.plans[0].importance, "low");
  assert.equal(high.plans[0].importance, "high");
});

test("parses next week, next month, and colloquial two o'clock", () => {
  const nextWeek = extractPlans("下周一上午十点给客户发方案，务必准时。", { referenceDate });
  const nextMonth = extractPlans("下个月五号下午两点交水电费。", { referenceDate });

  const monday = new Date(nextWeek.plans[0].date);
  assert.equal(monday.getMonth(), 9);
  assert.equal(monday.getDate(), 26);
  assert.equal(monday.getHours(), 10);

  const payment = new Date(nextMonth.plans[0].date);
  assert.equal(payment.getMonth(), 10);
  assert.equal(payment.getDate(), 5);
  assert.equal(payment.getHours(), 14);
});

test("mock speech transcript completes extraction pipeline", () => {
  const mockedSpeech = "嗯，明天下午两点和产品经理开会，非常重要。";
  const result = extractPlans(mockedSpeech, { referenceDate });
  assert.equal(result.plans.length, 1);
  assert.ok(result.plans[0].text.includes("产品经理"));
  assert.equal(result.plans[0].importance, "high");
  assert.equal(new Date(result.plans[0].date).getHours(), 14);
});

test("moves relative date out of title and trailing importance into priority", () => {
  const result = extractPlans("明天下午三点提交项目报告，这个很重要。", {
    referenceDate
  });
  assert.equal(result.plans.length, 1);
  assert.equal(result.plans[0].text, "提交项目报告");
  assert.equal(result.plans[0].importance, "high");
  assert.equal(new Date(result.plans[0].date).getDate(), 24);
  assert.equal(new Date(result.plans[0].date).getHours(), 15);
});

test("a standalone importance comment upgrades the prior task and creates no extra item", () => {
  const result = extractPlans("提交项目报告。这个很重要。", {
    referenceDate
  });
  assert.equal(result.plans.length, 1);
  assert.equal(result.plans[0].text, "提交项目报告");
  assert.equal(result.plans[0].importance, "high");
});

test("summarizes English vocabulary and sample essay into compact items", () => {
  const result = extractPlans("明天要背英语生词和英语范文。", {
    referenceDate
  });
  assert.deepEqual(result.plans.map((plan) => plan.text), ["英语生词", "范文"]);
  assert.ok(result.plans.every((plan) => new Date(plan.date).getDate() === 24));
});

test("keeps meaningful preparation verb while removing scheduling filler", () => {
  const result = extractPlans("提醒我明天记得准备资料。", {
    referenceDate
  });
  assert.equal(result.plans[0].text, "准备资料");
  assert.ok(!result.plans[0].text.includes("明天"));
});

test("summarizes a long passage into independent tasks with per-task metadata", () => {
  const text = "嗯，我跟你说一下，明天上午十点先把项目周报写完，这个特别重要。下午三点和产品经理开会确认发布时间。后天有空整理书架，不急。另外下周一交英语生词和英语范文。";
  const result = extractPlans(text, { referenceDate });

  assert.deepEqual(
    result.plans.map((plan) => plan.text),
    ["完成项目周报", "和产品经理开会确认发布时间", "整理书架", "完成英语生词", "完成英语范文"]
  );
  assert.deepEqual(
    result.plans.map((plan) => plan.importance),
    ["high", "medium", "low", "medium", "medium"]
  );
  assert.equal(new Date(result.plans[0].date).getDate(), 24);
  assert.equal(new Date(result.plans[0].date).getHours(), 10);
  assert.equal(new Date(result.plans[1].date).getDate(), 24);
  assert.equal(new Date(result.plans[1].date).getHours(), 15);
  assert.equal(new Date(result.plans[2].date).getDate(), 25);
  assert.equal(new Date(result.plans[3].date).getDate(), 26);
  assert.match(result.summary, /明天：完成项目周报/);
  assert.match(result.summary, /后天：整理书架/);
});

test("recovers multiple tasks from a long speech without punctuation", () => {
  const text = "我今天得把报告写完这个很重要下午三点和产品经理开会确认发布时间后天有空整理书架另外下周一交英语生词和英语范文";
  const result = extractPlans(text, { referenceDate });

  assert.deepEqual(
    result.plans.map((plan) => plan.text),
    ["完成报告", "和产品经理开会确认发布时间", "整理书架", "完成英语生词", "完成英语范文"]
  );
  assert.deepEqual(
    result.plans.map((plan) => plan.importance),
    ["high", "medium", "low", "medium", "medium"]
  );
  assert.equal(new Date(result.plans[1].date).getHours(), 15);
  assert.equal(new Date(result.plans[2].date).getDate(), 25);
  assert.ok(result.plans.every((plan) => !plan.text.includes("我今天得")));
});

test("removes meaningless connectors while preserving meaningful relational words", () => {
  const result = extractPlans(
    "明天写报告而且还要联系客户，等一会儿整理书架，并且和产品经理确认时间。",
    { referenceDate }
  );

  assert.deepEqual(
    result.plans.map((plan) => plan.text),
    ["写报告", "联系客户", "整理书架", "和产品经理确认时间"]
  );
  for (const connector of ["而且", "还要", "等会", "等一会儿", "并且"]) {
    assert.ok(result.cleanedText.includes(connector) === false, `connector remained: ${connector}`);
  }
  assert.ok(result.plans[3].text.startsWith("和产品经理"));
});

test("rejects feelings, opinions, questions, and past events as plans", () => {
  const nonPlanTexts = [
    "我今天很累，而且觉得这个会议很重要。",
    "明天干什么？",
    "这个方案很好，大概就是这样。",
    "我昨天提交了报告。",
    "提交了报告。",
    "明天准备。",
    "明天想联系。"
  ];
  for (const text of nonPlanTexts) {
    const result = extractPlans(text, { referenceDate });
    assert.equal(result.plans.length, 0, `should not create a plan: ${text}`);
  }
});

test("accepts concrete feasible actions", () => {
  for (const text of ["明天写报告。", "明天开会。", "我想学习英语。", "去医院拿药。"]) {
    const result = extractPlans(text, { referenceDate });
    assert.equal(result.plans.length, 1, `should create a plan: ${text}`);
  }
});

test("summarizes the user's spoken study list into short actionable plans", () => {
  const text = "啊今天就是要把英语卷子做完，英语生词做完，英语范文做完，然后，5:00前要把化学的，做题错，这个很重要化学的错题很重要，然后生物复习第五单元再把第五单元的作业给做完";
  const result = extractPlans(text, { referenceDate });

  assert.deepEqual(
    result.plans.map((plan) => plan.text),
    [
      "完成英语卷子",
      "完成英语生词",
      "完成英语范文",
      "完成化学错题",
      "复习生物第五单元",
      "完成生物第五单元作业"
    ]
  );
  assert.deepEqual(
    result.plans.map((plan) => plan.importance),
    ["medium", "medium", "medium", "high", "medium", "medium"]
  );
  assert.equal(new Date(result.plans[3].date).getHours(), 17);
  assert.ok(result.plans.every((plan) => !/[，,。；;]/.test(plan.text)));
});

test("keeps earlier subjects when later subjects are spoken", () => {
  const text = "今天要把英语卷子给做了英语箱子英语范文然后5:00前把化学错题给做了然后还有复习第五单元生物的知识然后再把，生物的作业做完然后看看最近生物有什么错题吧错题也给错了";
  const result = extractPlans(text, { referenceDate });

  assert.deepEqual(
    result.plans.map((plan) => plan.text),
    [
      "完成英语卷子",
      "完成英语生词",
      "完成英语范文",
      "完成化学错题",
      "复习生物第五单元知识",
      "完成生物作业",
      "完成生物错题"
    ]
  );
  assert.equal(result.plans.length, 7);
  assert.equal(new Date(result.plans[3].date).getHours(), 17);
  assert.ok(result.plans.every((plan) => !/[，,。；;]/.test(plan.text)));
});

test("keeps the complete study list and applies the spoken low priority", () => {
  const text = "今天要把英语卷子给做了还有英语单词，英语的范文化学的错题也要给做啊，还有生物复习第五单元再把第五单元的作业给做完今天尽量就是最不重要的是把数学课班作业给做，下，这个语段前面概括得非常好，但最后一个不好，提取错误且重要性也标记错了";
  const result = extractPlans(text, { referenceDate });

  assert.deepEqual(
    result.plans.map((plan) => plan.text),
    [
      "完成英语卷子",
      "完成英语单词",
      "完成英语范文",
      "完成化学错题",
      "复习生物第五单元",
      "完成生物第五单元作业",
      "完成数学课班作业"
    ]
  );
  assert.deepEqual(
    result.plans.map((plan) => plan.importance),
    ["medium", "medium", "medium", "medium", "medium", "medium", "low"]
  );
  assert.ok(result.plans.every((plan) => !/(?:这个语段|概括得|提取错误|标记错)/.test(plan.text)));
});
