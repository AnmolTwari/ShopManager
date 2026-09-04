import React from 'react';
import { Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { StockStatus } from '../types';

interface StockBadgeProps {
  status?: StockStatus;
  quantity?: number;
  minLevel?: number;
}

export const StockBadge: React.FC<StockBadgeProps> = ({ status, quantity, minLevel }) => {
  let bg = colors.successLight;
  let text = colors.success;
  let label = 'In Stock';

  const isOutOfStock = status === 'OUT_OF_STOCK' || (quantity !== undefined && quantity <= 0);
  const isLowStock =
    status === 'LOW_STOCK' ||
    (quantity !== undefined && minLevel !== undefined && quantity > 0 && quantity <= minLevel);

  if (isOutOfStock) {
    bg = colors.dangerLight;
    text = colors.danger;
    label = 'Out of Stock';
  } else if (isLowStock) {
    bg = colors.warningLight;
    text = colors.warning;
    label = 'Low Stock';
  }

  return (
    <View className="flex-row items-center self-start rounded-xl px-2 py-[3px]" style={{ backgroundColor: bg }}>
      <View className="mr-1.5 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: text }} />
      <Text className="text-[11px] font-bold uppercase tracking-[0.3px]" style={{ color: text }}>
        {label} {quantity !== undefined ? `(${quantity})` : ''}
      </Text>
    </View>
  );
};

