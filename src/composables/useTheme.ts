import { ref, computed, watchEffect } from 'vue';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

export type ThemePreference = 'light' | 'dark' | 'system';

/**
 * Also read by the inline boot script in `index.html`, which applies the saved theme
 * before the bundle loads so the app never flashes the wrong colours. Keep the two in
 * step if this ever changes.
 */
export const THEME_STORAGE_KEY = 'cinelist:theme';

/** Must match `--surface-0` in the two palettes in `theme/variables.css`. */
const BASE_COLOR = { dark: '#0B0B0B', light: '#F6F7F9' } as const;

const preference = ref<ThemePreference>('system');
const systemPrefersDark = ref(false);

const isDark = computed(() =>
  preference.value === 'system' ? systemPrefersDark.value : preference.value === 'dark'
);

let initialised = false;

const persist = (value: ThemePreference) => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, value);
  } catch {
    // Some WebView privacy modes make localStorage throw. The theme still applies for
    // this session; it just will not be remembered.
  }
};

const syncNativeChrome = (dark: boolean) => {
  if (!Capacitor.isNativePlatform()) return;
  // The status bar is the one piece of chrome outside the WebView that we can tint.
  StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => undefined);
  StatusBar.setBackgroundColor({ color: dark ? BASE_COLOR.dark : BASE_COLOR.light }).catch(
    () => undefined
  );
};

/** Call once from `main.ts`. Safe to call again. */
export const initTheme = (): void => {
  if (initialised || typeof window === 'undefined') return;
  initialised = true;

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      preference.value = stored;
    }
  } catch {
    // Fall back to following the device.
  }

  const query = window.matchMedia('(prefers-color-scheme: dark)');
  systemPrefersDark.value = query.matches;
  query.addEventListener('change', event => {
    systemPrefersDark.value = event.matches;
  });

  watchEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('ion-palette-dark', isDark.value);
    root.style.colorScheme = isDark.value ? 'dark' : 'light';
    // The boot script paints a background inline to cover the gap before the stylesheet
    // arrives. Once Vue is driving, hand that back to the stylesheet.
    root.style.backgroundColor = '';
    syncNativeChrome(isDark.value);
  });
};

export const useTheme = () => {
  const setPreference = (value: ThemePreference) => {
    preference.value = value;
    persist(value);
  };

  return {
    preference,
    isDark,
    systemPrefersDark: computed(() => systemPrefersDark.value),
    setPreference,
    /** Flip light and dark. Resolves `system` first so the first tap always does something. */
    toggle: () => setPreference(isDark.value ? 'light' : 'dark')
  };
};
