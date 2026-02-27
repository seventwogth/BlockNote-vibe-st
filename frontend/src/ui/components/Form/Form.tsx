import { HTMLAttributes, forwardRef, ReactNode } from 'react';

interface FormProps extends HTMLAttributes<HTMLFormElement> {}

export const Form = forwardRef<HTMLFormElement, FormProps>(({
  className = '',
  children,
  ...props
}, ref) => {
  return (
    <form
      ref={ref}
      className={`space-y-4 ${className}`}
      {...props}
    >
      {children}
    </form>
  );
});

Form.displayName = 'Form';

interface FormFieldProps extends HTMLAttributes<HTMLDivElement> {
  error?: string;
  hint?: string;
}

export const FormField = forwardRef<HTMLDivElement, FormFieldProps>(({
  error,
  hint,
  className = '',
  children,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={`space-y-1.5 ${className}`}
      {...props}
    >
      {children}
      {(error || hint) && (
        <p className={`text-xs ${error ? 'text-error' : 'text-text-secondary'}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
});

FormField.displayName = 'FormField';

interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const FormLabel = forwardRef<HTMLLabelElement, FormLabelProps>(({
  required,
  className = '',
  children,
  ...props
}, ref) => {
  return (
    <label
      ref={ref}
      className={`block text-sm font-medium text-text ${className}`}
      {...props}
    >
      {children}
      {required && <span className="text-error ml-1">*</span>}
    </label>
  );
});

FormLabel.displayName = 'FormLabel';

interface FormGroupProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
  description?: string;
}

export const FormGroup = forwardRef<HTMLDivElement, FormGroupProps>(({
  label,
  description,
  className = '',
  children,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={className}
      {...props}
    >
      {label && (
        <label className="block text-sm font-medium text-text mb-1.5">
          {label}
        </label>
      )}
      {description && (
        <p className="text-xs text-text-secondary mb-1.5">
          {description}
        </p>
      )}
      {children}
    </div>
  );
});

FormGroup.displayName = 'FormGroup';

interface FormActionsProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  align?: 'left' | 'right' | 'center' | 'between';
}

const alignStyles = {
  left: 'justify-start',
  right: 'justify-end',
  center: 'justify-center',
  between: 'justify-between',
};

export const FormActions = forwardRef<HTMLDivElement, FormActionsProps>(({
  align = 'right',
  className = '',
  children,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={`flex items-center gap-3 ${alignStyles[align]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

FormActions.displayName = 'FormActions';
