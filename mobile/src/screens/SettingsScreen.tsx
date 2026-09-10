import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Updates from 'expo-updates';
import {
  Building,
  Lock,
  LogOut,
  Mail,
  ShieldCheck,
  ChevronRight,
  Store,
  Phone,
  MapPin,
  RefreshCw,
} from 'lucide-react-native';
import { Header } from '../components/Header';
import { ChangePasswordModal } from '../components/ChangePasswordModal';
import { ChangeEmailModal } from '../components/ChangeEmailModal';
import { EditShopProfileModal } from '../components/EditShopProfileModal';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

export const SettingsScreen: React.FC = () => {
  const { user, shopProfile, logout, refreshUser } = useAuth();

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [shopProfileModalOpen, setShopProfileModalOpen] = useState(false);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);

  const handleLogoutPress = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of ShopManager?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const handleCheckUpdates = async () => {
    try {
      setIsCheckingUpdates(true);
      if (__DEV__) {
        Alert.alert('Development Mode', 'Live reloading is active in dev mode.');
        setIsCheckingUpdates(false);
        return;
      }
      if (!Updates.isEnabled) {
        Alert.alert('App Update', 'Over-the-air updates are active in standalone release APK builds.');
        setIsCheckingUpdates(false);
        return;
      }
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        Alert.alert('Update Available', 'Downloading latest features and restarting app...', [
          {
            text: 'OK',
            onPress: async () => {
              await Updates.fetchUpdateAsync();
              await Updates.reloadAsync();
            },
          },
        ]);
      } else {
        Alert.alert('Up to Date', 'You are already using the latest version of ShopManager.');
      }
    } catch (e: any) {
      console.warn('Updates error:', e);
      Alert.alert('App Update', 'No new update published yet on EAS, or this APK was built before EAS update was linked. Publish with "eas update" or install latest APK.');
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  return (
    <View className="flex-1 bg-[#f8fafc]">
      <Header title="Shop Settings" subtitle="Account & App Preferences" />

      <ScrollView contentContainerClassName="p-4 pb-10" showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View className="mb-5 flex-row items-center gap-3.5 rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
          <View className="h-[52px] w-[52px] items-center justify-center rounded-[14px] bg-[#059669]">
            <Building size={26} color="#fff" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-extrabold text-[#0f172a]">{user?.name || user?.username || 'Shop Owner'}</Text>
            <Text className="mt-0.5 text-xs text-[#64748b]">{user?.email || 'No email attached'}</Text>
            <View className="mt-1.5 flex-row items-center gap-1 self-start rounded-md bg-[#d1fae5] px-2 py-0.5">
              <ShieldCheck size={12} color={colors.primary} />
              <Text className="text-[10px] font-extrabold text-[#059669]">{user?.role || 'USER'}</Text>
            </View>
          </View>
        </View>

        {/* Shop Branding & Invoicing Profile */}
        <View className="mb-5">
          <Text className="mb-2 px-1 text-xs font-extrabold uppercase tracking-[0.5px] text-[#64748b]">
            Shop Branding & PDF Invoices
          </Text>
          <View className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
            <TouchableOpacity
              className="p-4"
              onPress={() => setShopProfileModalOpen(true)}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1 flex-row items-center gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#d1fae5]">
                    <Store size={20} color={colors.primary} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-black text-[#0f172a]">
                      {shopProfile?.shopName || 'Set Shop Name'}
                    </Text>
                    <Text className="mt-0.5 text-[11px] text-[#64748b]">
                      Printed on all bills, receipts, and WhatsApp shares
                    </Text>
                  </View>
                </View>
                <ChevronRight size={18} color={colors.textLight} />
              </View>

              {(shopProfile?.phone || shopProfile?.address) && (
                <View className="mt-3 border-t border-[#f1f5f9] pt-2.5 gap-1">
                  {shopProfile?.phone ? (
                    <View className="flex-row items-center gap-1.5">
                      <Phone size={12} color={colors.textMuted} />
                      <Text className="text-[11px] text-[#64748b]">{shopProfile.phone}</Text>
                    </View>
                  ) : null}
                  {shopProfile?.address ? (
                    <View className="flex-row items-center gap-1.5">
                      <MapPin size={12} color={colors.textMuted} />
                      <Text className="text-[11px] text-[#64748b]" numberOfLines={1}>{shopProfile.address}</Text>
                    </View>
                  ) : null}
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Security Section */}
        <View className="mb-5">
          <Text className="mb-2 px-1 text-xs font-extrabold uppercase tracking-[0.5px] text-[#64748b]">Account & Security</Text>
          <View className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
            <TouchableOpacity
              className="flex-row items-center gap-3 border-b border-[#e2e8f0] p-3.5"
              onPress={() => setPasswordModalOpen(true)}
              activeOpacity={0.7}
            >
              <View className="h-9 w-9 items-center justify-center rounded-[10px] bg-[#d1fae5]">
                <Lock size={18} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-[#0f172a]">Change Password</Text>
                <Text className="mt-px text-[11px] text-[#64748b]">Update your login password</Text>
              </View>
              <ChevronRight size={16} color={colors.textLight} />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center gap-3 p-3.5"
              onPress={() => setEmailModalOpen(true)}
              activeOpacity={0.7}
            >
              <View className="h-9 w-9 items-center justify-center rounded-[10px] bg-[#dbeafe]">
                <Mail size={18} color={colors.accent} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-[#0f172a]">Change Email</Text>
                <Text className="mt-px text-[11px] text-[#64748b]">{user?.email || 'Update registered email'}</Text>
              </View>
              <ChevronRight size={16} color={colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>

        {/* App Version & Updates */}
        <View className="mb-5">
          <Text className="mb-2 px-1 text-xs font-extrabold uppercase tracking-[0.5px] text-[#64748b]">App & System</Text>
          <View className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
            <TouchableOpacity
              className="flex-row items-center gap-3 p-3.5"
              onPress={handleCheckUpdates}
              disabled={isCheckingUpdates}
              activeOpacity={0.7}
            >
              <View className="h-9 w-9 items-center justify-center rounded-[10px] bg-[#e0f2fe]">
                {isCheckingUpdates ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <RefreshCw size={18} color={colors.primary} />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-[#0f172a]">Check for App Updates</Text>
                <Text className="mt-px text-[11px] text-[#64748b]">
                  {isCheckingUpdates ? 'Checking for updates...' : 'Get latest features & fixes over-the-air'}
                </Text>
              </View>
              <ChevronRight size={16} color={colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity className="mt-1 flex-row items-center justify-center gap-2 rounded-[14px] border border-[rgba(239,68,68,0.2)] bg-[#fee2e2] py-3.5" onPress={handleLogoutPress} activeOpacity={0.7}>
          <LogOut size={18} color={colors.danger} />
          <Text className="text-sm font-extrabold text-[#ef4444]">Sign Out from Shop</Text>
        </TouchableOpacity>

        <Text className="mt-5 text-center text-[11px] text-[#94a3b8]">ShopManager Mobile v1.0.0</Text>
      </ScrollView>

      {/* Sub-modals */}
      <EditShopProfileModal
        visible={shopProfileModalOpen}
        onClose={() => setShopProfileModalOpen(false)}
      />
      <ChangePasswordModal
        visible={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
      <ChangeEmailModal
        visible={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        onSuccess={refreshUser}
      />
    </View>
  );
};
