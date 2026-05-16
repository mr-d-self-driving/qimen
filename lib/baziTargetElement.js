'use strict';

/**
 * 八字断事目标元素解析
 *
 * 理论来源：陆致极《八字命理动态分析教程》《进阶教程》
 *           《三命通会》《滴天髓》《穷通宝鉴》
 * 详细理论参见：docs/bazi-dynamic-analysis-theory.md
 *
 * Fallback 链路：subcategory → category → GENERAL_FALLBACK
 * 性别修正：relationship / pregnancy 类有 gender_variants
 */

// ─────────────────────────────────────────────
// 分析模式常量
// ─────────────────────────────────────────────
const MODE = {
  STATIC: 'static',   // 仅看原局结构
  DYNAMIC: 'dynamic', // 仅看大运流年引动
  BOTH: 'both',       // 先看结构，再推应期
};

// ─────────────────────────────────────────────
// 通用回退：无法映射时使用原局喜忌 + 格局作为基础
// ─────────────────────────────────────────────
const GENERAL_FALLBACK = {
  primary_shishen: [],
  primary_gongwei: [],
  secondary_shishen: ['用神', '忌神'],
  analysis_mode: MODE.BOTH,
  dynamic_focus: {
    mechanisms: ['合动', '冲动'],
    timing_priority: 'both',
    key_questions: [
      '原局格局是否成格？用神是什么？',
      '大运是否顺用神方向行走？',
      '流年是否引动用神/忌神，引发吉凶变化？',
    ],
  },
  analysis_question:
    '基于原局格局、用神喜忌，结合当前大运流年干支对命局的刑冲合害，综合判断此问题的吉凶走势与时间窗口。',
  fallback_level: 'general',
};

// ─────────────────────────────────────────────
// 按 category 定义的中层回退
// ─────────────────────────────────────────────
const CATEGORY_FALLBACK = {
  career_business: {
    primary_shishen: ['正官', '七杀', '食神', '伤官'],
    primary_gongwei: ['月柱'],
    secondary_shishen: ['正印', '偏印'],
    analysis_mode: MODE.BOTH,
    dynamic_focus: {
      mechanisms: ['官星透出', '印星护卫', '用神引动'],
      timing_priority: 'dayun',
      key_questions: [
        '格局类型决定职业方向（正官格→管理权位；食伤格→技术创业）',
        '大运是否行官运/印运（升迁）or 食伤运（创业）？',
        '流年官星或格局用神是否被激活？',
      ],
    },
    analysis_question:
      '基于格局类型和官星/食伤状态，判断事业发展方向与当前大运流年的助力方向。',
    fallback_level: 'category',
  },

  finance_wealth: {
    primary_shishen: ['正财', '偏财'],
    primary_gongwei: [],
    secondary_shishen: ['食神', '伤官'],
    analysis_mode: MODE.BOTH,
    dynamic_focus: {
      mechanisms: ['财星透出', '食伤生财', '用神引动'],
      timing_priority: 'both',
      key_questions: [
        '日主强弱：身强→何时行财运；身弱→何时行比印运',
        '大运是否进入财地或用神旺地？',
        '流年财星是否被透引或激活？',
      ],
    },
    analysis_question:
      '基于日主强弱与财星结构，判断财运容量与当前大运流年发财/破财的走势。',
    fallback_level: 'category',
  },

  relationship: {
    // 此处仅作 category 级回退，具体性别修正在 subcategory 层处理
    primary_shishen: [], // 由性别决定，见 applyGenderAdjustment
    primary_gongwei: ['日支'],
    secondary_shishen: ['桃花', '天喜', '红鸾'],
    analysis_mode: MODE.BOTH,
    dynamic_focus: {
      mechanisms: ['合动', '冲动', '开墓库'],
      timing_priority: 'both',
      key_questions: [
        '妻宫（日支）当前状态：安静/被冲/被合/入墓？',
        '大运是否引动妻宫，建立了吉场（合解）还是凶场（刑冲）？',
        '流年是否最终触发婚姻状态变化？',
      ],
    },
    analysis_question:
      '基于妻星/夫星状态与妻宫稳定性，结合大运流年引动机制，判断婚恋走势。',
    fallback_level: 'category',
    gender_sensitive: true,
  },

  health_action: {
    primary_shishen: [],
    primary_gongwei: ['日柱'],
    secondary_shishen: ['忌神对应五行', '日主之根'],
    analysis_mode: MODE.BOTH,
    dynamic_focus: {
      mechanisms: ['干支扭曲', '根被拔', '反吟'],
      timing_priority: 'both',
      key_questions: [
        '命局最弱五行对应何脏腑（潜在风险部位）？',
        '大运是否行忌神旺地，加重健康隐患？',
        '流年是否与日柱构成扭曲/反吟（重大伤病指标）？',
      ],
    },
    analysis_question:
      '基于五行脏腑对应关系和日主根基强弱，判断体质隐患与当前岁运健康走势。',
    fallback_level: 'category',
  },

  exam_study: {
    primary_shishen: ['正印', '偏印'],
    primary_gongwei: ['月柱'],
    secondary_shishen: ['正官', '食神', '伤官'],
    analysis_mode: MODE.BOTH,
    dynamic_focus: {
      mechanisms: ['印星生旺', '官印相生', '财星坏印'],
      timing_priority: 'liunian',
      key_questions: [
        '印星是否有根？是否被财星所破（贪财坏印）？',
        '流年是否走印星旺地或官印双清之地？',
        '流年是否出现"截脚"（印星无根）或财破印的情况？',
      ],
    },
    analysis_question:
      '基于印星状态与官印结构，结合流年岁运，判断考试升学的成败与时机。',
    fallback_level: 'category',
  },

  pregnancy_birth: {
    primary_shishen: [], // 由性别决定
    primary_gongwei: ['时柱'],
    secondary_shishen: ['时支十二运'],
    analysis_mode: MODE.BOTH,
    dynamic_focus: {
      mechanisms: ['合动时柱', '子女星透出', '冲开墓库'],
      timing_priority: 'liunian',
      key_questions: [
        '子女星旺衰（时柱十二运状态）？',
        '大运流年是否合动时柱或透出子女星？',
        '有无多子/少子的命局结构特征？',
      ],
    },
    analysis_question:
      '基于子女星和时柱状态，结合大运流年，判断生育时机与子嗣情况。',
    fallback_level: 'category',
    gender_sensitive: true,
  },
};

// ─────────────────────────────────────────────
// 主映射表：subcategory → TargetSpec
// 含 gender_variants 的条目用 applyGenderAdjustment 展开
// ─────────────────────────────────────────────
const SUBCATEGORY_MAP = {

  // ══════════════════════════════════════
  // career_business
  // ══════════════════════════════════════

  career_direction: {
    primary_shishen: ['正官', '七杀', '食神', '伤官'],
    primary_gongwei: ['月柱'],
    secondary_shishen: ['正印', '偏印', '正财', '偏财'],
    analysis_mode: MODE.STATIC,
    dynamic_focus: null,
    analysis_question:
      '根据格局类型定职业底色：正官/七杀格偏权力管理；食神/伤官格偏技术创意；从财格偏商业经营。结合月柱宫位与印星状态，判断适合方向与行业。',
  },

  industry_fit: {
    primary_shishen: ['格局对应五行'], // 动态展开，见注释
    primary_gongwei: ['月柱'],
    secondary_shishen: ['正印', '偏印'],
    analysis_mode: MODE.STATIC,
    dynamic_focus: null,
    analysis_question:
      '以命局最旺五行和格局类型匹配行业：木→教育/医疗/文化；火→科技/娱乐/餐饮；土→房地产/农业/制造；金→金融/法律/机械；水→贸易/传媒/物流。印星对应资源背景与学历加持。',
  },

  entrepreneurship_vs_job: {
    primary_shishen: ['食神', '伤官', '偏财', '正官'],
    primary_gongwei: ['月柱'],
    secondary_shishen: ['正印', '七杀'],
    analysis_mode: MODE.STATIC,
    dynamic_focus: null,
    analysis_question:
      '食伤/偏财重且日主强→创业型；正官/正印重且格局清纯→体制/打工型；七杀有制→军警/自主经营。结合大运当前走向判断现阶段更适合哪条路。',
  },

  // ══════════════════════════════════════
  // finance_wealth
  // ══════════════════════════════════════

  general_wealth: {
    primary_shishen: ['正财', '偏财'],
    primary_gongwei: [],
    secondary_shishen: ['食神', '伤官'],
    analysis_mode: MODE.BOTH,
    dynamic_focus: {
      mechanisms: ['财星透出', '食伤引动财', '比劫帮身'],
      timing_priority: 'both',
      key_questions: [
        '日主身强or身弱？决定走财运发福还是走比印运发福',
        '大运是否进入用神旺地？',
        '流年是否透出财星或引动食伤生财结构？',
      ],
    },
    analysis_question:
      '综合日主强弱与财星结构：身强财弱→流年透财时得财；财旺身弱→流年逢比劫/印星帮身时发福。判断当前财运走势与近期发财/破财时机。',
  },

  wealth_capacity: {
    primary_shishen: ['正财', '偏财'],
    primary_gongwei: [],
    secondary_shishen: ['食神', '伤官'],
    analysis_mode: MODE.STATIC,
    dynamic_focus: null,
    analysis_question:
      '评估命局先天财富容量：日主能否任财（身强则能克财）？食伤是否为财源？财星是否有根有力？有无"财气通门户"（食伤→财→官）的完整通路？这决定一生财富的上限与模式（工资型/经营型/投资型）。',
  },

  income_model: {
    primary_shishen: ['正财', '偏财', '食神', '伤官'],
    primary_gongwei: ['月柱'],
    secondary_shishen: ['正官', '七杀'],
    analysis_mode: MODE.STATIC,
    dynamic_focus: null,
    analysis_question:
      '正财为主→稳定薪资/固定收入；偏财为主→浮动收益/生意/投机；食神生正财→技术/服务变现；伤官生偏财→创意/销售/自媒体变现。结合格局判断最适合的收入路径。',
  },

  // ══════════════════════════════════════
  // relationship（仅3个 bazi 分支子类）
  // ══════════════════════════════════════

  marriage_pattern: {
    // 静态结构分析：命局是否有多婚/晚婚/离婚之象
    gender_variants: {
      male: {
        primary_shishen: ['正财', '偏财'],
        primary_gongwei: ['日支'],
        secondary_shishen: ['桃花', '天喜'],
        analysis_mode: MODE.STATIC,
        dynamic_focus: null,
        analysis_question:
          '男命婚姻结构分析：① 妻宫（日支）是否稳固（有无丑未冲/三刑）；② 妻星（财星）是否完整，有无入墓/被劫/正偏财杂见；③ 有无多婚象（妻宫双现：日支与月/时支相同；正偏财杂见+墙外桃花）；④ 格局对婚姻质量的影响。',
        extra_static_checks: [
          '妻宫双现（日支与月/时支相同）→ 多婚象',
          '妻星入墓（财星藏于丑/戌/未/辰且无刑冲开墓）→ 晚婚/难婚',
          '正偏财杂见 + 桃花 → 多次婚姻',
          '比劫重（男）→ 劫财伤妻，婚姻不稳',
          '日支坐比劫 → 配偶宫被争夺，婚姻危机',
        ],
      },
      female: {
        primary_shishen: ['正官', '七杀'],
        primary_gongwei: ['日支'],
        secondary_shishen: ['桃花', '天喜', '红鸾'],
        analysis_mode: MODE.STATIC,
        dynamic_focus: null,
        analysis_question:
          '女命婚姻结构分析：① 夫宫（日支）是否稳固；② 夫星（官星）是否纯粹，有无官杀混杂；③ 伤官重是否妨夫；④ 有无多婚象（官杀混杂、正偏官杂见）；⑤ 格局对婚姻质量的影响。',
        extra_static_checks: [
          '官杀混杂 → 多次婚姻或感情复杂',
          '夫星入墓（官/杀藏于墓库无刑冲）→ 晚婚/难婚',
          '伤官太重（无印制）→ 妨夫',
          '满盘食伤（克官）→ 婚姻受挫或不婚',
          '日支坐伤官 → 配偶宫受损',
        ],
      },
    },
  },

  partner_profile: {
    // 静态解读：妻星/夫星五行性质 → 伴侣画像
    gender_variants: {
      male: {
        primary_shishen: ['正财', '偏财'],
        primary_gongwei: ['日支'],
        secondary_shishen: ['妻星十二运'],
        analysis_mode: MODE.STATIC,
        dynamic_focus: null,
        analysis_question:
          '男命伴侣画像：① 妻星（财星）五行→外貌特征（木细长秀丽/金方白净/水面黑光彩/火上尖下宽/土圆润丰满）；② 妻星十二运→配偶年龄/健康；③ 妻星所在宫位→配偶出身背景；④ 正财vs偏财→正妻性情（正财温和守分/偏财开朗活泼但多情）；⑤ 妻星坐下十神→配偶职业性格。',
      },
      female: {
        primary_shishen: ['正官', '七杀'],
        primary_gongwei: ['日支'],
        secondary_shishen: ['夫星十二运'],
        analysis_mode: MODE.STATIC,
        dynamic_focus: null,
        analysis_question:
          '女命伴侣画像：① 夫星（官/杀）五行→外貌特征；② 正官→稳重温和；七杀→强势霸气；③ 夫星十二运→配偶年龄/健康状态；④ 夫星所在宫位→配偶出身；⑤ 夫星坐下十神→配偶职业性格。',
      },
    },
  },

  relationship_timing: {
    // 动态应期：大运流年何时引动妻宫/夫宫
    gender_variants: {
      male: {
        primary_shishen: ['正财', '偏财'],
        primary_gongwei: ['日支'],
        secondary_shishen: ['桃花', '天喜'],
        analysis_mode: MODE.DYNAMIC,
        dynamic_focus: {
          mechanisms: ['合动', '冲动', '开墓库', '妻星透干'],
          timing_priority: 'both',
          key_questions: [
            '妻宫（日支）当前状态：安静/被冲/被合/入墓？（这是基准状态）',
            '大运是否引动妻宫？建立了合解（吉场：结婚可能）还是刑冲（凶场：婚变可能）？',
            '流年地支是否合动妻宫（解冲=结婚应期）？',
            '流年是否冲开妻星墓库（=突然出现结婚机会）？',
            '大运天干是否透出妻星（财星），同时流年合动妻宫？',
          ],
        },
        analysis_question:
          '男命感情应期：当前妻宫状态如何？大运建了什么场？最近哪个流年的地支会合动/冲开妻宫，或透出妻星——这即为结婚/恋爱应期窗口。给出最近3年的具体预判。',
      },
      female: {
        primary_shishen: ['正官', '七杀'],
        primary_gongwei: ['日支'],
        secondary_shishen: ['桃花', '红鸾'],
        analysis_mode: MODE.DYNAMIC,
        dynamic_focus: {
          mechanisms: ['合动', '冲动', '开墓库', '夫星透干'],
          timing_priority: 'both',
          key_questions: [
            '夫宫（日支）当前状态：安静/被冲/被合/入墓？',
            '大运是否引动夫宫或夫星？',
            '流年地支是否合动夫宫？',
            '流年是否冲开夫星墓库？',
            '大运天干是否透出夫星（官/杀），同时流年合动夫宫？',
          ],
        },
        analysis_question:
          '女命感情应期：夫宫状态分析→大运建场分析→最近流年引动夫宫/夫星的具体时间窗口判断。给出最近3年的具体预判。',
      },
    },
  },

  // ══════════════════════════════════════
  // health_action
  // ══════════════════════════════════════

  constitution: {
    primary_shishen: [],
    primary_gongwei: ['日柱'],
    secondary_shishen: ['忌神五行', '日主之根'],
    analysis_mode: MODE.STATIC,
    dynamic_focus: null,
    analysis_question:
      '体质结构：五行最弱处为潜在脏腑隐患（木弱→肝胆；火弱→心；土弱→脾胃；金弱→肺；水弱→肾）。日主旺弱决定整体精力体能。忌神旺相方向决定后天易受攻击部位。',
  },

  organ_risk: {
    primary_shishen: [],
    primary_gongwei: ['日柱'],
    secondary_shishen: ['忌神五行', '日主之根'],
    analysis_mode: MODE.BOTH,
    dynamic_focus: {
      mechanisms: ['干支扭曲', '根被拔', '反吟', '忌神入局'],
      timing_priority: 'both',
      key_questions: [
        '命局最弱五行对应何脏腑（潜在风险）？',
        '大运是否行忌神旺地（激活脏腑风险时段）？',
        '流年是否与日柱构成一/二级干支扭曲（重大伤病或死亡指标）？',
        '日主根基（禄/印星）是否在大运流年中被合化或冲拔（生命极限信号）？',
      ],
    },
    analysis_question:
      '五脏六腑风险评估：结合命局最弱五行与日主根基，判断潜在易患疾病方向；动态分析大运流年是否触发"干支扭曲"或"根被拔"等重大伤病信号，给出高风险时间段。',
  },

  // ══════════════════════════════════════
  // exam_study
  // ══════════════════════════════════════

  admission_exam: {
    primary_shishen: ['正印', '偏印', '正官'],
    primary_gongwei: ['月柱'],
    secondary_shishen: ['食神', '伤官'],
    analysis_mode: MODE.BOTH,
    dynamic_focus: {
      mechanisms: ['印星生旺', '官印相生', '财星坏印'],
      timing_priority: 'liunian',
      key_questions: [
        '印星是否有根有力？有无"贪财坏印"（财重破印）？',
        '官印是否双清（互相护卫，无伤官冲官、财星破印）？',
        '流年是否走印星旺地或官印相生之地？',
        '流年是否出现"截脚"（印星天干有力但地支克绝其根）？',
      ],
    },
    analysis_question:
      '升学录取判断：官印双清为科甲之象；印星有根且无财破为考运通路。判断当前流年岁运是否"有病得药"（印/官被生扶）或"去病留清"（忌神被冲合），给出考运成败与时机。',
  },

  exam_performance: {
    primary_shishen: ['正印', '偏印'],
    primary_gongwei: ['月柱'],
    secondary_shishen: ['食神', '伤官'],
    analysis_mode: MODE.DYNAMIC,
    dynamic_focus: {
      mechanisms: ['印星透出', '财星坏印', '食伤吐秀'],
      timing_priority: 'liunian',
      key_questions: [
        '流年印星状态：是否生旺（好发挥）还是被财冲破（失常）？',
        '食伤是否"泄秀"（才华流畅输出）？',
        '流年是否出现"截脚"或"盖头"导致印星效力减半？',
      ],
    },
    analysis_question:
      '考试临场发挥：流年印星生旺→状态佳；财星冲破印星→发挥失常；食伤吐秀顺畅→发挥超常。给出当前或目标考试流年的发挥预判。',
  },

  interview_review: {
    primary_shishen: ['正官', '正印', '偏印'],
    primary_gongwei: ['月柱'],
    secondary_shishen: ['食神', '伤官'],
    analysis_mode: MODE.DYNAMIC,
    dynamic_focus: {
      mechanisms: ['官印相生', '官星透出', '伤官见官'],
      timing_priority: 'liunian',
      key_questions: [
        '流年官星是否透出且有印护卫？（获得认可的信号）',
        '流年是否出现"伤官见官"（被否定/挑刺/落选的信号）？',
        '官印是否在流年构成相生态势？',
      ],
    },
    analysis_question:
      '复试面试/评审：官印双清且流年生助→获评委认可；伤官冲官或流年官星受克→被否定或落选。判断具体面试/评审时间点的胜算。',
  },

  // ══════════════════════════════════════
  // pregnancy_birth（含性别修正）
  // ══════════════════════════════════════

  conception: {
    gender_variants: {
      // 《渊海子平》：男命看官杀为子女星；《滴天髓》任铁樵主张食伤为子女星
      // 工程上取并用：男命以官杀为主，食伤为辅；女命以食伤为主
      male: {
        primary_shishen: ['正官', '七杀', '食神', '伤官'],
        primary_gongwei: ['时柱'],
        secondary_shishen: ['时支十二运'],
        analysis_mode: MODE.BOTH,
        dynamic_focus: {
          mechanisms: ['合动时柱', '子女星透出', '冲开墓库'],
          timing_priority: 'liunian',
          key_questions: [
            '时柱（子女宫）十二运状态是长生/旺相还是死绝？',
            '子女星（官杀/食伤）是否有根有力？',
            '大运流年是否合动时柱或透出子女星？',
            '有无"火炎土燥/水泛木浮"等无子命局特征？',
          ],
        },
        analysis_question:
          '男命受孕时机：时柱（子女宫）旺相且大运流年合动/透出子女星时为怀孕应期。同时检查有无命局层面无子特征（印重克食伤、五行极偏）。',
      },
      female: {
        primary_shishen: ['食神', '伤官'],
        primary_gongwei: ['时柱'],
        secondary_shishen: ['时支十二运'],
        analysis_mode: MODE.BOTH,
        dynamic_focus: {
          mechanisms: ['合动时柱', '食伤透出', '冲开墓库'],
          timing_priority: 'liunian',
          key_questions: [
            '时柱（子女宫）状态？',
            '食伤（子女星）是否有根？有无"满盘印绶克食伤"（无子象）？',
            '大运流年是否合动时柱或透出食伤？',
          ],
        },
        analysis_question:
          '女命受孕时机：食伤为子女星，时柱为子女宫。流年合动/透出食伤且时柱旺相时为怀孕应期。注意印星过重克食伤为无子/少子象。',
      },
    },
  },

  pregnancy_health: {
    gender_variants: {
      male: {
        primary_shishen: ['正官', '七杀', '食神', '伤官'],
        primary_gongwei: ['时柱', '日柱'],
        secondary_shishen: ['日主强弱'],
        analysis_mode: MODE.BOTH,
        dynamic_focus: {
          mechanisms: ['日主受损', '时柱受冲', '子女星受克'],
          timing_priority: 'both',
          key_questions: [
            '日主（代表配偶/母体）在大运流年是否受损？',
            '时柱（子女宫）是否被冲克？',
            '子女星状态是否稳健？',
          ],
        },
        analysis_question: '孕期父方维度：子女星和时柱是否在大运流年中平稳，判断胎儿平安度与出生顺利程度。',
      },
      female: {
        primary_shishen: ['食神', '伤官'],
        primary_gongwei: ['时柱', '日柱'],
        secondary_shishen: ['日主强弱'],
        analysis_mode: MODE.BOTH,
        dynamic_focus: {
          mechanisms: ['日主受损', '时柱受冲', '食伤受克'],
          timing_priority: 'both',
          key_questions: [
            '日主（母体）在大运流年是否被克损？',
            '食伤（子女星）是否被印星过克？',
            '时柱（子女宫）十二运状态？',
          ],
        },
        analysis_question: '女命孕期：日主代表母体，食伤代表胎儿。判断大运流年是否损伤日主或过克食伤，评估孕期风险与平安度。',
      },
    },
  },

  delivery_birth: {
    gender_variants: {
      male: {
        primary_shishen: ['正官', '七杀', '食神', '伤官'],
        primary_gongwei: ['时柱'],
        secondary_shishen: [],
        analysis_mode: MODE.DYNAMIC,
        dynamic_focus: {
          mechanisms: ['时柱被冲动', '子女星透干'],
          timing_priority: 'liunian',
          key_questions: [
            '流年流月是否合动/冲动时柱（分娩启动信号）？',
            '子女星是否在该流年被透引（生产时机）？',
          ],
        },
        analysis_question: '分娩时机：流年流月冲动/合动时柱，或透出子女星时为分娩应期。',
      },
      female: {
        primary_shishen: ['食神', '伤官'],
        primary_gongwei: ['时柱'],
        secondary_shishen: [],
        analysis_mode: MODE.DYNAMIC,
        dynamic_focus: {
          mechanisms: ['时柱被冲动', '食伤透干'],
          timing_priority: 'liunian',
          key_questions: [
            '流年流月是否合动/冲动时柱？',
            '食伤是否在该流年被透引？',
          ],
        },
        analysis_question: '女命分娩时机：流年流月引动时柱（子女宫），食伤被透出时为生产应期。',
      },
    },
  },
};

// ─────────────────────────────────────────────
// 性别修正：展开 gender_variants
// ─────────────────────────────────────────────

/**
 * gender: 'male' | 'female' | undefined
 * 未知性别时取 male 作为默认（财星/官杀为子，更普适）
 */
function applyGenderAdjustment(spec, gender) {
  if (!spec.gender_variants) return spec;
  const g = gender === 'female' ? 'female' : 'male';
  return spec.gender_variants[g];
}

// ─────────────────────────────────────────────
// 主入口
// ─────────────────────────────────────────────

/**
 * 解析断事目标元素规格
 *
 * @param {object} params
 * @param {string} params.category    - 主类别，见 divinationCategories.js
 * @param {string} [params.subcategory] - 子类别
 * @param {'male'|'female'} [params.gender] - 命主性别
 * @returns {TargetSpec} 目标元素规格，含 fallback_level 指示解析深度
 */
function resolveTargetElement({ category, subcategory, gender } = {}) {
  // 1. 尝试 subcategory 级精确匹配
  if (subcategory && SUBCATEGORY_MAP[subcategory]) {
    const spec = applyGenderAdjustment(SUBCATEGORY_MAP[subcategory], gender);
    return { ...spec, fallback_level: 'subcategory' };
  }

  // 2. 尝试 category 级回退
  if (category && CATEGORY_FALLBACK[category]) {
    const spec = applyGenderAdjustment(CATEGORY_FALLBACK[category], gender);
    // relationship category 回退时补充性别对应的妻/夫星
    if (category === 'relationship') {
      const shishen = gender === 'female' ? ['正官', '七杀'] : ['正财', '偏财'];
      return { ...spec, primary_shishen: shishen, fallback_level: 'category' };
    }
    if (category === 'pregnancy_birth') {
      const shishen = gender === 'female' ? ['食神', '伤官'] : ['正官', '七杀', '食神', '伤官'];
      return { ...spec, primary_shishen: shishen, fallback_level: 'category' };
    }
    return { ...spec, fallback_level: 'category' };
  }

  // 3. 通用回退：原局喜忌 + 格局
  return { ...GENERAL_FALLBACK };
}

// ─────────────────────────────────────────────
// 工具函数：将 TargetSpec 格式化为 prompt 注入片段
// ─────────────────────────────────────────────

/**
 * 将 TargetSpec 转为可直接注入 LLM prompt 的中文说明段落
 */
function formatTargetSpecForPrompt(spec) {
  const lines = [];

  if (spec.primary_shishen.length > 0) {
    lines.push(`【主要分析十神】${spec.primary_shishen.join('、')}`);
  }
  if (spec.primary_gongwei.length > 0) {
    lines.push(`【主要分析宫位】${spec.primary_gongwei.join('、')}`);
  }
  if (spec.secondary_shishen.length > 0) {
    lines.push(`【辅助参考元素】${spec.secondary_shishen.join('、')}`);
  }
  lines.push(`【分析模式】${spec.analysis_mode}`);

  if (spec.dynamic_focus) {
    lines.push(`【动态关注机制】${spec.dynamic_focus.mechanisms.join('、')}`);
    lines.push(`【时间轴优先】${spec.dynamic_focus.timing_priority}`);
    lines.push('【动态分析核心问题】');
    spec.dynamic_focus.key_questions.forEach((q) => lines.push(`  - ${q}`));
  }

  if (spec.extra_static_checks) {
    lines.push('【静态命局特征检查项】');
    spec.extra_static_checks.forEach((c) => lines.push(`  - ${c}`));
  }

  lines.push(`\n【分析提问】${spec.analysis_question}`);

  if (spec.fallback_level !== 'subcategory') {
    lines.push(`\n（注：当前使用 ${spec.fallback_level} 级通用分析框架）`);
  }

  return lines.join('\n');
}

module.exports = {
  resolveTargetElement,
  formatTargetSpecForPrompt,
  MODE,
};
