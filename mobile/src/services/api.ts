import axios, { AxiosError, AxiosInstance } from 'axios';
import { storage } from './storage';

// Default to live Render backend, with fallback capability for local dev
export const DEFAULT_BASE_URL = 'https://grocery-shop-backend-bfgk.onrender.com/api';

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
      this.setBaseUrl(savedUrl.trim());
    }
  }

  public setBaseUrl(newUrl: string) {
    this.currentBaseUrl = newUrl;
    this.instance.defaults.baseURL = newUrl;
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

    // Response Interceptor: Format error messages
    this.instance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<{ message?: string; error?: string; fieldErrors?: Record<string, string> }>) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          console.log('[API] 401 Unauthorized, token may be invalid');
        }

        const serverMessage =
          error.response?.data?.message ||
          error.response?.data?.error ||
          (error.code === 'ECONNABORTED'
            ? 'Request timed out. Please check your internet connection.'
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
