export interface SelectorOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  color?: string;
  category?: string;
}

export interface SegmentedControlProps<T = string> {
  options: SelectorOption<T>[];
  value: T | T[];
  onChange: (value: T | T[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
  showSelectAll?: boolean;
  selectAllLabel?: string;
  deselectAllLabel?: string;
}

export interface DropdownSelectProps<T = string> {
  options: SelectorOption<T>[];
  value: T;
  onChange: (value: T) => void;
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  categories?: { value: string; label: string }[];
  defaultCategory?: string;
  className?: string;
  renderValue?: (option: SelectorOption<T>) => React.ReactNode;
  renderOption?: (option: SelectorOption<T>, isSelected: boolean) => React.ReactNode;
  noOptionsMessage?: string;
}

export interface MultiSelectProps<T = string> {
  options: SelectorOption<T>[];
  value: T[];
  onChange: (value: T[]) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
  showSelectAll?: boolean;
  selectAllLabel?: string;
  deselectAllLabel?: string;
  maxVisible?: number;
}
