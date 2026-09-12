import { ref, computed, readonly } from 'vue';

/**
 * The one place the app decides what counts as a small screen.
 *
 * State and the resize listener live at module scope, so every caller shares a single
 * listener and the shell and the page headers can never disagree about whether the side
 * menu is available. The old per-component version attached a listener it never removed.
 *
 * The upper bound is 767.98 rather than 768 on purpose. A `max-width: 768px` rule and a
 * `min-width: 768px` rule both match at exactly 768px, which is how two different poster
 * heights ended up applying at that one width.
 */
export const MOBILE_MAX = 767.98;
export const DESKTOP_MIN = 1024;

const width = ref(typeof window === 'undefined' ? DESKTOP_MIN : window.innerWidth);

let started = false;
let frame = 0;

const startListening = () => {
  if (started || typeof window === 'undefined') return;
  started = true;

  window.addEventListener('resize', () => {
    // Coalesce the burst of events a drag or a rotation produces into one update.
    if (frame) return;
    frame = requestAnimationFrame(() => {
      width.value = window.innerWidth;
      frame = 0;
    });
  });
};

export const useBreakpoint = () => {
  startListening();

  return {
    width: readonly(width),
    isMobile: computed(() => width.value <= MOBILE_MAX),
    isDesktop: computed(() => width.value >= DESKTOP_MIN)
  };
};
