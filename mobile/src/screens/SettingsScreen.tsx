import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Header } from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { api, DEFAULT_BASE_URL } from '../services/api';
import { settingsApi } from '../services/shopApi';
import { storage } from '../services/storage';
import { colors } from '../theme/colors';
import { ui } from '../theme/ui';
import {
  User,
  Mail,
  Lock,
  Server,
  LogOut,
  ShieldCheck,
  Building,
  CheckCircle,
  X,
} from 'lucide-react-native';

export const SettingsScreen: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();

  // Password Modal
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  // Email Modal
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailSubmitting, setEmailSubmitting] = useState(false);

  // Backend API URL Modal
  const [urlModalOpen, setUrlModalOpen] = useState(false);
  const [customApiUrl, setCustomApiUrl] = useState(api.getBaseUrl());

  const handlePasswordSubmit = async () => {
    if (!currentPassword.trim() || !newPassword.trim()) {
      Alert.alert('Required', 'Please fill in current and new password.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Too Short', 'New password must be at least 6 characters.');
      return;
    }

    setPasswordSubmitting(true);
    try {
      await settingsApi.changePassword({ currentPassword, newPassword });
      Alert.alert('Success', 'Password updated successfully!');
      setPasswordModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      Alert.alert('Failed', err.message || 'Incorrect current password.');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const handleEmailSubmit = async () => {
    if (!newEmail.trim() || !emailPassword.trim()) {
      Alert.alert('Required', 'Please enter new email and current password.');
      return;
    }

    setEmailSubmitting(true);
    try {
      await settingsApi.changeEmail({ newEmail: newEmail.trim(), password: emailPassword });
      Alert.alert('Success', 'Email updated successfully!');
      setEmailModalOpen(false);
      setNewEmail('');
      setEmailPassword('');
      refreshUser();
    } catch (err: any) {
      Alert.alert('Failed', err.message || 'Failed to update email.');
    } finally {
      setEmailSubmitting(false);
    }
  };

  const handleSaveApiUrl = async () => {
    const trimmed = customApiUrl.trim() || DEFAULT_BASE_URL;
    api.setBaseUrl(trimmed);
    await storage.saveCustomApiUrl(trimmed);
    setUrlModalOpen(false);
    Alert.alert('API Updated', `Backend target set to: ${trimmed}`);
  };

  const handleLogoutPress = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of ShopManager?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View style={styles.container}>
      <Header title="Shop Settings" subtitle="Account & App Preferences" />

      <ScrollView contentContainerStyle={styles.scrollBody}>
        {/* User Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarBox}>
            <Building size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{user?.name || user?.username || 'Shop Owner'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'No email attached'}</Text>
            <View style={styles.rolePill}>
              <ShieldCheck size={12} color={colors.primary} />
              <Text style={styles.roleText}>{user?.role || 'USER'}</Text>
            </View>
          </View>
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Security</Text>
          <View style={styles.menuGroup}>
            <TouchableOpacity style={styles.menuItem} onPress={() => setPasswordModalOpen(true)}>
              <View style={styles.menuIconBox}>
                <Lock size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuLabel}>Change Password</Text>
                <Text style={styles.menuSub}>Update your login password</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => setEmailModalOpen(true)}>
              <View style={styles.menuIconBox}>
                <Mail size={18} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuLabel}>Change Email</Text>
                <Text style={styles.menuSub}>{user?.email || 'Update registered email'}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Network & Backend Configuration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Server Connection</Text>
          <View style={styles.menuGroup}>
            <TouchableOpacity style={styles.menuItem} onPress={() => setUrlModalOpen(true)}>
              <View style={styles.menuIconBox}>
                <Server size={18} color={colors.info} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuLabel}>Backend API URL</Text>
                <Text style={styles.menuSub} numberOfLines={1}>
                  {api.getBaseUrl()}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogoutPress}>
          <LogOut size={18} color={colors.danger} />
          <Text style={styles.logoutText}>Sign Out from Shop</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>ShopManager Mobile v1.0.0 • Connected to Live Cloud DB</Text>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal visible={passwordModalOpen} animationType="slide" transparent>
        <View style={ui.modalOverlay}>
          <View style={ui.modalContent}>
            <View style={ui.modalHeader}>
              <Text style={ui.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setPasswordModalOpen(false)}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Current Password</Text>
            <TextInput
              style={ui.input}
              placeholder="Enter current password"
              placeholderTextColor={colors.textLight}
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />

            <Text style={styles.inputLabel}>New Password (min 6 chars)</Text>
            <TextInput
              style={ui.input}
              placeholder="Enter new password"
              placeholderTextColor={colors.textLight}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <View style={ui.modalActions}>
              <TouchableOpacity style={[ui.btnGhost, {flex:1}]} onPress={() => setPasswordModalOpen(false)}>
                <Text style={ui.btnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[ui.btnPrimary, {flex:2}, passwordSubmitting && {opacity:0.6}]}
                onPress={handlePasswordSubmit}
                disabled={passwordSubmitting}
              >
                {passwordSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={ui.btnPrimaryText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Email Modal */}
      <Modal visible={emailModalOpen} animationType="slide" transparent>
        <View style={ui.modalOverlay}>
          <View style={ui.modalContent}>
            <View style={ui.modalHeader}>
              <Text style={ui.modalTitle}>Change Email Address</Text>
              <TouchableOpacity onPress={() => setEmailModalOpen(false)}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>New Email Address</Text>
            <TextInput
              style={ui.input}
              placeholder="new@example.com"
              placeholderTextColor={colors.textLight}
              keyboardType="email-address"
              autoCapitalize="none"
              value={newEmail}
              onChangeText={setNewEmail}
            />

            <Text style={styles.inputLabel}>Current Password (for security)</Text>
            <TextInput
              style={ui.input}
              placeholder="Confirm with your password"
              placeholderTextColor={colors.textLight}
              secureTextEntry
              value={emailPassword}
              onChangeText={setEmailPassword}
            />

            <View style={ui.modalActions}>
              <TouchableOpacity style={[ui.btnGhost, {flex:1}]} onPress={() => setEmailModalOpen(false)}>
                <Text style={ui.btnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[ui.btnPrimary, {flex:2}, emailSubmitting && {opacity:0.6}]}
                onPress={handleEmailSubmit}
                disabled={emailSubmitting}
              >
                {emailSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={ui.btnPrimaryText}>Update Email</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Backend URL Modal */}
      <Modal visible={urlModalOpen} animationType="slide" transparent>
        <View style={ui.modalOverlay}>
          <View style={ui.modalContent}>
            <View style={ui.modalHeader}>
              <Text style={ui.modalTitle}>Backend API Target</Text>
              <TouchableOpacity onPress={() => setUrlModalOpen(false)}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>API Base URL</Text>
            <TextInput
              style={ui.input}
              placeholder="https://your-backend.onrender.com/api"
              placeholderTextColor={colors.textLight}
              autoCapitalize="none"
              value={customApiUrl}
              onChangeText={setCustomApiUrl}
            />

            <TouchableOpacity
              style={styles.presetUrlBtn}
              onPress={() => setCustomApiUrl(DEFAULT_BASE_URL)}
            >
              <Text style={styles.presetUrlText}>Reset to Live Render Cloud URL</Text>
            </TouchableOpacity>

            <View style={ui.modalActions}>
              <TouchableOpacity style={[ui.btnGhost, {flex:1}]} onPress={() => setUrlModalOpen(false)}>
                <Text style={ui.btnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[ui.btnPrimary, {flex:2}]} onPress={handleSaveApiUrl}>
                <Text style={ui.btnPrimaryText}>Save URL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
    marginBottom: 20,
  },
  avatarBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  userEmail: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
    gap: 4,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  menuGroup: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  menuSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerLight,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 6,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.danger,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.textLight,
    marginTop: 20,
  },
  
  
  
  
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  
  presetUrlBtn: {
    paddingVertical: 8,
    marginBottom: 12,
  },
  presetUrlText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  
  
  
  
  
  
});
