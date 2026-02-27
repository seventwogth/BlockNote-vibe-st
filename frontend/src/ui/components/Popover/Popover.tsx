import React, { useState, useRef, useEffect, createContext, useContext, ReactNode, HTMLAttributes } from 'react';
import { createPortal } from 'react-dom';

interface PopoverProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

interface PopoverTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

interface PopoverContentProps extends HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  avoidCollisions?: boolean;
}

interface PopoverAnchorProps extends HTMLAttributes<HTMLDivElement> {}

interface PopoverContextType {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  triggerRef: React.MutableRefObject<HTMLButtonElement | null>;
  contentRef: React.MutableRefObject<HTMLDivElement | null>;
}

const PopoverContext = createContext<PopoverContextType | null>(null);

function usePopoverContext() {
  const context = useContext(PopoverContext);
  if (!context) {
    throw new Error('Popover components must be used within Popover');
  }
  return context;
}

function Popover({ open, onOpenChange, children }: PopoverProps) {
  const [isOpen, setIsOpen] = useState(open ?? false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open);
    }
  }, [open]);

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  return (
    <PopoverContext.Provider value={{ isOpen, onOpenChange: handleOpenChange, triggerRef, contentRef }}>
      {children}
    </PopoverContext.Provider>
  );
}

function PopoverTrigger({ asChild, className = '', children, ...props }: PopoverTriggerProps) {
  const { isOpen, onOpenChange, triggerRef } = usePopoverContext();
  const child = children as React.ReactElement;

  if (asChild && child) {
    return (
      <>
        {React.cloneElement(child, {
          ref: triggerRef,
          onClick: (e: MouseEvent) => {
            child.props?.onClick?.(e);
            onOpenChange(!isOpen);
          },
          'aria-expanded': isOpen,
        })}
      </>
    );
  }

  return (
    <button
      ref={triggerRef}
      className={className}
      onClick={() => onOpenChange(!isOpen)}
      aria-expanded={isOpen}
      {...props}
    >
      {children}
    </button>
  );
}

function PopoverContent({
  align = 'center',
  sideOffset = 4,
  avoidCollisions = true,
  className = '',
  children,
  ...props
}: PopoverContentProps) {
  const { isOpen, onOpenChange, triggerRef, contentRef } = usePopoverContext();
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!isOpen || !triggerRef.current || !contentRef.current) return;

    const trigger = triggerRef.current;
    const content = contentRef.current;
    const triggerRect = trigger.getBoundingClientRect();

    let top = triggerRect.bottom + sideOffset;
    let left = triggerRect.left;

    const contentRect = content.getBoundingClientRect();
    
    if (align === 'center') {
      left = triggerRect.left + (triggerRect.width - contentRect.width) / 2;
    } else if (align === 'end') {
      left = triggerRect.right - contentRect.width;
    }

    if (avoidCollisions) {
      if (top + contentRect.height > window.innerHeight) {
        top = triggerRect.top - contentRect.height - sideOffset;
      }
      if (left < 0) left = 8;
      if (left + contentRect.width > window.innerWidth) {
        left = window.innerWidth - contentRect.width - 8;
      }
    }

    setPosition({ top, left });
  }, [isOpen, align, sideOffset, avoidCollisions]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        contentRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        !contentRef.current.contains(e.target as Node)
      ) {
        onOpenChange(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onOpenChange]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={contentRef}
      className={`
        fixed z-50 min-w-[200px] max-w-[400px]
        bg-surface rounded-lg shadow-lg border border-border
        p-1 animate-in fade-in zoom-in-95 duration-150
        ${className}
      `}
      style={{ top: position.top, left: position.left }}
      {...props}
    >
      {children}
    </div>,
    document.body
  );
}

function PopoverAnchor({ className = '', children, ...props }: PopoverAnchorProps) {
  return (
    <div ref={useRef<HTMLDivElement>(null)} className={className} {...props}>
      {children}
    </div>
  );
}

export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverAnchor,
};
