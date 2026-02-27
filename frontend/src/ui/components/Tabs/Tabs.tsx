import { ReactNode, useState } from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  variant?: 'line' | 'pill' | 'enclosed';
  size?: 'sm' | 'md';
}

const variantStyles: Record<string, Record<string, string>> = {
  line: {
    container: 'border-b border-border',
    tab: 'border-b-2 border-transparent -mb-px',
    active: 'border-primary text-primary',
    inactive: 'text-text-secondary hover:text-text border-transparent',
  },
  pill: {
    container: '',
    tab: 'rounded-md',
    active: 'bg-primary text-white',
    inactive: 'text-text-secondary hover:bg-surface-hover hover:text-text',
  },
  enclosed: {
    container: 'border border-border rounded-lg p-1 bg-surface-secondary',
    tab: 'rounded',
    active: 'bg-surface shadow-sm text-text',
    inactive: 'text-text-secondary hover:text-text',
  },
};

export function Tabs({ tabs, defaultTab, onChange, variant = 'line', size = 'md' }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  const styles = variantStyles[variant];
  const sizeStyles = size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-sm';

  const activeContent = tabs.find((t) => t.id === activeTab)?.content;

  return (
    <div>
      <div className={`flex gap-1 ${styles.container}`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && handleTabClick(tab.id)}
            disabled={tab.disabled}
            className={`
              flex items-center gap-2 font-medium transition-colors
              ${sizeStyles}
              ${tab.id === activeTab ? styles.active : styles.inactive}
              ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${styles.tab}
            `}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-4">{activeContent}</div>
    </div>
  );
}
