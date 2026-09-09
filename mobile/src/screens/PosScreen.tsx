import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { Header } from '../components/Header';
import { ReceiptModal } from '../components/ReceiptModal';
import { StockBadge } from '../components/StockBadge';
import { useCart } from '../context/CartContext';
import { productsApi, salesApi } from '../services/shopApi';
import { colors } from '../theme/colors';
import { Category, Product, SaleResponse, SaleSummaryResponse } from '../types';
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
  Flame,
  Check,
  Receipt,
  X,
  Clock,
  ChevronDown,
  ChevronUp,
  Hash,
} from 'lucide-react-native';

export const PosScreen: React.FC = () => {
  const {
    items,
    addItem,
    setProductQuantity,
    removeItem,
    updateQuantity,
    clearCart,
    totalAmount,
    totalItems,
    estimatedProfit,
  } = useCart();

  // Screen Sub-tab: 'new-sale' | 'history'
  const [activeSubTab, setActiveSubTab] = useState<'new-sale' | 'history'>('new-sale');

  // Product Data
  const [products, setProducts] = useState<Product[]>([]);
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Multi-select state for bulk add
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);

  // Cart drawer expanded/collapsed on mobile
  const [cartDrawerExpanded, setCartDrawerExpanded] = useState<boolean>(false);

  // Modals
  const [scannerOpen, setScannerOpen] = useState<boolean>(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD'>('CASH');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [completedSale, setCompletedSale] = useState<SaleResponse | null>(null);

  // Quantity Picker Modal State
  const [qtyModalOpen, setQtyModalOpen] = useState<boolean>(false);
  const [qtyTargetProduct, setQtyTargetProduct] = useState<Product | null>(null);
  const [customQtyValue, setCustomQtyValue] = useState<string>('1');

  // Sales History State
  const [salesHistory, setSalesHistory] = useState<SaleSummaryResponse[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [selectedHistorySale, setSelectedHistorySale] = useState<SaleResponse | null>(null);

  function safeNum(v: any, fallback = 0): number {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    const n = parseFloat(String(v ?? ''));
    return Number.isFinite(n) ? n : fallback;
  }

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [prodData, popularData, catData] = await Promise.all([
        productsApi.list({ size: 100 }),
        productsApi.listPopular(10).catch(() => [] as Product[]),
        productsApi.listCategories().catch(() => [] as Category[]),
      ]);
      const safeProds = Array.isArray(prodData) ? prodData.filter((p) => p.active) : [];
      setProducts(safeProds);
      setPopularProducts(Array.isArray(popularData) ? popularData : []);
      setCategories(Array.isArray(catData) ? catData : []);
    } catch (e: any) {
      console.warn('Error loading products for POS:', e);
      setLoadError(e?.message || 'Failed to load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadSalesHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await salesApi.list(0, 30);
      setSalesHistory(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('Error loading sales history:', e);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (activeSubTab === 'history') {
      loadSalesHistory();
    }
  }, [activeSubTab, loadSalesHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    if (activeSubTab === 'new-sale') {
      loadInitialData();
    } else {
      loadSalesHistory().then(() => setRefreshing(false));
    }
  };

  const handleBarcodeScanned = (scannedCode: string) => {
    const clean = scannedCode.trim().toLowerCase();
    const matched = products.find(
      (p) =>
        (p.sku && p.sku.toLowerCase() === clean) ||
        p.name.toLowerCase().includes(clean)
    );

    if (matched) {
      const available = matched.currentQuantity !== undefined ? matched.currentQuantity : 9999;
      if (available <= 0) {
        Alert.alert('Out of Stock', `"${matched.name}" is currently out of stock.`);
        return;
      }
      const added = addItem(matched, 1);
      if (!added) {
        Alert.alert(
          'Stock Limit Reached',
          `Cannot add more "${matched.name}". Maximum available stock is ${available}.`
        );
      } else {
        setScannerOpen(false);
      }
    } else {
      Alert.alert(
        'Product Not Found',
        `No active product found with Barcode/SKU: ${scannedCode}.`
      );
    }
  };

  // Filtered Products for Catalog & Search
  const filteredProducts = useMemo(() => {
    let result = products;
    if (selectedCategory !== 'ALL') {
      result = result.filter((p) => p.categoryId === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase().slice(0, 100);
      result = result.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.sku || '').toLowerCase().includes(q) ||
          (p.brand || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [products, selectedCategory, searchQuery]);

  // Bulk Selection Helpers
  const toggleSelectProduct = (productId: number) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const toggleSelectAll = () => {
    const availableIds = filteredProducts
      .filter((p) => safeNum(p.currentQuantity) > 0)
      .map((p) => p.id);
    const allSelected = availableIds.length > 0 && availableIds.every((id) => selectedProductIds.includes(id));

    if (allSelected) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(availableIds);
    }
  };

  const handleAddSelectedToCart = () => {
    const selectedProds = products.filter((p) => selectedProductIds.includes(p.id));
    let addedCount = 0;
    selectedProds.forEach((p) => {
      if (safeNum(p.currentQuantity) > 0) {
        const added = addItem(p, 1);
        if (added) addedCount++;
      }
    });

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    setSelectedProductIds([]);
    if (addedCount > 0) {
      setCartDrawerExpanded(true);
    }
  };

  // Open Quantity Picker for a specific product
  const openQuantityPicker = (product: Product) => {
    if (safeNum(product.currentQuantity) <= 0) {
      Alert.alert('Out of Stock', `"${product.name}" is out of stock.`);
      return;
    }
    const cartItem = items.find((i) => i.product.id === product.id);
    setQtyTargetProduct(product);
    setCustomQtyValue(cartItem ? String(cartItem.quantity) : '1');
    setQtyModalOpen(true);
  };

  // Confirm custom quantity from modal
  const handleConfirmQuantity = () => {
    if (!qtyTargetProduct) return;
    const num = parseFloat(customQtyValue);
    if (!Number.isFinite(num) || num < 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid numeric quantity.');
      return;
    }
    const maxStock = safeNum(qtyTargetProduct.currentQuantity, 9999);
    if (num > maxStock) {
      Alert.alert(
        'Stock Limit Exceeded',
        `Maximum stock available for "${qtyTargetProduct.name}" is ${maxStock}. Setting to ${maxStock}.`
      );
      setProductQuantity(qtyTargetProduct, maxStock);
    } else {
      setProductQuantity(qtyTargetProduct, num);
    }
    setQtyModalOpen(false);
  };

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
      loadInitialData();
    } catch (err: any) {
      Alert.alert('Sale Failed', err.message || 'Unable to complete sale. Please verify stock availability.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenHistoryReceipt = async (summaryItem: SaleSummaryResponse) => {
    try {
      const fullSale = await salesApi.get(summaryItem.id);
      setSelectedHistorySale(fullSale);
    } catch {
      setSelectedHistorySale({
        id: summaryItem.id,
        totalAmount: summaryItem.totalAmount,
        createdAt: summaryItem.createdAt,
        items: (summaryItem.items || []).map((name) => ({
          productId: 0,
          productName: name,
          unit: 'PIECE',
          quantity: 1,
          unitPrice: summaryItem.totalAmount,
          purchasePrice: 0,
          lineTotal: summaryItem.totalAmount,
        })),
      });
    }
  };

  const availableFilteredCount = filteredProducts.filter((p) => safeNum(p.currentQuantity) > 0).length;
  const isAllSelected =
    availableFilteredCount > 0 &&
    filteredProducts
      .filter((p) => safeNum(p.currentQuantity) > 0)
      .every((p) => selectedProductIds.includes(p.id));

  // Determine Preset Quantity Options depending on product unit
  const isWeightedUnit =
    qtyTargetProduct?.unit === 'KG' ||
    qtyTargetProduct?.unit === 'LITRE' ||
    qtyTargetProduct?.unit === 'GRAM' ||
    qtyTargetProduct?.unit === 'ML';
  const qtyPresets = isWeightedUnit
    ? ['0.25', '0.5', '1', '2', '5', '10']
    : ['1', '2', '5', '10', '25', '50'];

  return (
    <View className="flex-1 bg-[#f8fafc]">
      <Header
        title="Sell Products"
        subtitle={activeSubTab === 'new-sale' ? 'Instant POS & Quick Bill' : 'Past Invoices & History'}
        onRefresh={onRefresh}
        isRefreshing={refreshing}
      />

      {/* Mode Switcher Tabs: [New Sale] | [Sales History] */}
      <View className="flex-row border-b border-[#e2e8f0] bg-white px-4 py-2">
        <View className="flex-1 flex-row rounded-xl bg-[#f1f5f9] p-1">
          <TouchableOpacity
            className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-lg py-2 ${
              activeSubTab === 'new-sale' ? 'bg-[#059669] shadow-sm' : ''
            }`}
            onPress={() => setActiveSubTab('new-sale')}
            activeOpacity={0.8}
          >
            <Sparkles size={15} color={activeSubTab === 'new-sale' ? '#fff' : colors.textMuted} />
            <Text
              className={`text-xs font-extrabold ${
                activeSubTab === 'new-sale' ? 'text-white' : 'text-[#64748b]'
              }`}
            >
              New Sale {totalItems > 0 ? `(${totalItems})` : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-lg py-2 ${
              activeSubTab === 'history' ? 'bg-[#059669] shadow-sm' : ''
            }`}
            onPress={() => setActiveSubTab('history')}
            activeOpacity={0.8}
          >
            <Clock size={15} color={activeSubTab === 'history' ? '#fff' : colors.textMuted} />
            <Text
              className={`text-xs font-extrabold ${
                activeSubTab === 'history' ? 'text-white' : 'text-[#64748b]'
              }`}
            >
              Sales History
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ============================================================ */}
      {/* TAB 1: NEW SALE (BILLING & CATALOG) */}
      {/* ============================================================ */}
      {activeSubTab === 'new-sale' && (
        <View className="flex-1">
          {/* Top Search & Barcode Trigger */}
          <View className="flex-row gap-2 border-b border-[#e2e8f0] bg-white px-4 py-2.5">
            <View className="flex-1 flex-row items-center rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-2.5">
              <Search size={16} color={colors.textMuted} />
              <TextInput
                className="flex-1 text-sm text-[#0f172a]"
                placeholder="Search products by name or SKU…"
                placeholderTextColor={colors.textLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
                maxLength={100}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                  <X size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            <TouchableOpacity
              className="flex-row items-center gap-1.5 rounded-xl bg-[#059669] px-3.5"
              onPress={() => setScannerOpen(true)}
              activeOpacity={0.8}
            >
              <Camera size={18} color="#fff" />
              <Text className="text-xs font-extrabold text-white">Scan</Text>
            </TouchableOpacity>
          </View>

          {loadError ? (
            <View className="mx-4 mt-2 rounded-lg border border-[#fecaca] bg-[#fee2e2] p-2.5">
              <Text className="text-xs font-bold text-[#ef4444]">{loadError}</Text>
            </View>
          ) : null}

          {/* Popular Fast-Selling Products Bar (When Search is empty) */}
          {!searchQuery.trim() && popularProducts.length > 0 && (
            <View className="border-b border-[#e2e8f0] bg-white py-2">
              <View className="mb-1.5 flex-row items-center justify-between px-4">
                <View className="flex-row items-center gap-1.5">
                  <Flame size={15} color="#ea580c" />
                  <Text className="text-xs font-extrabold text-[#0f172a]">Popular Products</Text>
                  <Text className="text-[11px] text-[#64748b]">• Tap to add / adjust qty</Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="flex-row gap-2 px-4"
              >
                {popularProducts.map((p) => {
                  const inCart = items.find((i) => i.product.id === p.id);
                  const isOut = safeNum(p.currentQuantity) <= 0;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      className={`flex-row items-center gap-2 rounded-xl border px-3 py-2 ${
                        inCart
                          ? 'border-[#059669] bg-[#ecfdf5]'
                          : isOut
                          ? 'border-[#e2e8f0] bg-[#f1f5f9] opacity-60'
                          : 'border-[#e2e8f0] bg-[#f8fafc]'
                      }`}
                      onPress={() => {
                        if (!isOut) openQuantityPicker(p);
                      }}
                      disabled={isOut}
                      activeOpacity={0.7}
                    >
                      <View>
                        <Text className="text-xs font-extrabold text-[#0f172a]" numberOfLines={1}>
                          {p.name}
                        </Text>
                        <Text className="text-[11px] font-bold text-[#059669]">
                          ₹{safeNum(p.sellingPrice).toFixed(2)}{' '}
                          {inCart ? (
                            <Text className="font-extrabold text-[#10b981]">({inCart.quantity} in cart)</Text>
                          ) : null}
                        </Text>
                      </View>
                      <View
                        className={`h-6 w-6 items-center justify-center rounded-full ${
                          inCart ? 'bg-[#059669]' : 'bg-[#d1fae5]'
                        }`}
                      >
                        {inCart ? <Check size={12} color="#fff" /> : <Plus size={14} color="#059669" />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Category Filter Pills */}
          <View className="border-b border-[#e2e8f0] bg-white py-2">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="flex-row gap-2 px-4"
            >
              <TouchableOpacity
                className={`rounded-full border px-3 py-1.5 ${
                  selectedCategory === 'ALL'
                    ? 'border-[#059669] bg-[#d1fae5]'
                    : 'border-[#e2e8f0] bg-[#f8fafc]'
                }`}
                onPress={() => setSelectedCategory('ALL')}
              >
                <Text
                  className={`text-xs font-semibold ${
                    selectedCategory === 'ALL' ? 'text-[#059669]' : 'text-[#64748b]'
                  }`}
                >
                  All Products ({products.length})
                </Text>
              </TouchableOpacity>
              {categories.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  className={`rounded-full border px-3 py-1.5 ${
                    selectedCategory === c.id
                      ? 'border-[#059669] bg-[#d1fae5]'
                      : 'border-[#e2e8f0] bg-[#f8fafc]'
                  }`}
                  onPress={() => setSelectedCategory(c.id)}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      selectedCategory === c.id ? 'text-[#059669]' : 'text-[#64748b]'
                    }`}
                  >
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Bulk Selection & Filter Summary Bar */}
          <View className="flex-row items-center justify-between border-b border-[#e2e8f0] bg-[#f8fafc] px-4 py-2">
            <TouchableOpacity
              className="flex-row items-center gap-2"
              onPress={toggleSelectAll}
              disabled={availableFilteredCount === 0}
            >
              <View
                className={`h-4 w-4 items-center justify-center rounded border ${
                  isAllSelected
                    ? 'border-[#059669] bg-[#059669]'
                    : 'border-[#94a3b8] bg-white'
                }`}
              >
                {isAllSelected && <Check size={11} color="#fff" />}
              </View>
              <Text className="text-xs font-bold text-[#475569]">
                Select All ({availableFilteredCount})
              </Text>
            </TouchableOpacity>

            {selectedProductIds.length > 0 && (
              <TouchableOpacity
                className="flex-row items-center gap-1 rounded-lg bg-[#059669] px-3 py-1.5"
                onPress={handleAddSelectedToCart}
              >
                <Plus size={14} color="#fff" />
                <Text className="text-xs font-extrabold text-white">
                  Add Selected ({selectedProductIds.length})
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Product Catalog List with Direct Quantity Selection */}
          {loading ? (
            <View className="flex-1 items-center justify-center p-7">
              <ActivityIndicator size="large" color={colors.primary} />
              <Text className="mt-2 text-xs font-semibold text-[#64748b]">Loading products to sell…</Text>
            </View>
          ) : (
            <FlatList
              data={filteredProducts}
              keyExtractor={(item) => item.id.toString()}
              contentContainerClassName="gap-2 p-4 pb-44"
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[colors.primary]}
                />
              }
              renderItem={({ item }) => {
                const isSelected = selectedProductIds.includes(item.id);
                const cartItem = items.find((i) => i.product.id === item.id);
                const maxQty = item.currentQuantity !== undefined ? item.currentQuantity : 9999;
                const isOutOfStock = safeNum(item.currentQuantity) <= 0;
                const selling = safeNum(item.sellingPrice, 0);
                const mrpVal = safeNum(item.mrp, 0);
                const hasDiscount = mrpVal > selling;

                return (
                  <View
                    className={`flex-row items-center justify-between rounded-xl border p-3 ${
                      isSelected
                        ? 'border-[#059669] bg-[#ecfdf5]'
                        : cartItem
                        ? 'border-[#bbf7d0] bg-white shadow-sm'
                        : isOutOfStock
                        ? 'border-[#e2e8f0] bg-[#f8fafc] opacity-60'
                        : 'border-[#e2e8f0] bg-white shadow-sm'
                    }`}
                  >
                    {/* Checkbox for Multi-Select */}
                    <TouchableOpacity
                      className="mr-2 p-1"
                      onPress={() => toggleSelectProduct(item.id)}
                      disabled={isOutOfStock}
                    >
                      <View
                        className={`h-5 w-5 items-center justify-center rounded border ${
                          isSelected
                            ? 'border-[#059669] bg-[#059669]'
                            : 'border-[#cbd5e1] bg-white'
                        }`}
                      >
                        {isSelected && <Check size={12} color="#fff" />}
                      </View>
                    </TouchableOpacity>

                    {/* Product Details - Tapping opens Quantity Picker */}
                    <TouchableOpacity
                      className="mr-2 flex-1"
                      onPress={() => {
                        if (!isOutOfStock) openQuantityPicker(item);
                      }}
                      activeOpacity={0.7}
                    >
                      <View className="flex-row items-center gap-1.5">
                        <Text className="text-[13px] font-extrabold text-[#0f172a]" numberOfLines={1}>
                          {item.name}
                        </Text>
                      </View>

                      <Text className="mt-0.5 text-[11px] text-[#64748b]">
                        {item.brand ? `${item.brand} • ` : ''}
                        {item.sku ? `SKU: ${item.sku} • ` : ''}
                        Stock: {safeNum(item.currentQuantity)} {item.unit || 'unit'}
                      </Text>

                      <View className="mt-1 flex-row items-center gap-2">
                        <Text className="text-sm font-black text-[#059669]">
                          ₹{selling.toFixed(2)}
                        </Text>
                        {hasDiscount && (
                          <Text className="text-xs text-[#94a3b8] line-through">
                            ₹{mrpVal.toFixed(2)}
                          </Text>
                        )}
                        <StockBadge status={item.stockStatus} quantity={item.currentQuantity} />
                      </View>
                    </TouchableOpacity>

                    {/* Quantity Selector / Stepper / Add Buttons */}
                    <View className="items-end gap-1.5">
                      {cartItem ? (
                        /* When item is in cart: Show Interactive Stepper + Clickable Qty Box */
                        <View className="flex-row items-center rounded-lg border border-[#059669] bg-[#ecfdf5]">
                          <TouchableOpacity
                            className="p-2"
                            onPress={() => updateQuantity(item.id, cartItem.quantity - 1)}
                          >
                            <Minus size={14} color="#059669" />
                          </TouchableOpacity>

                          <TouchableOpacity
                            className="min-w-8 items-center justify-center bg-white px-1.5 py-1"
                            onPress={() => openQuantityPicker(item)}
                          >
                            <Text className="text-xs font-black text-[#059669]">
                              {cartItem.quantity}
                            </Text>
                            <Text className="text-[8px] font-bold text-[#64748b]">Qty</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            className="p-2"
                            onPress={() => updateQuantity(item.id, cartItem.quantity + 1)}
                            disabled={cartItem.quantity >= maxQty}
                          >
                            <Plus
                              size={14}
                              color={cartItem.quantity >= maxQty ? colors.textLight : '#059669'}
                            />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        /* When item is not in cart: 1-Tap Add + Qty Picker Button */
                        <View className="flex-row items-center gap-1.5">
                          {/* Choose Exact Qty Button */}
                          {!isOutOfStock && (
                            <TouchableOpacity
                              className="rounded-lg border border-[#cbd5e1] bg-[#f8fafc] px-2 py-1.5"
                              onPress={() => openQuantityPicker(item)}
                              activeOpacity={0.7}
                            >
                              <Text className="text-[11px] font-bold text-[#475569]">Qty ⚙</Text>
                            </TouchableOpacity>
                          )}

                          {/* 1-Tap Sell (+1) */}
                          <TouchableOpacity
                            className={`flex-row items-center gap-1 rounded-lg px-3 py-1.5 ${
                              isOutOfStock ? 'bg-[#e2e8f0]' : 'bg-[#059669]'
                            }`}
                            onPress={() => {
                              if (!isOutOfStock) addItem(item, 1);
                            }}
                            disabled={isOutOfStock}
                            activeOpacity={0.7}
                          >
                            <Plus size={14} color={isOutOfStock ? '#94a3b8' : '#fff'} />
                            <Text
                              className={`text-xs font-extrabold ${
                                isOutOfStock ? 'text-[#94a3b8]' : 'text-white'
                              }`}
                            >
                              {isOutOfStock ? 'Sold Out' : 'Sell'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View className="items-center justify-center p-8">
                  <ShoppingBag size={40} color={colors.textLight} />
                  <Text className="mt-2 text-sm font-bold text-[#0f172a]">No Products Found</Text>
                  <Text className="mt-1 text-center text-xs text-[#64748b]">
                    Try clearing your search or category filter
                  </Text>
                </View>
              }
            />
          )}

          {/* Floating Live Cart Bar & Drawer */}
          {items.length > 0 && (
            <View className="absolute bottom-0 left-0 right-0 border-t border-[#cbd5e1] bg-white shadow-2xl">
              {/* Expandable Cart Drawer Content */}
              {cartDrawerExpanded && (
                <View className="max-h-64 border-b border-[#e2e8f0] bg-[#f8fafc] p-3">
                  <View className="mb-2 flex-row items-center justify-between">
                    <Text className="text-xs font-extrabold uppercase text-[#475569]">
                      Cart Items ({totalItems}) • Tap Qty to edit
                    </Text>
                    <TouchableOpacity onPress={clearCart}>
                      <Text className="text-xs font-bold text-[#ef4444]">Clear All</Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView contentContainerClassName="gap-2 pb-2">
                    {items.map((i) => {
                      const maxQty =
                        i.product.currentQuantity !== undefined ? i.product.currentQuantity : 9999;
                      return (
                        <View
                          key={i.product.id}
                          className="flex-row items-center justify-between rounded-lg border border-[#e2e8f0] bg-white p-2.5"
                        >
                          <TouchableOpacity
                            className="mr-2 flex-1"
                            onPress={() => openQuantityPicker(i.product)}
                          >
                            <Text className="text-xs font-extrabold text-[#0f172a]" numberOfLines={1}>
                              {i.product.name}
                            </Text>
                            <Text className="text-[10px] text-[#64748b]">
                              ₹{safeNum(i.unitPrice).toFixed(2)} × {i.quantity} = ₹
                              {(safeNum(i.unitPrice) * i.quantity).toFixed(2)}
                            </Text>
                          </TouchableOpacity>

                          {/* Stepper Controls with Direct Tap-to-Edit Qty */}
                          <View className="flex-row items-center rounded-lg border border-[#e2e8f0] bg-[#f8fafc]">
                            <TouchableOpacity
                              className="p-1.5"
                              onPress={() => updateQuantity(i.product.id, i.quantity - 1)}
                            >
                              <Minus size={13} color={colors.text} />
                            </TouchableOpacity>

                            <TouchableOpacity
                              className="min-w-8 items-center justify-center bg-white px-2 py-1"
                              onPress={() => openQuantityPicker(i.product)}
                            >
                              <Text className="text-xs font-extrabold text-[#059669]">
                                {i.quantity}
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              className="p-1.5"
                              onPress={() => updateQuantity(i.product.id, i.quantity + 1)}
                              disabled={i.quantity >= maxQty}
                            >
                              <Plus
                                size={13}
                                color={i.quantity >= maxQty ? colors.textLight : colors.text}
                              />
                            </TouchableOpacity>
                          </View>

                          <TouchableOpacity
                            className="ml-2 p-1"
                            onPress={() => removeItem(i.product.id)}
                          >
                            <Trash2 size={15} color={colors.danger} />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Summary & Checkout Bar */}
              <View className="flex-row items-center justify-between px-4 py-3">
                <TouchableOpacity
                  className="flex-1"
                  onPress={() => setCartDrawerExpanded((prev) => !prev)}
                  activeOpacity={0.8}
                >
                  <View className="flex-row items-center gap-1">
                    <Text className="text-[11px] font-bold uppercase text-[#64748b]">
                      Total ({totalItems} items)
                    </Text>
                    {cartDrawerExpanded ? (
                      <ChevronDown size={14} color={colors.textMuted} />
                    ) : (
                      <ChevronUp size={14} color={colors.textMuted} />
                    )}
                  </View>
                  <Text className="text-xl font-black text-[#059669]">
                    ₹{safeNum(totalAmount).toFixed(2)}
                  </Text>
                  <Text className="text-[11px] font-bold text-[#10b981]">
                    Est. Profit: +₹{safeNum(estimatedProfit).toFixed(2)}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-row items-center gap-1.5 rounded-xl bg-[#059669] px-6 py-3.5 shadow-md"
                  onPress={() => setCheckoutModalOpen(true)}
                  activeOpacity={0.85}
                >
                  <Text className="text-sm font-black text-white">Complete Sale</Text>
                  <Sparkles size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {/* ============================================================ */}
      {/* TAB 2: SALES HISTORY & INVOICES */}
      {/* ============================================================ */}
      {activeSubTab === 'history' && (
        <View className="flex-1">
          {loadingHistory ? (
            <View className="flex-1 items-center justify-center p-7">
              <ActivityIndicator size="large" color={colors.primary} />
              <Text className="mt-2 text-xs font-semibold text-[#64748b]">Loading sales history…</Text>
            </View>
          ) : salesHistory.length > 0 ? (
            <FlatList
              data={salesHistory}
              keyExtractor={(item) => item.id.toString()}
              contentContainerClassName="gap-2.5 p-4 pb-10"
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[colors.primary]}
                />
              }
              renderItem={({ item }) => {
                const total = safeNum(item.totalAmount, 0);
                const itemsStr =
                  item.items && item.items.length > 0 ? item.items.join(', ') : `${item.itemCount} items`;

                return (
                  <TouchableOpacity
                    className="flex-row items-center justify-between rounded-xl border border-[#e2e8f0] bg-white p-3.5 shadow-sm"
                    onPress={() => handleOpenHistoryReceipt(item)}
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center gap-3">
                      <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#d1fae5]">
                        <Receipt size={20} color={colors.primary} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-black text-[#0f172a]">
                          Invoice #{item.id}
                        </Text>
                        <Text className="mt-0.5 text-xs text-[#64748b]" numberOfLines={1}>
                          {itemsStr}
                        </Text>
                        <Text className="mt-0.5 text-[11px] text-[#94a3b8]">
                          {new Date(item.createdAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    </View>

                    <View className="items-end">
                      <Text className="text-base font-black text-[#059669]">₹{total.toFixed(2)}</Text>
                      <Text className="mt-0.5 text-[11px] font-bold text-[#059669]">View Receipt →</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          ) : (
            <View className="flex-1 items-center justify-center p-8">
              <Receipt size={44} color={colors.textLight} />
              <Text className="mt-2.5 text-base font-extrabold text-[#0f172a]">No Sales Recorded Yet</Text>
              <Text className="mt-1 text-center text-xs text-[#64748b]">
                Completed sales and invoices will appear here in chronological order.
              </Text>
              <TouchableOpacity
                className="mt-4 rounded-xl bg-[#059669] px-5 py-2.5"
                onPress={() => setActiveSubTab('new-sale')}
              >
                <Text className="text-xs font-bold text-white">Start New Sale</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* ============================================================ */}
      {/* QUANTITY PICKER & CUSTOM AMOUNT MODAL */}
      {/* ============================================================ */}
      <Modal visible={qtyModalOpen} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/60">
          <View className="rounded-t-3xl bg-white p-5">
            <View className="mb-3 flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-xl font-black text-[#0f172a]">Select Selling Quantity</Text>
                <Text className="mt-0.5 text-xs text-[#64748b]">{qtyTargetProduct?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setQtyModalOpen(false)}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {qtyTargetProduct && (
              <View className="mb-3.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-bold text-[#64748b]">Price per Unit</Text>
                  <Text className="text-base font-black text-[#059669]">
                    ₹{safeNum(qtyTargetProduct.sellingPrice).toFixed(2)} / {qtyTargetProduct.unit || 'unit'}
                  </Text>
                </View>
                <View className="mt-1 flex-row items-center justify-between">
                  <Text className="text-xs font-bold text-[#64748b]">Available Stock</Text>
                  <Text className="text-xs font-extrabold text-[#0f172a]">
                    {safeNum(qtyTargetProduct.currentQuantity)} {qtyTargetProduct.unit || 'units'}
                  </Text>
                </View>
              </View>
            )}

            {/* Quick Preset Pills */}
            <Text className="mb-1.5 text-[11px] font-bold uppercase text-[#64748b]">
              Quick Quantity Presets
            </Text>
            <View className="mb-3.5 flex-row flex-wrap gap-2">
              {qtyPresets.map((preset) => (
                <TouchableOpacity
                  key={preset}
                  className={`rounded-xl border px-3.5 py-2 ${
                    customQtyValue === preset
                      ? 'border-[#059669] bg-[#059669]'
                      : 'border-[#cbd5e1] bg-[#f8fafc]'
                  }`}
                  onPress={() => setCustomQtyValue(preset)}
                >
                  <Text
                    className={`text-xs font-extrabold ${
                      customQtyValue === preset ? 'text-white' : 'text-[#0f172a]'
                    }`}
                  >
                    {preset} {qtyTargetProduct?.unit || ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Direct Number Input Field with - & + buttons */}
            <Text className="mb-1.5 text-[11px] font-bold uppercase text-[#64748b]">
              Enter Exact Quantity *
            </Text>
            <View className="mb-4 flex-row items-center gap-2">
              <TouchableOpacity
                className="h-12 w-12 items-center justify-center rounded-xl border border-[#cbd5e1] bg-[#f8fafc]"
                onPress={() => {
                  const current = parseFloat(customQtyValue) || 1;
                  const next = Math.max(1, current - 1);
                  setCustomQtyValue(String(next));
                }}
              >
                <Minus size={18} color={colors.text} />
              </TouchableOpacity>

              <TextInput
                className="h-12 flex-1 rounded-xl border border-[#059669] bg-[#f8fafc] px-3 text-center text-lg font-black text-[#0f172a]"
                placeholder="1"
                placeholderTextColor={colors.textLight}
                keyboardType="numeric"
                value={customQtyValue}
                onChangeText={setCustomQtyValue}
                selectTextOnFocus
              />

              <TouchableOpacity
                className="h-12 w-12 items-center justify-center rounded-xl border border-[#cbd5e1] bg-[#f8fafc]"
                onPress={() => {
                  const current = parseFloat(customQtyValue) || 0;
                  const maxS = safeNum(qtyTargetProduct?.currentQuantity, 9999);
                  const next = Math.min(maxS, current + 1);
                  setCustomQtyValue(String(next));
                }}
              >
                <Plus size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Computed Subtotal */}
            <View className="mb-4 flex-row items-center justify-between rounded-xl bg-[#ecfdf5] p-3.5">
              <Text className="text-xs font-black text-[#059669]">Calculated Subtotal</Text>
              <Text className="text-lg font-black text-[#059669]">
                ₹
                {(
                  safeNum(qtyTargetProduct?.sellingPrice) * (parseFloat(customQtyValue) || 0)
                ).toFixed(2)}
              </Text>
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-2.5 border-t border-[#e2e8f0] pt-3">
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center rounded-xl border border-[#e2e8f0] bg-[#f8fafc] py-3"
                onPress={() => setQtyModalOpen(false)}
              >
                <Text className="text-sm font-bold text-[#0f172a]">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-[2] flex-row items-center justify-center gap-1.5 rounded-xl bg-[#059669] py-3"
                onPress={handleConfirmQuantity}
              >
                <CircleCheck size={18} color="#fff" />
                <Text className="text-sm font-black text-white">Apply & Add to Bill</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Barcode Scanner Modal */}
      {scannerOpen && (
        <BarcodeScannerModal
          visible={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScan={handleBarcodeScanned}
        />
      )}

      {/* Checkout Confirmation Modal */}
      <Modal visible={checkoutModalOpen} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/60">
          <View className="max-h-[90%] rounded-t-3xl bg-white p-5">
            <Text className="text-2xl font-extrabold text-[#0f172a]">Confirm & Complete Sale</Text>
            <Text className="mb-4 mt-0.5 text-sm font-bold text-[#059669]">
              Total Payable: ₹{safeNum(totalAmount).toFixed(2)} ({totalItems} items)
            </Text>

            {/* Payment Method Selector */}
            <Text className="mb-1.5 text-[11px] font-bold uppercase text-[#64748b]">
              Payment Method
            </Text>
            <View className="mb-4 flex-row gap-2.5">
              <TouchableOpacity
                className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border px-1 py-3 ${
                  paymentMethod === 'CASH'
                    ? 'border-[#059669] bg-[#d1fae5]'
                    : 'border-[#e2e8f0] bg-[#f8fafc]'
                }`}
                onPress={() => setPaymentMethod('CASH')}
              >
                <Banknote
                  size={20}
                  color={paymentMethod === 'CASH' ? colors.primary : colors.textMuted}
                />
                <Text
                  className={`text-xs font-bold ${
                    paymentMethod === 'CASH' ? 'text-[#059669]' : 'text-[#64748b]'
                  }`}
                >
                  Cash
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border px-1 py-3 ${
                  paymentMethod === 'UPI'
                    ? 'border-[#059669] bg-[#d1fae5]'
                    : 'border-[#e2e8f0] bg-[#f8fafc]'
                }`}
                onPress={() => setPaymentMethod('UPI')}
              >
                <QrCode
                  size={20}
                  color={paymentMethod === 'UPI' ? colors.primary : colors.textMuted}
                />
                <Text
                  className={`text-xs font-bold ${
                    paymentMethod === 'UPI' ? 'text-[#059669]' : 'text-[#64748b]'
                  }`}
                >
                  UPI / QR
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border px-1 py-3 ${
                  paymentMethod === 'CARD'
                    ? 'border-[#059669] bg-[#d1fae5]'
                    : 'border-[#e2e8f0] bg-[#f8fafc]'
                }`}
                onPress={() => setPaymentMethod('CARD')}
              >
                <CreditCard
                  size={20}
                  color={paymentMethod === 'CARD' ? colors.primary : colors.textMuted}
                />
                <Text
                  className={`text-xs font-bold ${
                    paymentMethod === 'CARD' ? 'text-[#059669]' : 'text-[#64748b]'
                  }`}
                >
                  Card
                </Text>
              </TouchableOpacity>
            </View>

            {/* Optional Customer Phone for WhatsApp Receipt */}
            <Text className="mb-1.5 text-[11px] font-bold uppercase text-[#64748b]">
              Customer WhatsApp Phone (Optional)
            </Text>
            <TextInput
              className="mb-[18px] h-[46px] rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 text-sm text-[#0f172a]"
              placeholder="e.g. 9876543210"
              placeholderTextColor={colors.textLight}
              keyboardType="phone-pad"
              value={customerPhone}
              onChangeText={setCustomerPhone}
            />

            {/* Action Buttons */}
            <View className="flex-row gap-2.5 border-t border-[#e2e8f0] pt-3">
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center rounded-lg border border-[#e2e8f0] bg-[#f8fafc] py-3"
                onPress={() => setCheckoutModalOpen(false)}
                disabled={submitting}
              >
                <Text className="text-base font-bold text-[#0f172a]">Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-[2] flex-row items-center justify-center gap-1.5 rounded-xl bg-[#059669] py-3"
                style={submitting ? { opacity: 0.6 } : undefined}
                onPress={handleCheckoutSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <CircleCheck size={18} color="#fff" />
                    <Text className="text-sm font-extrabold text-white">Complete Sale</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Completed Sale Receipt Modal */}
      <ReceiptModal
        visible={!!completedSale || !!selectedHistorySale}
        sale={completedSale || selectedHistorySale}
        customerPhone={customerPhone}
        paymentMethod={paymentMethod}
        onClose={() => {
          setCompletedSale(null);
          setSelectedHistorySale(null);
          setCustomerPhone('');
        }}
      />
    </View>
  );
};
