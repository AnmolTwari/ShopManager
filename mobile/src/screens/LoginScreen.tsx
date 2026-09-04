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
import { Lock, User, Eye, EyeOff, Sparkles } from 'lucide-react-native';

const APP_LOGO = require('../../assets/logo.png');

interface LoginScreenProps {
  onSwitchToRegister: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSwitchToRegister }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    const cleanUser = username.trim().slice(0, 100).replace(/[\x00-\x1F\x7F]/g, '');
    if (!cleanUser || !password.trim()) {
      setErrorMessage('Please enter both username/email and password.');
      return;
    }
    if (password.length < 1 || password.length > 128) {
      setErrorMessage('Password must be between 1 and 128 characters.');
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      await login({ username: cleanUser, password });
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
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
        {/* Brand Header */}
        <View className="mb-5 items-center">
          <View className="mb-2.5 h-16 w-16 items-center justify-center overflow-hidden rounded-[18px] border-[1.5px] border-[rgba(5,150,105,0.4)] bg-[#0f172a]">
            <Image source={APP_LOGO} className="h-16 w-16" resizeMode="contain" />
          </View>
          <Text className="text-2xl font-black text-white">ShopManager</Text>
          <Text className="mt-1 text-center text-xs text-[#94a3b8]">Smart Point of Sale & Inventory for Retail</Text>
        </View>

        {/* Login Card */}
        <View className="rounded-[22px] bg-white p-5 shadow-lg">
          <Text className="text-[19px] font-extrabold text-[#0f172a]">Welcome Back</Text>
          <Text className="mb-3.5 mt-0.5 text-xs text-[#64748b]">Sign in with your username or registered email</Text>

          {errorMessage && (
            <View className="mb-3 rounded-[10px] bg-[#fee2e2] p-2.5">
              <Text className="text-xs font-semibold text-[#ef4444]">{errorMessage}</Text>
            </View>
          )}

          {/* Username / Email Field */}
          <View className="mb-3">
            <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.4px] text-[#0f172a]">Username or Email</Text>
            <View className="h-[46px] flex-row items-center rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3">
              <User size={18} color={colors.textMuted} className="mr-2" />
              <TextInput
                className="h-[46px] flex-1 text-sm text-[#0f172a]"
                placeholder="e.g. shopowner or name@store.com"
                placeholderTextColor={colors.textLight}
                value={username}
                onChangeText={(text) => {
                  setUsername(text.slice(0, 100));
                  setErrorMessage(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={100}
                keyboardType="default"
              />
            </View>
          </View>

          {/* Password Field */}
          <View className="mb-3">
            <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.4px] text-[#0f172a]">Password</Text>
            <View className="h-[46px] flex-row items-center rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3">
              <Lock size={18} color={colors.textMuted} className="mr-2" />
              <TextInput
                className="h-[46px] flex-1 text-sm text-[#0f172a]"
                placeholder="Enter your password"
                placeholderTextColor={colors.textLight}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(text) => {
                  setPassword(text.slice(0, 128));
                  setErrorMessage(null);
                }}
                autoCapitalize="none"
                maxLength={128}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((p) => !p)}
                className="p-1.5"
              >
                {showPassword ? (
                  <EyeOff size={18} color={colors.textMuted} />
                ) : (
                  <Eye size={18} color={colors.textMuted} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            className="mt-2 h-12 flex-row items-center justify-center gap-2 rounded-[14px] bg-[#059669]"
            style={loading ? { opacity: 0.6 } : undefined}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text className="text-sm font-extrabold text-white">Sign In to Shop</Text>
                <Sparkles size={16} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          {/* Switch to Register */}
          <View className="mt-4 flex-row justify-center">
            <Text className="text-[13px] text-[#64748b]">New to ShopManager? </Text>
            <TouchableOpacity onPress={onSwitchToRegister}>
              <Text className="text-[13px] font-extrabold text-[#059669]">Create an Account</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Live Sync Banner */}
        <View className="mt-[18px] self-center rounded-full bg-[rgba(255,255,255,0.06)] px-3.5 py-1.5">
          <Text className="text-center text-[11px] font-semibold text-[#cbd5e1]">
            ⚡ Unified Database — Log in with the same account as your website
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

