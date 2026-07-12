import {
  CalendarDays,
  CheckSquare,
  ForkKnife,
  ShoppingCart,
  SunMedium,
  type LucideIcon
} from 'lucide-react';

export type PageId = 'today' | 'tasks' | 'events' | 'shopping' | 'food';

export interface AppRoute {
  id: PageId;
  label: string;
  icon: LucideIcon;
}

export const routes: AppRoute[] = [
  { id: 'today', label: 'Today', icon: SunMedium },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'events', label: 'Events', icon: CalendarDays },
  { id: 'shopping', label: 'Shopping', icon: ShoppingCart },
  { id: 'food', label: 'Food', icon: ForkKnife }
];
