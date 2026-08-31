import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { Store, UserCircle, RefreshCw } from 'lucide-react-native';

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
          <Store size={20} color={colors.primary} />
        </View>
        <View>
          <Text style={styles.title}>{title || 'ShopManager'}</Text>
          <Text style={styles.subtitle}>{subtitle || (user ? `Shop: ${user.name || user.username}` : 'Retail POS')}</Text>
        </View>
      </View>

      <View style={styles.right}>
        {onRefresh && (
          <TouchableOpacity
            style={[styles.iconButton, isRefreshing && styles.iconButtonRotating]}
            onPress={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
        <View style={styles.userBadge}>
          <UserCircle size={18} color={colors.primary} />
          <Text style={styles.roleText}>{user?.role || 'USER'}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonRotating: {
    opacity: 0.5,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
});
