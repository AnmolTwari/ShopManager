import React from 'react';
import { Image, Platform, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { CircleUser, RefreshCw } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

const APP_LOGO = require('../../assets/logo.png');

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const statusBarInset = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0;

export const Header: React.FC<HeaderProps> = ({ title, subtitle, onRefresh, isRefreshing }) => {
  const { user } = useAuth();

  return (
    <View className="z-10 flex-row items-center justify-between border-b border-[#e2e8f0] bg-white px-4 pb-3 shadow-sm" style={{ paddingTop: statusBarInset + 10 }}>
      <View className="flex-1 flex-row items-center gap-2.5">
        <View className="h-9 w-9 items-center justify-center overflow-hidden rounded-[10px] border border-[rgba(5,150,105,0.3)] bg-[#0f172a]">
          <Image source={APP_LOGO} className="h-9 w-9" resizeMode="contain" />
        </View>
        <View className="flex-1 justify-center">
          <Text className="text-base font-extrabold text-[#0f172a]" numberOfLines={1}>
            {title || 'ShopManager'}
          </Text>
          <Text className="mt-px text-[11px] font-medium text-[#64748b]" numberOfLines={1}>
            {subtitle || (user ? `Shop: ${user.name || user.username}` : 'Retail POS')}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center gap-2">
        {onRefresh && (
          <TouchableOpacity
            className="h-[34px] w-[34px] items-center justify-center rounded-lg border border-[#e2e8f0] bg-[#f8fafc]"
            style={isRefreshing ? { opacity: 0.5 } : undefined}
            onPress={onRefresh}
            disabled={isRefreshing}
            activeOpacity={0.7}
          >
            <RefreshCw size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
        <View className="flex-row items-center gap-1 rounded-lg border border-[rgba(5,150,105,0.2)] bg-[#d1fae5] px-2 py-1">
          <CircleUser size={15} color={colors.primary} />
          <Text className="text-[11px] font-bold tracking-[0.3px] text-[#059669]">{user?.role || 'USER'}</Text>
        </View>
      </View>
    </View>
  );
};

