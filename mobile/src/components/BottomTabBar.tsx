import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { useCart } from '../context/CartContext';
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

  const tabs: { id: TabScreen; label: string; icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }> }[] = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'pos', label: 'POS', icon: ShoppingCart },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'inventory', label: 'Stock', icon: Layers },
    { id: 'reports', label: 'Reports', icon: ChartColumn },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id;
        const IconComponent = tab.icon;
        const color = isActive ? colors.primary : colors.textMuted;

        return (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabItem, isActive && styles.tabItemActive]}
            onPress={() => onTabChange(tab.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrapper, isActive && styles.iconWrapperActive]}>
              <IconComponent size={20} color={color} strokeWidth={isActive ? 2.4 : 1.8} />
              {tab.id === 'pos' && totalItems > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{totalItems > 99 ? '99+' : totalItems}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.tabLabel, { color, fontWeight: isActive ? '800' : '600' }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'android' ? 12 : 24,
    paddingHorizontal: 6,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    borderRadius: 12,
  },
  tabItemActive: {
    backgroundColor: 'rgba(5, 150, 105, 0.05)',
  },
  iconWrapper: {
    position: 'relative',
    width: 32,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  iconWrapperActive: {
    backgroundColor: colors.primaryLight,
  },
  tabLabel: {
    fontSize: 10.5,
    marginTop: 2,
    letterSpacing: -0.1,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: colors.danger,
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
});
