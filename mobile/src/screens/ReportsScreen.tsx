import React, { useCallback, useEffect, useState } from 'react';
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
import { reportsApi } from '../services/shopApi';
import { colors } from '../theme/colors';
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

  const calculateDates = useCallback((p: DatePreset) => {
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
  }, []);

  const [summary, setSummary] = useState<ReportSummary | null>(() => {
    const today = new Date().toISOString().split('T')[0];
    return reportsApi.getCachedSummary(today, today);
  });
  const [loading, setLoading] = useState<boolean>(() => {
    const today = new Date().toISOString().split('T')[0];
    return !reportsApi.getCachedSummary(today, today);
  });
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadReport = useCallback(async (p: DatePreset, isRefresh = false) => {
    const { from, to } = calculateDates(p);
    const cached = reportsApi.getCachedSummary(from, to);
    if (cached) {
      setSummary(cached);
      setLoading(false);
    } else if (!isRefresh) {
      setLoading(true);
    }
    try {
      const data = await reportsApi.getSummary(from, to);
      setSummary(data);
    } catch (e) {
      console.warn('Error loading reports:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [calculateDates]);

  useEffect(() => {
    loadReport(preset);
  }, [preset, loadReport]);

  const onRefresh = () => {
    setRefreshing(true);
    loadReport(preset, true);
  };

  const totalRev = typeof summary?.totalAmount === 'number' ? summary.totalAmount : parseFloat(String(summary?.totalAmount || 0));
  const totalProfit = typeof summary?.totalProfit === 'number' ? summary.totalProfit : parseFloat(String(summary?.totalProfit || 0));
  const totalSales = summary?.salesCount || 0;
  const avgOrder = typeof summary?.averageOrderValue === 'number' ? summary.averageOrderValue : parseFloat(String(summary?.averageOrderValue || 0));
  const marginPct = totalRev > 0 ? (totalProfit / totalRev) * 100 : 0;

  return (
    <View className="flex-1 bg-[#f8fafc]">
      <Header title="Sales & Reports" subtitle="Revenue & Profit Analysis" onRefresh={onRefresh} isRefreshing={refreshing} />

      <ScrollView
        contentContainerClassName="p-4 pb-10"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* Preset Date Filter Pills */}
        <View className="mb-4 flex-row gap-2">
          {[
            { id: 'today', label: 'Today' },
            { id: '7d', label: 'Last 7 Days' },
            { id: '30d', label: 'This Month' },
            { id: 'all', label: 'All Time' },
          ].map((p) => (
            <TouchableOpacity
              key={p.id}
              className={`flex-1 items-center justify-center rounded-[10px] border px-1 py-2 ${preset === p.id ? 'border-[#059669] bg-[#059669]' : 'border-[#e2e8f0] bg-white'}`}
              onPress={() => setPreset(p.id as DatePreset)}
            >
              <Text className={`text-[11px] font-bold ${preset === p.id ? 'text-white' : 'text-[#64748b]'}`}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading && !summary ? (
          <View className="items-center justify-center p-7 py-[60px]">
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {/* Metric Summary Grid */}
            <View className="flex-row gap-2.5">
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

            <View className="mt-2.5 flex-row gap-2.5">
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
            <View className="mt-3.5 rounded-2xl border border-[#e2e8f0] bg-white p-[18px]">
              <View className="mb-3 flex-row items-center gap-1.5">
                <Percent size={18} color={colors.primary} />
                <Text className="text-sm font-extrabold text-[#0f172a]">Profit Margin Overview</Text>
              </View>

              <View className="mb-2">
                <Text className="text-[28px] font-black text-[#059669]">{marginPct.toFixed(1)}%</Text>
                <Text className="mt-0.5 text-xs font-semibold text-[#64748b]">Overall Profit Margin</Text>
              </View>

              <View className="mb-2.5 h-2 overflow-hidden rounded bg-[#f8fafc]">
                <View
                  className="h-full rounded"
                  style={[
                    {
                      width: `${Math.min(Math.max(marginPct, 5), 100)}%`,
                      backgroundColor: marginPct >= 15 ? colors.success : colors.warning,
                    },
                  ]}
                />
              </View>

              <Text className="text-xs leading-[18px] text-[#64748b]">
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

