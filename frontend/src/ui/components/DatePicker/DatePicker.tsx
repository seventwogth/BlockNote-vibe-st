import { useState, useRef, useEffect } from 'react';

interface DatePickerProps {
  value?: Date;
  onChange: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  placeholder?: string;
  label?: string;
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function DatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = 'Select date',
  label,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value || new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days: (number | null)[] = [];
    for (let i = 0; i < startingDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    
    return days;
  };

  const isSelected = (day: number | null) => {
    if (!day || !value) return false;
    return (
      day === viewDate.getDate() &&
      viewDate.getMonth() === value.getMonth() &&
      viewDate.getFullYear() === value.getFullYear()
    );
  };

  const isDisabled = (day: number | null) => {
    if (!day) return false;
    const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const handleSelect = (day: number | null) => {
    if (!day || isDisabled(day)) return;
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    onChange(newDate);
    setIsOpen(false);
  };

  const formatDate = (date?: Date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const goToPrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-text mb-1.5">{label}</label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full px-3 py-2 text-left border rounded-md bg-surface
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-0
          border-border focus:border-primary focus:ring-primary/20
          flex items-center justify-between
        `}
      >
        <span className={value ? 'text-text' : 'text-text-secondary'}>
          {value ? formatDate(value) : placeholder}
        </span>
        <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-72 bg-surface border border-border rounded-lg shadow-lg p-3">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={goToPrevMonth}
              className="p-1 hover:bg-surface-hover rounded transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="font-medium text-text">
              {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
            </span>
            <button
              type="button"
              onClick={goToNextMonth}
              className="p-1 hover:bg-surface-hover rounded transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-text-secondary py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {getDaysInMonth(viewDate).map((day, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSelect(day)}
                disabled={isDisabled(day)}
                className={`
                  p-1 text-sm rounded transition-colors
                  ${!day ? 'invisible' : ''}
                  ${isSelected(day) ? 'bg-primary text-white' : ''}
                  ${!isSelected(day) && !isDisabled(day) ? 'hover:bg-surface-hover text-text' : ''}
                  ${isDisabled(day) ? 'text-text-disabled cursor-not-allowed' : ''}
                `}
              >
                {day}
              </button>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-border flex gap-2">
            <button
              type="button"
              onClick={() => {
                onChange(new Date());
                setIsOpen(false);
              }}
              className="flex-1 text-xs text-primary hover:underline"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(new Date(0));
                setIsOpen(false);
              }}
              className="flex-1 text-xs text-text-secondary hover:underline"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface DateRangePickerProps {
  startDate?: Date;
  endDate?: Date;
  onChange: (start: Date | undefined, end: Date | undefined) => void;
  label?: string;
}

export function DateRangePicker({ startDate, endDate, label }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-text mb-1.5">{label}</label>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`
            flex-1 px-3 py-2 text-left border rounded-md bg-surface text-sm
            border-border focus:border-primary focus:ring-2 focus:ring-primary/20
            flex items-center justify-between
          `}
        >
          <span className={startDate ? 'text-text' : 'text-text-secondary'}>
            {startDate ? startDate.toLocaleDateString() : 'Start date'}
          </span>
        </button>
        <span className="self-center text-text-secondary">—</span>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`
            flex-1 px-3 py-2 text-left border rounded-md bg-surface text-sm
            border-border focus:border-primary focus:ring-2 focus:ring-primary/20
            flex items-center justify-between
          `}
        >
          <span className={endDate ? 'text-text' : 'text-text-secondary'}>
            {endDate ? endDate.toLocaleDateString() : 'End date'}
          </span>
        </button>
      </div>
    </div>
  );
}
