const DIVINATION_BRANCHES = ['qimen', 'bazi', 'hybrid', 'clarify'];
const CONFIDENCE_LEVELS = ['low', 'medium', 'high'];
const ROUTE_SOURCES = ['rules', 'llm'];

const DIVINATION_CATEGORIES = {
  career_business: {
    label: '事业职场',
    description: '事业职场、求职跳槽、项目推进、创业经营、职业方向',
    subcategories: {
      job_search: { label: '求职应聘/面试机会', branches: ['qimen', 'hybrid'] },
      current_job_change: { label: '现有工作/辞职跳槽/调动革职', branches: ['qimen', 'hybrid'] },
      promotion_title: { label: '升迁晋升/职称评定', branches: ['qimen', 'hybrid'] },
      project_business: { label: '项目推进/客户谈判/合作落地', branches: ['qimen', 'hybrid'] },
      career_direction: { label: '职业方向/行业适配', branches: ['bazi', 'hybrid', 'ziwei'] },
      industry_fit: { label: '行业适配', branches: ['bazi', 'ziwei'] },
      entrepreneurship_vs_job: { label: '创业还是打工', branches: ['bazi', 'hybrid', 'ziwei'] }
    }
  },
  finance_wealth: {
    label: '求财投资',
    description: '财运投资、生意利润、交易收款、理财基金、财富结构',
    subcategories: {
      general_wealth: { label: '笼统财运/整体求财', branches: ['qimen', 'bazi', 'hybrid', 'ziwei'] },
      service_brokerage: { label: '空手求财/中介撮合/服务佣金', branches: ['qimen', 'hybrid'] },
      trade_buy_sell: { label: '买卖交易/商品流通', branches: ['qimen', 'hybrid'] },
      investment_business: { label: '投资开店/办厂项目/实体经营', branches: ['qimen', 'hybrid'] },
      debt_repayment: { label: '借贷讨债/催收回款', branches: ['qimen', 'hybrid'] },
      real_estate_trade: { label: '房产买卖/地皮交易', branches: ['qimen', 'hybrid'] },
      wealth_capacity: { label: '财富容量/收入模式', branches: ['bazi', 'ziwei'] },
      income_model: { label: '收入模式', branches: ['bazi', 'ziwei'] }
    }
  },
  relationship: {
    label: '婚恋感情',
    description: '感情桃花、婚姻关系、追求相亲、关系选择',
    subcategories: {
      single_romance: { label: '单身寻缘/何时遇对象', branches: ['qimen', 'hybrid'] },
      pursuit_dating: { label: '追求相亲/能否发展', branches: ['qimen', 'hybrid'] },
      love_conflict: { label: '恋爱纠葛/第三者/多角关系', branches: ['qimen', 'hybrid'] },
      marriage_existing: { label: '已婚关系/婚姻危机/同居', branches: ['qimen', 'hybrid'] },
      online_romance: { label: '网恋真假/线上关系', branches: ['qimen', 'hybrid'] },
      marriage_pattern: { label: '婚姻结构/长期关系模式', branches: ['bazi', 'ziwei'] },
      partner_profile: { label: '伴侣画像', branches: ['bazi', 'ziwei'] },
      relationship_timing: { label: '长期感情应期', branches: ['bazi', 'hybrid', 'ziwei'] }
    }
  },
  health_action: {
    label: '健康疾病',
    description: '身体健康、疾病趋势、治疗效果、手术风险、体质隐患',
    subcategories: {
      medical_diagnosis: { label: '病情诊断/疾病发展', branches: ['qimen', 'hybrid'] },
      treatment_effect: { label: '治疗效果/医生药物', branches: ['qimen', 'hybrid'] },
      surgery_risk: { label: '手术/急症/风险', branches: ['qimen', 'hybrid'] },
      sports_competition: { label: '高强度运动/比赛表现', branches: ['qimen'] },
      constitution: { label: '体质结构/脏腑风险', branches: ['bazi', 'ziwei'] },
      organ_risk: { label: '五脏六腑隐患', branches: ['bazi', 'ziwei'] }
    }
  },
  item_transaction: {
    label: '交易失物',
    description: '找回失物、寻人、买卖物品、房屋租赁交易、合同真伪',
    subcategories: {
      lost_found: { label: '普通失物', branches: ['qimen'] },
      stolen_item: { label: '被盗/偷窃', branches: ['qimen'] },
      vehicle_lost: { label: '车辆/机械丢失', branches: ['qimen'] }
    }
  },
  exam_study: {
    label: '考试学习',
    description: '求学考试、升学录取、考研高考、公务员考试、成绩发挥',
    subcategories: {
      admission_exam: { label: '升学录取', branches: ['qimen', 'hybrid'] },
      exam_performance: { label: '考试发挥/成绩', branches: ['qimen', 'hybrid'] },
      interview_review: { label: '复试面试/评审', branches: ['qimen', 'hybrid'] }
    }
  },
  lawsuit_legal: {
    label: '官司法务',
    description: '官司诉讼、民事纠纷、刑事风险、胜败诉、证据律师',
    subcategories: {
      civil_lawsuit: { label: '民事诉讼', branches: ['qimen'] },
      criminal_case: { label: '刑事风险', branches: ['qimen'] },
      settlement_evidence: { label: '调解/证据/律师', branches: ['qimen'] }
    }
  },
  fengshui_house: {
    label: '风水家宅',
    description: '阳宅阴宅、家宅风水、祖坟、搬迁择宅',
    subcategories: {
      yang_house: { label: '阳宅家宅', branches: ['qimen'] },
      yin_house: { label: '阴宅祖坟', branches: ['qimen'] },
      moving_house: { label: '搬迁择宅', branches: ['qimen'] }
    }
  },
  pregnancy_birth: {
    label: '孕产子嗣',
    description: '受孕怀孕、胎儿母体、生产分娩、母子安危',
    subcategories: {
      conception: { label: '受孕', branches: ['qimen', 'hybrid'] },
      pregnancy_health: { label: '孕期母子', branches: ['qimen', 'hybrid'] },
      delivery_birth: { label: '分娩生产', branches: ['qimen', 'hybrid'] }
    }
  },
  general: {
    label: '杂事',
    description: '日常出行、时机选择、笼统问题或无法归类的杂事',
    subcategories: {
      vague: { label: '信息不足', branches: ['clarify'] },
      timing_choice: { label: '时机选择', branches: ['qimen'] },
      daily_decision: { label: '日常决策', branches: ['qimen'] }
    }
  }
};

function isValidCategory(category) {
  return Object.prototype.hasOwnProperty.call(DIVINATION_CATEGORIES, category);
}

function isValidSubcategory(category, subcategory) {
  if (!subcategory) return true;
  return Boolean(DIVINATION_CATEGORIES[category]?.subcategories?.[subcategory]);
}

function normalizeDivinationRoute(route = {}) {
  const branch = DIVINATION_BRANCHES.includes(route.branch) ? route.branch : 'clarify';
  const category = isValidCategory(route.category) ? route.category : 'general';
  const subcategory = isValidSubcategory(category, route.subcategory) ? (route.subcategory || '') : '';
  const confidence = CONFIDENCE_LEVELS.includes(route.confidence) ? route.confidence : 'low';
  const source = ROUTE_SOURCES.includes(route.source) ? route.source : 'rules';

  return {
    branch,
    category,
    subcategory,
    confidence,
    source,
    reason: String(route.reason || ''),
    followupQuestion: String(route.followupQuestion || '')
  };
}

module.exports = {
  CONFIDENCE_LEVELS,
  DIVINATION_BRANCHES,
  DIVINATION_CATEGORIES,
  ROUTE_SOURCES,
  isValidCategory,
  isValidSubcategory,
  normalizeDivinationRoute
};
