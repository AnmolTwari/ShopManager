import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { Header } from '../components/Header';
import { inventoryApi, productsApi } from '../services/shopApi';
import { colors } from '../theme/colors';
import { Product, StockAdjustmentRequest, StockInRequest, StockMovement } from '../types';
import {
  Layers,
  ArrowDownLeft,
  Sliders,
  Camera,
  CheckCircle,
  X,
  History,
} from 'lucide-react-native';

export const InventoryScreen: React.FC = () => {
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

  const loadData = async () => {
    try {
      const [movData, prodData] = await Promise.all([
        inventoryApi.listMovements(),
        productsApi.list(),
      ]);
      setMovements(movData);
      setProducts(prodData.filter((p) => p.active));
    } catch (e) {
      console.warn('Error loading inventory data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeScanned = (code: string) => {
    const matched = products.find(
      (p) => p.sku?.toLowerCase() === code.toLowerCase() || p.name.toLowerCase().includes(code.toLowerCase())
    );

    if (matched) {
      setSelectedProductId(matched.id);
      if (scannerTarget === 'adjust') {
        setAdjustNewQty(matched.currentQuantity.toString());
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

    setSubmitting(true);
    try {
      const payload: StockInRequest = {
        productId: selectedProductId,
        quantity: parseFloat(stockInQty) || 0,
        reason: stockInReason.trim() || null,
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

    setSubmitting(true);
    try {
      const payload: StockAdjustmentRequest = {
        productId: selectedProductId,
        newQuantity: parseFloat(adjustNewQty) || 0,
        reason: adjustReason.trim() || null,
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
    <View style={styles.container}>
      <Header title="Stock & Inventory" subtitle="Inflow, Adjustments & History" />

      {/* Quick Action Trigger Cards */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.stockInBtn}
          onPress={() => {
            resetStockInForm();
            setStockInModalOpen(true);
          }}
          activeOpacity={0.8}
        >
          <ArrowDownLeft size={20} color="#fff" />
          <View>
            <Text style={styles.stockInTitle}>Stock-In</Text>
            <Text style={styles.stockInSub}>Add received goods</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.adjustBtn}
          onPress={() => {
            resetAdjustForm();
            setAdjustModalOpen(true);
          }}
          activeOpacity={0.8}
        >
          <Sliders size={20} color={colors.text} />
          <View>
            <Text style={styles.adjustTitle}>Adjust Stock</Text>
            <Text style={styles.adjustSub}>Damages, expiry, recount</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Movement Audit Log */}
      <View style={styles.logHeader}>
        <History size={16} color={colors.textMuted} />
        <Text style={styles.logTitle}>Recent Stock Movements</Text>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : movements.length > 0 ? (
        <FlatList
          data={movements}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.logList}
          renderItem={({ item }) => {
            const isPositive = item.quantityChanged > 0;
            return (
              <View style={styles.movementCard}>
                <View style={styles.movLeft}>
                  <View
                    style={[
                      styles.typeBadge,
                      item.type === 'STOCK_IN'
                        ? styles.bgStockIn
                        : item.type === 'ADJUSTMENT'
                        ? styles.bgAdjust
                        : styles.bgSale,
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeText,
                        item.type === 'STOCK_IN'
                          ? styles.textStockIn
                          : item.type === 'ADJUSTMENT'
                          ? styles.textAdjust
                          : styles.textSale,
                      ]}
                    >
                      {item.type}
                    </Text>
                  </View>

                  <Text style={styles.movProductName}>{item.productName}</Text>
                  <Text style={styles.movDate}>
                    {new Date(item.createdAt).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {item.reason ? ` • ${item.reason}` : ''}
                  </Text>
                </View>

                <View style={styles.movRight}>
                  <Text style={[styles.deltaText, isPositive ? styles.textPositive : styles.textNegative]}>
                    {isPositive ? `+${item.quantityChanged}` : `${item.quantityChanged}`}
                  </Text>
                  <Text style={styles.resultingText}>Bal: {item.newQuantity}</Text>
                </View>
              </View>
            );
          }}
        />
      ) : (
        <View style={styles.emptyBox}>
          <Layers size={40} color={colors.textLight} />
          <Text style={styles.emptyTitle}>No Stock Movements Yet</Text>
          <Text style={styles.emptyDesc}>Recorded stock-ins and adjustments will appear here</Text>
        </View>
      )}

      {/* Stock In Modal */}
      <Modal visible={stockInModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Stock-In (Restock Goods)</Text>
              <TouchableOpacity onPress={() => setStockInModalOpen(false)}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formScroll}>
              <Text style={styles.inputLabel}>Select Product *</Text>
              <View style={styles.scannerPickRow}>
                <View style={[styles.pickerContainer, { flex: 1 }]}>
                  <Text style={styles.pickerSelectedText}>
                    {selectedProduct
                      ? `${selectedProduct.name} (Stock: ${selectedProduct.currentQuantity})`
                      : 'Choose a product below or scan...'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.scanBtn}
                  onPress={() => {
                    setScannerTarget('stock-in');
                    setScannerOpen(true);
                  }}
                >
                  <Camera size={18} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Product quick pill selector */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickProdList}>
                {products.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.quickProdPill, selectedProductId === p.id && styles.quickProdPillActive]}
                    onPress={() => setSelectedProductId(p.id)}
                  >
                    <Text
                      style={[
                        styles.quickProdText,
                        selectedProductId === p.id && styles.quickProdTextActive,
                      ]}
                    >
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Quantity to Add *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 50"
                placeholderTextColor={colors.textLight}
                keyboardType="numeric"
                value={stockInQty}
                onChangeText={setStockInQty}
              />

              <Text style={styles.inputLabel}>Invoice / Reason / Notes</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Supplier Batch #902"
                placeholderTextColor={colors.textLight}
                value={stockInReason}
                onChangeText={setStockInReason}
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setStockInModalOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, submitting && styles.saveBtnDisabled]}
                onPress={handleStockInSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <CheckCircle size={18} color="#fff" />
                    <Text style={styles.saveBtnText}>Record Stock In</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal visible={adjustModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Stock Adjustment</Text>
              <TouchableOpacity onPress={() => setAdjustModalOpen(false)}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formScroll}>
              <Text style={styles.inputLabel}>Select Product *</Text>
              <View style={styles.scannerPickRow}>
                <View style={[styles.pickerContainer, { flex: 1 }]}>
                  <Text style={styles.pickerSelectedText}>
                    {selectedProduct
                      ? `${selectedProduct.name} (Stock: ${selectedProduct.currentQuantity})`
                      : 'Choose a product below or scan...'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.scanBtn}
                  onPress={() => {
                    setScannerTarget('adjust');
                    setScannerOpen(true);
                  }}
                >
                  <Camera size={18} color="#fff" />
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickProdList}>
                {products.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.quickProdPill, selectedProductId === p.id && styles.quickProdPillActive]}
                    onPress={() => {
                      setSelectedProductId(p.id);
                      setAdjustNewQty(p.currentQuantity.toString());
                    }}
                  >
                    <Text
                      style={[
                        styles.quickProdText,
                        selectedProductId === p.id && styles.quickProdTextActive,
                      ]}
                    >
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>New Total Quantity *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter exact shelf count"
                placeholderTextColor={colors.textLight}
                keyboardType="numeric"
                value={adjustNewQty}
                onChangeText={setAdjustNewQty}
              />

              <Text style={styles.inputLabel}>Adjustment Reason</Text>
              <View style={styles.reasonRow}>
                {['DAMAGE', 'EXPIRY', 'COUNT_ERROR', 'THEFT', 'RECOUNT'].map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.reasonPill, adjustReason === r && styles.reasonPillActive]}
                    onPress={() => setAdjustReason(r)}
                  >
                    <Text style={[styles.reasonText, adjustReason === r && styles.reasonTextActive]}>
                      {r.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAdjustModalOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, submitting && styles.saveBtnDisabled]}
                onPress={handleAdjustSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <CheckCircle size={18} color="#fff" />
                    <Text style={styles.saveBtnText}>Apply Adjustment</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Barcode Scanner */}
      <BarcodeScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleBarcodeScanned}
        title="Scan Item to Update Stock"
        subtitle="Align barcode to select product"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  actionRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
  },
  stockInBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 16,
    gap: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  stockInTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  stockInSub: {
    color: '#d1fae5',
    fontSize: 11,
    marginTop: 1,
  },
  adjustBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  adjustTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  adjustSub: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 6,
  },
  logTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  logList: {
    padding: 16,
    paddingTop: 4,
    gap: 10,
    paddingBottom: 40,
  },
  movementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  movLeft: {
    flex: 1,
    marginRight: 10,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  bgStockIn: {
    backgroundColor: colors.successLight,
  },
  bgAdjust: {
    backgroundColor: colors.warningLight,
  },
  bgSale: {
    backgroundColor: colors.accentLight,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  textStockIn: {
    color: colors.success,
  },
  textAdjust: {
    color: colors.warning,
  },
  textSale: {
    color: colors.accent,
  },
  movProductName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  movDate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  movRight: {
    alignItems: 'flex-end',
  },
  deltaText: {
    fontSize: 16,
    fontWeight: '800',
  },
  textPositive: {
    color: colors.success,
  },
  textNegative: {
    color: colors.danger,
  },
  resultingText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
  },
  emptyDesc: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
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
  formInput: {
    height: 44,
    backgroundColor: colors.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    fontSize: 13,
    color: colors.text,
    marginBottom: 12,
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
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
});
