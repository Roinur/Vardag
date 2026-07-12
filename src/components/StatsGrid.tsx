import type { ReactNode } from 'react';

export function StatsGrid({ children }: { children: ReactNode }) {
  return <div className="mb-5 grid grid-cols-2 gap-3">{children}</div>;
}
