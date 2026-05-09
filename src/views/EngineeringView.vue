<template>
  <div class="ev">
    <header class="eh">
      <router-link class="back" to="/" aria-label="返回首页">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3 6 8l4 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        返回
      </router-link>
      <div class="etitle">术数工程化</div>
      <AccountMenu />
    </header>

    <div class="sc">
      <!-- S1 首屏原则 -->
      <section class="ss">
        <div class="si">
          <div class="hero-grid">
            <div class="hero-copy">
              <p class="tag">AI NUMEROLOGY SYSTEM</p>
              <h1>先让规则落盘<br>再让模型开口</h1>
              <div class="p-list">
                <div v-for="p in principles" :key="p.t" class="p-item">
                  <span class="p-icon">{{ p.icon }}</span>
                  <div><strong>{{ p.t }}</strong><p>{{ p.b }}</p></div>
                </div>
              </div>
            </div>
            <div class="instr" aria-hidden="true">
              <div class="igrid">
                <span v-for="c in palace" :key="c">{{ c }}</span>
              </div>
              <div class="iread"><span>INPUT GATE</span><strong>先问清</strong></div>
            </div>
          </div>
        </div>
      </section>

      <!-- S2 架构分工 -->
      <section class="ss">
        <div class="si">
          <div class="sh"><div class="tag">SYSTEM ARCHITECTURE</div><h2>三层分工，各司其职</h2><p class="sub">语言模型擅长表达，却不擅长计算。把两件事分开，结论才能被验证、被复现。</p></div>
          <div class="arch-grid">
            <template v-for="(card, i) in archCards" :key="i">
              <div class="arch-card" :class="card.cls">
                <div class="atag">{{ card.tag }}</div>
                <h3>{{ card.title }}</h3>
                <ul><li v-for="item in card.items" :key="item">{{ item }}</li></ul>
              </div>
              <div v-if="i < 2" class="aarrow">→</div>
            </template>
          </div>
          <div class="fbar">
            <template v-for="(n, i) in flowNodes" :key="i">
              <span class="fnode">{{ n }}</span>
              <span v-if="i < flowNodes.length - 1" class="fline"></span>
            </template>
          </div>
        </div>
      </section>

      <!-- S3 奇门 -->
      <section class="ss">
        <div class="si">
          <div class="feat-grid">
            <div class="fl">
              <div class="sh"><div class="tag">QIMEN DUNJIA</div><h2>奇门遁甲</h2><p class="sub">根据提问时间自动起局，判断方位与时机。</p></div>
              <div class="flist">
                <div v-for="f in qimenF" :key="f.n" class="fitem"><div class="fnum">{{ f.n }}</div><div><strong>{{ f.t }}</strong><p>{{ f.b }}</p></div></div>
              </div>
            </div>
            <div class="fr">
              <div class="steps">
                <div v-for="(s, i) in qimenS" :key="i">
                  <div class="step"><div class="dot" :class="s.c"></div><div class="sbody"><strong>{{ s.t }}</strong><span>{{ s.b }}</span></div></div>
                  <div v-if="i < qimenS.length - 1" class="conn"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- S4 八字 -->
      <section class="ss">
        <div class="si">
          <div class="feat-grid">
            <div class="fl">
              <div class="sh"><div class="tag">BAZI ENGINE</div><h2>八字命盘</h2><p class="sub">根据出生时间排出四柱，结合岁运给出评分与建议。</p></div>
              <div class="flist">
                <div v-for="f in baziF" :key="f.n" class="fitem"><div class="fnum">{{ f.n }}</div><div><strong>{{ f.t }}</strong><p>{{ f.b }}</p></div></div>
              </div>
            </div>
            <div class="fr">
              <div class="steps">
                <div v-for="(s, i) in baziS" :key="i">
                  <div class="step"><div class="dot" :class="s.c"></div><div class="sbody"><strong>{{ s.t }}</strong><span>{{ s.b }}</span></div></div>
                  <div v-if="i < baziS.length - 1" class="conn"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- S5 运势 -->
      <section class="ss">
        <div class="si">
          <div class="sh"><div class="tag">FORTUNE ENGINE</div><h2>日运 · 月运 · 年运</h2><p class="sub">同一套评分引擎，覆盖三个时间维度。评分来自引擎，建议来自模型，互不干预。</p></div>
          <div class="frt-grid">
            <div v-for="f in fortuneCards" :key="f.p" class="frt-card">
              <div class="fp">{{ f.p }}</div>
              <div v-for="r in f.rows" :key="r.l" class="frow"><span class="flabel">{{ r.l }}</span><span>{{ r.v }}</span></div>
            </div>
          </div>
          <p class="enote">评分维度（三个时间维度通用）：调候 · 病药 · 通关 · 扶抑</p>
        </div>
      </section>

      <!-- S6 总结 -->
      <section class="ss">
        <div class="si">
          <div class="sh"><div class="tag">SUMMARY</div><h2>一套可验证的术数推演系统</h2></div>
          <div class="prm-row">
            <div v-for="p in promises" :key="p.t" class="prm"><span class="pck">✓</span><div><strong>{{ p.t }}</strong><p>{{ p.b }}</p></div></div>
          </div>
          <div class="cmp">
            <div class="cr hd"><span></span><span>普通 AI 算命</span><span>本系统</span></div>
            <div v-for="r in cmpRows" :key="r.l" class="cr"><span>{{ r.l }}</span><span class="neg">{{ r.bad }}</span><span class="pos">{{ r.good }}</span></div>
          </div>
          <div class="sum-ctas">
            <router-link class="btn-gold" to="/">开始使用</router-link>
            <router-link class="btn-teal" to="/">返回首页</router-link>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import AccountMenu from '../components/AccountMenu.vue'

const palace = ['巽','离','坤','震','中','兑','艮','坎','乾']

const principles = [
  { icon: '◈', t: '确定性优先', b: '时间、干支、宫位、评分全由规则引擎算出，不留给模型猜' },
  { icon: '◧', t: '边界分明', b: '模型只在已验证的结构化数据内做翻译，无法改写上游结论' },
  { icon: '↻', t: '可校准', b: '每次推演沉淀为样本，反馈闭环驱动持续迭代' },
]

const archCards = [
  { cls: 'uc', tag: '用户', title: '提供输入', items: ['出生时间与问题意图', '对推演结果的反馈', '调整与追问'] },
  { cls: 'ec', tag: '规则引擎', title: '确定性计算', items: ['节气、干支、九宫排盘', '五行强弱与格局评分', '大运流年打分'] },
  { cls: 'lc', tag: '大模型', title: '受限解读', items: ['将术语翻译成通俗建议', '不创造新的数字或结论', '在边界内组织语言'] },
]
const flowNodes = ['时间 & 问题', '排盘 & 评分', '结构化数据包', '行动建议']

const qimenF = [
  { n: '01', t: '自动起局', b: '输入时间，判断阳遁/阴遁，给出值符值使' },
  { n: '02', t: '九宫映射', b: '将时间转为宫位、奇门星、八门、八神的空间关系' },
  { n: '03', t: '方向与时机', b: '输出趋吉方位与行动时间窗口建议' },
]
const qimenS = [
  { c: '', t: '用户输入', b: '问题 + 提问时间' },
  { c: 'e', t: '干支历法引擎', b: '排出奇门盘，确定九宫格局' },
  { c: 'e', t: '吉凶评分', b: '判断旺衰宫位，输出结构化数据包' },
  { c: 'l', t: '大模型解读', b: '宫位关系翻译成行动建议（禁止创造宫位）' },
]

const baziF = [
  { n: '01', t: '四柱排盘', b: '年月日时天干地支，五行力量统计' },
  { n: '02', t: '格局识别', b: '自动判断从强、从弱或普通格，确认喜忌' },
  { n: '03', t: '岁运评分', b: '结合当前大运流年，从四个维度打出运势分数' },
]
const baziS = [
  { c: '', t: '出生时间', b: '年月日时转为四柱干支' },
  { c: 'e', t: '五行统计', b: '旺衰 + 喜忌 + 格局识别' },
  { c: 'e', t: '岁运引擎', b: '大运流年评分，输出结构化数据包' },
  { c: 'l', t: '大模型转译', b: '格局与评分翻译成建议（不判断强弱）' },
]

const fortuneCards = [
  { p: '日运', rows: [{ l: '数据来源', v: '当天流日干支 × 八字命盘' }, { l: '输出内容', v: '当日适合的行动方向' }] },
  { p: '月运', rows: [{ l: '数据来源', v: '流月干支 × 当前大运' }, { l: '输出内容', v: '月度趋势与注意事项' }] },
  { p: '年运', rows: [{ l: '数据来源', v: '流年干支 × 命格喜忌' }, { l: '输出内容', v: '年度规划参考与机会窗口' }] },
]

const promises = [
  { t: '结论有据可查', b: '每个判断都能追溯到引擎计算的原始数据' },
  { t: '错误可被识别', b: '用户反馈与历史推演对比，偏差一目了然' },
  { t: '边界持续收紧', b: '积累样本后规则与话术随反馈持续迭代' },
]
const cmpRows = [
  { l: '排盘来源', bad: '模型自由生成', good: '确定性引擎' },
  { l: '结论可验证', bad: '❌', good: '✅' },
  { l: '系统可迭代', bad: '靠调 Prompt', good: '反馈 → 规则 → 迭代' },
]
</script>

<style scoped>
/* ── Base ── */
*,*::before,*::after{box-sizing:border-box}
.ev{height:100vh;overflow:hidden;color:var(--text-primary);font-family:var(--font-sans,system-ui,sans-serif)}
.eh{position:fixed;top:0;left:0;right:0;z-index:220;height:60px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:0 20px;background:rgba(5,5,10,.72);border-bottom:1px solid rgba(255,255,255,.05);backdrop-filter:blur(24px) saturate(1.5);-webkit-backdrop-filter:blur(24px) saturate(1.5)}
.back{justify-self:start;display:inline-flex;align-items:center;gap:7px;color:rgba(240,237,230,.78);font-size:13px;text-decoration:none;transition:color .2s}
.back:hover{color:var(--gold-light)}
.etitle{font-family:var(--font-serif);color:var(--gold-light);font-size:17px;letter-spacing:.18em;filter:drop-shadow(0 0 12px rgba(212,175,55,.35))}
.eh :deep(.account-menu-wrap){justify-self:end}

/* ── Snap ── */
.sc{height:calc(100vh - 60px);margin-top:60px;overflow-y:scroll;scroll-snap-type:y mandatory;scrollbar-width:none}
.sc::-webkit-scrollbar{display:none}
.ss{height:100%;scroll-snap-align:start;display:flex;align-items:center;justify-content:center}
.si{width:min(1120px,calc(100vw - 32px));margin:0 auto;position:relative;z-index:1}

/* ── Shared ── */
.tag{color:var(--teal);font-size:10px;letter-spacing:.32em;margin-bottom:8px}
.sh h2{margin:4px 0 6px;font-family:var(--font-serif);font-size:clamp(20px,2.5vw,30px);font-weight:500;color:#F5EDD3}
.sub{margin:0;color:rgba(240,237,230,.6);font-size:14px;line-height:1.75}

/* ── S1 Hero ── */
.hero-grid{display:grid;grid-template-columns:minmax(0,.95fr) minmax(260px,.7fr);gap:36px;align-items:center}
.hero-copy h1{margin:4px 0 14px;font-family:var(--font-serif);font-size:clamp(32px,4vw,52px);font-weight:500;line-height:.98;color:#F8F0D8}
.p-list{display:flex;flex-direction:column;gap:8px;margin-bottom:16px}
.p-item{display:flex;align-items:flex-start;gap:10px}
.p-item p{margin:1px 0 0;font-size:12px;color:rgba(240,237,230,.62);line-height:1.5}
.p-item strong{font-size:13px;color:#F1E6C4}
.p-icon{flex:0 0 auto;width:28px;height:28px;display:grid;place-items:center;border:1px solid rgba(232,204,128,.3);border-radius:7px;color:var(--gold-light);font-size:13px;background:rgba(232,204,128,.06)}
.btn-gold,.btn-teal{display:inline-flex;align-items:center;min-height:44px;padding:0 18px;border-radius:12px;font-size:13px;letter-spacing:.06em;cursor:pointer;text-decoration:none;transition:transform .2s,box-shadow .2s}
.btn-gold{border:none;background:linear-gradient(135deg,#E8CC80,#B38B36);color:#130d00;font-weight:700;box-shadow:0 12px 30px rgba(179,139,54,.18)}
.btn-teal{border:1px solid rgba(78,205,196,.34);background:rgba(78,205,196,.06);color:rgba(207,255,250,.94)}
.btn-gold:hover,.btn-teal:hover{transform:translateY(-1px)}
.instr{position:relative;min-height:300px;display:grid;place-items:center;overflow:hidden;border:1px solid rgba(232,204,128,.16);border-radius:20px;background:radial-gradient(circle at 50% 45%,rgba(232,204,128,.12),transparent 38%),linear-gradient(145deg,rgba(255,255,255,.06),rgba(255,255,255,.018));box-shadow:0 22px 80px rgba(0,0,0,.3);animation:instrument-breathe 6s ease-in-out infinite}
.instr::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(232,204,128,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(232,204,128,.035) 1px,transparent 1px);background-size:31px 31px;mask-image:radial-gradient(circle,#000 18%,transparent 72%)}
.igrid{position:relative;z-index:1;width:min(280px,72vw);display:grid;grid-template-columns:repeat(3,1fr);gap:1px;border:1px solid rgba(232,204,128,.14);background:rgba(232,204,128,.1);border-radius:16px;overflow:hidden}
.igrid span{aspect-ratio:1;display:grid;place-items:center;background:rgba(5,5,10,.72);color:rgba(240,237,230,.38);font-family:var(--font-serif);font-size:26px;animation:palace-pulse 7.2s ease-in-out infinite}
.igrid span:nth-child(1){animation-delay:0s}
.igrid span:nth-child(2){animation-delay:.8s}
.igrid span:nth-child(3){animation-delay:1.6s}
.igrid span:nth-child(4){animation-delay:2.4s}
.igrid span:nth-child(5){animation-delay:3.2s}
.igrid span:nth-child(6){animation-delay:4s}
.igrid span:nth-child(7){animation-delay:4.8s}
.igrid span:nth-child(8){animation-delay:5.6s}
.igrid span:nth-child(9){animation-delay:6.4s}
.iread{position:absolute;left:20px;right:20px;bottom:20px;display:flex;align-items:center;justify-content:space-between;padding-top:14px;border-top:1px solid rgba(255,255,255,.07)}
.iread span{color:var(--text-muted);font-size:10px;letter-spacing:.2em}
.iread strong{color:var(--gold-light);font-family:var(--font-serif);font-size:20px;font-weight:500;animation:gate-readout 3.6s ease-in-out infinite}
@keyframes instrument-breathe{
  0%,100%{border-color:rgba(232,204,128,.16);box-shadow:0 22px 80px rgba(0,0,0,.3)}
  50%{border-color:rgba(232,204,128,.32);box-shadow:0 22px 90px rgba(212,175,55,.12)}
}
@keyframes palace-pulse{
  0%,68%,100%{color:rgba(240,237,230,.38);background:rgba(5,5,10,.72);text-shadow:none}
  12%,28%{color:#F8F0D8;background:linear-gradient(145deg,rgba(232,204,128,.14),rgba(5,5,10,.76));text-shadow:0 0 18px rgba(232,204,128,.45)}
}
@keyframes gate-readout{
  0%,100%{opacity:.7;filter:drop-shadow(0 0 0 rgba(232,204,128,0))}
  45%{opacity:1;filter:drop-shadow(0 0 12px rgba(232,204,128,.35))}
}
@media(prefers-reduced-motion:reduce){
  .instr,.igrid span,.iread strong{animation:none}
}

/* ── S2 Architecture ── */
.arch-grid{display:flex;align-items:stretch;gap:0;margin-top:14px}
.arch-card{flex:1;padding:14px 16px;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(255,255,255,.028);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
.arch-card h3{margin:6px 0 9px;font-family:var(--font-serif);font-size:16px;font-weight:500;color:#F1E6C4}
.arch-card ul{margin:0;padding-left:0;list-style:none;display:flex;flex-direction:column;gap:5px}
.arch-card ul li{font-size:12px;color:rgba(240,237,230,.68);padding-left:12px;position:relative}
.arch-card ul li::before{content:'·';position:absolute;left:0;color:var(--teal)}
.atag{display:inline-block;padding:2px 9px;border-radius:20px;font-size:10px;letter-spacing:.18em;font-weight:600}
.uc .atag{background:rgba(255,255,255,.07);color:rgba(240,237,230,.7)}
.ec .atag{background:rgba(232,204,128,.12);color:var(--gold-light)}
.lc .atag{background:rgba(78,205,196,.1);color:rgba(130,235,228,.9)}
.aarrow{flex:0 0 auto;width:40px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.2);font-size:20px}
.fbar{display:flex;align-items:center;margin-top:16px}
.fnode{padding:6px 14px;border:1px solid rgba(255,255,255,.1);border-radius:20px;font-size:12px;color:rgba(240,237,230,.72);white-space:nowrap}
.fline{flex:1;height:1px;background:linear-gradient(90deg,rgba(232,204,128,.3),rgba(78,205,196,.3))}

/* ── S3/S4 Feature screens ── */
.feat-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,.8fr);gap:48px;align-items:center}
.flist{display:flex;flex-direction:column;gap:10px;margin-top:14px}
.fitem{display:flex;align-items:flex-start;gap:10px}
.fitem strong{font-size:13px;color:#F1E6C4;display:block;margin-bottom:2px}
.fitem p{margin:0;font-size:12px;color:rgba(240,237,230,.6);line-height:1.5}
.fnum{flex:0 0 auto;font-family:var(--font-serif);font-size:16px;color:var(--gold-light);width:26px}
.steps{display:flex;flex-direction:column}
.step{display:flex;align-items:flex-start;gap:14px}
.sbody{display:flex;flex-direction:column;padding-bottom:4px}
.sbody strong{font-size:14px;color:#F1E6C4}
.sbody span{font-size:12px;color:rgba(240,237,230,.58);line-height:1.6;margin-top:2px}
.dot{flex:0 0 auto;width:10px;height:10px;border-radius:50%;margin-top:5px;background:rgba(240,237,230,.3);border:2px solid rgba(255,255,255,.15)}
.dot.e{background:rgba(232,204,128,.7);border-color:rgba(232,204,128,.4);box-shadow:0 0 8px rgba(212,175,55,.35)}
.dot.l{background:rgba(78,205,196,.7);border-color:rgba(78,205,196,.4);box-shadow:0 0 8px rgba(78,205,196,.35)}
.conn{width:1px;height:18px;background:rgba(255,255,255,.1);margin-left:4px}

/* ── S5 Fortune ── */
.frt-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:14px}
.frt-card{padding:16px;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(255,255,255,.028);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
.fp{font-family:var(--font-serif);font-size:22px;color:var(--gold-light);margin-bottom:16px}
.frow{display:flex;flex-direction:column;gap:3px;margin-bottom:12px}
.flabel{font-size:10px;letter-spacing:.18em;color:var(--text-muted)}
.frow span:last-child{font-size:13px;color:rgba(240,237,230,.8)}
.enote{margin-top:18px;font-size:12px;color:var(--text-muted);text-align:center;letter-spacing:.08em}

/* ── S6 Summary ── */
.prm-row{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:14px}
.prm{display:flex;gap:12px;padding:16px;border:1px solid rgba(255,255,255,.06);border-radius:14px;background:rgba(255,255,255,.02)}
.prm strong{font-size:14px;color:#F1E6C4;display:block;margin-bottom:4px}
.prm p{margin:0;font-size:12px;color:rgba(240,237,230,.58);line-height:1.6}
.pck{flex:0 0 auto;width:24px;height:24px;display:grid;place-items:center;border-radius:50%;background:rgba(78,205,196,.15);color:var(--teal);font-size:12px;font-weight:700;margin-top:1px}
.cmp{margin-top:12px;border:1px solid rgba(255,255,255,.07);border-radius:12px;overflow:hidden}
.cr{display:grid;grid-template-columns:1fr 1fr 1fr;border-bottom:1px solid rgba(255,255,255,.05)}
.cr:last-child{border-bottom:none}
.cr span{padding:8px 14px;font-size:12px;color:rgba(240,237,230,.75)}
.cr.hd span{font-size:10px;letter-spacing:.18em;color:var(--text-muted);padding:6px 14px;background:rgba(255,255,255,.02)}
.cr .neg{color:rgba(240,100,100,.7)}
.cr .pos{color:rgba(78,205,196,.9)}
.sum-ctas{display:flex;gap:12px;margin-top:16px}

/* ── Mobile ── */
@media(max-width:900px){
  .ev{height:auto;overflow:visible}
  .eh{position:sticky;left:auto;right:auto}
  .sc{height:auto;margin-top:0;overflow-y:visible;scroll-snap-type:none}
  .ss{height:auto;display:block;padding:40px 0}
  .si{width:min(100vw - 28px,1120px)}
  .hero-grid,.feat-grid{grid-template-columns:1fr}
  .instr{min-height:300px}
  .arch-grid{flex-direction:column}
  .aarrow{display:none}
  .frt-grid,.prm-row{grid-template-columns:1fr}
  .sum-ctas{flex-direction:column}
}
@media(max-width:520px){
  .eh{grid-template-columns:auto 1fr auto;padding:0 16px}
  .back{font-size:0;gap:0}
  .etitle{font-size:15px;text-align:center}
  .hero-copy h1{font-size:clamp(34px,12vw,52px)}
}
</style>
