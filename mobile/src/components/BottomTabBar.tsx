import React from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCart } from '../context/CartContext';
import { colors } from '../theme/colors';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Layers,
  ChartColumn,
  Settings,
} from 'lucide-react-native';

export type TabScreen = 'dashboard' | 'pos' | 'products' | 'inventory' | 'reports' | 'settings';

interface BottomTabBarProps {
  currentTab: TabScreen;
  onTabChange: (tab: TabScreen) => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ currentTab, onTabChange }) => {
  const { totalItems } = useCart();
  const insets = useSafeAreaInsets();

  const safeBottomPadding = Math.max(
    insets.bottom > 0 ? insets.bottom + 6 : 0,
    Platform.OS === 'android' ? 24 : 14
  );

  const tabs: { id: TabScreen; label: string; icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }> }[] = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'pos', label: 'POS', icon: ShoppingCart },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'inventory', label: 'Stock', icon: Layers },
    { id: 'reports', label: 'Reports', icon: ChartColumn },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <View className="flex-row items-center justify-around border-t border-[#e2e8f0] bg-white px-1 pt-2 shadow-sm" style={{ paddingBottom: safeBottomPadding }}>
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id;
        const IconComponent = tab.icon;
        const color = isActive ? colors.primary : colors.textMuted;

        return (
          <TouchableOpacity
            key={tab.id}
            className={`flex-1 items-center justify-center rounded-xl py-1 ${isActive ? 'bg-[#ecfdf5]' : ''}`}
            onPress={() => onTabChange(tab.id)}
            activeOpacity={0.7}
          >
            <View className={`relative h-7 w-8 items-center justify-center rounded-lg ${isActive ? 'bg-[#d1fae5]' : ''}`}>
              <IconComponent size={19} color={color} strokeWidth={isActive ? 2.4 : 1.8} />
              {tab.id === 'pos' && totalItems > 0 && (
                <View className="absolute -right-1.5 -top-1 h-4 min-w-4 items-center justify-center rounded-full border-[1.5px] border-white bg-[#ef4444] px-0.5">
                  <Text className="text-[9px] font-extrabold text-white">{totalItems > 99 ? '99+' : totalItems}</Text>
                </View>
              )}
            </View>
            <Text className={`mt-0.5 text-[10px] ${isActive ? 'font-extrabold' : 'font-semibold'}`} style={{ color }}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

