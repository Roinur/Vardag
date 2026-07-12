import type { HTMLAttributes, ReactNode } from 'react';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padded?: boolean;
  interactive?: boolean;
  variant?: 'quiet' | 'flat';
}

export function GlassCard({
  children,
  className = '',
  padded = true,
  interactive = false,
  variant = 'quiet',
  ...props
}: GlassCardProps) {
  return (
    <div
      className={[
        `meta-surface meta-surface--${variant} rounded-[1.25rem] border border-app-border`,
        padded ? 'p-4 xs:p-5' : '',
        interactive ? 'transition active:scale-[0.99]' : '',
        className
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}
