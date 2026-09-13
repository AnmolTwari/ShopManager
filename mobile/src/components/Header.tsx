import React from 'react';
import { Image, Platform, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RefreshCw } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

const APP_LOGO = require('../../assets/logo.png');

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, onRefresh, isRefreshing }) => {
  const { user, shopProfile } = useAuth();
  const insets = useSafeAreaInsets();

  const topPadding = Platform.OS === 'android'
    ? (StatusBar.currentHeight || 24) + 10
    : Math.max(insets.top, 14) + 8;

  const effectiveSubtitle = subtitle || (shopProfile?.shopName ? `Shop: ${shopProfile.shopName}` : (user ? `Shop: ${user.name || user.username}` : 'Retail POS'));

  return (
    <View
      className="z-10 flex-row items-center justify-between border-b border-[#e2e8f0] bg-white px-4 pb-3 shadow-sm"
      style={{ paddingTop: topPadding }}
    >
      <View className="flex-1 flex-row items-center gap-2.5">
        <View className="h-9 w-9 items-center justify-center overflow-hidden rounded-[10px] border border-[rgba(5,150,105,0.3)] bg-[#0f172a]">
          <Image source={APP_LOGO} className="h-9 w-9" resizeMode="contain" />
        </View>
        <View className="flex-1 justify-center pr-2">
          <Text className="text-base font-extrabold text-[#0f172a]" numberOfLines={1}>
            {title || 'ShopManager'}
          </Text>
          <Text className="mt-px text-[11px] font-medium text-[#64748b]" numberOfLines={1}>
            {effectiveSubtitle}
          </Text>
        </View>
      </View>

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
    </View>
  );
};
