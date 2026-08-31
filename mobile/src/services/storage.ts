import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'shopmanager_access_token';
const USER_KEY = 'shopmanager_user_data';
const API_URL_KEY = 'shopmanager_custom_api_url';

export const storage = {
  async saveToken(token: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
      }
    } catch (e) {
      console.warn('Failed to save token to secure storage', e);
    }
  },

  async getToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(TOKEN_KEY);
      }
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (e) {
      console.warn('Failed to read token from secure storage', e);
      return null;
    }
  },

  async removeToken(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(TOKEN_KEY);
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
    } catch (e) {
      console.warn('Failed to delete token from secure storage', e);
    }
  },

  async saveUserData(userData: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(USER_KEY, userData);
      } else {
        await SecureStore.setItemAsync(USER_KEY, userData);
      }
    } catch (e) {
      console.warn('Failed to save user data', e);
    }
  },

  async getUserData(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(USER_KEY);
      }
      return await SecureStore.getItemAsync(USER_KEY);
    } catch (e) {
      return null;
    }
  },

  async removeUserData(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(USER_KEY);
      } else {
        await SecureStore.deleteItemAsync(USER_KEY);
      }
    } catch (e) {
      console.warn('Failed to delete user data', e);
    }
  },

  async saveCustomApiUrl(url: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(API_URL_KEY, url);
      } else {
        await SecureStore.setItemAsync(API_URL_KEY, url);
      }
    } catch (e) {
      console.warn('Failed to save custom API URL', e);
    }
  },

  async getCustomApiUrl(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(API_URL_KEY);
      }
      return await SecureStore.getItemAsync(API_URL_KEY);
    } catch (e) {
      return null;
    }
  },
};
