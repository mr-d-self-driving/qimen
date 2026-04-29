import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  createI18n,
  getInitialLocale,
  isSupportedLocale,
  normalizeLocale,
} from './index.mjs';

const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

afterEach(() => {
  restoreGlobal('localStorage', originalLocalStorage);
  restoreGlobal('navigator', originalNavigator);
});

function restoreGlobal(name, descriptor) {
  if (descriptor) {
    Object.defineProperty(globalThis, name, descriptor);
  } else {
    delete globalThis[name];
  }
}

function mockGlobal(name, value) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    value,
  });
}

test('detects and normalizes supported locales', () => {
  assert.equal(DEFAULT_LOCALE, 'zh-CN');
  assert.deepEqual(SUPPORTED_LOCALES, ['zh-CN', 'en-US']);
  assert.equal(isSupportedLocale('en-US'), true);
  assert.equal(isSupportedLocale('fr-FR'), false);
  assert.equal(normalizeLocale('en'), 'en-US');
  assert.equal(normalizeLocale('zh'), 'zh-CN');
  assert.equal(normalizeLocale('fr-FR'), 'zh-CN');
});

test('uses persisted locale before browser locale', () => {
  mockGlobal('localStorage', {
    getItem(key) {
      return key === 'qimen-locale' ? 'en-US' : null;
    },
  });
  mockGlobal('navigator', { language: 'zh-CN' });

  assert.equal(getInitialLocale(), 'en-US');
});

test('creates an i18n instance with expected messages', () => {
  const i18n = createI18n('en-US');

  assert.equal(i18n.global.locale.value, 'en-US');
  assert.equal(i18n.global.t('nav.qimen'), 'Qimen');
  assert.equal(i18n.global.t('nav.bazi'), 'Bazi');
  assert.equal(i18n.global.t('nav.fortune'), 'Fortune');
});
