import { useState, useCallback, forwardRef, HTMLAttributes } from 'react';

interface SliderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  showValue?: boolean;
  label?: string;
  onChange?: (value: number) => void;
}

export const Slider = forwardRef<HTMLDivElement, SliderProps>(({
  value: controlledValue,
  defaultValue = 0,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  showValue = false,
  label,
  onChange,
  className = '',
  ...props
}, ref) => {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const value = controlledValue ?? internalValue;

  const handleChange = useCallback((newValue: number) => {
    if (disabled) return;
    
    const clampedValue = Math.min(Math.max(newValue, min), max);
    const steppedValue = Math.round(clampedValue / step) * step;
    
    setInternalValue(steppedValue);
    onChange?.(steppedValue);
  }, [min, max, step, disabled, onChange]);

  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div ref={ref} className={`space-y-2 ${className}`} {...props}>
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && (
            <label className="text-sm font-medium text-text">
              {label}
            </label>
          )}
          {showValue && (
            <span className="text-sm text-text-secondary">
              {value}
            </span>
          )}
        </div>
      )}
      
      <div className="relative">
        <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-75"
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => handleChange(Number(e.target.value))}
          className="
            absolute inset-0 w-full h-full opacity-0 cursor-pointer
            disabled:cursor-not-allowed disabled:opacity-50
          "
        />
        
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-primary rounded-full shadow-md transition-all duration-75 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/50"
          style={{ left: `calc(${percentage}% - 8px)` }}
        />
      </div>
    </div>
  );
});

Slider.displayName = 'Slider';

interface RangeSliderProps {
  value?: [number, number];
  defaultValue?: [number, number];
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  showValue?: boolean;
  label?: string;
  className?: string;
  onChange?: (value: [number, number]) => void;
}

export const RangeSlider = forwardRef<HTMLDivElement, RangeSliderProps>(({
  value: controlledValue,
  defaultValue = [0, 100],
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  showValue = false,
  label,
  onChange,
  className = '',
  ...props
}, ref) => {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const value = controlledValue ?? internalValue;

  const handleChange = useCallback((index: number, newValue: number) => {
    if (disabled) return;
    
    const clampedValue = Math.min(Math.max(newValue, min), max);
    const steppedValue = Math.round(clampedValue / step) * step;
    
    const newRange: [number, number] = [...value] as [number, number];
    newRange[index] = steppedValue;
    
    if (index === 0 && steppedValue > value[1]) {
      newRange[1] = steppedValue;
    }
    if (index === 1 && steppedValue < value[0]) {
      newRange[0] = steppedValue;
    }
    
    setInternalValue(newRange);
    onChange?.(newRange);
  }, [min, max, step, disabled, value, onChange]);

  const percentageStart = ((value[0] - min) / (max - min)) * 100;
  const percentageEnd = ((value[1] - min) / (max - min)) * 100;

  return (
    <div ref={ref} className={`space-y-2 ${className}`} {...props}>
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && (
            <label className="text-sm font-medium text-text">
              {label}
            </label>
          )}
          {showValue && (
            <span className="text-sm text-text-secondary">
              {value[0]} - {value[1]}
            </span>
          )}
        </div>
      )}
      
      <div className="relative">
        <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-75"
            style={{ 
              width: `${percentageEnd - percentageStart}%`,
              marginLeft: `${percentageStart}%`
            }}
          />
        </div>
        
        {[0, 1].map((index) => (
          <input
            key={index}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value[index]}
            disabled={disabled}
            onChange={(e) => handleChange(index, Number(e.target.value))}
            className="
              absolute inset-0 w-full h-full opacity-0 cursor-pointer
              disabled:cursor-not-allowed disabled:opacity-50
            "
          />
        ))}
        
        {value.map((val, index) => {
          const percentage = ((val - min) / (max - min)) * 100;
          return (
            <div
              key={index}
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-primary rounded-full shadow-md transition-all duration-75 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/50"
              style={{ left: `calc(${percentage}% - 8px)` }}
            />
          );
        })}
      </div>
    </div>
  );
});

RangeSlider.displayName = 'RangeSlider';
