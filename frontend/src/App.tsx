import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from './components/Layout/Layout';
import { Sidebar } from './components/Sidebar/Sidebar';
import { BlockEditor } from './components/Editor/BlockEditor';
import { BoardEditor } from './components/Editor/BoardEditor';
import { ToastContainer } from './components/Toast';
import { ToastProvider } from './hooks/useToast';
import { usePage } from './hooks/usePage';
import { api } from './services/api';
import { User } from './types';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

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
    } catch (err) {
      try {
        const response = await api.login({ email, password });
        setUser(response.user);
        setToken(response.token);
      } catch (loginErr) {
        alert('Login failed');
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
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-text-secondary">Loading...</span>
          </div>
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
          />
        )}
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password, name);
  };

  return (
    <div className="flex items-center justify-center h-screen bg-surface">
      <div className="bg-white p-8 rounded-lg shadow-sm border border-border w-96">
        <h1 className="text-2xl font-semibold text-center mb-6">
          {isRegister ? 'Create Account' : 'Sign In'}
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-sm text-text-secondary mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:border-primary"
                required
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm text-text-secondary mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:border-primary"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm text-text-secondary mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:border-primary"
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full py-2 bg-primary text-white rounded hover:opacity-90"
          >
            {isRegister ? 'Sign Up' : 'Sign In'}
          </button>
        </form>
        
        <p className="mt-4 text-center text-sm text-text-secondary">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-primary hover:underline"
          >
            {isRegister ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default App;
