function buildScoreAuditPromptSection(scoreAudit = {}) {
  const scoreAuditJson = JSON.stringify(scoreAudit || {}, null, 2);
  return `
**【后端初算 + LLM审计要求】**
后端已经按教材步骤完成 preliminary_score_audit 初算。它是稳定的程序初分，不是最终断语分数。
你必须基于当前问题域、subcategory 取用神规则、盘面和教材逻辑，对后端初算进行审计，并允许在 -20 到 +20 范围内给出 audit_delta。

硬性要求：
1. score_audit.backend_pre_score 必须等于下方 preliminary_score_audit.final_score。
2. score_audit.audit_delta 必须是 -20 到 +20 的整数；如果无需修正，返回 0。
3. score_audit.final_score_suggestion = backend_pre_score + audit_delta，并限制在 0-100。
4. summary.score 必须等于 score_audit.final_score_suggestion。
5. audit_delta 必须有明确教材依据：后端漏看、误判、过度加权、权重不足、分类/取用神低置信度导致的偏差。
6. 如果 route.confidence 为 low，必须优先审计分类和取用神是否正确；若分类可能错，confidence 不得为 high。
7. 动态应期只能说明何时可能启动，不得单独把空亡、杜门、死门等阻力改写成高确定性成功。
8. 马星只代表动象/速度，不得单独大幅加分；空亡要解释为虚、不实、待填实，不得机械判死。
9. 用户态表达必须用人话，不要原样展示“乾6宫单宫能量、日干/时干主客生克、qimen-score-v1”等后端技术标签。

preliminary_score_audit：
${scoreAuditJson}

score_audit 输出要求：
- backend_pre_score：后端初分。
- audit_delta：你审计后的修正，范围 -20 到 +20。
- final_score_suggestion：最终建议分。
- missed_or_overweighted_factors：列出后端漏判/误判/过重/过轻的因素。
- audit_reason：用自然语言说明修正原因，不能只写技术术语。`;
}

function buildSummaryPromptSection() {
  return `
**【Summary 输出要求】**
summary 是给用户第一眼看的结论层，必须短、准、克制，并且和 LLM 审计后的 score_audit 保持一致。

字段要求：
1. summary.title：8-14字，直接点明问题类型，如“还款应期判断”“跳槽机会判断”。
2. summary.conclusion：一句话给核心结论，不得恐吓，不得把观察窗口说成必然结果。
3. summary.score 必须等于 score_audit.final_score_suggestion。
4. summary.keyword：4-12字，从最关键盘面信号抽象，不写泛泛鸡汤。
5. summary.score_basis 必须面向普通用户，不得堆砌宫位技术标签；positive_signals/negative_signals 至少各 1 条。

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
