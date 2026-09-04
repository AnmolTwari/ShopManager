import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Header } from '../components/Header';
import { MetricCard } from '../components/MetricCard';
import { ReceiptModal } from '../components/ReceiptModal';
import { dashboardApi, salesApi } from '../services/shopApi';
import { colors } from '../theme/colors';
import { DashboardSummary, SaleResponse, SaleSummaryResponse } from '../types';
import { TabScreen } from '../components/BottomTabBar';
import {
  IndianRupee,
  TrendingUp,
  ShoppingCart,
  TriangleAlert,
  Zap,
  CirclePlus,
  Package,
  Receipt,
  ArrowRight,
  TrendingDown,
  ChartBar,
} from 'lucide-react-native';

interface DashboardScreenProps {
  onNavigateTab: (tab: TabScreen) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigateTab }) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedSale, setSelectedSale] = useState<SaleResponse | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState<boolean>(false);

  const loadDashboard = async () => {
    try {
      const data = await dashboardApi.getSummary();
      setSummary(data);
    } catch (e) {
      console.warn('Dashboard load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const handleOpenReceipt = async (saleSummary: SaleSummaryResponse) => {
    setLoadingReceipt(true);
    try {
      const fullSale = await salesApi.get(saleSummary.id);
      setSelectedSale(fullSale);
    } catch {
      // Fallback construct from summary
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
        })),
      });
    } finally {
      setLoadingReceipt(false);
    }
  };

  if (loading && !summary) {
    return (
      <View className="flex-1 items-center justify-center bg-[#f8fafc]">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-3.5 text-sm text-[#64748b]">Loading shop insights...</Text>
      </View>
    );
  }

  const todayRev = typeof summary?.revenueToday === 'number' ? summary.revenueToday : parseFloat(String(summary?.revenueToday || 0));
  const todayProfit = typeof summary?.profitToday === 'number' ? summary.profitToday : parseFloat(String(summary?.profitToday || 0));
  const todaySales = summary?.salesToday || 0;
  const lowStock = summary?.lowStockCount || 0;
  const outOfStock = summary?.outOfStockCount || 0;
  const attentionCount = lowStock + outOfStock;

  // Chart max value calculation
  const dailyPoints = summary?.dailyRevenue || [];
  const maxRev = Math.max(...dailyPoints.map((d) => (typeof d.total === 'number' ? d.total : parseFloat(String(d.total || 0)))), 100);

  return (
    <View className="flex-1 bg-[#f8fafc]">
      <Header title="Shop Dashboard" onRefresh={onRefresh} isRefreshing={refreshing} />

      <ScrollView
        contentContainerClassName="p-4 pb-10"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* Quick Action Bar */}
        <View className="mb-4 gap-2">
          <TouchableOpacity
            className="flex-row items-center justify-center gap-2 rounded-2xl bg-[#059669] py-3.5 shadow-lg"
            onPress={() => onNavigateTab('pos')}
            activeOpacity={0.8}
          >
            <Zap size={20} color="#fff" />
            <Text className="text-[15px] font-extrabold text-white">Instant Barcode Billing (POS)</Text>
          </TouchableOpacity>

          <View className="flex-row gap-2">
            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-white py-2.5"
              onPress={() => onNavigateTab('products')}
            >
              <CirclePlus size={16} color={colors.primary} />
              <Text className="text-[13px] font-bold text-[#0f172a]">Add Product</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-white py-2.5"
              onPress={() => onNavigateTab('inventory')}
            >
              <Package size={16} color={colors.accent} />
              <Text className="text-[13px] font-bold text-[#0f172a]">Stock Inflow</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Low Stock Warning Alert */}
        {attentionCount > 0 && (
          <TouchableOpacity
            className="mb-4 flex-row items-center justify-between rounded-[14px] border border-[#fde68a] bg-[#fef3c7] p-3"
            onPress={() => onNavigateTab('inventory')}
            activeOpacity={0.8}
          >
            <View className="flex-1 flex-row items-center gap-2.5">
              <View className="h-8 w-8 items-center justify-center rounded-lg bg-[#fef3c7]">
                <TriangleAlert size={18} color={colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text className="text-[13px] font-extrabold text-[#92400e]">Inventory Alert</Text>
                <Text className="mt-px text-xs text-[#b45309]">
                  {outOfStock > 0 ? `${outOfStock} out of stock` : ''}
                  {outOfStock > 0 && lowStock > 0 ? ', ' : ''}
                  {lowStock > 0 ? `${lowStock} low in stock` : ''}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-1 rounded-lg bg-white px-2.5 py-1.5">
              <Text className="text-xs font-extrabold text-[#92400e]">Restock</Text>
              <ArrowRight size={14} color={colors.warning} />
            </View>
          </TouchableOpacity>
        )}

        {/* Metrics Grid */}
        <View className="mb-2.5 mt-1.5 flex-row items-center justify-between">
          <Text className="text-[15px] font-extrabold text-[#0f172a]">Today's Business</Text>
        </View>

        <View className="flex-row gap-2.5">
          <MetricCard
            label="Today Revenue"
            value={`₹${todayRev.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            subtitle={`${todaySales} bills completed`}
            icon={<IndianRupee size={18} color={colors.primary} />}
            variant="primary"
          />

          <MetricCard
            label="Net Profit"
            value={`₹${todayProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            subtitle={todayRev > 0 ? `${((todayProfit / todayRev) * 100).toFixed(1)}% margin` : '0% margin'}
            icon={<TrendingUp size={18} color={colors.success} />}
            variant="success"
          />
        </View>

        <View className="mt-2.5 flex-row gap-2.5">
          <MetricCard
            label="Total Bills"
            value={todaySales}
            subtitle="Completed today"
            icon={<ShoppingCart size={18} color={colors.accent} />}
            variant="accent"
          />

          <MetricCard
            label="Stock Alerts"
            value={attentionCount}
            subtitle={outOfStock > 0 ? `${outOfStock} out of stock` : `${summary?.totalProducts || 0} active items`}
            icon={<TriangleAlert size={18} color={attentionCount > 0 ? colors.danger : colors.textMuted} />}
            variant={attentionCount > 0 ? 'danger' : 'primary'}
          />
        </View>

        {/* 7-Day Revenue Trend Chart */}
        {dailyPoints.length > 0 && (
          <View className="mt-3.5 rounded-2xl border border-[#e2e8f0] bg-white p-4">
            <View className="mb-3 flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5">
                <ChartBar size={18} color={colors.primary} />
                <Text className="text-sm font-extrabold text-[#0f172a]">7-Day Revenue Trend</Text>
              </View>
            </View>

            <View className="h-[120px] flex-row items-end justify-between pt-3.5">
              {dailyPoints.map((point, index) => {
                const total = typeof point.total === 'number' ? point.total : parseFloat(String(point.total || 0));
                const heightPct = Math.max((total / maxRev) * 100, 8);
                const dayLabel = new Date(point.date).toLocaleDateString('en-US', { weekday: 'narrow' });

                return (
                  <View key={index} className="h-full flex-1 items-center justify-end">
                    <Text className="mb-1 text-[9px] font-bold text-[#64748b]">
                      {total > 0 ? `₹${Math.round(total)}` : ''}
                    </Text>
                    <View className="h-20 w-[22px] justify-end overflow-hidden rounded-md bg-[#f8fafc]">
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

        {/* Recent Sales Section */}
        <View className="mb-2.5 mt-1.5 flex-row items-center justify-between">
          <Text className="text-[15px] font-extrabold text-[#0f172a]">Recent Invoices</Text>
          <TouchableOpacity onPress={() => onNavigateTab('reports')}>
            <Text className="text-xs font-bold text-[#059669]">View Reports →</Text>
          </TouchableOpacity>
        </View>

        {summary?.recentSales && summary.recentSales.length > 0 ? (
          <View className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white">
            {summary.recentSales.slice(0, 5).map((sale) => {
              const total = typeof sale.totalAmount === 'number' ? sale.totalAmount : parseFloat(String(sale.totalAmount || 0));
              return (
                <TouchableOpacity
                  key={sale.id}
                  className="flex-row items-center justify-between border-b border-[#e2e8f0] p-3.5"
                  onPress={() => handleOpenReceipt(sale)}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center gap-2.5">
                    <View className="h-9 w-9 items-center justify-center rounded-[10px] bg-[#d1fae5]">
                      <Receipt size={18} color={colors.primary} />
                    </View>
                    <View>
                      <Text className="text-[13px] font-extrabold text-[#0f172a]">Invoice #{sale.id}</Text>
                      <Text className="mt-0.5 text-[11px] text-[#64748b]">
                        {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                        {sale.itemCount || (sale.items ? sale.items.length : 1)} items
                      </Text>
                    </View>
                  </View>

                  <View className="items-end">
                    <Text className="text-sm font-extrabold text-[#0f172a]">₹{total.toFixed(2)}</Text>
                    <Text className="mt-px text-[11px] font-bold text-[#059669]">View Receipt →</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View className="items-center justify-center rounded-2xl border border-[#e2e8f0] bg-white p-6">
            <ShoppingCart size={32} color={colors.textLight} />
            <Text className="mt-2.5 text-sm font-bold text-[#0f172a]">No Sales Recorded Today</Text>
            <Text className="mt-1 text-center text-xs text-[#64748b]">Tap the Barcode POS button above to start billing</Text>
          </View>
        )}
      </ScrollView>

      {/* Digital Receipt Modal */}
      <ReceiptModal
        visible={!!selectedSale}
        sale={selectedSale}
        onClose={() => setSelectedSale(null)}
      />
    </View>
  );
};

/*
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textMuted,
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 40,
  },
  quickBar: {
    marginBottom: 16,
    gap: 8,
  },
  actionPosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionPosText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  quickSubRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickSmallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  quickSmallText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: '#fde68a',
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
  },
  alertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  alertIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400e',
  },
  alertDesc: {
    fontSize: 12,
    color: '#b45309',
    marginTop: 1,
  },
  alertAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  alertActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400e',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginTop: 14,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  barChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: 14,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barAmountText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 4,
  },
  barTrack: {
    width: 22,
    height: 80,
    backgroundColor: colors.bg,
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  barFillActive: {
    backgroundColor: colors.primary,
  },
  barFillInactive: {
    backgroundColor: colors.border,
  },
  barDayLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: 6,
  },
  salesList: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  saleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  saleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  receiptIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saleNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  saleTime: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  saleRight: {
    alignItems: 'flex-end',
  },
  saleAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  tapReceiptText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 1,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: 10,
  },
  emptyDesc: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
*/
