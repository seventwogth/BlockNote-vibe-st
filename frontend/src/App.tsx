import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { Layout } from './components/Layout/Layout';
import { Sidebar } from './components/Sidebar/Sidebar';
import { ToastContainer } from './components/Toast';
import { ToastProvider, useToast } from './hooks/useToast';
import { useTheme } from './hooks/useTheme.tsx';
import { usePage } from './hooks/usePage';
import { api } from './services/api';
import { User } from './types';
import { Button } from './ui/components/Button/Button';
import { Input } from './ui/components/Input/Input';
import { Spinner } from './ui/components/Spinner/Spinner';

const BlockEditor = lazy(() => import('./components/Editor/BlockEditor').then(m => ({ default: m.BlockEditor })));
const BoardEditor = lazy(() => import('./components/Editor/BoardEditor').then(m => ({ default: m.BoardEditor })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full">
      <Spinner size="lg" />
    </div>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const { showToast } = useToast();
  useTheme();

  const { page, loading, updatePage, saveContent } = usePage(selectedPageId);

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
          />
        }
        user={user ? { name: user.name, email: user.email } : undefined}
        onLogout={handleLogout}
      >
        <Suspense fallback={<PageLoader />}>
          {loading ? (
            <PageLoader />
          ) : page?.page_type === 'board' ? (
            <BoardEditor
              page={page}
              onSaveContent={handleSaveContent}
              onUpdatePage={handleUpdatePage}
            />
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
