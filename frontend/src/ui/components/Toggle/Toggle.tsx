interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

const sizeStyles = {
  sm: {
    track: 'w-8 h-4',
    thumb: 'w-3 h-3',
    translate: 'translate-x-4',
  },
  md: {
    track: 'w-11 h-6',
    thumb: 'w-5 h-5',
    translate: 'translate-x-5',
  },
};

export function Toggle({ 
  checked, 
  onChange, 
  label, 
  description, 
  disabled, 
  size = 'md' 
}: ToggleProps) {
  const styles = sizeStyles[size];

  return (
    <label className={`flex items-start gap-3 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`
          relative inline-flex shrink-0 ${styles.track}
          rounded-full transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2
          ${checked ? 'bg-primary' : 'bg-border'}
        `}
      >
        <span
          className={`
            ${styles.thumb} rounded-full transition-transform duration-200
            pointer-events-none inline-block
            ${checked ? styles.translate : 'translate-x-0.5'}
            ${checked ? 'bg-white' : 'bg-white shadow'}
            mt-0.5
          `}
        />
      </button>
      {(label || description) && (
        <div className="flex-1">
          {label && <span className="text-sm font-medium text-text">{label}</span>}
          {description && <p className="text-xs text-text-secondary">{description}</p>}
        </div>
      )}
    </label>
  );
}
