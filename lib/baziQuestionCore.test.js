const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildBaziQuestionPrompt,
  buildBaziAuditSnapshot,
  extractBaziAnalysisParams,
  extractBaziQuestionContext,
  normalizeBaziSemanticRoute,
  normalizeBaziQuestionOutput,
  resolveConcreteTimeScope,
  resolveCandidateYears,
  resolveDayunForYear,
  deriveQuality
} = require('./baziQuestionCore');

const profile = {
  id: 'profile-1',
  name: '命主',
  gender: 'M',
  bazi_str: '甲子 丙寅 戊辰 庚申',
  geju: '食神格',
  strong_weak: '身弱',
  favorable_elements: ['火', '土'],
  unfavorable_elements: ['水', '木'],
  shensha: '{"day":["天乙贵人"]}',
  bazi_detail: {
    matrix: {
      pillars: [
        { name: '年', gan: '甲', zhi: '子', star: '七杀' },
        { name: '月', gan: '丙', zhi: '寅', star: '偏印' },
        { name: '日', gan: '戊', zhi: '辰', star: '元男' },
        { name: '时', gan: '庚', zhi: '申', star: '食神' }
      ],
      current_dayun: { gan: '丁', zhi: '卯', shi_shen: '正印' },
      current_liunian: { gan: '丙', zhi: '午', shi_shen: '偏印' },
      liuyue_list: [{ month_name: '正月', gan: '庚', zhi: '寅', shi_shen: '食神' }],
      dayun_list: [{ gan: '丁', zhi: '卯', start_age: 32 }]
    },
    strength_detail: { summary: '日主偏弱，喜火土扶身。' },
    five_shens: {
      favorable: ['正印', '偏印', '比肩'],
      unfavorable: ['正财', '偏财']
    },
    wuxing: {
      favorable: ['火', '土'],
      unfavorable: ['水', '木']
    },
    decision_chain: [
      { layer: 'L1 调候', reason: '初春余寒，先取丙火暖局' },
      { layer: 'L2 扶抑', reason: '日主偏弱，取印比扶身' }
    ],
    tiaohou_detail: {
      climate_state: '初春余寒',
      urgency: '偏急',
      primary_gods: [{ gan: '丙', shen: '偏印', wuxing: '火', priority: 1, role: '第一调候' }],
      explanation: '初春余寒未退，先要丙火向阳。',
      special_pattern_warning: ''
    },
    chengge_detail: { chengGe: '食神生财格', chengGeResult: '成格' },
    interactions: { stems: ['丙辛合'] },
    favorable_verdict: '此局喜印比扶身，财官不宜过重。',
    classic_verdict: { summary: '食神有气。' }
  }
};

test('extractBaziQuestionContext cites existing profile fields without recomputing pillars', () => {
  const context = extractBaziQuestionContext(profile);

  assert.equal(context.name, '命主');
  assert.equal(context.gender, '男');
  assert.equal(context.year_gz, '甲子');
  assert.equal(context.day_stem, '戊');
  assert.equal(context.strong_weak, '身弱');
  assert.equal(context.geju, '食神格');
  assert.equal(context.current_dayun, '丁卯');
  assert.equal(context.dayun_stem_shen, '正印');
  assert.equal(context.dayun_start_age, 32);
  assert.equal(context.current_year_gz, '丙午');
  assert.equal(context.current_month_gz, '庚寅');
  assert.match(context.tiaohou_detail, /初春余寒/);
  assert.match(context.tiaohou_detail, /丙/);
  assert.equal(context.favorable_shishen, '正印、偏印、比肩');
  assert.equal(context.unfavorable_shishen, '正财、偏财');
  assert.match(context.tiaohou_summary, /初春余寒|丙火/);
  assert.match(context.pattern_summary, /食神生财格/);
  assert.match(context.decision_chain_summary, /L1 调候/);
});

test('buildBaziQuestionPrompt includes strict non-recalculation guard and requested schema', () => {
  const { prompt } = buildBaziQuestionPrompt({
    profile,
    question: '我未来五年适合创业还是打工？',
    route: { category: 'career_business', subcategory: 'entrepreneurship_vs_job' }
  });

  assert.match(prompt, /你是一位精通子平八字推演的命理大师/);
  assert.match(prompt, /不得重新排盘/);
  assert.match(prompt, /八字：甲子 丙寅 戊辰 庚申/);
  assert.match(prompt, /用户问题/);
  assert.match(prompt, /调候诊断/);
  assert.match(prompt, /初春余寒/);
  assert.match(prompt, /"ming_ju_analysis"/);
  assert.match(prompt, /"dayun_liunian"/);
  assert.match(prompt, /"question_analysis"/);
  assert.match(prompt, /排盘口径 → 日主旺衰 → 寒暖燥湿调候 → 月令格局 → 十神组合 → 喜用忌神 → 刑冲合害 → 神煞辅助 → 大运流年应期 → 事件校验/);
});

test('normalizeBaziQuestionOutput maps bazi schema to existing result card analysis fields', () => {
  const output = normalizeBaziQuestionOutput({
    summary: { title: '事业分析', conclusion: '平稳', score: 70, keyword: '官印相生' },
    ming_ju_analysis: {
      ge_ju: '食神格',
      core_shishen: '官星',
      shensha_note: '天乙可用'
    },
    dayun_liunian: {
      current_climate: '平运',
      turning_point: '2027年',
      liuyue_trigger: '午月'
    },
    question_analysis: {
      timing: { best_period: '午月', avoid_period: '子月' }
    },
    advice: {
      strategy: ['先稳后动'],
      risk: '忌冒进',
      leverage: '借火土',
      lucky_tips: { direction: '南方', industry: '教育', timing: '午月' }
    }
  }, {
    question: '事业如何',
    route: { branch: 'bazi', category: 'career_business', subcategory: 'career_direction' }
  });

  assert.equal(output.branch, 'bazi');
  assert.equal(output.category, 'career_business');
  assert.equal(output.analysis.pattern, '食神格');
  assert.equal(output.analysis.yong_shen, '官星');
  assert.equal(output.analysis.dynamic_timing, '2027年');
  assert.equal(output.advice.lucky_tips.time, '午月');
  assert.equal(output.advice.lucky_tips.action, '借火土');
});

test('normalizeBaziSemanticRoute corrects timing unknown scope and partner profile mode conflicts', () => {
  const route = normalizeBaziSemanticRoute({
    branch: 'bazi',
    category: 'relationship',
    subcategory: 'partner_profile',
    analysis_mode: 'timing',
    needs_time_scan: false,
    time_scope: { type: 'unknown' },
    confidence: 'high'
  });

  assert.equal(route.analysis_mode, 'character');
  assert.equal(route.needs_time_scan, false);
  assert.equal(route.confidence, 'medium');
  assert.match(route.reason, /partner_profile/);
});

test('resolveConcreteTimeScope expands semantic ranges from current liunian year inclusively', () => {
  assert.deepEqual(resolveConcreteTimeScope({ type: 'next_3_years' }, 2026), {
    type: 'next_3_years',
    start_year: 2026,
    end_year: 2028
  });

  const fallback = resolveConcreteTimeScope({ type: 'unknown' }, 0, { analysisMode: 'status', nowYear: 2030 });
  assert.equal(fallback.type, 'current_year');
  assert.equal(fallback.start_year, 2030);
  assert.equal(fallback.end_year, 2030);
  assert.equal(fallback.source, 'system_year_fallback');
  assert.ok(fallback.limitations.length > 0);
});

test('extractBaziAnalysisParams maps profile matrix into pipeline params including birth year', () => {
  const result = extractBaziAnalysisParams({
    ...profile,
    birth_date: '1990-03-01',
    bazi_detail: {
      ...profile.bazi_detail,
      matrix: {
        ...profile.bazi_detail.matrix,
        current_liunian: { gan: '丙', zhi: '午', year: 2026, shi_shen: '偏印' },
        liunian_list: [{ year: 2026, gan: '丙', zhi: '午', shi_shen: '偏印' }]
      }
    }
  }, { analysis_mode: 'status' });

  assert.equal(result.ok, true);
  assert.equal(result.params.dayStem, '戊');
  assert.equal(result.params.gender, 'male');
  assert.equal(result.params.birthYear, 1990);
  assert.equal(result.params.currentLiunian.year, 2026);
  assert.deepEqual([...result.params.favorableWuxing], ['火', '土']);
});

test('resolveCandidateYears filters scoped liunian list and annotates dayun hints', () => {
  const result = resolveCandidateYears({
    timeScope: { type: 'next_3_years', start_year: 2026, end_year: 2028 },
    currentYear: 2026,
    birthYear: 1990,
    liunianList: [
      { year: 2025, gan: '乙', zhi: '巳' },
      { year: 2026, gan: '丙', zhi: '午' },
      { year: 2027, gan: '丁', zhi: '未' },
      { year: 2028, gan: '戊', zhi: '申' },
      { year: 2029, gan: '己', zhi: '酉' }
    ],
    dayunList: [
      { gan: '丁', zhi: '卯', start_year: 2020, end_year: 2029, start_age: 30 }
    ]
  });

  assert.deepEqual(result.years.map((item) => item.year), [2026, 2027, 2028]);
  assert.deepEqual(result.years[0].dayun_hint, { gan: '丁', zhi: '卯' });
  assert.deepEqual(result.limitations, []);
});

test('resolveDayunForYear estimates year range from birth year and start age', () => {
  const dayun = resolveDayunForYear({
    dayunList: [{ gan: '辛', zhi: '酉', start_age: 35 }],
    year: 2026,
    birthYear: 1990
  });

  assert.equal(dayun.gan, '辛');
  assert.equal(dayun.zhi, '酉');
  assert.equal(dayun.start_year, 2025);
  assert.equal(dayun.end_year, 2034);
  assert.equal(dayun.source, 'estimated');
  assert.ok(dayun.limitations.length > 0);
});

test('deriveQuality follows PRD timing strength buckets', () => {
  assert.equal(deriveQuality({
    isMajorWindow: true,
    isActivated: true,
    topStrength: 65,
    isEffective: true,
    newStability: 'stable'
  }), 'strong');
  assert.equal(deriveQuality({
    isMajorWindow: false,
    isActivated: true,
    topStrength: 45,
    isEffective: true,
    newStability: 'dynamic'
  }), 'medium');
  assert.equal(deriveQuality({
    isMajorWindow: false,
    isActivated: false,
    topStrength: 20,
    isEffective: false,
    newStability: 'dynamic'
  }), 'weak');
});

test('buildBaziQuestionPrompt assembles status mode with natural language reports and no raw dynamic JSON block', () => {
  const { prompt } = buildBaziQuestionPrompt({
    profile: {
      ...profile,
      bazi_detail: {
        ...profile.bazi_detail,
        matrix: {
          ...profile.bazi_detail.matrix,
          current_dayun: { gan: '辛', zhi: '酉', shi_shen: '伤官' },
          current_liunian: { gan: '丙', zhi: '午', year: 2026, shi_shen: '偏印' }
        }
      }
    },
    question: '我今年能不能结婚？',
    route: {
      branch: 'bazi',
      category: 'relationship',
      subcategory: 'relationship_timing',
      analysis_mode: 'status',
      time_scope: { type: 'current_year' }
    }
  });

  assert.match(prompt, /analysis_mode: status/);
  assert.match(prompt, /【上游命局分析摘要】/);
  assert.match(prompt, /调候判断：初春余寒未退，先要丙火向阳。/);
  assert.match(prompt, /喜用十神：正印、偏印、比肩；忌仇十神：正财、偏财/);
  assert.match(prompt, /取用链路：L1 调候：初春余寒，先取丙火暖局/);
  assert.match(prompt, /【目标元素定位 Step 1】/);
  assert.match(prompt, /【原局状态评估】/);
  assert.match(prompt, /【当前大运流年动态评估 Step 3】/);
  assert.match(prompt, /引动强度|旺衰系数/);
  assert.doesNotMatch(prompt, /"dayun_impact"\s*:/);
  assert.doesNotMatch(prompt, /"dynamicReport"\s*:/);
});

test('buildBaziQuestionPrompt assembles timing mode with scanned year candidates and no raw dynamic JSON block', () => {
  const { prompt } = buildBaziQuestionPrompt({
    profile: {
      ...profile,
      birth_year: 1990,
      bazi_detail: {
        ...profile.bazi_detail,
        matrix: {
          ...profile.bazi_detail.matrix,
          current_dayun: { gan: '丁', zhi: '卯', shi_shen: '正印', start_year: 2020, end_year: 2029 },
          current_liunian: { gan: '丙', zhi: '午', year: 2026, shi_shen: '偏印' },
          dayun_list: [{ gan: '丁', zhi: '卯', start_year: 2020, end_year: 2029, start_age: 30 }],
          liunian_list: [
            { year: 2026, gan: '丙', zhi: '午', shi_shen: '偏印' },
            { year: 2027, gan: '丁', zhi: '未', shi_shen: '正印' },
            { year: 2028, gan: '戊', zhi: '申', shi_shen: '比肩' }
          ]
        }
      }
    },
    question: '我未来几年什么时候容易结婚？',
    route: {
      branch: 'bazi',
      category: 'relationship',
      subcategory: 'relationship_timing',
      analysis_mode: 'timing',
      time_scope: { type: 'next_3_years' }
    }
  });

  assert.match(prompt, /analysis_mode: timing/);
  assert.match(prompt, /scanned_years: 2026、2027、2028/);
  assert.match(prompt, /候选年份动态断语包 Step 3/);
  assert.match(prompt, /候选强度/);
  assert.doesNotMatch(prompt, /"dynamicReport"\s*:/);
  assert.doesNotMatch(prompt, /"dayun_impact"\s*:/);
});

test('buildBaziQuestionPrompt assembles pattern mode from Step 1 and Step 2 without timing scan', () => {
  const { prompt } = buildBaziQuestionPrompt({
    profile,
    question: '我适合创业还是打工？',
    route: {
      branch: 'bazi',
      category: 'career_business',
      subcategory: 'entrepreneurship_vs_job',
      analysis_mode: 'pattern'
    }
  });

  assert.match(prompt, /analysis_mode: pattern/);
  assert.match(prompt, /先天结构、容量、适配度/);
  assert.match(prompt, /【目标元素定位 Step 1】/);
  assert.match(prompt, /【原局状态评估】/);
  assert.doesNotMatch(prompt, /候选年份动态断语包/);
  assert.doesNotMatch(prompt, /【当前大运流年动态评估 Step 3/);
});

test('buildBaziQuestionPrompt assembles pattern plus secondary status dynamic block', () => {
  const { prompt } = buildBaziQuestionPrompt({
    profile: {
      ...profile,
      bazi_detail: {
        ...profile.bazi_detail,
        matrix: {
          ...profile.bazi_detail.matrix,
          current_dayun: { gan: '辛', zhi: '酉', shi_shen: '伤官' },
          current_liunian: { gan: '丙', zhi: '午', year: 2026, shi_shen: '偏印' }
        }
      }
    },
    question: '我适合创业吗，现在能不能做？',
    route: {
      branch: 'bazi',
      category: 'career_business',
      subcategory: 'entrepreneurship_vs_job',
      analysis_mode: 'pattern',
      secondary_mode: 'status',
      time_scope: { type: 'current_year' }
    }
  });

  assert.match(prompt, /analysis_mode: pattern/);
  assert.match(prompt, /secondary_mode: status/);
  assert.match(prompt, /当前大运流年动态评估 Step 3（secondary=status）/);
  assert.match(prompt, /dynamic_context/);
  assert.doesNotMatch(prompt, /"dynamicReport"\s*:/);
});

test('buildBaziQuestionPrompt assembles character mode as tendency portrait', () => {
  const { prompt } = buildBaziQuestionPrompt({
    profile,
    question: '我未来对象是什么样的人？',
    route: {
      branch: 'bazi',
      category: 'relationship',
      subcategory: 'partner_profile',
      analysis_mode: 'character'
    }
  });

  assert.match(prompt, /analysis_mode: character/);
  assert.match(prompt, /倾向画像/);
  assert.match(prompt, /character_portrait/);
  assert.match(prompt, /每个画像点必须给 evidence/);
  assert.doesNotMatch(prompt, /【当前大运流年动态评估 Step 3/);
});

test('buildBaziQuestionPrompt assembles character plus secondary status for current partner state', () => {
  const { prompt } = buildBaziQuestionPrompt({
    profile: {
      ...profile,
      bazi_detail: {
        ...profile.bazi_detail,
        matrix: {
          ...profile.bazi_detail.matrix,
          current_dayun: { gan: '辛', zhi: '酉', shi_shen: '伤官' },
          current_liunian: { gan: '丙', zhi: '午', year: 2026, shi_shen: '偏印' }
        }
      }
    },
    question: '我今年老婆的状态怎么样？',
    route: {
      branch: 'bazi',
      category: 'relationship',
      subcategory: 'partner_profile',
      analysis_mode: 'character',
      secondary_mode: 'status',
      time_scope: { type: 'current_year' }
    }
  });

  assert.match(prompt, /analysis_mode: character/);
  assert.match(prompt, /secondary_mode: status/);
  assert.match(prompt, /当前大运流年动态评估 Step 3（secondary=status）/);
  assert.match(prompt, /不要扩展成未来应期/);
});

test('buildBaziQuestionPrompt uses llm derived target prompt without backend Step 2 or Step 3', () => {
  const { prompt } = buildBaziQuestionPrompt({
    profile,
    question: '这个人是不是同性恋？',
    route: {
      branch: 'bazi',
      category: 'relationship',
      subcategory: '',
      analysis_mode: 'character',
      target_resolution: 'llm_derived',
      confidence: 'low',
      llm_derived_target: {
        label: '亲密关系表达方式与关系边界',
        observation_scope: ['亲密关系表达方式', '吸引模式', '关系边界'],
        limitations: ['八字无法可靠判定性取向身份', '不得输出确定身份标签']
      }
    }
  });

  assert.match(prompt, /target_resolution: llm_derived/);
  assert.match(prompt, /LLM 自拟目标元素框架/);
  assert.match(prompt, /不调用 Step 2\/3 的后端目标元素分析/);
  assert.match(prompt, /meta.target.fallback_level 必须为 llm_derived/);
  assert.doesNotMatch(prompt, /【原局状态评估】/);
  assert.doesNotMatch(prompt, /【当前大运流年动态评估 Step 3/);
});

test('buildBaziQuestionPrompt infers bazi status mode from branch route when mode is absent', () => {
  const { prompt } = buildBaziQuestionPrompt({
    profile: {
      ...profile,
      bazi_detail: {
        ...profile.bazi_detail,
        matrix: {
          ...profile.bazi_detail.matrix,
          current_dayun: { gan: '辛', zhi: '酉', shi_shen: '伤官' },
          current_liunian: { gan: '丙', zhi: '午', year: 2026, shi_shen: '偏印' }
        }
      }
    },
    question: '我今年能不能结婚？',
    route: {
      branch: 'bazi',
      category: 'relationship',
      subcategory: 'relationship_timing'
    }
  });

  assert.match(prompt, /analysis_mode: status/);
  assert.match(prompt, /【当前大运流年动态评估 Step 3】/);
});

test('buildBaziQuestionPrompt keeps non-branch legacy route backward compatible', () => {
  const { prompt } = buildBaziQuestionPrompt({
    profile,
    question: '我未来五年适合创业还是打工？',
    route: { category: 'career_business', subcategory: 'entrepreneurship_vs_job' }
  });

  assert.doesNotMatch(prompt, /analysis_mode: status/);
  assert.match(prompt, /"ming_ju_analysis"/);
});

test('buildBaziAuditSnapshot captures intermediate engineering outputs without full profile', () => {
  const snapshot = buildBaziAuditSnapshot({
    requestId: 'req-1',
    userId: 'user-1',
    question: '我今年能不能结婚？',
    profile,
    routeHint: { branch_hint: 'bazi' },
    semanticRouteRaw: { analysis_mode: 'status' },
    semanticRouteNormalized: { analysis_mode: 'status' },
    pipelineResult: {
      targetSpec: { primary_shishen: ['正官'], primary_gongwei: ['日支'] },
      stateReport: { overall_stability: 'dynamic' },
      dynamicReport: { target_trigger: { is_activated: true } }
    },
    promptBlocks: ['【原局状态评估】...'],
    llmOutputRaw: { summary: { title: '婚恋状态' } },
    llmOutputNormalized: { summary: { title: '婚恋状态' } }
  });

  assert.equal(snapshot.request_id, 'req-1');
  assert.equal(snapshot.user_id, 'user-1');
  assert.equal(snapshot.analysis_params_snapshot.bazi_str, profile.bazi_str);
  assert.equal(snapshot.analysis_params_snapshot.name, undefined);
  assert.deepEqual(snapshot.prompt_blocks, ['【原局状态评估】...']);
});
