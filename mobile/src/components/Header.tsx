import React from 'react';
import { Image, Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { CircleUser, RefreshCw } from 'lucide-react-native';

const APP_LOGO = require('../../assets/logo.png');

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, onRefresh, isRefreshing }) => {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <View style={styles.logoContainer}>
          <Image source={APP_LOGO} style={styles.logoImage} resizeMode="contain" />
        </View>
        <View style={styles.titleColumn}>
          <Text style={styles.title} numberOfLines={1}>
            {title || 'ShopManager'}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle || (user ? `Shop: ${user.name || user.username}` : 'Retail POS')}
          </Text>
        </View>
      </View>

      <View style={styles.right}>
        {onRefresh && (
          <TouchableOpacity
            style={[styles.iconButton, isRefreshing && styles.iconButtonRotating]}
            onPress={onRefresh}
            disabled={isRefreshing}
            activeOpacity={0.7}
          >
            <RefreshCw size={17} color={colors.textMuted} />
          </TouchableOpacity>
        )}
        <View style={styles.userBadge}>
          <CircleUser size={16} color={colors.primary} />
          <Text style={styles.roleText}>{user?.role || 'USER'}</Text>
        </View>
      </View>
    </View>
  );
};

const statusBarInset = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: statusBarInset + 10,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 10,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  logoContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.3)',
  },
  logoImage: {
    width: 38,
    height: 38,
  },
  titleColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
    marginTop: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconButtonRotating: {
    opacity: 0.5,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 9,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.2)',
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.3,
  },
});
