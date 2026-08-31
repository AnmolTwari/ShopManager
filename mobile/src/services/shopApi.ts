import { http } from './api';
import {
  AuthResponse,
  Category,
  CreateSaleRequest,
  DashboardSummary,
  Product,
  ProductRequest,
  ReportSummary,
  Sale,
  StockAdjustmentRequest,
  StockInRequest,
  StockMovement,
  User,
} from '../types';

export const authApi = {
  async login(credentials: { username: string; password: string }): Promise<User> {
    const res = await http.post<User>('/auth/login', credentials);
    return res.data;
  },

  async register(data: { username: string; email: string; password: string; name?: string }): Promise<User> {
    const res = await http.post<User>('/auth/register', data);
    return res.data;
  },

  async me(): Promise<User> {
    const res = await http.get<User>('/auth/me');
    return res.data;
  },

  async logout(): Promise<void> {
    try {
      await http.post('/auth/logout');
    } catch {
      // Ignore network failure on logout
    }
  },
};

export const productsApi = {
  async list(): Promise<Product[]> {
    const res = await http.get<Product[]>('/products');
    return res.data;
  },

  async get(id: number): Promise<Product> {
    const res = await http.get<Product>(`/products/${id}`);
    return res.data;
  },

  async create(data: ProductRequest): Promise<Product> {
    const res = await http.post<Product>('/products', data);
    return res.data;
  },

  async update(id: number, data: ProductRequest): Promise<Product> {
    const res = await http.put<Product>(`/products/${id}`, data);
    return res.data;
  },

  async delete(id: number): Promise<void> {
    await http.delete(`/products/${id}`);
  },

  async restore(id: number): Promise<Product> {
    const res = await http.post<Product>(`/products/${id}/restore`);
    return res.data;
  },

  async listCategories(): Promise<Category[]> {
    const res = await http.get<Category[]>('/categories');
    return res.data;
  },

  async createCategory(data: { name: string; description?: string }): Promise<Category> {
    const res = await http.post<Category>('/categories', data);
    return res.data;
  },
};

export const inventoryApi = {
  async stockIn(data: StockInRequest): Promise<StockMovement> {
    const res = await http.post<StockMovement>('/inventory/stock-in', data);
    return res.data;
  },

  async adjust(data: StockAdjustmentRequest): Promise<StockMovement> {
    const res = await http.post<StockMovement>('/inventory/adjustment', data);
    return res.data;
  },

  async listMovements(): Promise<StockMovement[]> {
    const res = await http.get<StockMovement[]>('/inventory/movements');
    return res.data;
  },
};

export const salesApi = {
  async create(data: CreateSaleRequest): Promise<Sale> {
    const res = await http.post<Sale>('/sales', data);
    return res.data;
  },

  async list(): Promise<Sale[]> {
    const res = await http.get<Sale[]>('/sales');
    return res.data;
  },

  async get(id: number): Promise<Sale> {
    const res = await http.get<Sale>(`/sales/${id}`);
    return res.data;
  },
};

export const dashboardApi = {
  async getSummary(): Promise<DashboardSummary> {
    const res = await http.get<DashboardSummary>('/dashboard/summary');
    return res.data;
  },
};

export const reportsApi = {
  async getSummary(from?: string, to?: string): Promise<ReportSummary> {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    const res = await http.get<ReportSummary>(`/reports/summary?${params.toString()}`);
    return res.data;
  },
};

export const settingsApi = {
  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> {
    const res = await http.post<{ message: string }>('/settings/password', data);
    return res.data;
  },

  async changeEmail(data: { newEmail: string; password: string }): Promise<User> {
    const res = await http.post<User>('/settings/email', data);
    return res.data;
  },
};
