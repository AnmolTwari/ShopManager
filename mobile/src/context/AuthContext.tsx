import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../services/shopApi';
import { storage } from '../services/storage';
import { ShopProfile, User } from '../types';

interface AuthContextType {
  user: User | null;
  shopProfile: ShopProfile;
  isLoading: boolean;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  register: (data: { username: string; email: string; password: string; name?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateShopProfile: (profile: Partial<ShopProfile>) => Promise<void>;
}

const DEFAULT_SHOP_PROFILE: ShopProfile = {
  shopName: 'ShopManager Store',
  phone: '',
  address: '',
  tagline: '',
  gstNumber: '',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [shopProfile, setShopProfile] = useState<ShopProfile>(DEFAULT_SHOP_PROFILE);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      // Restore shop profile
      const storedProfile = await storage.getShopProfile();
      if (storedProfile) {
        try {
          setShopProfile(JSON.parse(storedProfile));
        } catch {}
      }

      const token = await storage.getToken();
      if (token) {
        const cachedUser = await storage.getUserData();
        if (cachedUser) {
          const parsed = JSON.parse(cachedUser);
          setUser(parsed);
          if (!storedProfile) {
            const fallbackName = parsed.name || parsed.username ? `${parsed.name || parsed.username}'s Store` : 'ShopManager Store';
            setShopProfile((prev) => ({ ...prev, shopName: fallbackName }));
          }
        }
        // Validate with backend in background
        const currentUser = await authApi.me();
        setUser(currentUser);
        await storage.saveUserData(JSON.stringify(currentUser));
        if (!storedProfile) {
          const fallbackName = currentUser.name || currentUser.username ? `${currentUser.name || currentUser.username}'s Store` : 'ShopManager Store';
          setShopProfile((prev) => ({ ...prev, shopName: fallbackName }));
        }
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

  const updateShopProfile = async (updates: Partial<ShopProfile>) => {
    const next: ShopProfile = { ...shopProfile, ...updates };
    setShopProfile(next);
    await storage.saveShopProfile(JSON.stringify(next));
  };

  const login = async (credentials: { username: string; password: string }) => {
    const res = await authApi.login(credentials);
    if (res.token) {
      await storage.saveToken(res.token);
    }
    await storage.saveUserData(JSON.stringify(res));
    setUser(res);

    // If no custom shop profile yet, set from username/name
    const stored = await storage.getShopProfile();
    if (!stored) {
      const initialShopName = res.name || res.username ? `${res.name || res.username}'s Store` : 'ShopManager Store';
      const initialProf: ShopProfile = { ...DEFAULT_SHOP_PROFILE, shopName: initialShopName };
      setShopProfile(initialProf);
      await storage.saveShopProfile(JSON.stringify(initialProf));
    }
  };

  const register = async (data: { username: string; email: string; password: string; name?: string }) => {
    const res = await authApi.register(data);
    if (res.token) {
      await storage.saveToken(res.token);
    }
    await storage.saveUserData(JSON.stringify(res));
    setUser(res);

    const initialShopName = res.name || res.username ? `${res.name || res.username}'s Store` : 'ShopManager Store';
    const initialProf: ShopProfile = { ...DEFAULT_SHOP_PROFILE, shopName: initialShopName };
    setShopProfile(initialProf);
    await storage.saveShopProfile(JSON.stringify(initialProf));
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
    <AuthContext.Provider
      value={{
        user,
        shopProfile,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
        updateShopProfile,
      }}
    >
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
