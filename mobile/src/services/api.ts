import axios, { AxiosError, AxiosInstance } from 'axios';
import { storage } from './storage';

// Default to live Render backend, with fallback capability for local dev
export const DEFAULT_BASE_URL = 'https://grocery-shop-backend-bfgk.onrender.com/api';

/**
 * Validate custom API URL to prevent SSRF / injection.
 * Only allow http/https, must contain host, auto-append /api suffix if missing.
 */
function sanitizeApiUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    // Disallow credentials in URL
    if (url.username || url.password) return null;
    // Normalize: ensure ends with /api
    let normalized = url.toString().replace(/\/+$/, '');
    if (!normalized.endsWith('/api')) {
      normalized = `${normalized}/api`;
    }
    return normalized;
  } catch {
    return null;
  }
}

class ApiClient {
  private instance: AxiosInstance;
  private currentBaseUrl: string = DEFAULT_BASE_URL;

  constructor() {
    this.instance = axios.create({
      baseURL: this.currentBaseUrl,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    this.initializeCustomUrl();
  }

  private async initializeCustomUrl() {
    const savedUrl = await storage.getCustomApiUrl();
    if (savedUrl && savedUrl.trim()) {
      const sanitized = sanitizeApiUrl(savedUrl.trim());
      if (sanitized) {
        this.setBaseUrl(sanitized);
      } else {
        // Remove invalid stored URL
        await storage.removeCustomApiUrl?.();
      }
    }
  }

  public setBaseUrl(newUrl: string) {
    const sanitized = sanitizeApiUrl(newUrl);
    if (!sanitized) {
      throw new Error('Invalid API URL. Use http(s)://host/api');
    }
    this.currentBaseUrl = sanitized;
    this.instance.defaults.baseURL = sanitized;
  }

  public getBaseUrl(): string {
    return this.currentBaseUrl;
  }

  private setupInterceptors() {
    // Request Interceptor: Attach Bearer JWT
    this.instance.interceptors.request.use(
      async (config) => {
        const token = await storage.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response Interceptor: Format error messages + security cleanup on 401
    this.instance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<{ message?: string; error?: string; fieldErrors?: Record<string, string> }>) => {
        if (error.response?.status === 401) {
          console.log('[API] 401 Unauthorized, clearing session');
          // Clear potentially stale token to avoid retry loops - AuthContext will handle navigation
          try {
            await storage.removeToken();
            await storage.removeUserData();
          } catch {}
        }

        // Map backend fieldErrors safely (prevent huge messages)
        const fieldErr = error.response?.data?.fieldErrors;
        const fieldMsg = fieldErr ? Object.values(fieldErr).slice(0, 5).join(' ') : undefined;

        const serverMessage =
          fieldMsg ||
          error.response?.data?.message ||
          error.response?.data?.error ||
          (error.code === 'ECONNABORTED'
            ? 'Request timed out. Please check your internet connection.'
            : error.response?.status && error.response.status >= 500
              ? 'Server error. Please try again later.'
              : 'Unable to connect to server. Please try again.');

        return Promise.reject({
          status: error.response?.status,
          message: serverMessage,
          fieldErrors: error.response?.data?.fieldErrors,
          raw: error,
        });
      }
    );
  }

  public get axios(): AxiosInstance {
    return this.instance;
  }
}

export const api = new ApiClient();
export const http = api.axios;
