import { createI18n as createVueI18n } from 'vue-i18n';
import zhCN from './locales/zh-CN.mjs';
import enUS from './locales/en-US.mjs';

export const DEFAULT_LOCALE = 'zh-CN';
export const LOCALE_STORAGE_KEY = 'qimen-locale';
export const SUPPORTED_LOCALES = ['zh-CN', 'en-US'];

const localeAliases = {
  zh: 'zh-CN',
  'zh-CN': 'zh-CN',
  'zh-Hans': 'zh-CN',
  en: 'en-US',
  'en-US': 'en-US',
};

const messages = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

export function isSupportedLocale(locale) {
  return SUPPORTED_LOCALES.includes(locale);
}

export function normalizeLocale(locale) {
  if (!locale || typeof locale !== 'string') return DEFAULT_LOCALE;

  if (localeAliases[locale]) return localeAliases[locale];

  const language = locale.split('-')[0];
  return localeAliases[language] || DEFAULT_LOCALE;
}

function readPersistedLocale() {
  try {
    return globalThis.localStorage?.getItem(LOCALE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function readBrowserLocale() {
  return globalThis.navigator?.language || DEFAULT_LOCALE;
}

export function getInitialLocale() {
  return normalizeLocale(readPersistedLocale() || readBrowserLocale());
}

export function persistLocale(locale) {
  const normalizedLocale = normalizeLocale(locale);

  try {
    globalThis.localStorage?.setItem(LOCALE_STORAGE_KEY, normalizedLocale);
  } catch {
    // Ignore storage failures so private browsing or SSR-like tests still work.
  }

  return normalizedLocale;
}

export function createI18n(locale = getInitialLocale()) {
  return createVueI18n({
    legacy: false,
    globalInjection: true,
    locale: normalizeLocale(locale),
    fallbackLocale: DEFAULT_LOCALE,
    messages,
  });
}

const i18n = createI18n();

export default i18n;
