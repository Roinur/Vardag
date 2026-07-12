import type { ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';

interface IconCircleProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  tone?: 'blue' | 'green' | 'purple' | 'orange' | 'muted' | 'red';
}

const toneClasses: Record<NonNullable<IconCircleProps['tone']>, string> = {
  blue: 'text-app-active bg-app-active/12 border-app-active/35',
  green: 'text-app-green bg-app-green/12 border-app-green/35',
  purple: 'text-app-purple bg-app-purple/12 border-app-purple/35',
  orange: 'text-app-orange bg-app-orange/12 border-app-orange/35',
  muted: 'text-app-muted bg-app-contrast/5 border-app-contrast/15',
  red: 'text-app-red bg-app-red/12 border-app-red/35'
};

export function IconCircle({ icon: Icon, label, tone = 'muted', className = '', ...props }: IconCircleProps) {
  return (
    <button
      aria-label={label}
      title={label}
      className={[
        'grid h-12 w-12 shrink-0 place-items-center rounded-full border transition active:scale-95',
        toneClasses[tone],
        className
      ].join(' ')}
      type="button"
      {...props}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
