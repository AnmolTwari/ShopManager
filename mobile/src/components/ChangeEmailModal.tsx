import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import { settingsApi } from '../services/shopApi';
import { colors } from '../theme/colors';

interface ChangeEmailModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ChangeEmailModal: React.FC<ChangeEmailModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newEmail.trim() || !password.trim()) {
      Alert.alert('Required', 'Please enter new email and current password.');
      return;
    }

    setSubmitting(true);
    try {
      await settingsApi.changeEmail({ newEmail: newEmail.trim(), password });
      Alert.alert('Success', 'Email updated successfully!');
      setNewEmail('');
      setPassword('');
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Failed', err.message || 'Failed to update email.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 justify-end bg-[rgba(0,0,0,0.6)]">
        <View className="max-h-[90%] rounded-t-[24px] bg-white p-5">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-2xl font-extrabold text-[#0f172a]">Change Email Address</Text>
            <TouchableOpacity onPress={onClose} disabled={submitting}>
              <X size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Text className="mb-1.5 text-[11px] font-bold uppercase text-[#64748b]">New Email Address</Text>
          <TextInput
            className="mb-3 h-11 rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-3 text-base text-[#0f172a]"
            placeholder="new@example.com"
            placeholderTextColor={colors.textLight}
            keyboardType="email-address"
            autoCapitalize="none"
            value={newEmail}
            onChangeText={setNewEmail}
          />

          <Text className="mb-1.5 text-[11px] font-bold uppercase text-[#64748b]">Current Password (for security)</Text>
          <TextInput
            className="h-11 rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-3 text-base text-[#0f172a]"
            placeholder="Confirm with your password"
            placeholderTextColor={colors.textLight}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <View className="flex-row gap-2.5 border-t border-[#e2e8f0] pt-3">
            <TouchableOpacity className="flex-1 items-center justify-center rounded-lg border border-[#e2e8f0] bg-[#f8fafc] py-3" onPress={onClose} disabled={submitting}>
              <Text className="text-base font-bold text-[#0f172a]">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-[2] flex-row items-center justify-center gap-1.5 rounded-lg bg-[#059669] py-3"
              style={submitting ? { opacity: 0.6 } : undefined}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-base font-extrabold text-white">Update Email</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

