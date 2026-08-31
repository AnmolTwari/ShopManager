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

export type ProductUnit = 'PIECE' | 'PACKET' | 'BOX' | 'BOTTLE' | 'KG' | 'GRAM' | 'LITRE' | 'ML';

export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface Product {
  id: number;
  name: string;
  categoryId: number;
  categoryName?: string;
  brand?: string;
  sku?: string;
  unit: ProductUnit;
  purchasePrice: number;
  sellingPrice: number;
  mrp?: number;
  currentQuantity: number;
  minimumStockLevel: number;
  stockStatus: StockStatus;
  active: boolean;
}

export interface ProductRequest {
  name: string;
  categoryId: number;
  brand?: string | null;
  sku?: string | null;
  unit: ProductUnit;
  purchasePrice: number;
  sellingPrice: number;
  mrp?: number | null;
  currentQuantity?: number;
  minimumStockLevel?: number;
  active?: boolean;
}

export type MovementType = 'STOCK_IN' | 'ADJUSTMENT' | 'SALE';

export interface StockMovement {
  id: number;
  productId: number;
  productName: string;
  productSku?: string;
  unit: ProductUnit;
  type: MovementType;
  previousQuantity: number;
  quantityChanged: number;
  newQuantity: number;
  stockStatus: StockStatus;
  reason?: string;
  createdAt: string;
}

export interface StockInRequest {
  productId: number;
  quantity: number;
  reason?: string | null;
}

export interface StockAdjustmentRequest {
  productId: number;
  newQuantity: number;
  reason?: string | null;
}

export interface SaleItemResponse {
  productId: number;
  productName: string;
  productSku?: string;
  unit: ProductUnit;
  quantity: number;
  unitPrice: number;
  purchasePrice: number;
  lineTotal: number;
}

export interface SaleResponse {
  id: number;
  totalAmount: number;
  items: SaleItemResponse[];
  createdAt: string;
}

export interface SaleSummaryResponse {
  id: number;
  itemCount: number;
  totalAmount: number;
  createdAt: string;
  items: string[];
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
}

export interface CreateSaleItemRequest {
  productId: number;
  quantity: number;
}

export interface CreateSaleRequest {
  items: CreateSaleItemRequest[];
}

export interface DailyRevenuePoint {
  date: string;
  total: number;
}

export interface DashboardSummary {
  salesToday: number;
  revenueToday: number;
  profitToday: number;
  salesYesterday: number;
  revenueYesterday: number;
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  lowStockProducts: string[];
  outOfStockProducts: string[];
  dailyRevenue: DailyRevenuePoint[];
  recentSales: SaleSummaryResponse[];
}

export interface ReportSummary {
  from?: string;
  to?: string;
  salesCount: number;
  totalAmount: number;
  totalProfit: number;
  averageOrderValue: number;
}
