import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Store, X, CircleCheck } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

interface EditShopProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export const EditShopProfileModal: React.FC<EditShopProfileModalProps> = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const modalBottomPadding = Math.max(
    insets.bottom > 0 ? insets.bottom + 20 : 0,
    Platform.OS === 'android' ? 56 : 24
  );
  const { shopProfile, updateShopProfile } = useAuth();

  const [shopName, setShopName] = useState(shopProfile?.shopName || '');
  const [phone, setPhone] = useState(shopProfile?.phone || '');
  const [address, setAddress] = useState(shopProfile?.address || '');
  const [tagline, setTagline] = useState(shopProfile?.tagline || '');
  const [saving, setSaving] = useState(false);

  // Sync with current shop profile on open
  React.useEffect(() => {
    if (visible && shopProfile) {
      setShopName(shopProfile.shopName || '');
      setPhone(shopProfile.phone || '');
      setAddress(shopProfile.address || '');
      setTagline(shopProfile.tagline || '');
    }
  }, [visible, shopProfile]);

  const handleSave = async () => {
    const trimmedName = shopName.trim();
    if (!trimmedName) {
      Alert.alert('Shop Name Required', 'Please enter your shop or business name (e.g. Sandeep Minimart).');
      return;
    }

    setSaving(true);
    try {
      await updateShopProfile({
        shopName: trimmedName,
        phone: phone.trim(),
        address: address.trim(),
        tagline: tagline.trim(),
      });
      Alert.alert('Shop Profile Updated', 'Your shop name and details will now appear on all bill receipts and PDF exports.');
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to save shop profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/60"
      >
        <View className="max-h-[90%] rounded-t-3xl bg-white px-5 pt-5" style={{ paddingBottom: modalBottomPadding }}>
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-1 flex-row items-center gap-2">
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#d1fae5]">
                <Store size={20} color={colors.primary} />
              </View>
              <View>
                <Text className="text-xl font-extrabold text-[#0f172a]">Shop Profile</Text>
                <Text className="text-xs text-[#64748b]">Appears on PDF bills & receipts</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <X size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-4" keyboardShouldPersistTaps="handled">
            <Text className="mb-1.5 text-[11px] font-bold uppercase text-[#64748b]">
              Shop / Business Name *
            </Text>
            <TextInput
              className="mb-3.5 h-12 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3.5 text-base font-bold text-[#0f172a]"
              placeholder="e.g. Sandeep Minimart"
              placeholderTextColor={colors.textLight}
              value={shopName}
              onChangeText={setShopName}
              maxLength={100}
            />

            <Text className="mb-1.5 text-[11px] font-bold uppercase text-[#64748b]">
              Shop Contact Phone (Optional)
            </Text>
            <TextInput
              className="mb-3.5 h-12 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3.5 text-base text-[#0f172a]"
              placeholder="e.g. +91 98765 43210"
              placeholderTextColor={colors.textLight}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              maxLength={20}
            />

            <Text className="mb-1.5 text-[11px] font-bold uppercase text-[#64748b]">
              Shop Address / Location (Optional)
            </Text>
            <TextInput
              className="mb-3.5 h-12 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3.5 text-base text-[#0f172a]"
              placeholder="e.g. Shop #4, Main Market, City"
              placeholderTextColor={colors.textLight}
              value={address}
              onChangeText={setAddress}
              maxLength={150}
            />

            <Text className="mb-1.5 text-[11px] font-bold uppercase text-[#64748b]">
              Tagline / Greeting (Optional)
            </Text>
            <TextInput
              className="mb-2 h-12 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3.5 text-base text-[#0f172a]"
              placeholder="e.g. Quality Groceries at Best Prices"
              placeholderTextColor={colors.textLight}
              value={tagline}
              onChangeText={setTagline}
              maxLength={100}
            />

            <View className="mt-2 rounded-xl bg-[#ecfdf5] p-3 border border-[#a7f3d0]">
              <Text className="text-xs font-medium text-[#047857]">
                💡 Receipts and exported PDFs will be branded with your shop name, contact information, and real-time transaction timestamp.
              </Text>
            </View>
          </ScrollView>

          <View className="flex-row gap-2.5 border-t border-[#e2e8f0] pt-3">
            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center rounded-xl border border-[#e2e8f0] bg-[#f8fafc] py-3"
              onPress={onClose}
            >
              <Text className="text-sm font-bold text-[#0f172a]">Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-[2] flex-row items-center justify-center gap-1.5 rounded-xl bg-[#059669] py-3"
              onPress={handleSave}
              disabled={saving}
            >
              <CircleCheck size={18} color="#fff" />
              <Text className="text-sm font-black text-white">
                {saving ? 'Saving...' : 'Save Shop Profile'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
