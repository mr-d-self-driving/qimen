'use strict';

const MONTHLY_CONTEXT_DIMENSIONS = ['career', 'wealth', 'love', 'health'];

function normalizeText(value, maxLength) {
  const text = String(value || '').trim();
  return text.slice(0, maxLength);
}

function createEmptyProfileContext() {
  return {
    career_profile: {
      current_status: '',
      industry: '',
      level: '',
      years: '',
      goal: '',
      pressure: '',
      note: '',
    },
    wealth_profile: {
      income_structure: '',
      stage: '',
      style: '',
      focus: '',
      risk: '',
      note: '',
    },
    love_profile: {
      current_status: '',
      orientation: '',
      experience_stage: '',
      goal: '',
      pattern: '',
      note: '',
    },
    health_profile: {
      rhythm: '',
      body_state: '',
      focus: '',
      drain_source: '',
      note: '',
    },
    updated_at: '',
  };
}

function createEmptyMonthlyContext(monthKey = '') {
  return {
    month_key: monthKey,
    carry_from_previous: false,
    overall_note: '',
    career_monthly: { status: '', summary: '', goal: '', worry: '' },
    wealth_monthly: { status: '', summary: '', goal: '', worry: '' },
    love_monthly: { status: '', summary: '', goal: '', worry: '' },
    health_monthly: { status: '', summary: '', goal: '', worry: '' },
    updated_at: '',
  };
}

function normalizeProfileContextPayload(input = {}) {
  const base = createEmptyProfileContext();
  return {
    career_profile: {
      current_status: normalizeText(input?.career_profile?.current_status, 32),
      industry: normalizeText(input?.career_profile?.industry, 30),
      level: normalizeText(input?.career_profile?.level, 24),
      years: normalizeText(input?.career_profile?.years, 16),
      goal: normalizeText(input?.career_profile?.goal, 32),
      pressure: normalizeText(input?.career_profile?.pressure, 32),
      note: normalizeText(input?.career_profile?.note, 80),
    },
    wealth_profile: {
      income_structure: normalizeText(input?.wealth_profile?.income_structure, 32),
      stage: normalizeText(input?.wealth_profile?.stage, 24),
      style: normalizeText(input?.wealth_profile?.style, 16),
      focus: normalizeText(input?.wealth_profile?.focus, 32),
      risk: normalizeText(input?.wealth_profile?.risk, 32),
      note: normalizeText(input?.wealth_profile?.note, 80),
    },
    love_profile: {
      current_status: normalizeText(input?.love_profile?.current_status, 24),
      orientation: normalizeText(input?.love_profile?.orientation, 16),
      experience_stage: normalizeText(input?.love_profile?.experience_stage, 24),
      goal: normalizeText(input?.love_profile?.goal, 32),
      pattern: normalizeText(input?.love_profile?.pattern, 32),
      note: normalizeText(input?.love_profile?.note, 80),
    },
    health_profile: {
      rhythm: normalizeText(input?.health_profile?.rhythm, 24),
      body_state: normalizeText(input?.health_profile?.body_state, 24),
      focus: normalizeText(input?.health_profile?.focus, 24),
      drain_source: normalizeText(input?.health_profile?.drain_source, 24),
      note: normalizeText(input?.health_profile?.note, 80),
    },
    updated_at: normalizeText(input?.updated_at, 40) || base.updated_at,
  };
}

function normalizeMonthlyDimensionPayload(input = {}) {
  return {
    status: normalizeText(input?.status, 32),
    summary: normalizeText(input?.summary, 80),
    goal: normalizeText(input?.goal, 50),
    worry: normalizeText(input?.worry, 50),
  };
}

function normalizeMonthlyContextPayload(input = {}, monthKey = '') {
  return {
    month_key: normalizeText(input?.month_key, 16) || monthKey,
    carry_from_previous: Boolean(input?.carry_from_previous),
    overall_note: normalizeText(input?.overall_note, 100),
    career_monthly: normalizeMonthlyDimensionPayload(input?.career_monthly),
    wealth_monthly: normalizeMonthlyDimensionPayload(input?.wealth_monthly),
    love_monthly: normalizeMonthlyDimensionPayload(input?.love_monthly),
    health_monthly: normalizeMonthlyDimensionPayload(input?.health_monthly),
    updated_at: normalizeText(input?.updated_at, 40),
  };
}

function getDimensionKeysForPrompt(dimension) {
  if (dimension === 'career') return { primary: 'career', secondary: ['wealth', 'love', 'health'] };
  if (dimension === 'wealth') return { primary: 'wealth', secondary: ['career', 'love', 'health'] };
  if (dimension === 'love') return { primary: 'love', secondary: ['career', 'wealth', 'health'] };
  if (dimension === 'health') return { primary: 'health', secondary: ['career', 'wealth', 'love'] };
  return { primary: 'overall', secondary: ['career', 'wealth', 'love', 'health'] };
}

function buildJoinedLine(items = []) {
  return items.filter(Boolean).join('；');
}

function formatProfileLine(dimension, profileContext = {}) {
  if (dimension === 'career') {
    const source = profileContext.career_profile || {};
    return buildJoinedLine([
      source.current_status && `当前状态：${source.current_status}`,
      source.industry && `行业方向：${source.industry}`,
      source.level && `职位层级：${source.level}`,
      source.years && `工作年限：${source.years}`,
      source.goal && `长期诉求：${source.goal}`,
      source.pressure && `主要压力：${source.pressure}`,
      source.note && `补充：${source.note}`,
    ]);
  }
  if (dimension === 'wealth') {
    const source = profileContext.wealth_profile || {};
    return buildJoinedLine([
      source.income_structure && `收入结构：${source.income_structure}`,
      source.stage && `财务阶段：${source.stage}`,
      source.style && `理财风格：${source.style}`,
      source.focus && `长期关注：${source.focus}`,
      source.risk && `风险点：${source.risk}`,
      source.note && `补充：${source.note}`,
    ]);
  }
  if (dimension === 'love') {
    const source = profileContext.love_profile || {};
    return buildJoinedLine([
      source.current_status && `当前关系状态：${source.current_status}`,
      source.experience_stage && `经历阶段：${source.experience_stage}`,
      source.goal && `长期诉求：${source.goal}`,
      source.pattern && `关系模式：${source.pattern}`,
      source.note && `补充：${source.note}`,
    ]);
  }
  if (dimension === 'health') {
    const source = profileContext.health_profile || {};
    return buildJoinedLine([
      source.rhythm && `生活节奏：${source.rhythm}`,
      source.body_state && `身体状态：${source.body_state}`,
      source.focus && `当前重点：${source.focus}`,
      source.drain_source && `消耗源：${source.drain_source}`,
      source.note && `补充：${source.note}`,
    ]);
  }
  return '';
}

function formatMonthlyLine(dimension, monthlyContext = {}, full = false) {
  const source = monthlyContext?.[`${dimension}_monthly`] || {};
  if (!full) return source.status ? `状态：${source.status}` : '';
  return buildJoinedLine([
    source.status && `状态：${source.status}`,
    source.summary && `现状：${source.summary}`,
    source.goal && `本月目标：${source.goal}`,
    source.worry && `本月担心：${source.worry}`,
  ]);
}

function buildContextPromptBlock(dimension, profileContext, currentMonthlyContext, recentMonthlyContexts = []) {
  const normalizedProfile = normalizeProfileContextPayload(profileContext || {});
  const normalizedCurrent = normalizeMonthlyContextPayload(currentMonthlyContext || {}, currentMonthlyContext?.month_key || '');
  const normalizedRecent = Array.isArray(recentMonthlyContexts)
    ? recentMonthlyContexts.map(item => normalizeMonthlyContextPayload(item || {}, item?.month_key || ''))
    : [];

  const { primary, secondary } = getDimensionKeysForPrompt(dimension);
  const lines = [];

  if (primary === 'overall') {
    const profileLines = MONTHLY_CONTEXT_DIMENSIONS
      .map(key => formatProfileLine(key, normalizedProfile))
      .filter(Boolean);
    if (profileLines.length) {
      lines.push('长期基调：');
      profileLines.forEach((line, index) => lines.push(`- ${['事业', '财务', '感情', '健康/生活'][index]}：${line}`));
    }
    const currentLines = MONTHLY_CONTEXT_DIMENSIONS
      .map(key => formatMonthlyLine(key, normalizedCurrent, true))
      .filter(Boolean);
    if (normalizedCurrent.overall_note || currentLines.length) {
      lines.push('当前月现状：');
      if (normalizedCurrent.overall_note) lines.push(`- 本月总说明：${normalizedCurrent.overall_note}`);
      currentLines.forEach((line, index) => lines.push(`- ${['事业', '财务', '感情', '健康/生活'][index]}：${line}`));
    }
  } else {
    const primaryLabelMap = { career: '事业', wealth: '财务', love: '感情', health: '健康/生活' };
    const profileLine = formatProfileLine(primary, normalizedProfile);
    if (profileLine) {
      lines.push(`长期基调（${primaryLabelMap[primary]}）：`);
      lines.push(`- ${profileLine}`);
    }
    const currentPrimaryLine = formatMonthlyLine(primary, normalizedCurrent, true);
    const secondaryLines = secondary
      .map(key => ({ key, line: formatMonthlyLine(key, normalizedCurrent, false) }))
      .filter(item => item.line);
    if (normalizedCurrent.overall_note || currentPrimaryLine || secondaryLines.length) {
      lines.push('当前月现状：');
      if (normalizedCurrent.overall_note) lines.push(`- 本月总说明：${normalizedCurrent.overall_note}`);
      if (currentPrimaryLine) lines.push(`- ${primaryLabelMap[primary]}：${currentPrimaryLine}`);
      secondaryLines.forEach(({ key, line }) => lines.push(`- ${primaryLabelMap[key]}：${line}`));
    }
  }

  const recentLines = normalizedRecent
    .filter(item => item.month_key && item.month_key !== normalizedCurrent.month_key)
    .slice(0, 3)
    .map((item) => {
      const parts = [];
      if (item.overall_note) parts.push(`总说明：${item.overall_note}`);
      if (primary === 'overall') {
        MONTHLY_CONTEXT_DIMENSIONS.forEach((key) => {
          const line = formatMonthlyLine(key, item, false);
          if (line) parts.push(`${{ career: '事业', wealth: '财务', love: '感情', health: '健康/生活' }[key]}${line.replace(/^状态：/, '状态：')}`);
        });
      } else {
        const primaryLine = formatMonthlyLine(primary, item, false);
        if (primaryLine) parts.push(`${{ career: '事业', wealth: '财务', love: '感情', health: '健康/生活' }[primary]}${primaryLine.replace(/^状态：/, '状态：')}`);
      }
      return parts.length ? `- ${item.month_key}：${parts.join('；')}` : '';
    })
    .filter(Boolean);

  if (recentLines.length) {
    lines.push('近3个月背景：');
    lines.push(...recentLines);
  }

  if (!lines.length) {
    return `
## 断事笔记
- 当前无可用断事笔记，请按无断事笔记模式生成，不强行猜测命主现实处境。`;
  }

  return `
## 断事笔记
以下内容仅作为现实背景，用于决定本次解读聚焦在哪类现实问题上，不用于改变命理强弱判断本身。
${lines.map(line => line.startsWith('-') ? line : line).join('\n')}`;
}

function buildContextVersionSeed(profileContext, recentMonthlyContexts = []) {
  const parts = [];
  const profileUpdatedAt = String(profileContext?.updated_at || '').trim();
  if (profileUpdatedAt) parts.push(`p:${profileUpdatedAt}`);
  for (const item of recentMonthlyContexts) {
    const monthKey = String(item?.month_key || '').trim();
    const updatedAt = String(item?.updated_at || '').trim();
    if (monthKey && updatedAt) parts.push(`m:${monthKey}:${updatedAt}`);
  }
  return parts.length ? parts.join('|') : 'ctx:none';
}

module.exports = {
  MONTHLY_CONTEXT_DIMENSIONS,
  createEmptyProfileContext,
  createEmptyMonthlyContext,
  normalizeProfileContextPayload,
  normalizeMonthlyContextPayload,
  buildContextPromptBlock,
  buildContextVersionSeed,
};
