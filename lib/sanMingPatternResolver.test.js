const test = require('node:test');
const assert = require('node:assert/strict');

const { resolveSanMingPattern } = require('./sanMingPatternResolver');

test('resolveSanMingPattern exposes display-only labels for reviewed SanMing/Shenfeng examples', () => {
  const cases = [
    {
      pillars: ['壬申', '己酉', '丁巳', '庚子'],
      name: '官印双全',
      methodTags: ['官印双全', '四干迭相']
    },
    {
      pillars: ['癸未', '乙卯', '丙戌', '戊子'],
      name: '相刑遇贵',
      methodTags: ['相刑遇贵', '子卯刑', '未戌刑']
    },
    {
      pillars: ['壬辰', '甲辰', '丙戌', '戊戌'],
      name: '天干顺食格',
      methodTags: ['天干顺食格', '壬食甲', '甲食丙', '丙食戊']
    },
    {
      pillars: ['甲寅', '戊辰', '丙午', '丙申'],
      name: '地支夹拱格',
      methodTags: ['地支夹拱格', '寅辰夹卯', '辰午夹巳', '午申夹未']
    },
    {
      pillars: ['癸亥', '癸亥', '癸丑', '癸丑'],
      name: '一气生成格',
      methodTags: ['一气生成格', '北方水乡', '秀气不杂']
    },
    {
      pillars: ['丙申', '丙申', '丙申', '癸巳'],
      name: '日禄归时格',
      methodTags: ['日禄归时', '官星坐禄', '用神坐贵', '财官双美']
    },
    {
      pillars: ['壬辰', '乙巳', '己亥', '庚午'],
      name: '日禄归时格',
      methodTags: ['日禄归时', '归禄逢伤官', '伤官去煞', '生出财气']
    },
    {
      pillars: ['己亥', '丙寅', '丁丑', '丙午'],
      name: '日禄归时格',
      methodTags: ['日禄归时', '归禄逢财', '自坐财库', '食神制官煞']
    },
    {
      pillars: ['庚寅', '己卯', '乙亥', '癸未'],
      name: '正官格',
      methodTags: ['官清印正', '未卯拱木', '格正局清']
    },
    {
      pillars: ['戊辰', '丙辰', '甲寅', '甲子'],
      name: '食神生财格',
      methodTags: ['食神生财']
    },
    {
      pillars: ['乙酉', '庚辰', '甲寅', '庚午'],
      name: '阳刃格',
      methodTags: ['木旺见金', '杀刃相合']
    },
    {
      pillars: ['癸丑', '戊午', '丙午', '壬辰'],
      name: '合官留杀格',
      methodTags: ['合官留杀', '晦火存水', '戊癸合化忌']
    },
    {
      pillars: ['癸巳', '戊午', '丙午', '壬辰'],
      name: '合官留杀格',
      methodTags: ['合官留杀', '戊癸合化', '阳刃猖狂', '无金滋助', '清枯之象']
    },
    {
      pillars: ['壬戌', '己酉', '戊午', '丁巳'],
      name: '伤官格',
      methodTags: ['伤官兼用财印', '印太重而带财', '丁与壬不相碍']
    },
    {
      pillars: ['甲寅', '庚午', '戊申', '甲寅'],
      name: '阳刃格',
      methodTags: ['阳刃', '煞两透', '根太重', '食以制之']
    },
    {
      pillars: ['庚辰', '己卯', '壬辰', '庚子'],
      name: '伤官格',
      methodTags: ['伤官吐秀', '卯木为用', '酉冲破用']
    },
    {
      pillars: ['己丑', '戊辰', '丁巳', '庚戌'],
      name: '穷通丁辰庚金泄土格',
      methodTags: ['土重晦光', '庚金泄土', '无金运失用']
    },
    {
      pillars: ['乙丑', '己卯', '乙亥', '癸未'],
      name: '曲直格',
      methodTags: ['春木成局', '四柱无金', '曲直仁寿']
    },
    {
      pillars: ['壬寅', '丁未', '己卯', '乙亥'],
      name: '从杀格',
      methodTags: ['亥卯未木局', '从其旺势', '从杀格']
    },
    {
      pillars: ['辛丑', '辛丑', '己酉', '丙寅'],
      name: '伤官生财',
      methodTags: ['冬土寒湿', '过泄', '调候取用', '丙火']
    },
    {
      pillars: ['辛巳', '甲午', '癸卯', '癸亥'],
      name: '财旺生官',
      methodTags: ['财旺生官', '去火存金', '体用不伤']
    },
    {
      pillars: ['乙亥', '丁亥', '乙丑', '丙戌'],
      name: '正印格',
      methodTags: ['正印格', '印绶', '天德']
    },
    {
      pillars: ['丁未', '癸卯', '癸亥', '癸丑'],
      name: '食神格',
      methodTags: ['食神格', '食神生财', '身强食旺', '财透']
    },
    {
      pillars: ['丁丑', '壬寅', '己巳', '丙寅'],
      name: '正官格',
      methodTags: ['正官格', '官格用印', '丁壬合', '制伤官清']
    },
    {
      pillars: ['己卯', '丙子', '庚寅', '辛巳'],
      name: '伤官格',
      methodTags: ['伤官格', '伤官带杀', '用伤官制杀', '财为忌']
    }
  ];

  cases.forEach(({ pillars, name, methodTags }) => {
    const result = resolveSanMingPattern({ pillars });
    assert.equal(result.name, name);
    assert.deepEqual(result.methodTags, methodTags);
    assert.equal(result.scoreScope, 'display_only');
  });
});
