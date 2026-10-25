export function appendFinalTranscript(
  existing,
  chunk,
  {
    gapMs = 0,
    pauseBefore = false,
    pauseThresholdMs = 1000
  } = {}
) {
  const current = String(existing || "").trim();
  const addition = String(chunk || "").trim();
  if (!addition) return current;
  if (current === addition || (current && current.endsWith(addition))) return current;

  let mergedAddition = addition;
  if (current) {
    const maxOverlap = Math.min(current.length, addition.length, 12);
    for (let overlap = maxOverlap; overlap >= 2; overlap -= 1) {
      if (
        current.endsWith(addition.slice(0, overlap)) &&
        !/[，,。！？!?；;：:\s]$/.test(current)
      ) {
        mergedAddition = addition.slice(overlap);
        break;
      }
    }
  }

  const shouldAddComma =
    Boolean(current) &&
    (pauseBefore || gapMs > pauseThresholdMs) &&
    !/[，,。！？!?；;：:\s]$/.test(current) &&
    !/^[，,。！？!?；;：:]/.test(mergedAddition);

  return `${current}${current && shouldAddComma && mergedAddition ? "，" : ""}${mergedAddition}`.trim();
}

export function chooseBestTranscript(result) {
  const alternatives = Array.from(result || [])
    .map((alternative, index) => ({
      index,
      transcript: String(alternative?.transcript || "").trim(),
      confidence: Number(alternative?.confidence)
    }))
    .filter((alternative) => alternative.transcript);
  if (!alternatives.length) return "";

  const taskCues =
    /(?:要|需要|得|必须|完成|提交|复习|预习|做|写|背|读|交|整理|准备|检查|联系|买|打扫|练习)/gu;
  const studyObjects =
    /(?:英语|数学|语文|化学|物理|生物|政治|历史|地理|作业|卷子|试卷|单词|生词|范文|错题|单元|知识)/gu;
  const knownSpeechFixes =
    /(?:英语单词|英语范文|化学作业|化学错题|数学作业|生物作业|复习|预习)/gu;

  return alternatives
    .map((alternative) => {
      const confidence = Number.isFinite(alternative.confidence)
        ? Math.max(0, Math.min(1, alternative.confidence))
        : 0;
      const taskScore = (alternative.transcript.match(taskCues) || []).length * 0.35;
      const objectScore = (alternative.transcript.match(studyObjects) || []).length * 0.2;
      const fixScore = (alternative.transcript.match(knownSpeechFixes) || []).length * 0.25;
      const lengthScore = Math.min(alternative.transcript.length / 40, 0.35);
      const firstChoiceBonus = alternative.index === 0 ? 0.08 : 0;
      return {
        transcript: alternative.transcript,
        score: confidence * 10 + taskScore + objectScore + fixScore + lengthScore + firstChoiceBonus
      };
    })
    .sort((left, right) => right.score - left.score)[0].transcript;
}

export function refineSpeechTranscript(text) {
  return String(text || "")
    .replace(/画学(?=(?:作业|错题|错提|错体|卷子|练习|复习|成绩|考试))/gu, "化学")
    .replace(/化雪(?=(?:作业|错题|错提|错体|卷子|练习|复习|成绩|考试))/gu, "化学")
    .replace(/树学(?=(?:作业|错题|错提|错体|卷子|练习|复习|成绩|考试))/gu, "数学")
    .replace(/声物(?=(?:作业|错题|错提|错体|卷子|练习|复习|成绩|考试))/gu, "生物")
    .replace(/英语(?:箱子|单子|单词字)/gu, "英语单词")
    .replace(/英语(?:泛文|犯文|饭文)/gu, "英语范文")
    .replace(/英语听说给作文/gu, "英语听说给做完")
    .replace(/反相册试/gu, "分项测试")
    .replace(/反测试/gu, "分项测试")
    .replace(
      /((?:做|完成|写)(?:一点|一下)?[，,]?\s*)((?:英语|数学|语文|物理|化学|生物|政治|历史|地理)课外班)(?=$|[，,。！？!?；;])/gu,
      "$1$2作业"
    )
    .replace(/(英语|化学|数学|语文|物理|生物)的?(错提|错体)/gu, "$1错题")
    .replace(/((?:作业|卷子|试卷|练习|错题)(?:要|需要|得|必须))[坐作]/gu, "$1做")
    .replace(/第([一二三四五六七八九十\d]+)(?:单员|单元元)/gu, "第$1单元")
    .replace(/([，,。！？!?；;：:])\s+/gu, "$1")
    .trim();
}
