import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Header } from '../components/Header';
import { ReceiptModal } from '../components/ReceiptModal';
import { StockAlertModal } from '../components/StockAlertModal';
import { CustomerDebtModal } from '../components/CustomerDebtModal';
import { dashboardApi, salesApi } from '../services/shopApi';
import { debtStorage } from '../services/debtStorage';
import { colors } from '../theme/colors';
import { DashboardSummary, SaleResponse, SaleSummaryResponse } from '../types';
import { TabScreen } from '../components/BottomTabBar';
import { useAuth } from '../context/AuthContext';
import { formatTimeOnly } from '../utils/dateUtils';
import {
  TriangleAlert,
  Zap,
  CirclePlus,
  Package,
  Receipt,
  ArrowRight,
  ChartBar,
  CircleCheck,
  Sparkles,
  ShoppingCart,
  BookUser,
} from 'lucide-react-native';

export interface NavigationParams {
  productId?: number;
  stockFilter?: 'ALL' | 'OUT_OF_STOCK' | 'LOW_STOCK' | 'IN_STOCK';
}

interface DashboardScreenProps {
  onNavigateTab: (tab: TabScreen, params?: NavigationParams) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigateTab }) => {
  const { user, shopProfile } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(() => dashboardApi.getCachedSummary());
  const [loading, setLoading] = useState<boolean>(() => !dashboardApi.getCachedSummary());
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedSale, setSelectedSale] = useState<SaleResponse | null>(null);
  const [stockAlertModalOpen, setStockAlertModalOpen] = useState<boolean>(false);
  const [debtModalOpen, setDebtModalOpen] = useState<boolean>(false);
  const [totalDebt, setTotalDebt] = useState<number>(0);

  const loadDashboard = useCallback(async () => {
    try {
      const [data, debtVal] = await Promise.all([
        dashboardApi.getSummary(),
        debtStorage.getTotalOutstandingDebt().catch(() => 0),
      ]);
      setSummary(data);
      setTotalDebt(debtVal);
    } catch (e) {
      console.warn('Dashboard load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboard();
  }, [loadDashboard]);

  const handleOpenReceipt = async (saleSummary: SaleSummaryResponse) => {
    try {
      const fullSale = await salesApi.get(saleSummary.id);
      setSelectedSale(fullSale);
    } catch {
      setSelectedSale({
        id: saleSummary.id,
        totalAmount: saleSummary.totalAmount,
        createdAt: saleSummary.createdAt,
        items: (saleSummary.items || []).map((name) => ({
          productId: 0,
          productName: name,
          unit: 'PIECE',
          quantity: 1,
          unitPrice: saleSummary.totalAmount,
          purchasePrice: 0,
          lineTotal: saleSummary.totalAmount,
          mrp: null,
        })),
      });
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }, []);

  if (loading && !summary) {
    return (
      <View className="flex-1 items-center justify-center bg-[#f8fafc]">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-3.5 text-sm font-semibold text-[#64748b]">Loading shop insights...</Text>
      </View>
    );
  }

  const todayRev = typeof summary?.revenueToday === 'number' ? summary.revenueToday : parseFloat(String(summary?.revenueToday || 0));
  const todayProfit = typeof summary?.profitToday === 'number' ? summary.profitToday : parseFloat(String(summary?.profitToday || 0));
  const todaySales = summary?.salesToday || 0;
  const lowStock = summary?.lowStockCount || 0;
  const outOfStock = summary?.outOfStockCount || 0;
  const attentionCount = lowStock + outOfStock;
  const marginPct = todayRev > 0 ? (todayProfit / todayRev) * 100 : 0;

  // Chart max value calculation
  const dailyPoints = summary?.dailyRevenue || [];
  const maxRev = Math.max(...dailyPoints.map((d) => (typeof d.total === 'number' ? d.total : parseFloat(String(d.total || 0)))), 100);

  const outOfStockPreview = summary?.outOfStockProducts ?? [];
  const lowStockPreview = summary?.lowStockProducts ?? [];
  const hasPreviewItems = outOfStockPreview.length > 0 || lowStockPreview.length > 0;

  return (
    <View className="flex-1 bg-[#f8fafc]">
      <Header title="Shop Dashboard" onRefresh={onRefresh} isRefreshing={refreshing} />

      <ScrollView
        contentContainerClassName="p-4 pb-12"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* 1. Welcome Greeting & Date Banner */}
        <View className="mb-3.5 flex-row items-center justify-between">
          <View>
            <Text className="text-xs font-bold text-[#64748b]">{getGreeting()} 👋</Text>
            <Text className="text-base font-black text-[#0f172a]">
              {shopProfile?.shopName || user?.name || user?.username || 'My Store'}
            </Text>
          </View>
          <View className="rounded-full bg-[#e2e8f0]/60 px-3 py-1">
            <Text className="text-[11px] font-bold text-[#475569]">{todayFormatted}</Text>
          </View>
        </View>

        {/* 2. Hero Sales Summary Card */}
        <View className="mb-4 overflow-hidden rounded-3xl bg-[#0f172a] p-5 shadow-lg">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">
              Today's Total Sales
            </Text>
            <View className="flex-row items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1">
              <Sparkles size={12} color="#10b981" />
              <Text className="text-[10px] font-black text-[#34d399]">{todaySales} Bills Today</Text>
            </View>
          </View>

          <Text className="mt-2 text-3xl font-black text-white" numberOfLines={1}>
            ₹{todayRev.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>

          <View className="mt-3.5 flex-row items-center justify-between border-t border-slate-800 pt-3">
            <View>
              <Text className="text-[10px] font-semibold text-[#94a3b8]">Estimated Profit</Text>
              <Text className="text-sm font-black text-[#34d399]">
                +₹{todayProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                <Text className="text-xs font-semibold text-[#6ee7b7]">({marginPct.toFixed(1)}%)</Text>
              </Text>
            </View>

            <TouchableOpacity
              className="flex-row items-center gap-1.5 rounded-xl bg-[#059669] px-3.5 py-2"
              onPress={() => onNavigateTab('pos')}
              activeOpacity={0.8}
            >
              <Zap size={15} color="#fff" />
              <Text className="text-xs font-black text-white">Start Billing</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. Fast Action Buttons */}
        <View className="mb-4 flex-row gap-2">
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl border border-[#e2e8f0] bg-white py-3 shadow-xs"
            onPress={() => onNavigateTab('products')}
            activeOpacity={0.7}
          >
            <CirclePlus size={16} color={colors.primary} />
            <Text className="text-xs font-extrabold text-[#0f172a]">Add Product</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl border border-[#e2e8f0] bg-white py-3 shadow-xs"
            onPress={() => onNavigateTab('inventory')}
            activeOpacity={0.7}
          >
            <Package size={16} color={colors.accent} />
            <Text className="text-xs font-extrabold text-[#0f172a]">Stock Inflow</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl border py-3 shadow-xs ${
              attentionCount > 0
                ? 'border-[#fde68a] bg-[#fef3c7]'
                : 'border-[#e2e8f0] bg-white'
            }`}
            onPress={() => setStockAlertModalOpen(true)}
            activeOpacity={0.7}
          >
            <TriangleAlert size={16} color={attentionCount > 0 ? '#d97706' : colors.textMuted} />
            <Text
              className={`text-xs font-extrabold ${
                attentionCount > 0 ? 'text-[#92400e]' : 'text-[#0f172a]'
              }`}
            >
              {attentionCount > 0 ? `Alerts (${attentionCount})` : 'Stock Alerts'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 4. Smart Inventory Alert Banner */}
        {attentionCount > 0 ? (
          <TouchableOpacity
            className="mb-4 rounded-2xl border border-[#fde68a] bg-[#fef3c7] p-3.5 shadow-sm"
            onPress={() => setStockAlertModalOpen(true)}
            activeOpacity={0.8}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1 flex-row items-center gap-2.5">
                <View className="h-8 w-8 items-center justify-center rounded-xl bg-[#fde68a]">
                  <TriangleAlert size={18} color="#b45309" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text className="text-[13px] font-black text-[#92400e]">Stock Action Needed</Text>
                  <Text className="mt-0.5 text-xs font-bold text-[#b45309]">
                    {outOfStock > 0 ? `${outOfStock} out of stock` : ''}
                    {outOfStock > 0 && lowStock > 0 ? ' • ' : ''}
                    {lowStock > 0 ? `${lowStock} low in stock` : ''}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center gap-1 rounded-xl bg-white px-2.5 py-1.5 shadow-xs">
                <Text className="text-xs font-black text-[#92400e]">Restock</Text>
                <ArrowRight size={13} color="#92400e" />
              </View>
            </View>

            {hasPreviewItems && (
              <View className="mt-2.5 border-t border-[#fde68a]/70 pt-2">
                <Text className="text-[11px] font-medium text-[#92400e]" numberOfLines={2}>
                  {[
                    ...outOfStockPreview.map((name) => `${name} (out)`),
                    ...lowStockPreview.map((name) => `${name} (low)`),
                  ].join(' • ')}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <View className="mb-4 flex-row items-center justify-between rounded-2xl border border-[#bbf7d0] bg-[#ecfdf5] px-3.5 py-2.5">
            <View className="flex-row items-center gap-2">
              <CircleCheck size={16} color="#059669" />
              <Text className="text-xs font-bold text-[#065f46]">All inventory properly stocked</Text>
            </View>
            <Text className="text-[11px] font-semibold text-[#047857]">
              {summary?.totalProducts || 0} active products
            </Text>
          </View>
        )}

        {/* Customer Debt Banner (if unpaid debts exist) */}
        {totalDebt > 0 && (
          <TouchableOpacity
            className="mb-4 flex-row items-center justify-between rounded-2xl border border-[#fde68a] bg-[#fffbeb] p-3.5 shadow-sm"
            onPress={() => setDebtModalOpen(true)}
            activeOpacity={0.8}
          >
            <View className="flex-1 flex-row items-center gap-2.5">
              <View className="h-8 w-8 items-center justify-center rounded-xl bg-[#fef3c7]">
                <BookUser size={18} color="#d97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text className="text-[13px] font-black text-[#92400e]">Customer Credit (Udhaar Book)</Text>
                <Text className="mt-0.5 text-xs font-bold text-[#b45309]">
                  ₹{totalDebt.toFixed(2)} total pending collection
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-1 rounded-xl bg-white px-2.5 py-1.5 shadow-xs">
              <Text className="text-xs font-black text-[#92400e]">View Book</Text>
              <ArrowRight size={13} color="#92400e" />
            </View>
          </TouchableOpacity>
        )}

        {/* 6. 7-Day Revenue Trend Chart */}
        {dailyPoints.length > 0 && (
          <View className="mt-4 rounded-3xl border border-[#e2e8f0] bg-white p-4 shadow-xs">
            <View className="mb-2 flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5">
                <ChartBar size={17} color={colors.primary} />
                <Text className="text-sm font-extrabold text-[#0f172a]">7-Day Revenue Trend</Text>
              </View>
              <Text className="text-[11px] font-bold text-[#64748b]">Last 7 Days</Text>
            </View>

            <View className="h-[120px] flex-row items-end justify-between pt-3">
              {dailyPoints.map((point, index) => {
                const total = typeof point.total === 'number' ? point.total : parseFloat(String(point.total || 0));
                const heightPct = Math.max((total / maxRev) * 100, 8);
                const dayLabel = new Date(point.date).toLocaleDateString('en-US', { weekday: 'narrow' });

                return (
                  <View key={index} className="h-full flex-1 items-center justify-end">
                    <Text className="mb-1 text-[9px] font-bold text-[#64748b]">
                      {total > 0 ? `₹${Math.round(total)}` : ''}
                    </Text>
                    <View className="h-20 w-[22px] justify-end overflow-hidden rounded-lg bg-[#f8fafc]">
                      <View
                        style={[
                          { height: `${heightPct}%`, backgroundColor: total > 0 ? colors.primary : colors.border },
                        ]}
                      />
                    </View>
                    <Text className="mt-1.5 text-[11px] font-bold text-[#64748b]">{dayLabel}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* 7. Recent Invoices Section */}
        <View className="mb-2 mt-4 flex-row items-center justify-between">
          <Text className="text-sm font-black text-[#0f172a]">Recent Invoices</Text>
          <TouchableOpacity onPress={() => onNavigateTab('reports')}>
            <Text className="text-xs font-bold text-[#059669]">View All Reports →</Text>
          </TouchableOpacity>
        </View>

        {summary?.recentSales && summary.recentSales.length > 0 ? (
          <View className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-xs">
            {summary.recentSales.slice(0, 5).map((sale) => {
              const total = typeof sale.totalAmount === 'number' ? sale.totalAmount : parseFloat(String(sale.totalAmount || 0));
              return (
                <TouchableOpacity
                  key={sale.id}
                  className="flex-row items-center justify-between border-b border-[#f1f5f9] p-3.5"
                  onPress={() => handleOpenReceipt(sale)}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center gap-3">
                    <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#ecfdf5]">
                      <Receipt size={18} color="#059669" />
                    </View>
                    <View>
                      <Text className="text-[13px] font-black text-[#0f172a]">Invoice #{sale.id}</Text>
                      <Text className="mt-0.5 text-[11px] text-[#64748b]">
                        {formatTimeOnly(sale.createdAt)} •{' '}
                        {sale.itemCount || (sale.items ? sale.items.length : 1)} items
                      </Text>
                    </View>
                  </View>

                  <View className="items-end">
                    <Text className="text-sm font-black text-[#0f172a]">₹{total.toFixed(2)}</Text>
                    <Text className="mt-px text-[11px] font-bold text-[#059669]">View Receipt →</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View className="items-center justify-center rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-xs">
            <ShoppingCart size={32} color={colors.textLight} />
            <Text className="mt-2.5 text-sm font-bold text-[#0f172a]">No Sales Recorded Today</Text>
            <Text className="mt-1 text-center text-xs text-[#64748b]">Tap the Start Billing button above to create a bill</Text>
          </View>
        )}
      </ScrollView>

      {/* Out of Stock & Low Stock Inspection Modal */}
      <StockAlertModal
        visible={stockAlertModalOpen}
        onClose={() => setStockAlertModalOpen(false)}
        onRestockProduct={(prod) => {
          onNavigateTab('inventory', prod.id ? { productId: prod.id } : undefined);
        }}
        onViewAllProducts={(stockFilter) => {
          onNavigateTab('products', stockFilter ? { stockFilter } : undefined);
        }}
        outOfStockNames={summary?.outOfStockProducts || []}
        lowStockNames={summary?.lowStockProducts || []}
        outOfStockCount={outOfStock}
        lowStockCount={lowStock}
      />

      {/* Customer Debt Book Modal */}
      <CustomerDebtModal
        visible={debtModalOpen}
        onClose={() => {
          setDebtModalOpen(false);
          loadDashboard();
        }}
      />

      {/* Digital Receipt Modal */}
      <ReceiptModal
        visible={!!selectedSale}
        sale={selectedSale}
        shopName={shopProfile?.shopName}
        onClose={() => setSelectedSale(null)}
      />
    </View>
  );
};
