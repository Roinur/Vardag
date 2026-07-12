import type { ReactNode } from 'react';
import { Heading, Text } from './Typography';

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <header className="page-header">
      <Heading level={1} className="page-header-title">
        {title}
      </Heading>
      {subtitle ? <Text className="page-header-subtitle">{subtitle}</Text> : null}
    </header>
  );
}
