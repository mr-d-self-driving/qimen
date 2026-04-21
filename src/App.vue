<template>
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
