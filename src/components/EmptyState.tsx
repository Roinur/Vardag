import type { LucideIcon } from 'lucide-react';
import { Text } from './Typography';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body: string;
}

export function EmptyState({ icon: Icon, title, body }: EmptyStateProps) {
  return (
    <div className="rounded-[1.1rem] border border-dashed border-app-contrast/12 bg-app-contrast/[0.035] p-4 text-center">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full border border-app-contrast/15 bg-app-contrast/5 text-app-muted">
        <Icon className="h-6 w-6" />
      </div>
      <Text className="font-semibold text-app-fg">{title}</Text>
      <Text className="mt-1 text-sm">{body}</Text>
    </div>
  );
}
