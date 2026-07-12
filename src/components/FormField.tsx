import type { ReactNode } from 'react';
import { Text } from './Typography';

interface FormFieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
}

export function FormField({ label, hint, children }: FormFieldProps) {
  return (
    <label className="block min-w-0">
      <Text as="span" className="mb-1.5 block text-xs font-semibold text-app-fg">
        {label}
      </Text>
      {children}
      {hint ? <Text className="mt-1.5 text-xs">{hint}</Text> : null}
    </label>
  );
}
