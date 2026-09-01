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
import { ui } from '../theme/ui';
import { ReportSummary } from '../types';
import {
  IndianRupee,
  TrendingUp,
  ShoppingCart,
  Percent,
  Wallet,
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

  const totalRev = typeof summary?.totalAmount === 'number' ? summary.totalAmount : parseFloat(String(summary?.totalAmount || 0));
  const totalProfit = typeof summary?.totalProfit === 'number' ? summary.totalProfit : parseFloat(String(summary?.totalProfit || 0));
  const totalSales = summary?.salesCount || 0;
  const avgOrder = typeof summary?.averageOrderValue === 'number' ? summary.averageOrderValue : parseFloat(String(summary?.averageOrderValue || 0));
  const marginPct = totalRev > 0 ? (totalProfit / totalRev) * 100 : 0;

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
          <View style={ui.emptyBox}>
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
                label="Avg Order Value"
                value={`₹${avgOrder.toFixed(2)}`}
                subtitle="Per bill average"
                icon={<Wallet size={18} color={colors.primary} />}
                variant="primary"
              />
            </View>

            {/* Performance Summary Banner */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryTitleRow}>
                <Percent size={18} color={colors.primary} />
                <Text style={styles.summaryTitle}>Profit Margin Overview</Text>
              </View>

              <View style={styles.marginRow}>
                <Text style={styles.marginValueText}>{marginPct.toFixed(1)}%</Text>
                <Text style={styles.marginLabelText}>Overall Profit Margin</Text>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${Math.min(Math.max(marginPct, 5), 100)}%`,
                      backgroundColor: marginPct >= 15 ? colors.success : colors.warning,
                    },
                  ]}
                />
              </View>

              <Text style={styles.summaryNote}>
                {totalRev > 0
                  ? `For every ₹100 of sales, you earned ₹${marginPct.toFixed(1)} in net profit.`
                  : 'Record sales to track your profit margins in real-time.'}
              </Text>
            </View>
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
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginTop: 14,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  marginRow: {
    marginBottom: 8,
  },
  marginValueText: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.primary,
  },
  marginLabelText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  progressTrack: {
    height: 8,
    backgroundColor: colors.bg,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  summaryNote: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
  
});
