import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'shopmanager_access_token';
const USER_KEY = 'shopmanager_user_data';
const API_URL_KEY = 'shopmanager_custom_api_url';
const SHOP_PROFILE_KEY = 'shopmanager_shop_profile';

// Fast In-Memory cache for 0ms synchronous read times
let memoryToken: string | null = null;
let memoryUserData: string | null = null;
let memoryCustomApiUrl: string | null = null;
let memoryShopProfile: string | null = null;

export const storage = {
  async saveToken(token: string): Promise<void> {
    memoryToken = token;
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
    if (memoryToken !== null) {
      return memoryToken;
    }
    try {
      let token: string | null = null;
      if (Platform.OS === 'web') {
        token = localStorage.getItem(TOKEN_KEY);
      } else {
        token = await SecureStore.getItemAsync(TOKEN_KEY);
      }
      memoryToken = token;
      return token;
    } catch (e) {
      console.warn('Failed to read token from secure storage', e);
      return null;
    }
  },

  async removeToken(): Promise<void> {
    memoryToken = null;
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
    memoryUserData = userData;
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
    if (memoryUserData !== null) {
      return memoryUserData;
    }
    try {
      let data: string | null = null;
      if (Platform.OS === 'web') {
        data = localStorage.getItem(USER_KEY);
      } else {
        data = await SecureStore.getItemAsync(USER_KEY);
      }
      memoryUserData = data;
      return data;
    } catch {
      return null;
    }
  },

  async removeUserData(): Promise<void> {
    memoryUserData = null;
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
    memoryCustomApiUrl = url;
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
    if (memoryCustomApiUrl !== null) {
      return memoryCustomApiUrl;
    }
    try {
      let url: string | null = null;
      if (Platform.OS === 'web') {
        url = localStorage.getItem(API_URL_KEY);
      } else {
        url = await SecureStore.getItemAsync(API_URL_KEY);
      }
      memoryCustomApiUrl = url;
      return url;
    } catch {
      return null;
    }
  },

  async removeCustomApiUrl(): Promise<void> {
    memoryCustomApiUrl = null;
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(API_URL_KEY);
      } else {
        await SecureStore.deleteItemAsync(API_URL_KEY);
      }
    } catch (e) {
      console.warn('Failed to delete custom API URL', e);
    }
  },

  async saveShopProfile(profileData: string): Promise<void> {
    memoryShopProfile = profileData;
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(SHOP_PROFILE_KEY, profileData);
      } else {
        await SecureStore.setItemAsync(SHOP_PROFILE_KEY, profileData);
      }
    } catch (e) {
      console.warn('Failed to save shop profile to storage', e);
    }
  },

  async getShopProfile(): Promise<string | null> {
    if (memoryShopProfile !== null) {
      return memoryShopProfile;
    }
    try {
      let prof: string | null = null;
      if (Platform.OS === 'web') {
        prof = localStorage.getItem(SHOP_PROFILE_KEY);
      } else {
        prof = await SecureStore.getItemAsync(SHOP_PROFILE_KEY);
      }
      memoryShopProfile = prof;
      return prof;
    } catch {
      return null;
    }
  },

  async removeShopProfile(): Promise<void> {
    memoryShopProfile = null;
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(SHOP_PROFILE_KEY);
      } else {
        await SecureStore.deleteItemAsync(SHOP_PROFILE_KEY);
      }
    } catch (e) {
      console.warn('Failed to delete shop profile from storage', e);
    }
  },
};
