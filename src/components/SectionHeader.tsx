import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Heading, Text } from './Typography';

interface SectionHeaderProps {
  title: string;
  icon?: ReactNode;
  action?: string;
  actionIcon?: ReactNode;
  onAction?: () => void;
}

export function SectionHeader({ title, icon, action, actionIcon, onAction }: SectionHeaderProps) {
  return (
    <div className="mb-3 flex items-center gap-3">
      {icon}
      <Heading level={2} className="min-w-0 flex-1 text-xl">
        {title}
      </Heading>
      {action && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="flex items-center gap-1 rounded-full px-2 py-1 text-app-muted transition hover:text-app-fg"
        >
          <Text as="span" className="text-sm text-inherit">
            {action}
          </Text>
          {actionIcon ?? <ChevronRight className="h-4 w-4" />}
        </button>
      ) : action ? (
        <Text as="span" className="rounded-full px-2 py-1 text-sm">
          {action}
        </Text>
      ) : null}
    </div>
  );
}
