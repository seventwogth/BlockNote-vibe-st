import { HTMLAttributes, forwardRef, ReactNode } from 'react';

interface SidebarProps extends HTMLAttributes<HTMLDivElement> {
  width?: number | string;
  collapsible?: boolean;
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

export const Sidebar = forwardRef<HTMLDivElement, SidebarProps>(({
  width = 260,
  collapsible = false,
  collapsed = false,
  onCollapse,
  className = '',
  children,
  ...props
}, ref) => {
  return (
    <aside
      ref={ref}
      className={`
        flex flex-col h-full bg-surface border-r border-border
        transition-all duration-200
        ${className}
      `}
      style={{ width: collapsed ? 'auto' : width }}
      {...props}
    >
      {children}
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';

interface SidebarHeaderProps extends HTMLAttributes<HTMLDivElement> {}

export const SidebarHeader = forwardRef<HTMLDivElement, SidebarHeaderProps>(({
  className = '',
  children,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={`p-4 border-b border-border ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

SidebarHeader.displayName = 'SidebarHeader';

interface SidebarContentProps extends HTMLAttributes<HTMLDivElement> {}

export const SidebarContent = forwardRef<HTMLDivElement, SidebarContentProps>(({
  className = '',
  children,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={`flex-1 overflow-y-auto ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

SidebarContent.displayName = 'SidebarContent';

interface SidebarFooterProps extends HTMLAttributes<HTMLDivElement> {}

export const SidebarFooter = forwardRef<HTMLDivElement, SidebarFooterProps>(({
  className = '',
  children,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={`p-4 border-t border-border ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

SidebarFooter.displayName = 'SidebarFooter';

interface SidebarSectionProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  collapsible?: boolean;
}

export const SidebarSection = forwardRef<HTMLDivElement, SidebarSectionProps>(({
  title,
  collapsible = false,
  className = '',
  children,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={`py-2 ${className}`}
      {...props}
    >
      {title && (
        <div className="px-4 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">
          {title}
        </div>
      )}
      {children}
    </div>
  );
});

SidebarSection.displayName = 'SidebarSection';

interface SidebarItemProps extends HTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  icon?: ReactNode;
  badge?: ReactNode;
}

export const SidebarItem = forwardRef<HTMLButtonElement, SidebarItemProps>(({
  active = false,
  icon,
  badge,
  className = '',
  children,
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      className={`
        w-full flex items-center gap-3 px-4 py-2
        text-sm transition-colors duration-150
        ${active 
          ? 'bg-primary/10 text-primary font-medium' 
          : 'text-text-secondary hover:bg-surface-hover hover:text-text'
        }
        ${className}
      `}
      {...props}
    >
      {icon && (
        <span className="flex-shrink-0 w-5 h-5">
          {icon}
        </span>
      )}
      <span className="flex-1 text-left truncate">
        {children}
      </span>
      {badge && (
        <span className="flex-shrink-0">
          {badge}
        </span>
      )}
    </button>
  );
});

SidebarItem.displayName = 'SidebarItem';

interface SidebarGroupProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
}

export const SidebarGroup = forwardRef<HTMLDivElement, SidebarGroupProps>(({
  label,
  className = '',
  children,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={`space-y-1 ${className}`}
      {...props}
    >
      {label && (
        <div className="px-4 py-1.5 text-xs font-semibold text-text-secondary uppercase">
          {label}
        </div>
      )}
      {children}
    </div>
  );
});

SidebarGroup.displayName = 'SidebarGroup';

interface SidebarDividerProps extends HTMLAttributes<HTMLHRElement> {}

export const SidebarDivider = forwardRef<HTMLHRElement, SidebarDividerProps>(({
  className = '',
  ...props
}, ref) => {
  return (
    <hr
      ref={ref}
      className={`my-2 border-border ${className}`}
      {...props}
    />
  );
});

SidebarDivider.displayName = 'SidebarDivider';
