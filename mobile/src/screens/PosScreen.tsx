import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { Header } from '../components/Header';
import { ReceiptModal } from '../components/ReceiptModal';
import { useCart } from '../context/CartContext';
import { productsApi, salesApi } from '../services/shopApi';
import { colors } from '../theme/colors';
import { ui } from '../theme/ui';
import { Product, SaleResponse } from '../types';
import * as Haptics from 'expo-haptics';
import {
  Camera,
  Search,
  Plus,
  Minus,
  Trash2,
  CircleCheck,
  CreditCard,
  QrCode,
  Banknote,
  Sparkles,
  ShoppingBag,
} from 'lucide-react-native';

export const PosScreen: React.FC = () => {
  const { items, addItem, removeItem, updateQuantity, clearCart, totalAmount, totalItems, estimatedProfit } =
    useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [scannerOpen, setScannerOpen] = useState<boolean>(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD'>('CASH');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [completedSale, setCompletedSale] = useState<SaleResponse | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const [loadError, setLoadError] = useState<string | null>(null);

  function safeNum(v: any, fallback = 0): number {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    const n = parseFloat(String(v ?? ''));
    return Number.isFinite(n) ? n : fallback;
  }

  const loadProducts = async () => {
    setLoadError(null);
    try {
      const data = await productsApi.list({ size: 100 });
      const safe = Array.isArray(data) ? data : [];
      setProducts(safe.filter((p) => p.active));
    } catch (e: any) {
      console.warn('Error loading products for POS:', e);
      setLoadError(e?.message || 'Failed to load products');
    }
  };

  const handleBarcodeScanned = (scannedCode: string) => {
    const matched = products.find(
      (p) =>
        p.sku?.toLowerCase() === scannedCode.toLowerCase() ||
        p.name.toLowerCase().includes(scannedCode.toLowerCase())
    );

    if (matched) {
      const available = matched.currentQuantity !== undefined ? matched.currentQuantity : 9999;
      const added = addItem(matched, 1);
      if (!added) {
        Alert.alert(
          'Stock Limit Reached',
          `Cannot add more "${matched.name}". Maximum available stock is ${available}.`
        );
      }
    } else {
      Alert.alert(
        'Product Not Found',
        `No active product found with Barcode/SKU: ${scannedCode}. Please check your inventory.`
      );
    }
  };

  const filteredProducts = products.filter((p) => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.trim().toLowerCase().slice(0, 100);
    const name = (p.name || '').toLowerCase();
    const sku = (p.sku || '').toLowerCase();
    const brand = (p.brand || '').toLowerCase();
    return name.includes(q) || sku.includes(q) || brand.includes(q);
  });

  const handleCheckoutSubmit = async () => {
    if (items.length === 0) return;

    setSubmitting(true);
    try {
      const salePayload = {
        items: items.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
        })),
      };

      const result = await salesApi.create(salePayload);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      setCheckoutModalOpen(false);
      clearCart();
      setCompletedSale(result);
      loadProducts();
    } catch (err: any) {
      Alert.alert('Sale Failed', err.message || 'Unable to complete sale. Please verify stock availability.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="POS Billing" subtitle="Scan & Instant Checkout" />

      {/* Top Search & Barcode Trigger */}
      <View style={styles.topControl}>
        <View style={ui.searchBox}>
          <Search size={18} color={colors.textMuted} />
          <TextInput
            style={ui.searchInput}
            placeholder="Search product name or SKU..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            maxLength={100}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearSearchText}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.scanCameraBtn}
          onPress={() => setScannerOpen(true)}
          activeOpacity={0.8}
        >
          <Camera size={20} color="#fff" />
          <Text style={styles.scanCameraText}>Scan</Text>
        </TouchableOpacity>
      </View>

      {loadError ? (
        <View style={{ marginHorizontal: 16, marginTop: 8, backgroundColor: colors.dangerLight, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#fecaca' }}>
          <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '700' }}>{loadError}</Text>
        </View>
      ) : null}

      {/* Search Result Overlay if typing */}
      {searchQuery.trim().length > 0 && (
        <View style={styles.searchOverlay}>
          <Text style={styles.searchOverlayTitle}>
            Matching Products ({filteredProducts.length})
          </Text>
          {filteredProducts.length > 0 ? (
            <FlatList
              data={filteredProducts}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.searchItem}
                  onPress={() => {
                    addItem(item, 1);
                    setSearchQuery('');
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.searchItemName}>{item.name}</Text>
                    <Text style={styles.searchItemSku}>
                      SKU: {item.sku || 'N/A'} • Stock: {item.currentQuantity}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.searchItemPrice}>₹{safeNum(item.sellingPrice).toFixed(2)}</Text>
                    <Text style={styles.addTapText}>+ Add</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          ) : (
            <Text style={styles.noSearchText}>No matching products found</Text>
          )}
        </View>
      )}

      {/* Cart Items List */}
      <View style={styles.cartContainer}>
        <View style={styles.cartHeader}>
          <Text style={styles.cartTitle}>Billing Cart ({totalItems} items)</Text>
          {items.length > 0 && (
            <TouchableOpacity onPress={clearCart}>
              <Text style={styles.clearCartText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        {items.length > 0 ? (
          <FlatList
            data={items}
            keyExtractor={(item) => item.product.id.toString()}
            contentContainerStyle={styles.cartList}
            renderItem={({ item }) => {
              const maxQty = item.product.currentQuantity !== undefined ? item.product.currentQuantity : 9999;
              return (
                <View style={styles.cartCard}>
                  <View style={styles.cartCardLeft}>
                    <Text style={styles.cartItemName} numberOfLines={1}>
                      {item.product.name}
                    </Text>
                    <Text style={styles.cartItemUnit}>
                      ₹{safeNum(item.unitPrice).toFixed(2)} / {item.product.unit || 'unit'} • Stock: {safeNum(item.product.currentQuantity)}
                    </Text>
                  </View>

                  {/* Quantity Controls */}
                  <View style={styles.qtyRow}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(item.product.id, item.quantity - 1)}
                    >
                      <Minus size={14} color={colors.text} />
                    </TouchableOpacity>

                    <Text style={styles.qtyText}>{item.quantity}</Text>

                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
                      disabled={item.quantity >= maxQty}
                    >
                      <Plus
                        size={14}
                        color={item.quantity >= maxQty ? colors.textLight : colors.text}
                      />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.cartItemTotal}>
                    ₹{(safeNum(item.quantity) * safeNum(item.unitPrice)).toFixed(2)}
                  </Text>

                  <TouchableOpacity
                    style={styles.trashBtn}
                    onPress={() => removeItem(item.product.id)}
                  >
                    <Trash2 size={16} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        ) : (
          <View style={styles.emptyCartBox}>
            <ShoppingBag size={48} color={colors.textLight} />
            <Text style={styles.emptyCartTitle}>Cart is Empty</Text>
            <Text style={styles.emptyCartDesc}>
              Tap the green "Scan" button or search above to add items to bill
            </Text>
            <TouchableOpacity style={styles.startScanBtn} onPress={() => setScannerOpen(true)}>
              <Camera size={18} color="#fff" />
              <Text style={styles.startScanText}>Open Barcode Scanner</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Bottom Floating Checkout Bar */}
      {items.length > 0 && (
        <View style={styles.checkoutBar}>
          <View style={styles.checkoutInfo}>
            <Text style={styles.checkoutLabel}>Grand Total ({totalItems} items)</Text>
            <Text style={styles.checkoutTotal}>₹{safeNum(totalAmount).toFixed(2)}</Text>
            <Text style={styles.checkoutProfit}>Est. Profit: +₹{safeNum(estimatedProfit).toFixed(2)}</Text>
          </View>

          <TouchableOpacity
            style={styles.checkoutBtn}
            onPress={() => setCheckoutModalOpen(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.checkoutBtnText}>Checkout</Text>
            <Sparkles size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleBarcodeScanned}
      />

      {/* Checkout Confirmation Modal */}
      <Modal visible={checkoutModalOpen} animationType="slide" transparent>
        <View style={ui.modalOverlay}>
          <View style={ui.modalContent}>
            <Text style={ui.modalTitle}>Confirm & Complete Sale</Text>
            <Text style={styles.modalSubtitle}>Total Amount: ₹{safeNum(totalAmount).toFixed(2)}</Text>

            {/* Payment Method Selector */}
            <Text style={styles.inputLabel}>Payment Method</Text>
            <View style={styles.paymentMethodsRow}>
              <TouchableOpacity
                style={[styles.pmBtn, paymentMethod === 'CASH' && styles.pmBtnActive]}
                onPress={() => setPaymentMethod('CASH')}
              >
                <Banknote size={20} color={paymentMethod === 'CASH' ? colors.primary : colors.textMuted} />
                <Text style={[styles.pmText, paymentMethod === 'CASH' && styles.pmTextActive]}>
                  Cash
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pmBtn, paymentMethod === 'UPI' && styles.pmBtnActive]}
                onPress={() => setPaymentMethod('UPI')}
              >
                <QrCode size={20} color={paymentMethod === 'UPI' ? colors.primary : colors.textMuted} />
                <Text style={[styles.pmText, paymentMethod === 'UPI' && styles.pmTextActive]}>
                  UPI / QR
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pmBtn, paymentMethod === 'CARD' && styles.pmBtnActive]}
                onPress={() => setPaymentMethod('CARD')}
              >
                <CreditCard size={20} color={paymentMethod === 'CARD' ? colors.primary : colors.textMuted} />
                <Text style={[styles.pmText, paymentMethod === 'CARD' && styles.pmTextActive]}>
                  Card
                </Text>
              </TouchableOpacity>
            </View>

            {/* Optional Customer Phone for WhatsApp Receipt */}
            <Text style={styles.inputLabel}>Customer WhatsApp Phone (Optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 9876543210"
              placeholderTextColor={colors.textLight}
              keyboardType="phone-pad"
              value={customerPhone}
              onChangeText={setCustomerPhone}
            />

            {/* Action Buttons */}
            <View style={ui.modalActions}>
              <TouchableOpacity
                style={ui.btnGhost}
                onPress={() => setCheckoutModalOpen(false)}
                disabled={submitting}
              >
                <Text style={ui.btnGhostText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmBtn, submitting && styles.confirmBtnDisabled]}
                onPress={handleCheckoutSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <CircleCheck size={18} color="#fff" />
                    <Text style={styles.confirmBtnText}>Complete Sale</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Completed Sale Receipt Modal */}
      <ReceiptModal
        visible={!!completedSale}
        sale={completedSale}
        customerPhone={customerPhone}
        paymentMethod={paymentMethod}
        onClose={() => {
          setCompletedSale(null);
          setCustomerPhone('');
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topControl: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  
  
  clearSearchText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  scanCameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  scanCameraText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  searchOverlay: {
    position: 'absolute',
    top: 115,
    left: 16,
    right: 16,
    zIndex: 99,
    maxHeight: 260,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  searchOverlayTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  searchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  searchItemSku: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  searchItemPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  addTapText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    marginTop: 2,
  },
  noSearchText: {
    textAlign: 'center',
    paddingVertical: 16,
    color: colors.textMuted,
    fontSize: 13,
  },
  cartContainer: {
    flex: 1,
    padding: 16,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cartTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  clearCartText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.danger,
  },
  cartList: {
    gap: 8,
    paddingBottom: 80,
  },
  cartCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cartCardLeft: {
    flex: 1,
    marginRight: 8,
  },
  cartItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  cartItemUnit: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 10,
  },
  qtyBtn: {
    padding: 6,
  },
  qtyText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    paddingHorizontal: 8,
  },
  cartItemTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    marginRight: 10,
  },
  trashBtn: {
    padding: 6,
  },
  emptyCartBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyCartTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginTop: 12,
  },
  emptyCartDesc: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    marginBottom: 16,
  },
  startScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  startScanText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  checkoutBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  checkoutInfo: {
    flex: 1,
  },
  checkoutLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  checkoutTotal: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.primary,
  },
  checkoutProfit: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  checkoutBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  
  
  
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  paymentMethodsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  pmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  pmBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  pmText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  pmTextActive: {
    color: colors.primary,
  },
  modalInput: {
    height: 46,
    backgroundColor: colors.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.text,
    marginBottom: 18,
  },
  
  
  
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  confirmBtnDisabled: {
    opacity: 0.6,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
});
