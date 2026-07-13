export type HapticKind = 'light' | 'success' | 'family';

export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const haptic = (kind: HapticKind = 'light'): void => {
  if (!('vibrate' in navigator)) return;
  const pattern: Record<HapticKind, number | number[]> = {
    light: 10,
    success: [12, 24, 16],
    family: [8, 18, 8]
  };
  navigator.vibrate(pattern[kind]);
};

export const signalRealtimeArrival = (): void => {
  if (prefersReducedMotion()) return;
  const root = document.documentElement;
  root.classList.remove('has-realtime-arrival');
  requestAnimationFrame(() => {
    root.classList.add('has-realtime-arrival');
    window.setTimeout(() => root.classList.remove('has-realtime-arrival'), 420);
  });
};
