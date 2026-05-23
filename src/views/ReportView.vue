<template>
  <div class="report-view">
    <header id="siteHeader">
        <div class="site-logo">报告中心</div>
        <div class="header-actions">
        </div>
    </header>

    <div class="page-wrap">
        <div class="container">
            <div class="report-header">
                <div class="section-kicker">专属报告</div>
                <div class="section-title">全方位多维分析</div>
            </div>

            <div class="report-list">
                <!-- 第一份报告入口：合盘 wrapped.html -->
                <a href="/wrapped.html" class="report-card">
                    <div class="report-card-bg"></div>
                    <div class="report-card-content">
                        <div class="report-icon">✨</div>
                        <h3 class="report-title">八字双人合盘 · 朋友缘分</h3>
                        <p class="report-desc">查看你们在一起是充电还是漏电，深度洞察人际化学反应</p>
                    </div>
                </a>
                
                <!-- 预留未来其他报告 -->
            </div>
        </div>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.report-view {
  min-height: 100vh;
  padding-bottom: 100px;
}

#siteHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: transparent;
  z-index: 100;
  position: relative;
}

.site-logo {
  font-family: 'Syne', sans-serif;
  font-size: 18px;
  font-weight: 800;
  color: #D4AF37;
  letter-spacing: 1px;
}

.page-wrap {
  padding: 0 16px;
  max-width: 480px;
  margin: 0 auto;
}

.report-header {
  margin: 20px 0 30px;
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
  text-shadow: 0 0 20px rgba(255,255,255,0.1);
}

.report-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.report-card {
  display: flex;
  flex-direction: column;
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  text-decoration: none;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  transition: transform 0.2s, box-shadow 0.2s;
  min-height: 140px;
}

.report-card:active {
  transform: scale(0.97);
}

.report-card-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(204,255,0,0.08) 0%, rgba(107,143,255,0.08) 100%);
  z-index: 0;
}

.report-card-bg::before {
  content: '';
  position: absolute;
  top: -30px;
  right: -30px;
  width: 140px;
  height: 140px;
  background: rgba(204,255,0,0.15);
  border-radius: 50%;
  filter: blur(30px);
}

.report-card-bg::after {
  content: '';
  position: absolute;
  bottom: -20px;
  left: -20px;
  width: 100px;
  height: 100px;
  background: rgba(255,107,157,0.15);
  border-radius: 50%;
  filter: blur(25px);
}

.report-card-content {
  position: relative;
  z-index: 1;
  padding: 24px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
}

.report-icon {
  font-size: 28px;
  margin-bottom: 12px;
  display: inline-block;
  background: rgba(255, 255, 255, 0.1);
  width: 48px;
  height: 48px;
  line-height: 48px;
  text-align: center;
  border-radius: 12px;
  box-shadow: inset 0 0 10px rgba(255,255,255,0.05);
}

.report-title {
  font-family: 'Syne', sans-serif;
  font-size: 20px;
  font-weight: 800;
  color: #fff;
  margin-bottom: 6px;
  line-height: 1.2;
}

.report-desc {
  font-size: 13px;
  color: rgba(255,255,255,0.6);
  line-height: 1.5;
}
</style>
