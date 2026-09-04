import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { Lock, User, Mail, Sparkles, Building2 } from 'lucide-react-native';

const APP_LOGO = require('../../assets/logo.png');

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
      className="flex-1 bg-[#0f172a]"
    >
      <ScrollView contentContainerClassName="flex-grow justify-center p-5" keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View className="mb-5 items-center">
          <View className="mb-2.5 h-16 w-16 items-center justify-center overflow-hidden rounded-[18px] border-[1.5px] border-[rgba(5,150,105,0.4)] bg-[#0f172a]">
            <Image source={APP_LOGO} className="h-16 w-16" resizeMode="contain" />
          </View>
          <Text className="text-2xl font-black text-white">ShopManager</Text>
          <Text className="mt-0.5 text-center text-xs text-[#94a3b8]">Register Your Shop in Seconds</Text>
        </View>

        {/* Card */}
        <View className="rounded-[22px] bg-white p-5 shadow-lg">
          <Text className="text-[19px] font-extrabold text-[#0f172a]">Create Shop Account</Text>
          <Text className="mb-3.5 mt-0.5 text-xs text-[#64748b]">Get full inventory, billing & analytics access</Text>

          {errorMessage && (
            <View className="mb-3 rounded-[10px] bg-[#fee2e2] p-2.5">
              <Text className="text-xs font-semibold text-[#ef4444]">{errorMessage}</Text>
            </View>
          )}

          {/* Shop / Owner Name */}
          <View className="mb-3">
            <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.4px] text-[#0f172a]">Shop Name / Your Name</Text>
            <View className="h-11 flex-row items-center rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3">
              <Building2 size={18} color={colors.textMuted} className="mr-2" />
              <TextInput
                className="h-11 flex-1 text-sm text-[#0f172a]"
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
          <View className="mb-3">
            <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.4px] text-[#0f172a]">Username *</Text>
            <View className="h-11 flex-row items-center rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3">
              <User size={18} color={colors.textMuted} className="mr-2" />
              <TextInput
                className="h-11 flex-1 text-sm text-[#0f172a]"
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
          <View className="mb-3">
            <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.4px] text-[#0f172a]">Email Address *</Text>
            <View className="h-11 flex-row items-center rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3">
              <Mail size={18} color={colors.textMuted} className="mr-2" />
              <TextInput
                className="h-11 flex-1 text-sm text-[#0f172a]"
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
          <View className="mb-3">
            <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.4px] text-[#0f172a]">Password (min 6 chars) *</Text>
            <View className="h-11 flex-row items-center rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3">
              <Lock size={18} color={colors.textMuted} className="mr-2" />
              <TextInput
                className="h-11 flex-1 text-sm text-[#0f172a]"
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
            className="mt-2 h-12 flex-row items-center justify-center gap-2 rounded-[14px] bg-[#059669]"
            style={loading ? { opacity: 0.6 } : undefined}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text className="text-sm font-extrabold text-white">Create Shop Account</Text>
                <Sparkles size={16} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          {/* Switch to Login */}
          <View className="mt-4 flex-row justify-center">
            <Text className="text-[13px] text-[#64748b]">Already have an account? </Text>
            <TouchableOpacity onPress={onSwitchToLogin}>
              <Text className="text-[13px] font-extrabold text-[#059669]">Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
