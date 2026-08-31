import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../services/shopApi';
import { storage } from '../services/storage';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  register: (data: { username: string; email: string; password: string; name?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      const token = await storage.getToken();
      if (token) {
        const cachedUser = await storage.getUserData();
        if (cachedUser) {
          setUser(JSON.parse(cachedUser));
        }
        // Validate with backend in background
        const currentUser = await authApi.me();
        setUser(currentUser);
        await storage.saveUserData(JSON.stringify(currentUser));
      }
    } catch (e) {
      console.log('Session restore failed or expired:', e);
      await storage.removeToken();
      await storage.removeUserData();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: { username: string; password: string }) => {
    const res = await authApi.login(credentials);
    if (res.token) {
      await storage.saveToken(res.token);
    }
    await storage.saveUserData(JSON.stringify(res));
    setUser(res);
  };

  const register = async (data: { username: string; email: string; password: string; name?: string }) => {
    const res = await authApi.register(data);
    if (res.token) {
      await storage.saveToken(res.token);
    }
    await storage.saveUserData(JSON.stringify(res));
    setUser(res);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      await storage.removeToken();
      await storage.removeUserData();
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const updated = await authApi.me();
      setUser(updated);
      await storage.saveUserData(JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
