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
import { Product, SaleResponse } from '../types';
import * as Haptics from 'expo-haptics';
import {
  Camera,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
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

  const loadProducts = async () => {
    try {
      const data = await productsApi.list();
      setProducts(data.filter((p) => p.active));
    } catch (e) {
      console.warn('Error loading products for POS:', e);
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
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.brand && p.brand.toLowerCase().includes(q))
    );
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
        <View style={styles.searchBox}>
          <Search size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search product name or SKU..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
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
                    <Text style={styles.searchItemPrice}>₹{item.sellingPrice.toFixed(2)}</Text>
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
                      ₹{item.unitPrice.toFixed(2)} / {item.product.unit || 'unit'} • Stock: {item.product.currentQuantity}
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
                    ₹{(item.quantity * item.unitPrice).toFixed(2)}
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
            <Text style={styles.checkoutTotal}>₹{totalAmount.toFixed(2)}</Text>
            <Text style={styles.checkoutProfit}>Est. Profit: +₹{estimatedProfit.toFixed(2)}</Text>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm & Complete Sale</Text>
            <Text style={styles.modalSubtitle}>Total Amount: ₹{totalAmount.toFixed(2)}</Text>

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
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setCheckoutModalOpen(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelBtnText}>Back</Text>
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
                    <CheckCircle size={18} color="#fff" />
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
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    height: 42,
    fontSize: 13,
    color: colors.text,
    marginLeft: 6,
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
    paddingBottom: 30,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
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
  modalActions: {
    flexDirection: 'row',
    gap: 10,
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
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
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
