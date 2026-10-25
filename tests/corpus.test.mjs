import test from "node:test";
import assert from "node:assert/strict";
import { extractPlans } from "../extractor.js";

const referenceDate = new Date(2026, 9, 25, 12, 0, 0);

const corpusCases = [
  ["C01", "我所在的位置就是这次那曲地震的震中玛如乡，这里也是受损情况最严重的一个区域。", []],
  ["C02", "我们突破了传统的形式，把它应用到了我们现代的生活。", []],
  ["C03", "两个队还是比较熟悉的，因此将主要进攻发起区域设在中场。", []],
  ["C04", "不少人以为台风只属于盛夏，其实并非如此。", []],
  ["C05", "我母亲大约10年前第一次尝试针灸，现在有需要时就会来治疗。", []],
  ["C06", "目前，我们还研发汽车皮革新产品，积极拓展特种、高端纺织新材料领域。", []],
  ["C07", "昆虫类的蛋白质确实可以算作是不错的蛋白质，但要说蟑螂粉是优质蛋白质，还有待商榷。", []],
  ["C08", "今天风大，出门小心点。", []],
  ["C09", "我真的非常愤怒，因为这类事件一直没有消失。", []],
  ["C10", "果葡糖浆和白砂糖每天最多摄入不能超过50克，建议25克以下。", []],
  ["C11", "可以推荐开户，也可以自己找开户优惠，再来找我买保险产品。", []],
  ["C12", "我老公在家手机就没离过手，吃饭前后刷短视频、看短剧，屏幕里推什么就看什么。", []],
  ["C13", "下一步，我们将指导各地结合低效用地再开发试点，分类细化盘活存量土地的路径。", ["指导各地盘活存量土地"]],
  ["C14", "我60多岁了，想出去看看祖国的大好河山，种完麦子，我就往南走。", ["完成麦收后去南方旅行"]],
  ["C15", "我们做街区活化，核心原则就是不能做只有游客来的假古街。", []],
  ["C16", "近期有居民反映小区内偶有公鸡打鸣声扰民，目前暂未排查到饲养住户。", []],
  ["C17", "养老院的医疗服务有内科、康复医疗科，还有中医科。", []],
  ["C18", "涉养老机构服务合同纠纷中，最常见也最难认定的问题，是老人摔倒后机构有没有尽到照护义务。", []],
  ["C19", "早年广交会境外采购商以香港地区客商为主，其后日本、欧美采购商陆续到场。", []],
  ["C20", "当年我去的时候，那里全是沙子，只有沙子。而现在，到处都是绿色。", []]
];

test("uses 20 Mandarin speech excerpts to separate narration from action", () => {
  for (const [id, input, expected] of corpusCases) {
    const result = extractPlans(input, { referenceDate });
    assert.deepEqual(
      result.plans.map((plan) => plan.text),
      expected,
      `${id} extraction mismatch`
    );
  }
});

test("removes repeated oral fillers and reported-speech frames", () => {
  const cases = [
    ["然后然后，我明天就是要把这个报告写完。", "完成报告"],
    ["其实吧，我明天就是需要联系这个客户。", "联系客户"],
    ["我我明天要提交报告。", "提交报告"],
    ["这个这个，明天再说，说我要先联系客户。", "联系客户"],
    ["目前先联系客户。", "联系客户"],
    ["现在准备提交报告。", "提交报告"],
    ["当前计划整理资料。", "整理资料"]
  ];
  for (const [input, expected] of cases) {
    const result = extractPlans(input, { referenceDate });
    assert.deepEqual(result.plans.map((plan) => plan.text), [expected], input);
  }
});
