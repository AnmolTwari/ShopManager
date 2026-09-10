import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, View } from 'react-native';
import './global.css';
import * as Updates from 'expo-updates';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomTabBar, TabScreen } from './src/components/BottomTabBar';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { InventoryScreen } from './src/screens/InventoryScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { PosScreen } from './src/screens/PosScreen';
import { ProductsScreen } from './src/screens/ProductsScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { ReportsScreen } from './src/screens/ReportsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { colors } from './src/theme/colors';

const MainNavigator: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [currentTab, setCurrentTab] = useState<TabScreen>('dashboard');

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

  // Authenticated Main Tabs Flow
  const renderTabScreen = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardScreen onNavigateTab={setCurrentTab} />;
      case 'pos':
        return <PosScreen />;
      case 'products':
        return <ProductsScreen onNavigateTab={setCurrentTab} />;
      case 'inventory':
        return <InventoryScreen onNavigateTab={setCurrentTab} />;
      case 'reports':
        return <ReportsScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <DashboardScreen onNavigateTab={setCurrentTab} />;
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <View className="flex-1">{renderTabScreen()}</View>
      <BottomTabBar currentTab={currentTab} onTabChange={setCurrentTab} />
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
