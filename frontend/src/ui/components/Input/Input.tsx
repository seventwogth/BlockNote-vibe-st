import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';

type InputSize = 'sm' | 'md' | 'lg';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  inputSize?: InputSize;
  error?: boolean;
  errorMessage?: string;
  label?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const sizeStyles: Record<InputSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-3 text-base',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  inputSize = 'md',
  error = false,
  errorMessage,
  label,
  hint,
  leftIcon,
  rightIcon,
  fullWidth = true,
  className = '',
  disabled,
  id,
  ...props
}, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label 
          htmlFor={inputId} 
          className="block text-sm font-medium text-text mb-1.5"
        >
          {label}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
            {leftIcon}
          </div>
        )}
        
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={`
            w-full rounded-md border bg-surface text-text
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-0
            disabled:opacity-50 disabled:cursor-not-allowed
            ${leftIcon ? 'pl-10' : ''}
            ${rightIcon ? 'pr-10' : ''}
            ${error 
              ? 'border-error focus:border-error focus:ring-error/20' 
              : 'border-border focus:border-primary focus:ring-primary/20'
            }
            ${sizeStyles[inputSize]}
            ${className}
          `}
          {...props}
        />
        
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary">
            {rightIcon}
          </div>
        )}
      </div>

      {errorMessage && (
        <p className="mt-1.5 text-sm text-error">{errorMessage}</p>
      )}
      {hint && !errorMessage && (
        <p className="mt-1.5 text-sm text-text-secondary">{hint}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  errorMessage?: string;
  label?: string;
  hint?: string;
  fullWidth?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  error = false,
  errorMessage,
  label,
  hint,
  fullWidth = true,
  className = '',
  disabled,
  id,
  ...props
}, ref) => {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label 
          htmlFor={textareaId} 
          className="block text-sm font-medium text-text mb-1.5"
        >
          {label}
        </label>
      )}
      
      <textarea
        ref={ref}
        id={textareaId}
        disabled={disabled}
        className={`
          w-full rounded-md border bg-surface text-text
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-0
          disabled:opacity-50 disabled:cursor-not-allowed
          px-3 py-2 text-sm
          ${error 
            ? 'border-error focus:border-error focus:ring-error/20' 
            : 'border-border focus:border-primary focus:ring-primary/20'
          }
          ${className}
        `}
        {...props}
      />

      {errorMessage && (
        <p className="mt-1.5 text-sm text-error">{errorMessage}</p>
      )}
      {hint && !errorMessage && (
        <p className="mt-1.5 text-sm text-text-secondary">{hint}</p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';
