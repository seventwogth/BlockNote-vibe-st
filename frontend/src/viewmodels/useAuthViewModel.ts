import { useState, useCallback } from 'react';
import { api } from '../services/api';
import { User, AuthResponse, LoginRequest, RegisterRequest } from '../types';
import { useToast } from '../hooks/useToast';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

export function useAuthViewModel() {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem('token'),
    loading: false,
    error: null,
  });
  
  const { showToast } = useToast();

  const login = useCallback(async (credentials: LoginRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response: AuthResponse = await api.login(credentials);
      localStorage.setItem('token', response.token);
      api.setToken(response.token);
      setState({
        user: response.user,
        token: response.token,
        loading: false,
        error: null,
      });
      showToast('Welcome back!', 'success');
      return response;
    } catch (error) {
      const message = 'Invalid email or password';
      setState(prev => ({ ...prev, loading: false, error: message }));
      showToast(message, 'error');
      throw error;
    }
  }, [showToast]);

  const register = useCallback(async (data: RegisterRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response: AuthResponse = await api.register(data);
      localStorage.setItem('token', response.token);
      api.setToken(response.token);
      setState({
        user: response.user,
        token: response.token,
        loading: false,
        error: null,
      });
      showToast('Welcome! Your account has been created.', 'success');
      return response;
    } catch (error) {
      const message = 'Registration failed. Please try again.';
      setState(prev => ({ ...prev, loading: false, error: message }));
      showToast(message, 'error');
      throw error;
    }
  }, [showToast]);

  const logout = useCallback(() => {
    api.logout();
    localStorage.removeItem('token');
    setState({
      user: null,
      token: null,
      loading: false,
      error: null,
    });
    showToast('You have been logged out.', 'info');
  }, [showToast]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    login,
    register,
    logout,
    clearError,
  };
}
