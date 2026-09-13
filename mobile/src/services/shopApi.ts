import { http } from './api';
import {
  Category,
  CreateSaleRequest,
  DashboardSummary,
  Product,
  ProductRequest,
  ReportSummary,
  SaleResponse,
  SaleSummaryResponse,
  StockAdjustmentRequest,
  StockInRequest,
  StockMovement,
  User,
  PageResponse,
} from '../types';

function isPageResponse<T>(data: any): data is PageResponse<T> {
  return data && typeof data === 'object' && Array.isArray(data.content) && 'totalElements' in data;
}

function sanitizeParam(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim().slice(0, 100).replace(/[\x00-\x1F\x7F]/g, '');
  return trimmed || undefined;
}

// In-Memory Fast Caches for 0ms Screen Renders
let memoryDashboardSummary: DashboardSummary | null = null;
let memoryCategories: Category[] | null = null;
let memoryProducts: Product[] | null = null;
const memoryReports = new Map<string, ReportSummary>();

export function clearShopApiCaches() {
  memoryDashboardSummary = null;
  memoryProducts = null;
  memoryCategories = null;
  memoryReports.clear();
}

export const authApi = {
  async login(credentials: { username: string; password: string }): Promise<User> {
    const res = await http.post<User>('/auth/login', credentials);
    clearShopApiCaches();
    return res.data;
  },

  async register(data: { username: string; email: string; password: string; name?: string }): Promise<User> {
    const res = await http.post<User>('/auth/register', data);
    clearShopApiCaches();
    return res.data;
  },

  async me(): Promise<User> {
    const res = await http.get<User>('/auth/me');
    return res.data;
  },

  async logout(): Promise<void> {
    clearShopApiCaches();
    try {
      await http.post('/auth/logout');
    } catch {
      // Ignore network failure on logout
    }
  },
};

export interface ProductListParams {
  search?: string;
  categoryId?: number;
  stockStatus?: string;
  page?: number;
  size?: number;
}

export const productsApi = {
  getCachedProducts(): Product[] | null {
    return memoryProducts;
  },

  getCachedCategories(): Category[] | null {
    return memoryCategories;
  },

  async list(params: ProductListParams = {}): Promise<Product[]> {
    const query = new URLSearchParams();
    const search = sanitizeParam(params.search);
    if (search) query.set('search', search);
    if (params.categoryId != null) query.set('categoryId', String(params.categoryId));
    if (params.stockStatus) query.set('stockStatus', params.stockStatus);
    if (params.page != null) query.set('page', String(Math.max(0, params.page)));
    if (params.size != null) query.set('size', String(Math.min(Math.max(params.size, 1), 100)));
    const qs = query.toString();
    const url = qs ? `/products?${qs}` : '/products';
    const res = await http.get<Product[] | PageResponse<Product>>(url);
    const data: any = res.data;

    let result: Product[] = [];
    if (Array.isArray(data)) result = data;
    else if (isPageResponse<Product>(data)) result = data.content ?? [];
    else if (data && Array.isArray((data as any).data)) result = (data as any).data;

    // Cache unfiltered base list
    if (!search && params.categoryId == null && !params.stockStatus && (params.page == null || params.page === 0)) {
      memoryProducts = result;
    }

    return result;
  },

  async listPaged(params: ProductListParams = {}): Promise<PageResponse<Product>> {
    const query = new URLSearchParams();
    const search = sanitizeParam(params.search);
    if (search) query.set('search', search);
    if (params.categoryId != null) query.set('categoryId', String(params.categoryId));
    if (params.stockStatus) query.set('stockStatus', params.stockStatus);
    if (params.page != null) query.set('page', String(Math.max(0, params.page)));
    if (params.size != null) query.set('size', String(Math.min(Math.max(params.size, 1), 100)));
    const qs = query.toString();
    const url = qs ? `/products?${qs}` : '/products';
    const res = await http.get<PageResponse<Product>>(url);
    const data: any = res.data;
    if (isPageResponse<Product>(data)) return data;
    if (Array.isArray(data)) {
      return { content: data, totalElements: data.length, totalPages: 1, number: 0, size: data.length, first: true, last: true, empty: data.length === 0 };
    }
    return { content: [], totalElements: 0, totalPages: 0, number: 0, size: 20, first: true, last: true, empty: true };
  },

  async listPopular(limit: number = 8): Promise<Product[]> {
    try {
      const res = await http.get<Product[]>(`/products/popular?limit=${limit}`);
      const data: any = res.data;
      if (Array.isArray(data)) return data;
      if (isPageResponse<Product>(data)) return data.content ?? [];
      return [];
    } catch {
      return [];
    }
  },

  async get(id: number): Promise<Product> {
    const res = await http.get<Product>(`/products/${id}`);
    return res.data;
  },

  async create(data: ProductRequest): Promise<Product> {
    const res = await http.post<Product>('/products', data);
    memoryProducts = null;
    memoryDashboardSummary = null;
    memoryReports.clear();
    return res.data;
  },

  async update(id: number, data: ProductRequest): Promise<Product> {
    const res = await http.put<Product>(`/products/${id}`, data);
    memoryProducts = null;
    memoryDashboardSummary = null;
    memoryReports.clear();
    return res.data;
  },

  async delete(id: number): Promise<{ archived: boolean }> {
    const res = await http.delete<{ archived: boolean }>(`/products/${id}`);
    memoryProducts = null;
    memoryDashboardSummary = null;
    memoryReports.clear();
    if (res.data && typeof (res.data as any).archived === 'boolean') return res.data as any;
    return { archived: true };
  },

  async restore(id: number): Promise<Product> {
    try {
      const res = await http.post<Product>(`/products/${id}/restore`);
      memoryProducts = null;
      memoryDashboardSummary = null;
      memoryReports.clear();
      return res.data;
    } catch (e: any) {
      if (e?.status === 404 || e?.status === 405) {
        throw new Error('Restore not supported on this server version. Product remains archived.');
      }
      throw e;
    }
  },

  async listCategories(): Promise<Category[]> {
    if (memoryCategories && memoryCategories.length > 0) {
      // Return cached immediately & refresh asynchronously
      http.get<Category[] | PageResponse<Category>>('/categories').then((res) => {
        const data: any = res.data;
        if (Array.isArray(data)) memoryCategories = data;
        else if (isPageResponse<Category>(data)) memoryCategories = data.content ?? [];
      }).catch(() => {});
      return memoryCategories;
    }

    const res = await http.get<Category[] | PageResponse<Category>>('/categories');
    const data: any = res.data;
    let cats: Category[] = [];
    if (Array.isArray(data)) cats = data;
    else if (isPageResponse<Category>(data)) cats = data.content ?? [];
    memoryCategories = cats;
    return cats;
  },

  async createCategory(data: { name: string }): Promise<Category> {
    const sanitized = sanitizeParam(data.name);
    if (!sanitized) throw new Error('Category name is required');
    const res = await http.post<Category>('/categories', { name: sanitized });
    memoryCategories = null;
    return res.data;
  },
};

export const inventoryApi = {
  async stockIn(data: StockInRequest): Promise<StockMovement> {
    const res = await http.post<StockMovement>('/inventory/stock-in', data);
    memoryProducts = null;
    memoryDashboardSummary = null;
    return res.data;
  },

  async adjust(data: StockAdjustmentRequest): Promise<StockMovement> {
    const res = await http.post<StockMovement>('/inventory/adjustment', data);
    memoryProducts = null;
    memoryDashboardSummary = null;
    return res.data;
  },

  async listMovements(): Promise<StockMovement[]> {
    const res = await http.get<StockMovement[]>('/inventory/movements');
    return res.data;
  },
};

export const salesApi = {
  async create(data: CreateSaleRequest): Promise<SaleResponse> {
    const res = await http.post<SaleResponse>('/sales', data);
    memoryProducts = null;
    memoryDashboardSummary = null;
    memoryReports.clear();
    return res.data;
  },

  async list(page = 0, size = 20): Promise<SaleSummaryResponse[]> {
    try {
      const res = await http.get<PageResponse<SaleSummaryResponse> | SaleSummaryResponse[]>(`/sales?page=${page}&size=${size}`);
      const data: any = res.data;
      if (Array.isArray(data)) return data;
      if (isPageResponse<SaleSummaryResponse>(data)) return data.content ?? [];
      return [];
    } catch {
      return [];
    }
  },

  async listPaged(page = 0, size = 20): Promise<PageResponse<SaleSummaryResponse>> {
    const res = await http.get<PageResponse<SaleSummaryResponse>>(`/sales?page=${page}&size=${size}`);
    const data: any = res.data;
    if (isPageResponse<SaleSummaryResponse>(data)) return data;
    if (Array.isArray(data)) {
      return {
        content: data,
        totalElements: data.length,
        totalPages: 1,
        number: page,
        size,
        first: page === 0,
        last: true,
        empty: data.length === 0,
      };
    }
    return { content: [], totalElements: 0, totalPages: 0, number: page, size, first: true, last: true, empty: true };
  },

  async get(id: number): Promise<SaleResponse> {
    const res = await http.get<SaleResponse>(`/sales/${id}`);
    return res.data;
  },
};

export const dashboardApi = {
  getCachedSummary(): DashboardSummary | null {
    return memoryDashboardSummary;
  },

  async getSummary(): Promise<DashboardSummary> {
    const res = await http.get<DashboardSummary>('/dashboard/summary');
    memoryDashboardSummary = res.data;
    return res.data;
  },
};

export const reportsApi = {
  getCachedSummary(from?: string, to?: string): ReportSummary | null {
    const key = `${from || 'all'}_${to || 'all'}`;
    return memoryReports.get(key) || null;
  },

  async getSummary(from?: string, to?: string): Promise<ReportSummary> {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    const queryString = params.toString();
    const url = queryString ? `/reports/summary?${queryString}` : '/reports/summary';
    const res = await http.get<ReportSummary>(url);
    const key = `${from || 'all'}_${to || 'all'}`;
    memoryReports.set(key, res.data);
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
