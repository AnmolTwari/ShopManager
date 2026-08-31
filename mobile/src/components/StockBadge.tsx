import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { StockStatus } from '../types';

interface StockBadgeProps {
  status: StockStatus;
  quantity?: number;
  minLevel?: number;
}

export const StockBadge: React.FC<StockBadgeProps> = ({ status, quantity, minLevel }) => {
  let bg = colors.successLight;
  let text = colors.success;
  let label = 'In Stock';

  if (status === 'OUT_OF_STOCK' || (quantity !== undefined && quantity <= 0)) {
    bg = colors.dangerLight;
    text = colors.danger;
    label = 'Out of Stock';
  } else if (status === 'LOW_STOCK' || (quantity !== undefined && minLevel !== undefined && quantity <= minLevel)) {
    bg = colors.warningLight;
    text = colors.warning;
    label = 'Low Stock';
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <View style={[styles.dot, { backgroundColor: text }]} />
      <Text style={[styles.text, { color: text }]}>
        {label} {quantity !== undefined ? `(${quantity})` : ''}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});
