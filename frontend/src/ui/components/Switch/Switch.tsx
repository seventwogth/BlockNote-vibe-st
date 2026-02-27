import { InputHTMLAttributes, forwardRef } from 'react';

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
  error?: string;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(({
  label,
  description,
  error,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || `switch-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <div className="relative flex-shrink-0 mt-0.5">
        <input
          ref={ref}
          type="checkbox"
          id={inputId}
          className="peer sr-only"
          {...props}
        />
        <label
          htmlFor={inputId}
          className={`
            relative inline-flex h-6 w-11 cursor-pointer 
            rounded-full transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
            peer-checked:bg-primary peer-checked:focus:ring-primary/50
            peer-disabled:cursor-not-allowed peer-disabled:opacity-50
            bg-border peer-checked:bg-primary
            ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <span
            className={`
              pointer-events-none inline-block h-5 w-5 
              transform rounded-full bg-white shadow-md 
              ring-0 transition-transform duration-200
              translate-x-0.5 mt-0.5
              peer-checked:translate-x-[22px]
            `}
          />
        </label>
      </div>
      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <label htmlFor={inputId} className="text-sm font-medium text-text cursor-pointer">
              {label}
            </label>
          )}
          {description && (
            <span className="text-xs text-text-secondary mt-0.5">
              {description}
            </span>
          )}
          {error && (
            <span className="text-xs text-error mt-0.5">
              {error}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

Switch.displayName = 'Switch';
