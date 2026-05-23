<template>
  <div class="report-view">
    <header id="siteHeader">
      <div class="header-side"></div>
      <div class="site-logo">报告中心</div>
      <div class="header-side header-actions">
        <AccountMenu />
      </div>
    </header>

    <div class="page-wrap">
      <div class="container">
        <div class="report-header">
          <div class="section-kicker">专属报告</div>
          <div class="section-title">全方位多维分析</div>
          <div class="section-sub">深挖你的命局，从关系、运势到格局</div>
        </div>

        <div class="report-list">
          <!-- 合盘报告 -->
          <a href="/wrapped.html" class="report-card card-friendship">
            <div class="card-glow"></div>
            <div class="report-card-content">
              <div class="card-top-row">
                <div class="report-icon">✨</div>
                <span class="card-tag">限时免费</span>
              </div>
              <h3 class="report-title">八字双人合盘</h3>
              <p class="report-subtitle">朋友缘分</p>
              <p class="report-desc">你们在一起是充电还是漏电？五个维度深测人际化学反应</p>
              <div class="card-dims">
                <span>同频</span>
                <span>义气</span>
                <span>消耗</span>
                <span>成长</span>
                <span>钱财</span>
              </div>
            </div>
            <div class="card-arrow">→</div>
          </a>

          <!-- 占位卡 1 -->
          <div class="report-card card-locked">
            <div class="card-glow card-glow-blue"></div>
            <div class="report-card-content">
              <div class="card-top-row">
                <div class="report-icon report-icon-dim">🔮</div>
                <span class="card-tag card-tag-soon">即将上线</span>
              </div>
              <h3 class="report-title report-title-dim">本命大运推演</h3>
              <p class="report-subtitle report-subtitle-dim">流年运势</p>
              <p class="report-desc">逐年解析大运流年，识别关键节点</p>
            </div>
            <div class="locked-badge">🔒</div>
          </div>

          <!-- 占位卡 2 -->
          <div class="report-card card-locked">
            <div class="card-glow card-glow-red"></div>
            <div class="report-card-content">
              <div class="card-top-row">
                <div class="report-icon report-icon-dim">💼</div>
                <span class="card-tag card-tag-soon">即将上线</span>
              </div>
              <h3 class="report-title report-title-dim">事业财运报告</h3>
              <p class="report-subtitle report-subtitle-dim">格局分析</p>
              <p class="report-desc">用神喜忌、财官格局与行动策略</p>
            </div>
            <div class="locked-badge">🔒</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import AccountMenu from '../components/AccountMenu.vue'
</script>

<style scoped>
.report-view {
  min-height: 100vh;
  padding-bottom: 100px;
}

#siteHeader {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 14px 16px;
  background: transparent;
  z-index: 100;
  position: relative;
}

.site-logo {
  font-family: 'Syne', sans-serif;
  font-size: 17px;
  font-weight: 800;
  color: #D4AF37;
  letter-spacing: 0.08em;
  text-align: center;
  white-space: nowrap;
}

.header-side {
  display: flex;
  align-items: center;
}

.header-actions {
  justify-content: flex-end;
  gap: 12px;
}

.page-wrap {
  padding: 0 16px;
  max-width: 480px;
  margin: 0 auto;
}

.report-header {
  margin: 12px 0 24px;
}

.section-kicker {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(212, 175, 55, 0.8);
  margin-bottom: 6px;
}

.section-title {
  font-family: 'Syne', sans-serif;
  font-size: 28px;
  font-weight: 800;
  color: #fff;
  line-height: 1.1;
  margin-bottom: 6px;
}

.section-sub {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.45);
}

.report-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── Base card ── */
.report-card {
  display: block;
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  text-decoration: none;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  padding: 22px 20px;
}

.report-card:not(.card-locked):active {
  transform: scale(0.97);
}

/* ── Active card hover ── */
.card-friendship {
  border-color: rgba(204, 255, 0, 0.18);
  cursor: pointer;
}
.card-friendship:hover {
  border-color: rgba(204, 255, 0, 0.35);
  box-shadow: 0 0 32px rgba(204, 255, 0, 0.08);
}

/* ── Locked card ── */
.card-locked {
  opacity: 0.55;
  cursor: default;
}

/* ── Glow orbs ── */
.card-glow {
  position: absolute;
  top: -40px;
  right: -40px;
  width: 160px;
  height: 160px;
  background: radial-gradient(circle, rgba(204, 255, 0, 0.18) 0%, transparent 70%);
  pointer-events: none;
  border-radius: 50%;
}
.card-glow-blue {
  background: radial-gradient(circle, rgba(107, 143, 255, 0.2) 0%, transparent 70%);
}
.card-glow-red {
  background: radial-gradient(circle, rgba(255, 107, 157, 0.2) 0%, transparent 70%);
}

/* ── Card content ── */
.report-card-content {
  position: relative;
  z-index: 1;
}

.card-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.report-icon {
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.report-icon-dim {
  filter: grayscale(0.5);
  opacity: 0.7;
}

.card-tag {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.05em;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(204, 255, 0, 0.12);
  color: #CCFF00;
  border: 1px solid rgba(204, 255, 0, 0.25);
}

.card-tag-soon {
  background: rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.4);
  border-color: rgba(255, 255, 255, 0.12);
}

.report-title {
  font-family: 'Syne', sans-serif;
  font-size: 20px;
  font-weight: 800;
  color: #fff;
  margin-bottom: 2px;
  line-height: 1.2;
}

.report-title-dim {
  color: rgba(255, 255, 255, 0.7);
}

.report-subtitle {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.12em;
  color: rgba(212, 175, 55, 0.7);
  text-transform: uppercase;
  margin-bottom: 8px;
}

.report-subtitle-dim {
  color: rgba(255, 255, 255, 0.3);
}

.report-desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.5;
  margin-bottom: 14px;
}

.card-dims {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.card-dims span {
  font-size: 11px;
  padding: 3px 9px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.55);
}

.card-arrow {
  position: absolute;
  bottom: 20px;
  right: 20px;
  font-size: 18px;
  color: rgba(204, 255, 0, 0.6);
  z-index: 1;
  transition: transform 0.2s, color 0.2s;
}

.card-friendship:hover .card-arrow {
  transform: translateX(3px);
  color: #CCFF00;
}

.locked-badge {
  position: absolute;
  bottom: 20px;
  right: 20px;
  font-size: 16px;
  z-index: 1;
}
</style>
