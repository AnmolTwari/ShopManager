export type UserRole = 'USER' | 'ADMIN';

export interface User {
  username: string;
  email: string;
  name?: string;
  role: UserRole;
  token?: string;
}

export type AuthResponse = User;

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface Product {
  id: number;
  name: string;
  categoryId?: number;
  categoryName?: string;
  brand?: string;
  sku?: string;
  unit?: string;
  purchasePrice: number;
  sellingPrice: number;
  mrp?: number;
  quantity: number;
  minStockLevel: number;
  active: boolean;
  stockStatus: StockStatus;
}

export interface ProductRequest {
  name: string;
  categoryId?: number | null;
  brand?: string | null;
  sku?: string | null;
  unit?: string | null;
  purchasePrice: number;
  sellingPrice: number;
  mrp?: number | null;
  quantity?: number;
  minStockLevel?: number;
}

export type MovementType = 'STOCK_IN' | 'ADJUSTMENT' | 'SALE';

export interface StockMovement {
  id: number;
  productId: number;
  productName: string;
  productSku?: string;
  type: MovementType;
  quantityDelta: number;
  resultingQuantity: number;
  referenceNumber?: string;
  reason?: string;
  notes?: string;
  createdAt: string;
}

export interface StockInRequest {
  productId: number;
  quantity: number;
  purchasePrice?: number | null;
  referenceNumber?: string | null;
  notes?: string | null;
}

export interface StockAdjustmentRequest {
  productId: number;
  newQuantity: number;
  reason: 'DAMAGE' | 'EXPIRY' | 'COUNT_ERROR' | 'THEFT' | 'OTHER';
  notes?: string | null;
}

export interface SaleItem {
  id?: number;
  productId: number;
  productName: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  purchasePrice?: number;
  totalPrice: number;
  profit?: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
}

export interface CreateSaleRequest {
  items: {
    productId: number;
    quantity: number;
    unitPrice?: number;
  }[];
  paymentMethod?: 'CASH' | 'UPI' | 'CARD';
  customerName?: string;
  customerPhone?: string;
  notes?: string;
}

export interface Sale {
  id: number;
  saleNumber: string;
  totalAmount: number;
  profitAmount: number;
  paymentMethod?: string;
  customerName?: string;
  customerPhone?: string;
  createdAt: string;
  items: SaleItem[];
}

export interface DashboardSummary {
  todayRevenue: number;
  todayProfit: number;
  todaySaleCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  popularProducts: {
    productId: number;
    productName: string;
    totalQuantitySold: number;
    totalRevenue: number;
  }[];
  recentSales: Sale[];
}

export interface CategoryBreakdown {
  categoryName: string;
  totalRevenue: number;
  totalProfit: number;
  saleCount: number;
  percentage: number;
}

export interface ReportSummary {
  totalRevenue: number;
  totalProfit: number;
  totalSales: number;
  profitMarginPercentage: number;
  categoryBreakdown: CategoryBreakdown[];
}
