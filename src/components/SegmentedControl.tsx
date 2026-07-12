import { SlidingControl } from './SlidingControl';

interface SegmentedControlProps<T extends string> {
  value: T;
  options: readonly T[];
  labels?: Partial<Record<T, string>>;
  onChange: (value: T) => void;
  ariaLabel?: string;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  labels,
  onChange,
  ariaLabel = 'View'
}: SegmentedControlProps<T>) {
  return (
    <SlidingControl
      value={value}
      options={options.map((option) => ({ value: option, label: labels?.[option] ?? option }))}
      onChange={onChange}
      ariaLabel={ariaLabel}
      className="mb-5"
    />
  );
}
