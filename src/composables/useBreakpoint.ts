import { ref, computed, readonly } from 'vue';


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
