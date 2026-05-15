function buildScoreAuditPromptSection(scoreAudit = {}) {
  const scoreAuditJson = JSON.stringify(scoreAudit || {}, null, 2);
  return `
**【后端评分审计要求】**
后端程序评分已经完成，score_audit 是系统按教材步骤生成的权威评分路径。你不得自行重算、覆盖、倒推或修改分数。

硬性要求：
1. summary.score 必须等于后端 score_audit.final_score。
2. 返回的 score_audit 必须原样沿用下方后端 JSON，不得改 base_score、adjustments、final_score、confidence、version。
3. 你可以在 model_review 中做“复核与纠偏建议”，指出后端评分可能遗漏的教材信号，但这些建议不能改变本次 final_score。
4. 若后端命中“格局极性翻转表”，解释时必须按覆盖后的问题域语义说明；若未命中，不得把凶门凶格强行洗白。
5. 动态应期只能说明何时可能启动，不得单独把空亡、杜门、死门等阻力改写成高确定性成功。

后端 score_audit：
${scoreAuditJson}

model_review 输出要求：
- model_review.verdict：只能是 "aligned"、"needs_attention"、"insufficient_context"。
- model_review.correction_suggestions：数组，给出可用于后续校准的建议；每条必须说明“可能遗漏的盘面信号”和“建议调整的规则”，但不得给出新的 final_score。
- model_review.boundary：说明本次分数为什么仍以 后端 score_audit.final_score 为准。`;
}

function buildSummaryPromptSection() {
  return `
**【Summary 输出要求】**
summary 是给用户第一眼看的结论层，必须短、准、克制，并且和 score_audit 保持一致。

字段要求：
1. summary.title：8-14字，直接点明问题类型，如“还款应期判断”“跳槽机会判断”。
2. summary.conclusion：一句话给核心结论，不得恐吓，不得把观察窗口说成必然结果。
3. summary.score 必须沿用 score_audit.final_score，不能另行估分。
4. summary.keyword：4-12字，从最关键盘面信号抽象，不写泛泛鸡汤。
5. summary.score_basis：必须和 score_audit.adjustments 呼应，positive_signals/negative_signals 至少各 1 条。

欠款还款类 few-shot：
{
  "summary": {
    "title": "还款应期判断",
    "conclusion": "有催动还款的窗口，但不宜断为必然到账",
    "score": 58,
    "score_basis": {
      "positive_signals": ["钱款用神后续有冲空/填实窗口，说明可被催动"],
      "negative_signals": ["钱款用神当前落空，现实中多对应承诺未实、到账未定"],
      "score_logic": "用神有被引动的时间窗口，但当前仍处虚位，因此分数保持中等偏谨慎。"
    },
    "keyword": "钱款落空，冲填为应"
  }
}`;
}

module.exports = {
  buildScoreAuditPromptSection,
  buildSummaryPromptSection
};
