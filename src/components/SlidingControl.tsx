import type { CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Text } from './Typography';

export interface SlidingControlOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  activeClassName?: string;
}

interface SlidingControlProps<T extends string> {
  value: T;
  options: readonly SlidingControlOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
  compact?: boolean;
}

export function SlidingControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className = '',
  compact = false
}: SlidingControlProps<T>) {
  const activeIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const style = {
    '--segment-count': options.length,
    '--active-index': activeIndex
  } as CSSProperties;

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`sliding-control accent-control ${className}`}
      style={style}
    >
      <span className="sliding-control__indicator" aria-hidden="true" />
      {options.map((option) => {
        const active = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={`sliding-control__option ${compact ? 'sliding-control__option--compact' : ''} ${
              active ? option.activeClassName ?? 'text-app-fg' : 'text-app-muted'
            }`}
            onClick={() => onChange(option.value)}
          >
            {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
            <Text as="span" className="sliding-control__label min-w-0 text-inherit">
              {option.label}
            </Text>
          </button>
        );
      })}
    </div>
  );
}
