import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Header } from '../components/Header';
import { MetricCard } from '../components/MetricCard';
import { ReceiptModal } from '../components/ReceiptModal';
import { dashboardApi } from '../services/shopApi';
import { colors } from '../theme/colors';
import { DashboardSummary, Sale } from '../types';
import { TabScreen } from '../components/BottomTabBar';
import {
  IndianRupee,
  TrendingUp,
  ShoppingCart,
  AlertTriangle,
  Zap,
  PlusCircle,
  Package,
  Receipt,
  ArrowRight,
} from 'lucide-react-native';

interface DashboardScreenProps {
  onNavigateTab: (tab: TabScreen) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigateTab }) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

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

  if (loading && !summary) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading shop insights...</Text>
      </View>
    );
  }

  const todayRev = summary?.todayRevenue || 0;
  const todayProfit = summary?.todayProfit || 0;
  const todaySales = summary?.todaySaleCount || 0;
  const lowStock = summary?.lowStockCount || 0;
  const outOfStock = summary?.outOfStockCount || 0;
  const attentionCount = lowStock + outOfStock;

  return (
    <View style={styles.container}>
      <Header title="Shop Dashboard" onRefresh={onRefresh} isRefreshing={refreshing} />

      <ScrollView
        contentContainerStyle={styles.scrollBody}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* Quick Action Bar */}
        <View style={styles.quickBar}>
          <TouchableOpacity
            style={styles.actionPosBtn}
            onPress={() => onNavigateTab('pos')}
            activeOpacity={0.8}
          >
            <Zap size={20} color="#fff" />
            <Text style={styles.actionPosText}>Instant Barcode Billing (POS)</Text>
          </TouchableOpacity>

          <View style={styles.quickSubRow}>
            <TouchableOpacity
              style={styles.quickSmallBtn}
              onPress={() => onNavigateTab('products')}
            >
              <PlusCircle size={16} color={colors.primary} />
              <Text style={styles.quickSmallText}>Add Product</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickSmallBtn}
              onPress={() => onNavigateTab('inventory')}
            >
              <Package size={16} color={colors.accent} />
              <Text style={styles.quickSmallText}>Stock Inflow</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Low Stock Warning Alert */}
        {attentionCount > 0 && (
          <TouchableOpacity
            style={styles.alertCard}
            onPress={() => onNavigateTab('inventory')}
            activeOpacity={0.8}
          >
            <View style={styles.alertLeft}>
              <View style={styles.alertIconBox}>
                <AlertTriangle size={18} color={colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>Inventory Alert</Text>
                <Text style={styles.alertDesc}>
                  {outOfStock > 0 ? `${outOfStock} out of stock` : ''}
                  {outOfStock > 0 && lowStock > 0 ? ', ' : ''}
                  {lowStock > 0 ? `${lowStock} low in stock` : ''}
                </Text>
              </View>
            </View>
            <View style={styles.alertAction}>
              <Text style={styles.alertActionText}>Restock</Text>
              <ArrowRight size={14} color={colors.warning} />
            </View>
          </TouchableOpacity>
        )}

        {/* Metrics Grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Business</Text>
        </View>

        <View style={styles.metricsGrid}>
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

        <View style={[styles.metricsGrid, { marginTop: 10 }]}>
          <MetricCard
            label="Total Sales"
            value={todaySales}
            subtitle="Completed today"
            icon={<ShoppingCart size={18} color={colors.accent} />}
            variant="accent"
          />

          <MetricCard
            label="Stock Alerts"
            value={attentionCount}
            subtitle={outOfStock > 0 ? `${outOfStock} out of stock` : 'Items need restock'}
            icon={<AlertTriangle size={18} color={attentionCount > 0 ? colors.danger : colors.textMuted} />}
            variant={attentionCount > 0 ? 'danger' : 'primary'}
          />
        </View>

        {/* Recent Sales Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Invoices</Text>
          <TouchableOpacity onPress={() => onNavigateTab('reports')}>
            <Text style={styles.seeAllText}>View Reports →</Text>
          </TouchableOpacity>
        </View>

        {summary?.recentSales && summary.recentSales.length > 0 ? (
          <View style={styles.salesList}>
            {summary.recentSales.slice(0, 5).map((sale) => (
              <TouchableOpacity
                key={sale.id}
                style={styles.saleItem}
                onPress={() => setSelectedSale(sale)}
                activeOpacity={0.7}
              >
                <View style={styles.saleLeft}>
                  <View style={styles.receiptIconBox}>
                    <Receipt size={18} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.saleNumber}>#{sale.saleNumber}</Text>
                    <Text style={styles.saleTime}>
                      {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                      {sale.items?.length || 1} items
                    </Text>
                  </View>
                </View>

                <View style={styles.saleRight}>
                  <Text style={styles.saleAmount}>₹{sale.totalAmount.toFixed(2)}</Text>
                  <Text style={styles.saleProfit}>+₹{sale.profitAmount?.toFixed(2) || '0.00'}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <ShoppingCart size={32} color={colors.textLight} />
            <Text style={styles.emptyTitle}>No Sales Recorded Today</Text>
            <Text style={styles.emptyDesc}>Tap the Barcode POS button above to start billing</Text>
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

const styles = StyleSheet.create({
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
    paddingBottom: 30,
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
  saleProfit: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
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
});
