import type { CSSProperties } from 'react';

interface ShoppingProgressProps {
  bought: number;
  total: number;
  label: string;
}

export function ShoppingProgress({ bought, total, label }: ShoppingProgressProps) {
  const progress = total > 0 ? Math.min(1, Math.max(0, bought / total)) : 0;
  const style = { '--shopping-progress': `${progress * 100}%` } as CSSProperties;

  return (
    <div
      className="shopping-progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      style={style}
    >
      <span className="shopping-progress__fill" />
    </div>
  );
}
