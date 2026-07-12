import { Check } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

interface CheckCircleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  checked: boolean;
  label: string;
}

export function CheckCircleButton({ checked, label, className = '', ...props }: CheckCircleButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={[
        'grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 transition active:scale-95',
        checked ? 'border-app-green bg-app-green text-[#061528]' : 'border-app-muted/80 text-transparent',
        className
      ].join(' ')}
      {...props}
    >
      <Check className="h-5 w-5" strokeWidth={3} />
    </button>
  );
}
