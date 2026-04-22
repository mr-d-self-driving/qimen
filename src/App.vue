<template>
  <canvas ref="cosmosCanvas" id="cosmosCanvas"></canvas>
  <div class="bg-radial"></div>

  <router-view v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>

  <nav id="globalBottomNav">
    <router-link to="/" class="nav-item" active-class="active">
      <div class="nav-icon">🧭</div>
      <div class="nav-label">奇门</div>
    </router-link>
    <router-link to="/bazi" class="nav-item" active-class="active">
      <div class="nav-icon">🧬</div>
      <div class="nav-label">八字</div>
    </router-link>
    <router-link to="/me" class="nav-item" active-class="active">
      <div class="nav-icon">👤</div>
      <div class="nav-label">我的</div>
    </router-link>
  </nav>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const cosmosCanvas = ref(null)
let animationId = null

const initVisuals = () => {
    if(!cosmosCanvas.value) return
    const canvas = cosmosCanvas.value
    const ctx = canvas.getContext('2d')
    let W, H, stars = []
    
    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight }
    const draw = () => {
        ctx.clearRect(0,0,W,H)
        stars.forEach(s => {
            s.a += s.speed*0.008; s.x += s.drift; 
            if(s.x < 0) s.x = W; if(s.x > W) s.x = 0;
            ctx.save(); ctx.globalAlpha = ((Math.sin(s.a)+1)/2)*0.5+0.05
            ctx.fillStyle = '#E8CC80'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill(); ctx.restore()
        })
        
        // Connect nearby stars with lines (optional aesthetic from old index)
        for(let i=0; i<stars.length; i++){
            for(let j=i+1; j<stars.length; j++){
                const dx = stars[i].x - stars[j].x, dy = stars[i].y - stars[j].y, dist = Math.sqrt(dx*dx+dy*dy)
                if(dist < 90){
                    ctx.save(); ctx.globalAlpha = (1-dist/90)*0.035; ctx.strokeStyle = '#B38B36'; ctx.lineWidth = .5;
                    ctx.beginPath(); ctx.moveTo(stars[i].x, stars[i].y); ctx.lineTo(stars[j].x, stars[j].y); ctx.stroke(); ctx.restore()
                }
            }
        }
        animationId = requestAnimationFrame(draw)
    }
    resize()
    stars = Array.from({length: 100}, () => ({x:Math.random()*W, y:Math.random()*H, r:Math.random()*0.9+0.2, a:Math.random(), speed:(Math.random()*0.3+0.05)*(Math.random()>.5?1:-1), drift:(Math.random()-.5)*0.1}))
    draw()
    window.addEventListener('resize', resize)
}

onMounted(() => {
    initVisuals()
})

onUnmounted(() => {
    if (animationId) cancelAnimationFrame(animationId)
})
</script>

<style scoped>
/* 这里放底部导航的 CSS */
#globalBottomNav {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999;
    height: calc(65px + env(safe-area-inset-bottom));
    background: rgba(14, 14, 31, 0.88);
    backdrop-filter: blur(40px) saturate(1.6);
    border-top: 1px solid rgba(212,175,55,0.22);
    display: flex; justify-content: space-around; align-items: center;
    padding-bottom: env(safe-area-inset-bottom);
}
.nav-item {
    flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;
    color: #8E8E93; text-decoration: none; transition: color 0.3s;
}
.nav-item.active { color: #D4AF37; }
.nav-icon { font-size: 22px; }
.nav-label { font-size: 10px; font-weight: 600; letter-spacing: 1px; }

/* 丝滑的页面切换动画 */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
