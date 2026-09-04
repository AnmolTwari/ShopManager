import React from 'react';
import { Text, View } from 'react-native';
import { colors } from '../theme/colors';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'accent';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtitle,
  icon,
  variant = 'primary',
}) => {
  const getVariantBg = () => {
    switch (variant) {
      case 'success':
        return colors.successLight;
      case 'warning':
        return colors.warningLight;
      case 'danger':
        return colors.dangerLight;
      case 'accent':
        return colors.accentLight;
      default:
        return colors.primaryLight;
    }
  };

  return (
    <View className="min-w-[47%] flex-1 rounded-2xl border border-[#e2e8f0] bg-white p-3.5 shadow-sm">
      <View className="mb-1.5 flex-row items-center justify-between">
        <Text className="text-[11px] font-bold uppercase tracking-[0.4px] text-[#64748b]">{label}</Text>
        <View className="h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: getVariantBg() }}>{icon}</View>
      </View>
      <Text className="text-2xl font-black text-[#0f172a]" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {subtitle && <Text className="mt-1 text-[11px] text-[#64748b]">{subtitle}</Text>}
    </View>
  );
};

