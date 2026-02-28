import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { Layout } from './components/Layout/Layout';
import { Sidebar } from './components/Sidebar/Sidebar';
import { ToastContainer } from './components/Toast';
import { ToastProvider, useToast } from './hooks/useToast';
import { useTheme } from './hooks/useTheme';
import { usePage } from './hooks/usePage';
import { api } from './services/api';
import { Page, User } from './types';
import { Button } from './ui/components/Button/Button';
import { Input } from './ui/components/Input/Input';
import { Spinner } from './ui/components/Spinner/Spinner';

const BlockEditor = lazy(() => import('./components/Editor/BlockEditor').then(m => ({ default: m.BlockEditor })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full">
      <Spinner size="lg" />
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const { showToast } = useToast();
  useTheme();

  const { page, loading, updatePage, saveContent } = usePage(selectedPageId);

  useEffect(() => {
    if (selectedWorkspaceId) {
      api.getWorkspacePages(selectedWorkspaceId).then(setPages).catch(console.error);
    }
  }, [selectedWorkspaceId]);

  const isFolder = page?.page_type === 'folder';
  const childPages = pages.filter(p => p.parent_id === selectedPageId);

  const buildBreadcrumb = (pageId: string | null, allPages: Page[]) => {
    const crumbs: Page[] = [];
    let currentId = pageId;
    while (currentId) {
      const currentPage = allPages.find(p => p.id === currentId);
      if (currentPage) {
        crumbs.unshift(currentPage);
        currentId = currentPage.parent_id || null;
      } else {
        break;
      }
    }
    return crumbs;
  };

  const currentBreadcrumb = selectedPageId ? buildBreadcrumb(selectedPageId, pages) : [];

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      api.setToken(savedToken);
    }
  }, []);

  const handleLogin = async (email: string, password: string, name: string) => {
    try {
      const response = await api.register({ email, password, name });
      setUser(response.user);
      setToken(response.token);
      showToast('Welcome!', 'success');
    } catch (err) {
      try {
        const response = await api.login({ email, password });
        setUser(response.user);
        setToken(response.token);
        showToast('Welcome back!', 'success');
      } catch (loginErr) {
        showToast('Login failed. Please check your credentials.', 'error');
      }
    }
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setToken(null);
    setSelectedPageId(null);
  };

  const handleSelectPage = useCallback((pageId: string) => {
    setSelectedPageId(pageId);
  }, []);

  const handleSaveContent = useCallback(async (content: Uint8Array) => {
    await saveContent(content);
  }, [saveContent]);

  const handleUpdatePage = useCallback(async (updates: Partial<Page>) => {
    await updatePage(updates);
  }, [updatePage]);

  if (!token) {
    return (
      <ToastProvider>
        <AuthScreen onLogin={handleLogin} />
        <ToastContainer />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <Layout
        sidebar={
          <Sidebar
            selectedPageId={selectedPageId || undefined}
            onSelectPage={handleSelectPage}
            token={token}
            onWorkspaceSelect={(wsId) => setSelectedWorkspaceId(wsId)}
          />
        }
        user={user ? { name: user.name, email: user.email } : undefined}
        onLogout={handleLogout}
      >
        <Suspense fallback={<PageLoader />}>
          {loading ? (
            <PageLoader />
          ) : isFolder ? (
            <div className="p-8 max-w-4xl mx-auto">
              <div className="flex items-center gap-2 text-sm text-text-secondary mb-6">
                <button onClick={() => setSelectedPageId(null)} className="hover:text-primary">
                  Pages
                </button>
                {currentBreadcrumb.map((crumb, idx) => (
                  <React.Fragment key={crumb.id}>
                    <span>/</span>
                    <button 
                      onClick={() => setSelectedPageId(crumb.id)}
                      className={`hover:text-primary ${idx === currentBreadcrumb.length - 1 ? 'text-text font-medium' : ''}`}
                    >
                      {crumb.title}
                    </button>
                  </React.Fragment>
                ))}
              </div>
              <h1 className="text-3xl font-bold text-text mb-6 flex items-center gap-3">
                <span>{page?.icon || '📁'}</span>
                <span>{page?.title}</span>
              </h1>
              <div className="space-y-2">
                {childPages.length === 0 ? (
                  <p className="text-text-secondary">This folder is empty</p>
                ) : (
                  childPages.map(child => (
                    <button
                      key={child.id}
                      onClick={() => handleSelectPage(child.id)}
                      className="w-full p-4 text-left rounded-lg border border-border hover:border-primary hover:bg-hover transition-colors flex items-center gap-3"
                    >
                      <span className="text-xl">{child.page_type === 'folder' ? '📁' : '📄'}</span>
                      <span className="font-medium">{child.title}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <BlockEditor
              page={page}
              onSaveContent={handleSaveContent}
              onUpdatePage={handleUpdatePage}
              onNavigate={handleSelectPage}
            />
          )}
        </Suspense>
      </Layout>
      <ToastContainer />
    </ToastProvider>
  );
}

interface AuthScreenProps {
  onLogin: (email: string, password: string, name: string) => void;
}

function AuthScreen({ onLogin }: AuthScreenProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onLogin(email, password, name);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">📝</div>
          <h1 className="text-3xl font-bold text-text mb-2">BlockNote</h1>
          <p className="text-text-secondary">Your personal knowledge base</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <Input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" fullWidth loading={loading}>
            {isRegister ? 'Sign Up' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-sm text-primary hover:underline"
          >
            {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
