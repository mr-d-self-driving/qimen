'use strict';

const STATEMENT_SOURCE = 'NotebookLM 古籍断语整理';

const STATUS_MAP = {
  FORMED: 'formed',
  BROKEN: 'broken',
  PARTIAL: 'partial',
  PENDING: 'partial',
  DRY_COLD_IMBALANCED: 'broken',
  '成格': 'formed',
  '败格': 'broken',
  '破格': 'broken',
  '偏枯': 'broken',
  '待定': 'partial',
  '半成': 'partial',
};

const PATTERN_NAME_ALIASES = {
  从食伤格: '从儿格',
  从食伤_从儿格: '从儿格',
  月刃格: '羊刃格',
};

const COMMON_SOURCE = {
  normal: '《子平真诠》善恶顺逆与月令取格，《三命通会》格局成败断语，《滴天髓》气势与病药法。',
  special: '《滴天髓》从格、专旺与顺势原则，《三命通会》特殊格局成败断语。',
};

const PATTERN_STATEMENT_LIBRARY = {
  正官格: {
    formed: {
      personality: '处事稳重，重视规则、承诺与责任，容易给人可靠、有分寸的印象。',
      career_wealth: '适合在制度清晰、职责明确的组织中发展，若财印配合得宜，事业与收入更容易稳定累积。',
      relationship_health: '关系中重视稳定与长期承诺，健康层面宜维持规律作息，避免把责任压力长期压在心里。',
      warning: '优势在守正，也要保留变通空间；遇到新机会时，先评估规则边界，再决定是否推进。',
      source_basis: '《子平真诠》正官为善神宜顺用；《三命通会》重官星清纯，不喜混杂。',
    },
    broken: {
      personality: '内在容易在守规矩和想反抗之间拉扯，遇压力时可能显得紧绷或犹疑。',
      career_wealth: '事业上易遇规则、人事或权责不清带来的阻力，求财也容易被外部评价牵动。',
      relationship_health: '关系里容易因标准过高或现实压力而紧张，健康上宜关注睡眠、疲劳与情绪调节。',
      warning: '先厘清边界与责任，不要卷入无谓的是非；压力大时，用事实和流程解决问题。',
      source_basis: '《渊海子平》官杀混杂不清；《子平真诠》伤官见官为格局病处。',
    },
    partial: {
      personality: '有责任感和上进心，但力量未完全贯通，行动上可能还在蓄势。',
      career_wealth: '事业处在积累平台、资历与信用的阶段，未必立刻显达，但适合稳步经营。',
      relationship_health: '关系多以平稳为主，健康层面重在日常保养和节奏管理。',
      warning: '此时不宜急求结果，先把专业能力、信用和可被托付的形象做扎实。',
      source_basis: COMMON_SOURCE.normal,
    },
  },
  七杀格: {
    formed: {
      personality: '行动果断，抗压和决断力强，能在复杂局面中快速抓住重点。',
      career_wealth: '适合竞争、管理、开拓或压力较高的岗位；有制化时，压力会转成执行力和职位担当。',
      relationship_health: '关系中保护欲较强，但要避免表达过硬；健康层面宜给高压状态安排固定缓冲。',
      warning: '锋芒可成事，也会带来对抗；越是在关键位置，越要学会协作和留余地。',
      source_basis: '《三命通会》偏官有制可成权；《子平真诠》七杀为不善，逆用以制化为要。',
    },
    broken: {
      personality: '容易感到被压力追赶，反应偏急，防备心和胜负心都较强。',
      career_wealth: '事业可能遇到强竞争、强约束或高风险环境，若缺少制化，推进会比较吃力。',
      relationship_health: '关系里要留意强势沟通造成摩擦；健康层面宜避免过劳和冲动决策带来的损耗。',
      warning: '不要在条件不成熟时硬冲，先补资源、规则和合作方，用秩序化解压力。',
      source_basis: '《三命通会》身弱杀强无制为病；《子平真诠》不善者逆用，无制则败。',
    },
    partial: {
      personality: '内心有胜负欲和承担意识，但信心、资源或环境支持尚未完全到位。',
      career_wealth: '有施展抱负的机会，但还需要印星或食伤一类的制化路径来承接。',
      relationship_health: '关系需要慢慢建立信任；健康上尤其适合用运动、休息和计划感来释放压力。',
      warning: '先找策略和支持系统，再谈冲锋；把“硬扛”改成“有计划地承担”。',
      source_basis: COMMON_SOURCE.normal,
    },
  },
  正财格: {
    formed: {
      personality: '务实可靠，重视秩序、资源和承诺，擅长把抽象目标落到实际安排。',
      career_wealth: '适合稳定经营、财务管理、实业和长期项目，财富更偏向持续积累而非一时冒进。',
      relationship_health: '关系中重视责任和现实基础；健康层面要避免为稳定而长期压抑自身需求。',
      warning: '会经营是优势，但别让过度保守限制视野，重大决策仍要兼顾弹性。',
      source_basis: '《子平真诠》财为善神宜顺用；《渊海子平》身能任财方见福力。',
    },
    broken: {
      personality: '容易受现实得失牵动，安全感不足时会变得计较或焦虑。',
      career_wealth: '财务波动、资源被分夺或责任超载时，事业与收入容易失衡。',
      relationship_health: '关系可能受现实条件、钱财安排或价值观差异影响；健康上宜注意饮食与劳逸平衡。',
      warning: '先建立预算、边界和风险隔离，少做情绪化消费或超出承受力的投资。',
      source_basis: '《三命通会》财多身弱、比劫争财为病；《子平真诠》财格喜食官护持。',
    },
    partial: {
      personality: '有理财和经营意识，但执行力度、资源条件或承载力还在形成。',
      career_wealth: '收入多以稳步积累为主，适合先建立技能、信用和现金流。',
      relationship_health: '关系慢热而现实，健康状态大体平稳，注意别把压力都放在物质目标上。',
      warning: '把长期规划拆成可执行的小步骤，等身财两边力量更均衡时再放大规模。',
      source_basis: COMMON_SOURCE.normal,
    },
  },
  偏财格: {
    formed: {
      personality: '眼光灵活，善于识别机会和整合人脉，待人较大方，资源感强。',
      career_wealth: '适合市场、项目、投资、商务拓展等需要机会判断的领域，财路可能更灵活多元。',
      relationship_health: '关系中外缘较旺，需重视边界和承诺；健康上要减少应酬透支。',
      warning: '机会多不等于都要抓，越有资源越要建立规则，避免财来财去。',
      source_basis: '《三命通会》偏财得地可发；《子平真诠》财格仍以身能任、食官护为佳。',
    },
    broken: {
      personality: '容易贪快、贪多或被短期收益吸引，稳定性不足。',
      career_wealth: '财务容易因扩张过度、判断失误或合作边界不清而起伏。',
      relationship_health: '关系中可能因外缘、钱财或承诺不清产生波动；健康上宜控制应酬和作息。',
      warning: '少碰高杠杆和不透明合作，先把账目、合同和退出机制写清楚。',
      source_basis: '《三命通会》偏财逢比劫则难聚；《子平真诠》财遇劫夺需救应。',
    },
    partial: {
      personality: '想法活络，有商业敏感度，但还需要聚焦和验证。',
      career_wealth: '偶有机会和收益，但尚未形成稳定模式，适合小步试错。',
      relationship_health: '关系仍在观察和磨合中；健康上要防思虑过多与节奏不稳。',
      warning: '先做减法，集中一两个最有把握的方向，不要同时铺太多线。',
      source_basis: COMMON_SOURCE.normal,
    },
  },
  食神格: {
    formed: {
      personality: '温和有余裕，表达自然，具备把技能、审美或知识稳定输出的能力。',
      career_wealth: '适合专业技术、内容、教育、服务和创意类路径；食神能生财时，才华更容易变现。',
      relationship_health: '关系中较懂照顾与陪伴；健康层面宜保持运动，避免安逸过度。',
      warning: '舒展是优势，但不要停在舒适区，要把兴趣沉淀成作品和成果。',
      source_basis: '《三命通会》食神生财为美；《子平真诠》食神喜生财制杀，忌枭夺。',
    },
    broken: {
      personality: '容易有想法但行动不足，或才华被压力、环境和自我怀疑压住。',
      career_wealth: '技能难以稳定变现，项目推进可能被外界干扰或资源中断影响。',
      relationship_health: '关系中可能因被动或表达不足而疏离；健康上宜注意饮食、消化和精神松弛。',
      warning: '把创意落成计划，避免长期拖延；同时远离持续打压你输出的人和环境。',
      source_basis: '《子平真诠》枭神夺食为食神格病处；《三命通会》食神受制则秀气不舒。',
    },
    partial: {
      personality: '性情平和，有兴趣和技能苗头，但深度仍待培养。',
      career_wealth: '目前更像默默耕耘期，收入未必立刻体现才华价值。',
      relationship_health: '关系偏日常陪伴型，健康以规律饮食和作息为要。',
      warning: '选定一门能长期复利的技能，不要浅尝辄止。',
      source_basis: COMMON_SOURCE.normal,
    },
  },
  伤官格: {
    formed: {
      personality: '反应快，有创造力和表达欲，擅长看见旧规则里的问题。',
      career_wealth: '适合技术突破、创意表达、咨询策划、内容和新兴行业；有财印承接时才华更稳。',
      relationship_health: '关系中需要尊重和空间，也要照顾对方感受；健康上宜疏导情绪和用脑压力。',
      warning: '锋芒要落到作品和解决方案里，少用语言对抗来证明自己。',
      source_basis: '《子平真诠》伤官喜财印相辅；《三命通会》伤官生财、伤官佩印可成格。',
    },
    broken: {
      personality: '容易言语过锋、情绪反应快，遇权威或规则时更容易顶住不放。',
      career_wealth: '职场上可能因沟通方式或规则冲突带来阻力，才华有时反被误解。',
      relationship_health: '关系里要避免用尖锐表达伤人；健康上重视情绪波动、睡眠和压力释放。',
      warning: '先确认规则和边界，再表达不同意见；把批判转成建设性方案。',
      source_basis: '《子平真诠》伤官见官为病，但亦强调格局需结合调候、财印和成败。',
    },
    partial: {
      personality: '想法多、变化快，但系统性和持续性还不够。',
      career_wealth: '方向仍在试探，收入和成果容易随状态波动。',
      relationship_health: '关系中可能忽冷忽热，健康上宜减少熬夜和情绪内耗。',
      warning: '给创意配上流程、周期和复盘，让灵感能被稳定交付。',
      source_basis: COMMON_SOURCE.normal,
    },
  },
  正印格: {
    formed: {
      personality: '重视学习、涵养和保护他人，气质温厚，愿意长期积累。',
      career_wealth: '适合教育、研究、咨询、文职、制度支持类岗位，容易因资历与口碑获得稳定发展。',
      relationship_health: '关系中包容度较高；健康上宜防过度安逸，保持身体活动。',
      warning: '受支持是优势，也要培养独立判断和现实执行。',
      source_basis: '《子平真诠》印绶为善神，喜官相生，忌财破；《三命通会》印得官生为佳。',
    },
    broken: {
      personality: '容易想得多做得少，或过度依赖既有保护与安全区。',
      career_wealth: '事业上可能因行动不足、现实感弱或资源受损而进展缓慢。',
      relationship_health: '关系中易显保守或表达不足；健康上宜改善运动不足和精神滞重。',
      warning: '把学习转为输出和实践，不要让安全感变成停滞。',
      source_basis: '《渊海子平》财破印为病；《子平真诠》印格重在护印与流通。',
    },
    partial: {
      personality: '有学习心和稳定感，但知识、资源或贵人力量尚未完全成形。',
      career_wealth: '适合继续蓄力，先拿资质、作品或经验沉淀信用。',
      relationship_health: '关系节奏偏慢，健康以规律和适度运动为主。',
      warning: '不要只停在准备阶段，给自己设定明确输出节点。',
      source_basis: COMMON_SOURCE.normal,
    },
  },
  偏印格: {
    formed: {
      personality: '思维独特，直觉强，适合研究冷门、复杂或需要洞察的领域。',
      career_wealth: '适合研究、策划、设计、术数、心理、技术探索等靠独特能力立身的路径。',
      relationship_health: '关系中更重精神理解和边界；健康上需重视睡眠和情绪稳定。',
      warning: '独特性需要被表达和协作承接，避免长期封闭在自己的系统里。',
      source_basis: '《三命通会》偏印得用主巧思；《子平真诠》偏印须看制化，不喜夺食。',
    },
    broken: {
      personality: '容易敏感、多疑或兴趣分散，执行上可能有始无终。',
      career_wealth: '工作中若协作困难或输出不稳，容易被边缘化，收益也不稳定。',
      relationship_health: '关系里要练习信任和表达；健康上宜关注睡眠、焦虑和长期精神紧绷。',
      warning: '减少无端猜测，选一个方向深耕，用计划约束发散。',
      source_basis: '《渊海子平》枭神夺食为病；《子平真诠》偏印见食需辨夺与用。',
    },
    partial: {
      personality: '有直觉和兴趣广度，但还缺少方法论和稳定作品。',
      career_wealth: '处于冷门能力与主流需求对接的摸索期。',
      relationship_health: '关系中容易觉得不被理解，健康上适合用规律运动疏导。',
      warning: '把敏感转成观察，把兴趣转成作品，才会被外界看见。',
      source_basis: COMMON_SOURCE.normal,
    },
  },
  建禄格: {
    formed: {
      personality: '自主性强，有韧性和自我驱动力，遇事更愿意靠自己打出局面。',
      career_wealth: '若见财官食引动，适合创业、管理、专业负责人等路径，能靠积累建立位置。',
      relationship_health: '关系中重平等和共同承担；健康底子通常较能扛，但也要避免硬撑。',
      warning: '自立是优势，分享资源和听取建议能让格局更稳。',
      source_basis: '《子平真诠》建禄月劫喜财官食引化；《三命通会》建禄得财官印绶则佳。',
    },
    broken: {
      personality: '容易固执、自我，遇不同意见时不易退让。',
      career_wealth: '若比劫过重而财官不足，容易劳而分散，合作和财务都需谨慎。',
      relationship_health: '关系中要避免强势和只按自己节奏来；健康上防过度消耗体力。',
      warning: '重大财务与合作事项要设边界，少靠意气判断。',
      source_basis: '《三命通会》建禄逢比劫分夺；《子平真诠》建禄无财官食则难发用。',
    },
    partial: {
      personality: '有独立意识，但方向和外部引动尚未完全明确。',
      career_wealth: '事业在爬坡期，适合打基础、练本领、找互补资源。',
      relationship_health: '关系趋于稳定但不宜太强势；健康以劳逸均衡为要。',
      warning: '先把个人能力沉淀成可交换的价值，再谈扩张。',
      source_basis: COMMON_SOURCE.normal,
    },
  },
  羊刃格: {
    formed: {
      personality: '行动力强，敢担当，遇关键局面有冲劲和控制力。',
      career_wealth: '若有官杀或食伤调节，适合竞争、攻坚、执行、管理和需要胆识的领域。',
      relationship_health: '关系中保护欲强，但要避免压迫感；健康上宜用运动稳定强能量。',
      warning: '越有冲劲越要讲策略，刚柔并济才能走得长。',
      source_basis: '《子平真诠》羊刃喜官杀制伏；《三命通会》杀刃相停可成权。',
    },
    broken: {
      personality: '容易急躁、好胜，遇刺激时反应过快。',
      career_wealth: '事业和财务容易因冲动、争执或风险判断不足而起伏。',
      relationship_health: '关系中要避免强势压人；健康上需注意外伤、炎症和过劳风险。',
      warning: '先降火再决策，远离高风险冲突和情绪化博弈。',
      source_basis: '《三命通会》羊刃无制为险；《子平真诠》刃格须制化得宜。',
    },
    partial: {
      personality: '有冲劲但目标感未稳，容易蓄势焦躁。',
      career_wealth: '能吃苦，但如果缺策略，容易事倍功半。',
      relationship_health: '关系中直来直去，健康上适合稳定运动和作息。',
      warning: '给能量找合法、稳定、可持续的出口，把勇气配上谋略。',
      source_basis: COMMON_SOURCE.normal,
    },
  },
  从财格: {
    formed: {
      personality: '现实感强，善于观察资源流向，能顺着平台、市场和机会调整自己。',
      career_wealth: '适合商业、资源整合、平台型发展；顺势得当时，财富与机会更容易集中。',
      relationship_health: '关系中重现实互助和共同目标；健康上要避免为资源奔忙而透支。',
      warning: '逐利不能失去底线，越顺势越要守合同、信用和风险边界。',
      source_basis: '《滴天髓》弃命从财，顺其财势为用；从格忌逆扶日主。',
    },
    broken: {
      personality: '容易被得失牵动，现实压力大时会失去稳定立场。',
      career_wealth: '遇比劫或逆势岁运时，财务和合作容易出现明显波动。',
      relationship_health: '关系易受现实条件影响；健康上宜留意长期奔忙造成的损耗。',
      warning: '不要追逐超过认知和承受力的收益，先保现金流和退路。',
      source_basis: '《滴天髓》从财遇逆势破局为忌；《子平真诠》从格重真从与行运。',
    },
    partial: {
      personality: '有借力和趋利意识，但理想与现实仍有拉扯。',
      career_wealth: '依赖平台或资源发展，收益有机会但基础未稳。',
      relationship_health: '关系中会衡量现实匹配度；健康上要注意抗疲劳能力。',
      warning: '既然借势，就要选准平台和规则，不要一边依附一边抗拒。',
      source_basis: COMMON_SOURCE.special,
    },
  },
  从官杀格: {
    formed: {
      personality: '自律、能承压，擅长在强规则和高要求环境中找到位置。',
      career_wealth: '适合权责清楚、层级明确、考核严格的平台，能以执行力换取职位和资源。',
      relationship_health: '关系中重责任与大局；健康上要给压力建立出口。',
      warning: '服从大局不等于失去判断，高压位置更要守规则和伦理。',
      source_basis: '《三命通会》弃命从杀可贵；《滴天髓》从杀顺势，忌食伤逆克。',
    },
    broken: {
      personality: '容易长期处于紧张感里，外顺内压，心理负荷较重。',
      career_wealth: '若逆势或制杀过重，职场容易受压、被动或卷入权责风险。',
      relationship_health: '关系可能受外部压力干扰；健康上宜重视压力管理和休息。',
      warning: '不合理要求要设边界，必要时换环境，不要长期硬扛。',
      source_basis: '《滴天髓》从杀被破则压力反成病；《子平真诠》从格须顺势。',
    },
    partial: {
      personality: '能理解纪律和平台价值，但仍会在服从与自我之间摆动。',
      career_wealth: '处于考核和站稳位置的阶段，平台有力但自身未完全巩固。',
      relationship_health: '关系中容易在意评价，健康上要保持作息和恢复。',
      warning: '先用稳定表现换信任，再逐步争取更大空间。',
      source_basis: COMMON_SOURCE.special,
    },
  },
  从儿格: {
    formed: {
      personality: '表达力、创造力和输出欲强，适合把才华持续转化成作品。',
      career_wealth: '适合内容、艺术、技术输出、教育传播和创意行业；食伤生财时更易变现。',
      relationship_health: '关系重沟通和精神共鸣；健康上要避免过度用脑和熬夜。',
      warning: '灵感要配商业化和资产化意识，别只输出不沉淀。',
      source_basis: '《滴天髓》从儿格以食伤顺泄为用，喜生财流通。',
    },
    broken: {
      personality: '想法过多而落地不足，情绪和表达容易失控。',
      career_wealth: '创意难以变现，或因缺乏团队、流程与现实承接而反复耗散。',
      relationship_health: '关系中需避免只凭感觉推进；健康上重视睡眠、神经紧张和节奏管理。',
      warning: '把发散收束成项目计划，找务实伙伴帮你落地。',
      source_basis: '《滴天髓》从儿见印破局；《子平真诠》从格忌逆势。',
    },
    partial: {
      personality: '灵感多，表达欲强，但传播渠道和商业承接还不足。',
      career_wealth: '才智初露，尚需平台、作品和受众验证。',
      relationship_health: '关系重交流但现实落地略弱，健康上要防用脑过度。',
      warning: '不要孤芳自赏，建立稳定输出节奏和反馈机制。',
      source_basis: COMMON_SOURCE.special,
    },
  },
  从势格: {
    formed: {
      personality: '适应力强，善于察觉环境趋势和多方关系。',
      career_wealth: '适合资源整合、平台协作和趋势型行业，能借势而起。',
      relationship_health: '关系中包容度较高，但要保留自己的核心原则；健康受环境影响较明显。',
      warning: '顺势不是随波逐流，要在机会中守住底线和判断。',
      source_basis: '《滴天髓》从势重引通助势，顺其旺势为佳。',
    },
    broken: {
      personality: '容易随环境摇摆，缺少稳定核心时会焦虑。',
      career_wealth: '外部趋势反复或依托失稳时，事业资源容易受牵动。',
      relationship_health: '关系里依附性可能偏强；健康上宜减少外部情绪污染。',
      warning: '局势混乱时先保全实力，不要盲目站队或跟风。',
      source_basis: '《滴天髓》从势遇逆行与混战为忌；《子平真诠》气势不清则难成。',
    },
    partial: {
      personality: '能看见风向，但自身筹码和判断力还在培养。',
      career_wealth: '事业在观察与选择阶段，还未完全吃到趋势红利。',
      relationship_health: '关系受环境影响较多，健康以稳定生活节奏为先。',
      warning: '先储备信息、人脉和技能，等趋势清楚再加码。',
      source_basis: COMMON_SOURCE.special,
    },
  },
  专旺格: {
    formed: {
      personality: '意志专一，信念感强，适合在一个方向深耕到很深。',
      career_wealth: '适合垂直领域、专业壁垒和长期主义路径，能靠专注形成影响力。',
      relationship_health: '关系中较专注但要求也高；健康上要避免过刚和单一节奏带来的失衡。',
      warning: '纯粹是优势，但要学会柔化表达，给外界留接口。',
      source_basis: '《滴天髓》旺极宜顺不宜逆；《三命通会》一气成象重纯粹。',
    },
    broken: {
      personality: '容易固执或偏执，遇不同意见时不易转弯。',
      career_wealth: '若被强行逆势克破，事业与财富可能出现明显波动。',
      relationship_health: '关系中避免把自我意志强加给对方；健康上宜留意过劳和紧绷。',
      warning: '势太专时，退一步反而是保护自己；低潮期不宜硬碰硬。',
      source_basis: '《滴天髓》旺极抑之反激；《三命通会》专旺忌逆其气势。',
    },
    partial: {
      personality: '有专注力和执着，但纯度还不足，容易被外界分心。',
      career_wealth: '方向已见雏形，仍需时间打磨专业深度。',
      relationship_health: '关系中要多体会对方感受，健康上注意劳损和作息。',
      warning: '把精力集中到核心优势上，少被短期机会分散。',
      source_basis: COMMON_SOURCE.special,
    },
  },
};

function normalizePatternName(patternName = '') {
  return PATTERN_NAME_ALIASES[patternName] || patternName;
}

function normalizeStatus(status = '') {
  return STATUS_MAP[status] || 'partial';
}

function getPatternStatement(patternName, status) {
  const key = normalizePatternName(patternName);
  const state = normalizeStatus(status);
  const patternRecord = PATTERN_STATEMENT_LIBRARY[key];
  if (!patternRecord) return null;
  return {
    ...patternRecord[state],
    statement_source: STATEMENT_SOURCE,
    statement_state: status && STATUS_MAP[status] ? status : (state === 'formed' ? 'FORMED' : state === 'broken' ? 'BROKEN' : 'PARTIAL'),
    normalized_state: state,
    pattern_name: key,
  };
}

module.exports = {
  PATTERN_STATEMENT_LIBRARY,
  STATEMENT_SOURCE,
  getPatternStatement,
};
