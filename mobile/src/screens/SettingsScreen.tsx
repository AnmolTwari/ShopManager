import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Building,
  Lock,
  LogOut,
  Mail,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react-native';
import { Header } from '../components/Header';
import { ChangePasswordModal } from '../components/ChangePasswordModal';
import { ChangeEmailModal } from '../components/ChangeEmailModal';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

export const SettingsScreen: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  const handleLogoutPress = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of ShopManager?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
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

        {/* Sign Out Button */}
        <TouchableOpacity className="mt-1 flex-row items-center justify-center gap-2 rounded-[14px] border border-[rgba(239,68,68,0.2)] bg-[#fee2e2] py-3.5" onPress={handleLogoutPress} activeOpacity={0.7}>
          <LogOut size={18} color={colors.danger} />
          <Text className="text-sm font-extrabold text-[#ef4444]">Sign Out from Shop</Text>
        </TouchableOpacity>

        <Text className="mt-5 text-center text-[11px] text-[#94a3b8]">ShopManager Mobile v1.0.0</Text>
      </ScrollView>

      {/* Sub-modals */}
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
