import React from 'react';
import { Header } from './Header';

interface LayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  user?: {
    name: string;
    email: string;
  };
  onLogout?: () => void;
}

export function Layout({ children, sidebar, user, onLogout }: LayoutProps) {
  return (
    <div className="flex flex-col h-screen w-full">
      <Header user={user} onLogout={onLogout} />
      <div className="flex flex-1 overflow-hidden">
        {sidebar && (
          <aside className="w-60 bg-surface border-r border-border overflow-y-auto">
            {sidebar}
          </aside>
        )}
        <main className="flex-1 overflow-y-auto bg-white">
          {children}
        </main>
      </div>
    </div>
  );
}
