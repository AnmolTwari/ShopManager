import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, View } from 'react-native';
import './global.css';
import * as Updates from 'expo-updates';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomTabBar, TabScreen } from './src/components/BottomTabBar';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { DashboardScreen, NavigationParams } from './src/screens/DashboardScreen';
import { InventoryScreen } from './src/screens/InventoryScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { PosScreen } from './src/screens/PosScreen';
import { ProductsScreen, StockFilterType } from './src/screens/ProductsScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { ReportsScreen } from './src/screens/ReportsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { colors } from './src/theme/colors';

const MainNavigator: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [currentTab, setCurrentTab] = useState<TabScreen>('dashboard');
  const [inventoryInitialProductId, setInventoryInitialProductId] = useState<number | null>(null);
  const [productsInitialStockFilter, setProductsInitialStockFilter] = useState<StockFilterType>('ALL');
  const [visitedTabs, setVisitedTabs] = useState<Set<TabScreen>>(() => new Set(['dashboard']));

  useEffect(() => {
    async function checkUpdates() {
      try {
        if (__DEV__) return;
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (e) {
        console.log('OTA check:', e);
      }
    }
    checkUpdates();
  }, []);

  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(currentTab)) return prev;
      const next = new Set(prev);
      next.add(currentTab);
      return next;
    });
  }, [currentTab]);

  const handleNavigateTab = (tab: TabScreen, params?: NavigationParams) => {
    if (params?.productId != null) {
      setInventoryInitialProductId(params.productId);
    } else {
      setInventoryInitialProductId(null);
    }

    if (params?.stockFilter) {
      setProductsInitialStockFilter(params.stockFilter);
    } else {
      setProductsInitialStockFilter('ALL');
    }

    setCurrentTab(tab);
  };

  const handleBottomTabChange = (tab: TabScreen) => {
    setInventoryInitialProductId(null);
    setProductsInitialStockFilter('ALL');
    setCurrentTab(tab);
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Unauthenticated Flow
  if (!user) {
    if (authMode === 'register') {
      return <RegisterScreen onSwitchToLogin={() => setAuthMode('login')} />;
    }
    return <LoginScreen onSwitchToRegister={() => setAuthMode('register')} />;
  }

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <View className="flex-1">
        <View style={{ flex: 1, display: currentTab === 'dashboard' ? 'flex' : 'none' }}>
          <DashboardScreen onNavigateTab={handleNavigateTab} />
        </View>
        {visitedTabs.has('pos') && (
          <View style={{ flex: 1, display: currentTab === 'pos' ? 'flex' : 'none' }}>
            <PosScreen />
          </View>
        )}
        {visitedTabs.has('products') && (
          <View style={{ flex: 1, display: currentTab === 'products' ? 'flex' : 'none' }}>
            <ProductsScreen
              onNavigateTab={handleNavigateTab}
              initialStockFilter={productsInitialStockFilter}
            />
          </View>
        )}
        {visitedTabs.has('inventory') && (
          <View style={{ flex: 1, display: currentTab === 'inventory' ? 'flex' : 'none' }}>
            <InventoryScreen
              onNavigateTab={handleNavigateTab}
              initialProductId={inventoryInitialProductId}
            />
          </View>
        )}
        {visitedTabs.has('reports') && (
          <View style={{ flex: 1, display: currentTab === 'reports' ? 'flex' : 'none' }}>
            <ReportsScreen />
          </View>
        )}
        {visitedTabs.has('settings') && (
          <View style={{ flex: 1, display: currentTab === 'settings' ? 'flex' : 'none' }}>
            <SettingsScreen />
          </View>
        )}
      </View>
      <BottomTabBar currentTab={currentTab} onTabChange={handleBottomTabChange} />
    </View>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AuthProvider>
          <CartProvider>
            <MainNavigator />
          </CartProvider>
        </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
