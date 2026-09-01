import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { Store, Lock, User, Mail, Sparkles, Building2 } from 'lucide-react-native';

interface RegisterScreenProps {
  onSwitchToLogin: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onSwitchToLogin }) => {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleRegister = async () => {
    const cleanUser = username.trim().slice(0, 50).replace(/[\x00-\x1F\x7F]/g, '');
    const cleanEmail = email.trim().slice(0, 254).toLowerCase();
    const cleanName = name.trim().slice(0, 80).replace(/[\x00-\x1F\x7F]/g, '');

    if (!cleanUser || !cleanEmail || !password.trim()) {
      setErrorMessage('Please fill in all required fields (username, email, password).');
      return;
    }
    if (cleanUser.length < 3 || !/^[a-zA-Z0-9._-]+$/.test(cleanUser)) {
      setErrorMessage('Username must be 3+ chars, only letters, numbers, . _ - allowed.');
      return;
    }
    if (!isValidEmail(cleanEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (password.length < 6 || password.length > 128) {
      setErrorMessage('Password must be 6 to 128 characters.');
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      await register({
        username: cleanUser,
        email: cleanEmail,
        password,
        name: cleanName || undefined,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Username or email may already be taken.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Store size={36} color="#fff" />
          </View>
          <Text style={styles.brandTitle}>ShopManager</Text>
          <Text style={styles.brandTagline}>Register Your Shop in Seconds</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create Shop Account</Text>
          <Text style={styles.cardSubtitle}>Get full inventory, billing & analytics access</Text>

          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Shop / Owner Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Shop Name / Your Name</Text>
            <View style={styles.inputWrapper}>
              <Building2 size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. Green Grocery Store"
                placeholderTextColor={colors.textLight}
                value={name}
                onChangeText={(v) => setName(v.slice(0, 80))}
                maxLength={80}
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Username */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username *</Text>
            <View style={styles.inputWrapper}>
              <User size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. greengrocery"
                placeholderTextColor={colors.textLight}
                value={username}
                onChangeText={(text) => {
                  setUsername(text.slice(0, 50));
                  setErrorMessage(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={50}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address *</Text>
            <View style={styles.inputWrapper}>
              <Mail size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="owner@example.com"
                placeholderTextColor={colors.textLight}
                value={email}
                onChangeText={(text) => {
                  setEmail(text.slice(0, 254));
                  setErrorMessage(null);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={254}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password (min 6 chars) *</Text>
            <View style={styles.inputWrapper}>
              <Lock size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Create a strong password"
                placeholderTextColor={colors.textLight}
                secureTextEntry
                value={password}
                onChangeText={(text) => {
                  setPassword(text.slice(0, 128));
                  setErrorMessage(null);
                }}
                autoCapitalize="none"
                maxLength={128}
              />
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>Create Shop Account</Text>
                <Sparkles size={16} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          {/* Switch to Login */}
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Already have an account? </Text>
            <TouchableOpacity onPress={onSwitchToLogin}>
              <Text style={styles.switchLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
  },
  brandTagline: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 3,
    marginBottom: 14,
  },
  errorBox: {
    backgroundColor: colors.dangerLight,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: colors.text,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 14,
    marginTop: 8,
    gap: 8,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  switchText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  switchLink: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
});
