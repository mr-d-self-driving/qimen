import { ref, computed } from 'vue'

const STORAGE_KEY = 'qimen-theme-preference'

const preference = ref('system') // 'light' | 'dark' | 'system'
const systemPrefersDark = ref(false)

export const themePreference = preference

export const resolvedTheme = computed(() =>
  preference.value === 'system'
    ? (systemPrefersDark.value ? 'dark' : 'light')
    : preference.value
)

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
}

export function setThemePreference(pref) {
  preference.value = pref
  localStorage.setItem(STORAGE_KEY, pref)
  // brief transition class so elements animate on change
  document.documentElement.classList.add('theme-transitioning')
  applyTheme(resolvedTheme.value)
  setTimeout(() => document.documentElement.classList.remove('theme-transitioning'), 400)
}

export function initTheme() {
  preference.value = localStorage.getItem(STORAGE_KEY) || 'system'

  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  systemPrefersDark.value = mq.matches
  mq.addEventListener('change', e => {
    systemPrefersDark.value = e.matches
    if (preference.value === 'system') {
      document.documentElement.classList.add('theme-transitioning')
      applyTheme(resolvedTheme.value)
      setTimeout(() => document.documentElement.classList.remove('theme-transitioning'), 400)
    }
  })

  // apply immediately with no transition (avoids flash)
  applyTheme(resolvedTheme.value)
}
