import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { Layout } from './components/Layout/Layout';
import { Sidebar } from './components/Sidebar/Sidebar';
import { ToastContainer } from './components/Toast';
import { ToastProvider, useToast } from './hooks/useToast';
import { useTheme } from './hooks/useTheme';
import { usePage } from './hooks/usePage';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Layout } from './ui/components/Layout/Layout';
import { ToastContainer } from './ui/components/Toast/Toast';
import { PageLoader } from './components/PageLoader';
import { BlockEditor } from './components/Editor/BlockEditor';
import { Page } from './types';
import { api } from './services/api';
import { Spinner } from './ui/components/Spinner/Spinner';
import React, { useState, useEffect, Suspense } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<Page[]>([]);
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

  const buildBreadcrumb = async (pageId: string | null) => {
    const crumbs: Page[] = [];
    let currentId = pageId;
    while (currentId) {
      const currentPage = pages.find(p => p.id === currentId);
      if (currentPage) {
        crumbs.unshift(currentPage);
        currentPage.page_type === 'folder' ? currentPage.parent_id : null;
        currentId = currentPage.parent_id || null;
      } else {
        break;
      }
    }
    setBreadcrumb(crumbs);
  };

  useEffect(() => {
    if (selectedPageId && pages.length > 0) {
      buildBreadcrumb(selectedPageId);
    }
  }, [selectedPageId, pages]);

  const handleSelectPage = (pageId: string) => {
    setSelectedPageId(pageId);
  };

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

  const handleUpdatePage = useCallback(async (data: { title?: string; icon?: string }) => {
    await updatePage(data);
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
                {breadcrumb.map((crumb, idx) => (
                  <React.Fragment key={crumb.id}>
                    <span>/</span>
                    <button 
                      onClick={() => setSelectedPageId(crumb.id)}
                      className={`hover:text-primary ${idx === breadcrumb.length - 1 ? 'text-text font-medium' : ''}`}
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
          <p className="text-text-secondary">Your workspace for notes & boards</p>
        </div>

        <div className="bg-surface rounded-xl shadow-lg border border-border p-8">
          <h2 className="text-xl font-semibold text-text text-center mb-6">
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <Input
                label="Full Name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required
              />
            )}
            
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
            
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
            
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
            >
              {isRegister ? 'Create Account' : 'Sign In'}
            </Button>
          </form>
          
          <p className="mt-6 text-center text-sm text-text-secondary">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-primary hover:underline font-medium"
            >
              {isRegister ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-text-secondary">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}

export default App;
