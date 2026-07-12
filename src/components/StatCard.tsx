import type { LucideIcon } from 'lucide-react';
import { Text } from './Typography';

interface StatCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  tone?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  compact?: boolean;
}

const toneClasses: Record<NonNullable<StatCardProps['tone']>, string> = {
  blue: 'text-app-active',
  green: 'text-app-green',
  purple: 'text-app-purple',
  orange: 'text-app-orange',
  red: 'text-app-red'
};

export function StatCard({ icon: Icon, value, label, tone = 'blue', compact = false }: StatCardProps) {
  return (
    <div className={`meta-surface meta-surface--flat grid grid-cols-[2.5rem_auto] items-center justify-center gap-3 rounded-[1.1rem] border border-app-border p-3 ${compact ? 'min-h-[4.35rem]' : 'min-h-[6.5rem]'}`}>
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-app-contrast/10 bg-app-contrast/[0.035] ${toneClasses[tone]}`}>
        <Icon className="h-5 w-5" strokeWidth={2.3} />
      </div>
      <div className={`min-w-0 ${compact ? 'flex items-baseline gap-1.5' : ''}`}>
        <Text as="span" className={`${compact ? 'text-xl' : 'block text-2xl'} font-semibold leading-none text-app-fg`}>{value}</Text>
        <Text as="span" className={`${compact ? 'text-xs' : 'mt-1 block text-xs'} leading-tight`}>{label}</Text>
      </div>
    </div>
  );
}
