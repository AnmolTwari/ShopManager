import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { Header } from '../components/Header';
import { inventoryApi, productsApi } from '../services/shopApi';
import { colors } from '../theme/colors';
import { Product, StockAdjustmentRequest, StockInRequest, StockMovement } from '../types';
import { TabScreen } from '../components/BottomTabBar';
import { formatDateTime } from '../utils/dateUtils';
import {
  Layers,
  ArrowDownLeft,
  SlidersHorizontal,
  Camera,
  CircleCheck,
  X,
  RotateCcw,
  ShoppingBag,
} from 'lucide-react-native';

interface InventoryScreenProps {
  onNavigateTab?: (tab: TabScreen) => void;
}

export const InventoryScreen: React.FC<InventoryScreenProps> = ({ onNavigateTab }) => {
  const insets = useSafeAreaInsets();
  const modalBottomPadding = Math.max(
    insets.bottom > 0 ? insets.bottom + 20 : 0,
    Platform.OS === 'android' ? 56 : 24
  );
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [stockInModalOpen, setStockInModalOpen] = useState<boolean>(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState<boolean>(false);
  const [scannerOpen, setScannerOpen] = useState<boolean>(false);
  const [scannerTarget, setScannerTarget] = useState<'stock-in' | 'adjust'>('stock-in');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Stock In Form
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [stockInQty, setStockInQty] = useState('');
  const [stockInReason, setStockInReason] = useState('');

  // Adjust Form
  const [adjustNewQty, setAdjustNewQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('DAMAGE');

  useEffect(() => {
    loadData();
  }, []);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function safeQty(v: any): string {
    if (v == null) return '0';
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    return Number.isFinite(n) ? String(n) : '0';
  }

  const loadData = async () => {
    setErrorMsg(null);
    try {
      const [movData, prodData] = await Promise.all([
        inventoryApi.listMovements(),
        productsApi.list({ size: 100 }),
      ]);
      setMovements(Array.isArray(movData) ? movData : []);
      const safeProds = Array.isArray(prodData) ? prodData : [];
      setProducts(safeProds.filter((p) => p.active));
    } catch (e: any) {
      console.warn('Error loading inventory data:', e);
      setErrorMsg(e?.message || 'Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeScanned = (code: string) => {
    const clean = code.trim().slice(0, 100).toLowerCase();
    const matched = products.find(
      (p) => (p.sku && p.sku.toLowerCase() === clean) || (p.name && p.name.toLowerCase().includes(clean))
    );

    if (matched) {
      setSelectedProductId(matched.id);
      if (scannerTarget === 'adjust') {
        setAdjustNewQty(safeQty(matched.currentQuantity));
      }
      setScannerOpen(false);
    } else {
      Alert.alert('Not Found', `No active product found with barcode ${code}.`);
    }
  };

  const handleStockInSubmit = async () => {
    if (!selectedProductId || !stockInQty.trim()) {
      Alert.alert('Missing Fields', 'Please select a product and enter quantity to add.');
      return;
    }
    const qty = parseFloat(stockInQty);
    if (!Number.isFinite(qty) || qty <= 0 || qty > 100000) {
      Alert.alert('Invalid Quantity', 'Quantity must be between 0 and 100,000.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: StockInRequest = {
        productId: selectedProductId,
        quantity: qty,
        reason: stockInReason.trim().slice(0, 200) || null,
      };

      await inventoryApi.stockIn(payload);
      setStockInModalOpen(false);
      resetStockInForm();
      loadData();
    } catch (err: any) {
      Alert.alert('Stock In Failed', err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustSubmit = async () => {
    if (!selectedProductId || !adjustNewQty.trim()) {
      Alert.alert('Missing Fields', 'Please select a product and enter the updated quantity.');
      return;
    }
    const newQ = parseFloat(adjustNewQty);
    if (!Number.isFinite(newQ) || newQ < 0 || newQ > 100000) {
      Alert.alert('Invalid Quantity', 'New quantity must be between 0 and 100,000.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: StockAdjustmentRequest = {
        productId: selectedProductId,
        newQuantity: newQ,
        reason: adjustReason.trim().slice(0, 200) || null,
      };

      await inventoryApi.adjust(payload);
      setAdjustModalOpen(false);
      resetAdjustForm();
      loadData();
    } catch (err: any) {
      Alert.alert('Adjustment Failed', err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetStockInForm = () => {
    setSelectedProductId(null);
    setStockInQty('');
    setStockInReason('');
  };

  const resetAdjustForm = () => {
    setSelectedProductId(null);
    setAdjustNewQty('');
    setAdjustReason('DAMAGE');
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  return (
    <View className="flex-1 bg-[#f8fafc]">
      <Header title="Stock & Inventory" subtitle="Inflow, Adjustments & History" />
      {errorMsg ? (
        <View className="mx-4 mt-2 rounded-lg border border-[#fecaca] bg-[#fee2e2] p-2.5">
          <Text className="text-xs font-bold text-[#ef4444]">{errorMsg}</Text>
        </View>
      ) : null}

      {/* Quick Action Trigger Cards */}
      <View className="gap-2.5 p-4">
        <View className="flex-row gap-2.5">
          <TouchableOpacity
            className="flex-1 flex-row items-center gap-2.5 rounded-2xl bg-[#059669] p-3.5"
            onPress={() => {
              resetStockInForm();
              setStockInModalOpen(true);
            }}
            activeOpacity={0.8}
          >
            <ArrowDownLeft size={20} color="#fff" />
            <View className="flex-1">
              <Text className="text-sm font-extrabold text-white" numberOfLines={1}>Stock-In</Text>
              <Text className="mt-px text-[11px] text-[#d1fae5]" numberOfLines={1}>Add received goods</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 flex-row items-center gap-2.5 rounded-2xl border border-[#e2e8f0] bg-white p-3.5"
            onPress={() => {
              resetAdjustForm();
              setAdjustModalOpen(true);
            }}
            activeOpacity={0.8}
          >
            <SlidersHorizontal size={20} color={colors.text} />
            <View className="flex-1">
              <Text className="text-sm font-extrabold text-[#0f172a]" numberOfLines={1}>Adjust Stock</Text>
              <Text className="mt-px text-[11px] text-[#64748b]" numberOfLines={1}>Damages, recount</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Sell / Outflow Shortcut */}
        {onNavigateTab && (
          <TouchableOpacity
            className="flex-row items-center justify-between rounded-xl border border-[#bbf7d0] bg-[#ecfdf5] p-3"
            onPress={() => onNavigateTab('pos')}
            activeOpacity={0.8}
          >
            <View className="flex-row items-center gap-2.5">
              <View className="h-8 w-8 items-center justify-center rounded-lg bg-[#059669]">
                <ShoppingBag size={16} color="#fff" />
              </View>
              <View>
                <Text className="text-xs font-extrabold text-[#0f172a]">Sell Products & Outflow</Text>
                <Text className="text-[11px] text-[#059669]">Create sales and instant bills</Text>
              </View>
            </View>
            <Text className="text-xs font-extrabold text-[#059669]">Go to Sell →</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Movement Audit Log */}
      <View className="mb-2 flex-row items-center gap-1.5 px-4">
        <RotateCcw size={16} color={colors.textMuted} />
        <Text className="text-sm font-extrabold text-[#0f172a]">Recent Stock Movements</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center p-7">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : movements.length > 0 ? (
        <FlatList
          data={movements}
          keyExtractor={(item) => item.id.toString()}
          contentContainerClassName="gap-2.5 px-4 pb-10 pt-1"
          renderItem={({ item }) => {
            const isPositive = item.quantityChanged > 0;
            return (
              <View className="flex-row items-center justify-between rounded-xl border border-[#e2e8f0] bg-white p-3">
                <View className="mr-2.5 flex-1">
                  <View
                    className={`mb-1 self-start rounded-md px-2 py-0.5 ${
                      item.type === 'STOCK_IN'
                        ? 'bg-[#d1fae5]'
                        : item.type === 'ADJUSTMENT'
                        ? 'bg-[#fef3c7]'
                        : 'bg-[#eff6ff]'
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-extrabold uppercase ${
                        item.type === 'STOCK_IN'
                          ? 'text-[#10b981]'
                          : item.type === 'ADJUSTMENT'
                          ? 'text-[#f59e0b]'
                          : 'text-[#3b82f6]'
                      }`}
                    >
                      {item.type}
                    </Text>
                  </View>

                  <Text className="text-[13px] font-bold text-[#0f172a]">{item.productName}</Text>
                  <Text className="mt-0.5 text-[11px] text-[#64748b]">
                    {formatDateTime(item.createdAt)}
                    {item.reason ? ` • ${item.reason}` : ''}
                  </Text>
                </View>

                <View className="items-end">
                  <Text className={`text-base font-extrabold ${isPositive ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                    {isPositive ? `+${item.quantityChanged}` : `${item.quantityChanged}`}
                  </Text>
                  <Text className="mt-0.5 text-[11px] text-[#64748b]">Bal: {item.newQuantity}</Text>
                </View>
              </View>
            );
          }}
        />
      ) : (
        <View className="flex-1 items-center justify-center p-7">
          <Layers size={40} color={colors.textLight} />
          <Text className="mt-2 text-sm font-bold text-[#0f172a]">No Stock Movements Yet</Text>
          <Text className="mt-0.5 text-xs text-[#64748b]">Recorded stock-ins and adjustments will appear here</Text>
        </View>
      )}

      {/* Stock In Modal */}
      <Modal
        visible={stockInModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setStockInModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end bg-black/60"
        >
          <View className="max-h-[90%] rounded-t-3xl bg-white px-5 pt-5" style={{ paddingBottom: modalBottomPadding }}>
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-2xl font-extrabold text-[#0f172a]">Stock-In (Restock Goods)</Text>
              <TouchableOpacity onPress={() => setStockInModalOpen(false)} hitSlop={10}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerClassName="pb-4" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text className="mb-1.5 text-[11px] font-bold uppercase text-[#64748b]">Select Product *</Text>
              <View className="mb-2.5 flex-row gap-2">
                <View className="h-11 flex-1 justify-center rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] px-3">
                  <Text className="text-sm text-[#0f172a]" numberOfLines={1}>
                    {selectedProduct
                      ? `${selectedProduct.name} (Stock: ${selectedProduct.currentQuantity})`
                      : 'Choose a product below or scan...'}
                  </Text>
                </View>
                <TouchableOpacity
                  className="h-11 w-11 items-center justify-center rounded-[10px] bg-[#059669]"
                  onPress={() => {
                    setScannerTarget('stock-in');
                    setScannerOpen(true);
                  }}
                >
                  <Camera size={18} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Product quick pill selector */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                {products.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    className={`mr-1.5 rounded-lg border px-3 py-1.5 ${selectedProductId === p.id ? 'border-[#059669] bg-[#d1fae5]' : 'border-[#e2e8f0] bg-[#f8fafc]'}`}
                    onPress={() => setSelectedProductId(p.id)}
                  >
                    <Text
                      className={`text-[11px] font-bold ${selectedProductId === p.id ? 'text-[#059669]' : 'text-[#64748b]'}`}
                    >
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text className="mb-1.5 text-[11px] font-bold uppercase text-[#64748b]">Quantity to Add *</Text>
              <TextInput
                className="h-11 rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-3 text-base text-[#0f172a]"
                placeholder="e.g. 50"
                placeholderTextColor={colors.textLight}
                keyboardType="numeric"
                value={stockInQty}
                onChangeText={setStockInQty}
              />

              <Text className="mb-1.5 text-[11px] font-bold uppercase text-[#64748b]">Invoice / Reason / Notes</Text>
              <TextInput
                className="h-11 rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-3 text-base text-[#0f172a]"
                placeholder="e.g. Supplier Batch #902"
                placeholderTextColor={colors.textLight}
                value={stockInReason}
                onChangeText={setStockInReason}
              />
            </ScrollView>

            <View className="flex-row gap-2.5 border-t border-[#e2e8f0] pt-3">
              <TouchableOpacity className="flex-1 flex-row items-center justify-center rounded-lg border border-[#e2e8f0] bg-[#f8fafc] py-3" onPress={() => setStockInModalOpen(false)}>
                <Text className="text-base font-bold text-[#0f172a]">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row flex-[1.8] items-center justify-center gap-1.5 rounded-lg bg-[#059669] px-3 py-3"
                onPress={handleStockInSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <CircleCheck size={16} color="#fff" />
                    <Text className="text-base font-extrabold text-white" numberOfLines={1} adjustsFontSizeToFit>Record Stock In</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal
        visible={adjustModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setAdjustModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end bg-black/60"
        >
          <View className="max-h-[90%] rounded-t-3xl bg-white px-5 pt-5" style={{ paddingBottom: modalBottomPadding }}>
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-2xl font-extrabold text-[#0f172a]">Adjust Stock Level</Text>
              <TouchableOpacity onPress={() => setAdjustModalOpen(false)} hitSlop={10}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerClassName="pb-4" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text className="mb-1.5 text-[11px] font-bold uppercase text-[#64748b]">Select Product *</Text>
              <View className="mb-2.5 flex-row gap-2">
                <View className="h-11 flex-1 justify-center rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] px-3">
                  <Text className="text-sm text-[#0f172a]" numberOfLines={1}>
                    {selectedProduct
                      ? `${selectedProduct.name} (Stock: ${selectedProduct.currentQuantity})`
                      : 'Choose a product below or scan...'}
                  </Text>
                </View>
                <TouchableOpacity
                  className="h-11 w-11 items-center justify-center rounded-[10px] bg-[#059669]"
                  onPress={() => {
                    setScannerTarget('adjust');
                    setScannerOpen(true);
                  }}
                >
                  <Camera size={18} color="#fff" />
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                {products.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    className={`mr-1.5 rounded-lg border px-3 py-1.5 ${selectedProductId === p.id ? 'border-[#059669] bg-[#d1fae5]' : 'border-[#e2e8f0] bg-[#f8fafc]'}`}
                    onPress={() => {
                      setSelectedProductId(p.id);
                      setAdjustNewQty(safeQty(p.currentQuantity));
                    }}
                  >
                    <Text
                      className={`text-[11px] font-bold ${selectedProductId === p.id ? 'text-[#059669]' : 'text-[#64748b]'}`}
                    >
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text className="mb-1.5 text-[11px] font-bold uppercase text-[#64748b]">New Total Quantity *</Text>
              <TextInput
                className="h-11 rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-3 text-base text-[#0f172a]"
                placeholder="Enter exact shelf count"
                placeholderTextColor={colors.textLight}
                keyboardType="numeric"
                value={adjustNewQty}
                onChangeText={setAdjustNewQty}
              />

              <Text className="mb-1.5 text-[11px] font-bold uppercase text-[#64748b]">Adjustment Reason</Text>
              <View className="flex-row flex-wrap gap-2">
                {['DAMAGE', 'EXPIRY', 'COUNT_ERROR', 'THEFT', 'RECOUNT'].map((r) => (
                  <TouchableOpacity
                    key={r}
                    className={`rounded-lg border px-2.5 py-1.5 ${adjustReason === r ? 'border-[#059669] bg-[#d1fae5]' : 'border-[#e2e8f0] bg-[#f8fafc]'}`}
                    onPress={() => setAdjustReason(r)}
                  >
                    <Text className={`text-[11px] font-bold ${adjustReason === r ? 'text-[#059669]' : 'text-[#64748b]'}`}>
                      {r.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View className="flex-row gap-2.5 border-t border-[#e2e8f0] pt-3">
              <TouchableOpacity className="flex-1 flex-row items-center justify-center rounded-lg border border-[#e2e8f0] bg-[#f8fafc] py-3" onPress={() => setAdjustModalOpen(false)}>
                <Text className="text-base font-bold text-[#0f172a]">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row flex-[1.8] items-center justify-center gap-1.5 rounded-lg bg-[#059669] px-3 py-3"
                onPress={handleAdjustSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <CircleCheck size={16} color="#fff" />
                    <Text className="text-base font-extrabold text-white" numberOfLines={1} adjustsFontSizeToFit>Apply Adjustment</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Barcode Scanner */}
      {scannerOpen && (
        <BarcodeScannerModal
          visible={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScan={handleBarcodeScanned}
          title="Scan Item to Update Stock"
          subtitle="Align barcode to select product"
        />
      )}
    </View>
  );
};

/*
  formScroll: {
    paddingBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  scannerPickRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  pickerContainer: {
    height: 44,
    backgroundColor: colors.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  pickerSelectedText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  scanBtn: {
    width: 44,
    height: 44,
    backgroundColor: colors.primary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickProdList: {
    marginBottom: 12,
  },
  quickProdPill: {
    backgroundColor: colors.bg,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 6,
  },
  quickProdPillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  quickProdText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  quickProdTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  
  reasonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  reasonPill: {
    backgroundColor: colors.bg,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reasonPillActive: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warning,
  },
  reasonText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  reasonTextActive: {
    color: colors.warning,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
*/
