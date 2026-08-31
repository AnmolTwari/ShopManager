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
import { reportsApi } from '../services/shopApi';
import { colors } from '../theme/colors';
import { ReportSummary } from '../types';
import {
  BarChart3,
  Calendar,
  IndianRupee,
  TrendingUp,
  ShoppingCart,
  Percent,
  Layers,
} from 'lucide-react-native';

type DatePreset = 'today' | '7d' | '30d' | 'all';

export const ReportsScreen: React.FC = () => {
  const [preset, setPreset] = useState<DatePreset>('today');
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const calculateDates = (p: DatePreset) => {
    const today = new Date();
    const to = today.toISOString().split('T')[0];

    if (p === 'today') {
      return { from: to, to };
    } else if (p === '7d') {
      const d = new Date();
      d.setDate(today.getDate() - 7);
      return { from: d.toISOString().split('T')[0], to };
    } else if (p === '30d') {
      const d = new Date();
      d.setDate(today.getDate() - 30);
      return { from: d.toISOString().split('T')[0], to };
    }
    return { from: undefined, to: undefined };
  };

  const loadReport = async () => {
    try {
      const { from, to } = calculateDates(preset);
      const data = await reportsApi.getSummary(from, to);
      setSummary(data);
    } catch (e) {
      console.warn('Error loading reports:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadReport();
  }, [preset]);

  const onRefresh = () => {
    setRefreshing(true);
    loadReport();
  };

  const totalRev = summary?.totalRevenue || 0;
  const totalProfit = summary?.totalProfit || 0;
  const totalSales = summary?.totalSales || 0;
  const marginPct = summary?.profitMarginPercentage || (totalRev > 0 ? (totalProfit / totalRev) * 100 : 0);

  return (
    <View style={styles.container}>
      <Header title="Sales & Reports" subtitle="Revenue & Profit Analysis" onRefresh={onRefresh} isRefreshing={refreshing} />

      <ScrollView
        contentContainerStyle={styles.scrollBody}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* Preset Date Filter Pills */}
        <View style={styles.presetRow}>
          {[
            { id: 'today', label: 'Today' },
            { id: '7d', label: 'Last 7 Days' },
            { id: '30d', label: 'This Month' },
            { id: 'all', label: 'All Time' },
          ].map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.presetPill, preset === p.id && styles.presetPillActive]}
              onPress={() => setPreset(p.id as DatePreset)}
            >
              <Text style={[styles.presetText, preset === p.id && styles.presetTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading && !summary ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {/* Metric Summary Grid */}
            <View style={styles.metricsGrid}>
              <MetricCard
                label="Total Revenue"
                value={`₹${totalRev.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                subtitle={`${totalSales} invoices`}
                icon={<IndianRupee size={18} color={colors.primary} />}
                variant="primary"
              />

              <MetricCard
                label="Net Profit"
                value={`₹${totalProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                subtitle={`${marginPct.toFixed(1)}% profit margin`}
                icon={<TrendingUp size={18} color={colors.success} />}
                variant="success"
              />
            </View>

            <View style={[styles.metricsGrid, { marginTop: 10 }]}>
              <MetricCard
                label="Total Bills"
                value={totalSales}
                subtitle="Completed transactions"
                icon={<ShoppingCart size={18} color={colors.accent} />}
                variant="accent"
              />

              <MetricCard
                label="Profit Margin"
                value={`${marginPct.toFixed(1)}%`}
                subtitle="Return on sales"
                icon={<Percent size={18} color={colors.primary} />}
                variant="primary"
              />
            </View>

            {/* Category Breakdown */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Category Performance</Text>
            </View>

            {summary?.categoryBreakdown && summary.categoryBreakdown.length > 0 ? (
              <View style={styles.breakdownCard}>
                {summary.categoryBreakdown.map((cat, idx) => {
                  const percentage = cat.percentage || (totalRev > 0 ? (cat.totalRevenue / totalRev) * 100 : 0);
                  return (
                    <View key={idx} style={styles.catItem}>
                      <View style={styles.catTopRow}>
                        <Text style={styles.catName}>{cat.categoryName || 'Uncategorized'}</Text>
                        <Text style={styles.catAmount}>₹{cat.totalRevenue.toFixed(2)}</Text>
                      </View>

                      {/* Progress Bar */}
                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressBar,
                            {
                              width: `${Math.min(Math.max(percentage, 5), 100)}%`,
                              backgroundColor: idx % 2 === 0 ? colors.primary : colors.accent,
                            },
                          ]}
                        />
                      </View>

                      <View style={styles.catBottomRow}>
                        <Text style={styles.catSub}>
                          {cat.saleCount || 0} sales • Profit: ₹{cat.totalProfit?.toFixed(2) || '0.00'}
                        </Text>
                        <Text style={styles.catPct}>{percentage.toFixed(1)}%</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Layers size={36} color={colors.textLight} />
                <Text style={styles.emptyTitle}>No Category Breakdown</Text>
                <Text style={styles.emptyDesc}>Sales recorded in this period will display category analytics here</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 40,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  presetPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  presetText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  presetTextActive: {
    color: '#fff',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  breakdownCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 16,
  },
  catItem: {},
  catTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  catName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  catAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.bg,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  catBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  catSub: {
    fontSize: 11,
    color: colors.textMuted,
  },
  catPct: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  centerBox: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginTop: 2,
    textAlign: 'center',
  },
});
