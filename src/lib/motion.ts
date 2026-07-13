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
