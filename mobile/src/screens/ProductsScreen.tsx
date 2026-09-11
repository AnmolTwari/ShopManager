import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { BottomTabBar, TabScreen } from '../components/BottomTabBar';
import { Header } from '../components/Header';
import { ReceiptModal } from '../components/ReceiptModal';
import { StockBadge } from '../components/StockBadge';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { productsApi, salesApi } from '../services/shopApi';
import { colors } from '../theme/colors';
import { Category, Product, ProductRequest, ProductUnit, SaleResponse } from '../types';
import * as Haptics from 'expo-haptics';
import {
  Plus,
  Search,
  Camera,
  Pencil,
  Archive,
  Package,
  X,
  Check,
  RefreshCw,
  TriangleAlert,
  ShoppingBag,
  CircleCheck,
  Sparkles,
  Banknote,
  QrCode,
  CreditCard,
  ArrowRight,
} from 'lucide-react-native';

const UNITS: ProductUnit[] = ['PIECE', 'PACKET', 'BOX', 'BOTTLE', 'KG', 'GRAM', 'LITRE', 'ML'];
const PAGE_SIZE = 50;

function safeNumber(v: any, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const parsed = parseFloat(String(v ?? ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}
function fmtCurrency(v: any): string {
  return `₹${safeNumber(v, 0).toFixed(2)}`;
}
function sanitizeText(input: string, maxLen: number): string {
  return input.replace(/[\x00-\x1F\x7F]/g, '').slice(0, maxLen).trim();
}
function sanitizeSku(input: string): string {
  return input.replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 50).trim();
}

interface ProductsScreenProps {
  onNavigateTab?: (tab: TabScreen) => void;
}

export const ProductsScreen: React.FC<ProductsScreenProps> = ({ onNavigateTab }) => {
  const insets = useSafeAreaInsets();
  const modalBottomPadding = Math.max(
    insets.bottom > 0 ? insets.bottom + 20 : 0,
    Platform.OS === 'android' ? 56 : 24
  );
  const { items, addItem, totalAmount, totalItems } = useCart();
  const { shopProfile } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'ALL'>('ALL');

  // Form Modals
  const [formModalOpen, setFormModalOpen] = useState<boolean>(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [scannerOpen, setScannerOpen] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Quick Direct Sell Modal State
  const [quickSellModalOpen, setQuickSellModalOpen] = useState<boolean>(false);
  const [quickSellProduct, setQuickSellProduct] = useState<Product | null>(null);
  const [quickSellQty, setQuickSellQty] = useState<string>('1');
  const [quickSellPaymentMethod, setQuickSellPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD'>('CASH');
  const [quickSellPhone, setQuickSellPhone] = useState<string>('');
  const [quickSelling, setQuickSelling] = useState<boolean>(false);
  const [completedSale, setCompletedSale] = useState<SaleResponse | null>(null);

  // Product Form Fields
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [brand, setBrand] = useState('');
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState<ProductUnit>('PIECE');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [currentQuantity, setCurrentQuantity] = useState('0');
  const [minimumStockLevel, setMinimumStockLevel] = useState('5');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const loadData = useCallback(
    async (opts: { showSpinner?: boolean; isRefresh?: boolean } = {}) => {
      const showSpinner = opts.showSpinner ?? !opts.isRefresh;
      if (showSpinner) setLoading(true);
      if (opts.isRefresh) setRefreshing(true);
      setError(null);
      try {
        const params: any = { size: PAGE_SIZE, page: 0 };
        if (debouncedSearch) params.search = debouncedSearch;
        if (selectedCategory !== 'ALL') params.categoryId = selectedCategory;
        const [prodData, catData] = await Promise.all([
          productsApi.list(params),
          productsApi.listCategories().catch(() => [] as Category[]),
        ]);
        const safeProducts = Array.isArray(prodData) ? prodData : [];
        setProducts(safeProducts);
        setCategories(Array.isArray(catData) ? catData : []);
      } catch (e: any) {
        const msg = e?.message || 'Failed to load products. Please retry.';
        setError(msg);
        console.warn('Error loading products:', e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [debouncedSearch, selectedCategory]
  );

  useEffect(() => {
    loadData({ showSpinner: true });
  }, [loadData]);

  const onRefresh = useCallback(() => {
    loadData({ isRefresh: true });
  }, [loadData]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setCategoryId(categories.length > 0 ? categories[0].id : null);
    setBrand('');
    setSku('');
    setUnit('PIECE');
    setPurchasePrice('');
    setSellingPrice('');
    setMrp('');
    setCurrentQuantity('0');
    setMinimumStockLevel('5');
    setFormModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name ?? '');
    setCategoryId(p.categoryId || (categories.length > 0 ? categories[0].id : null));
    setBrand(p.brand || '');
    setSku(p.sku || '');
    setUnit(p.unit || 'PIECE');
    setPurchasePrice(p.purchasePrice != null ? String(p.purchasePrice) : '');
    setSellingPrice(p.sellingPrice != null ? String(p.sellingPrice) : '');
    setMrp(p.mrp != null ? String(p.mrp) : '');
    setCurrentQuantity(p.currentQuantity != null ? String(p.currentQuantity) : '0');
    setMinimumStockLevel(p.minimumStockLevel != null ? String(p.minimumStockLevel) : '5');
    setFormModalOpen(true);
  };

  // Quick Direct Sell Handling
  const openQuickSellModal = (p: Product) => {
    if (safeNumber(p.currentQuantity) <= 0) {
      Alert.alert('Out of Stock', `Cannot sell "${p.name}". Stock is 0.`);
      return;
    }
    setQuickSellProduct(p);
    setQuickSellQty('1');
    setQuickSellPhone('');
    setQuickSellPaymentMethod('CASH');
    setQuickSellModalOpen(true);
  };

  const handleQuickSellSubmit = async () => {
    if (!quickSellProduct) return;
    const qty = parseFloat(quickSellQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid quantity greater than 0.');
      return;
    }
    const maxStock = safeNumber(quickSellProduct.currentQuantity, 9999);
    if (qty > maxStock) {
      Alert.alert('Insufficient Stock', `Only ${maxStock} items available in stock.`);
      return;
    }

    setQuickSelling(true);
    try {
      const result = await salesApi.create({
        items: [{ productId: quickSellProduct.id, quantity: qty }],
      });
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      setQuickSellModalOpen(false);
      setCompletedSale(result);
      loadData({ showSpinner: false, isRefresh: true });
    } catch (err: any) {
      Alert.alert('Quick Sale Failed', err.message || 'Operation failed.');
    } finally {
      setQuickSelling(false);
    }
  };

  const handleCreateCategory = async () => {
    const clean = sanitizeText(newCatName, 80);
    if (!clean) {
      Alert.alert('Validation', 'Please enter a valid category name.');
      return;
    }
    try {
      const created = await productsApi.createCategory({ name: clean });
      setCategories((prev) => [...prev, created]);
      setCategoryId(created.id);
      setNewCatName('');
      setCategoryModalOpen(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not create category.');
    }
  };

  const handleSaveProduct = async () => {
    const cleanName = sanitizeText(name, 150);
    if (!cleanName) {
      Alert.alert('Missing Info', 'Product name is required (max 150 chars).');
      return;
    }
    const pp = safeNumber(purchasePrice, NaN);
    const sp = safeNumber(sellingPrice, NaN);
    if (!Number.isFinite(pp) || pp < 0) {
      Alert.alert('Invalid Price', 'Purchase price must be a valid number ≥ 0.');
      return;
    }
    if (!Number.isFinite(sp) || sp < 0) {
      Alert.alert('Invalid Price', 'Selling price must be a valid number ≥ 0.');
      return;
    }
    const cleanMrp = mrp.trim() ? safeNumber(mrp, NaN) : null;
    if (mrp.trim() && (!Number.isFinite(cleanMrp!) || cleanMrp! < 0)) {
      Alert.alert('Invalid MRP', 'MRP must be a valid number ≥ 0 or empty.');
      return;
    }
    const qty = sanitizeText(currentQuantity, 20);
    const minLevel = sanitizeText(minimumStockLevel, 20);
    const qtyNum = safeNumber(qty, 0);
    const minNum = safeNumber(minLevel, 5);
    if (qtyNum < 0 || minNum < 0) {
      Alert.alert('Invalid Stock', 'Quantity values must be ≥ 0.');
      return;
    }

    let targetCatId = categoryId;
    if (!targetCatId) {
      if (categories.length > 0) {
        targetCatId = categories[0].id;
      } else {
        try {
          const defaultCat = await productsApi.createCategory({ name: 'General' });
          setCategories([defaultCat]);
          targetCatId = defaultCat.id;
        } catch {
          Alert.alert('Category Required', 'Please create a category first.');
          return;
        }
      }
    }

    setSaving(true);
    try {
      const payload: ProductRequest = {
        name: cleanName,
        categoryId: targetCatId!,
        brand: sanitizeText(brand, 100) || null,
        sku: sanitizeSku(sku) || null,
        unit,
        purchasePrice: pp,
        sellingPrice: sp,
        mrp: cleanMrp,
        currentQuantity: qtyNum,
        minimumStockLevel: minNum,
      };

      if (editingProduct) {
        await productsApi.update(editingProduct.id, payload);
      } else {
        await productsApi.create(payload);
      }
      setFormModalOpen(false);
      loadData({ showSpinner: false, isRefresh: true });
    } catch (err: any) {
      const msg =
        err?.message || err?.fieldErrors
          ? Object.values(err.fieldErrors).join(' ')
          : 'Could not save product.';
      Alert.alert('Save Failed', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveToggle = async (p: Product) => {
    Alert.alert(
      'Remove Product',
      `Remove "${p.name}"? If it has history it will be archived; otherwise deleted permanently.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await productsApi.delete(p.id);
              setProducts((prev) => prev.filter((x) => x.id !== p.id));
              Alert.alert(
                'Removed',
                res.archived ? 'Product archived (history retained).' : 'Product deleted permanently.'
              );
              loadData({ showSpinner: false });
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Operation failed.');
            }
          },
        },
      ]
    );
  };

  const filtered = useMemo(() => (Array.isArray(products) ? products : []), [products]);

  const renderProductCard = ({ item }: { item: Product }) => {
    if (!item) return null;
    const selling = safeNumber(item.sellingPrice, 0);
    const purchase = safeNumber(item.purchasePrice, 0);
    const margin = selling - purchase;
    const qty = safeNumber(item.currentQuantity, 0);
    const minL = safeNumber(item.minimumStockLevel, 5);
    const cartItem = items.find((i) => i.product.id === item.id);
    const isOutOfStock = qty <= 0;

    return (
      <View className="rounded-[14px] border border-[#e2e8f0] bg-white p-3.5 shadow-sm">
        <View className="mb-2 flex-row items-start justify-between">
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text className="text-sm font-extrabold text-[#0f172a]" numberOfLines={2}>
              {item.name || 'Unnamed Product'}
            </Text>
            <Text className="mt-0.5 text-[11px] text-[#64748b]" numberOfLines={1}>
              {item.categoryName ? `${item.categoryName} • ` : ''}
              {item.brand ? `${item.brand} • ` : ''}
              SKU: {item.sku || 'N/A'}
            </Text>
          </View>
          <StockBadge status={item.stockStatus} quantity={qty} minLevel={minL} />
        </View>

        {/* Pricing Info */}
        <View className="mb-2.5 flex-row justify-between gap-1.5 rounded-[10px] bg-[#f8fafc] p-2.5">
          <View className="flex-1">
            <Text className="text-[10px] font-semibold uppercase text-[#64748b]">Selling</Text>
            <Text className="mt-0.5 text-sm font-extrabold text-[#059669]">{fmtCurrency(selling)}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-[10px] font-semibold uppercase text-[#64748b]">Cost</Text>
            <Text className="mt-0.5 text-sm font-bold text-[#0f172a]">{fmtCurrency(purchase)}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-[10px] font-semibold uppercase text-[#64748b]">Unit / Margin</Text>
            <Text
              className="mt-0.5 text-xs font-bold text-[#10b981]"
              style={margin < 0 ? { color: colors.danger } : undefined}
            >
              {item.unit || 'PIECE'} {margin >= 0 ? `(+${fmtCurrency(margin)})` : `(${fmtCurrency(margin)})`}
            </Text>
          </View>
        </View>

        {/* Action Buttons: SELL + Edit + Remove */}
        <View className="flex-row gap-2">
          {/* Primary SELL Button */}
          <TouchableOpacity
            className={`flex-[1.5] flex-row items-center justify-center gap-1.5 rounded-lg py-2.5 ${
              isOutOfStock
                ? 'bg-[#e2e8f0]'
                : cartItem
                ? 'bg-[#059669]'
                : 'bg-[#059669]'
            }`}
            onPress={() => {
              if (!isOutOfStock) {
                const added = addItem(item, 1);
                if (added) {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  } catch {}
                }
              }
            }}
            disabled={isOutOfStock}
            activeOpacity={0.8}
          >
            <ShoppingBag size={14} color={isOutOfStock ? '#94a3b8' : '#fff'} />
            <Text
              className={`text-xs font-black ${
                isOutOfStock ? 'text-[#94a3b8]' : 'text-white'
              }`}
            >
              {isOutOfStock ? 'Out of Stock' : cartItem ? `+ Sell More (${cartItem.quantity})` : 'Sell Product'}
            </Text>
          </TouchableOpacity>

          {/* Quick 1-Tap Direct Checkout Modal Trigger */}
          {!isOutOfStock && (
            <TouchableOpacity
              className="flex-row items-center justify-center rounded-lg border border-[#059669] bg-[#ecfdf5] px-2.5 py-2.5"
              onPress={() => openQuickSellModal(item)}
              activeOpacity={0.7}
            >
              <Sparkles size={14} color="#059669" />
            </TouchableOpacity>
          )}

          {/* Edit */}
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center gap-1 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] py-2.5"
            onPress={() => openEditModal(item)}
            activeOpacity={0.7}
          >
            <Pencil size={13} color={colors.text} />
            <Text className="text-xs font-bold text-[#0f172a]">Edit</Text>
          </TouchableOpacity>

          {/* Remove */}
          <TouchableOpacity
            className="flex-row items-center justify-center rounded-lg bg-[#fee2e2] px-2.5 py-2.5"
            onPress={() => handleArchiveToggle(item)}
            activeOpacity={0.7}
          >
            <Archive size={14} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#f8fafc]">
      <Header
        title="Product Catalog"
        subtitle={`${(products || []).length} active products`}
        onRefresh={onRefresh}
        isRefreshing={refreshing}
      />

      {/* Search & Add */}
      <View className="flex-row gap-2 border-b border-[#e2e8f0] bg-white px-4 py-2.5">
        <View className="flex-1 flex-row items-center rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-2.5">
          <Search size={16} color={colors.textMuted} />
          <TextInput
            className="flex-1 text-sm text-[#0f172a]"
            placeholder="Search products, brand or SKU…"
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
            maxLength={100}
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          className="flex-row items-center gap-1 rounded-[10px] bg-[#059669] px-3.5"
          onPress={openCreateModal}
          activeOpacity={0.85}
        >
          <Plus size={18} color="#fff" />
          <Text className="text-[13px] font-bold text-white">Add</Text>
        </TouchableOpacity>
      </View>

      {/* Category Pills */}
      <View className="border-b border-[#e2e8f0] bg-white py-3">
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
              All
            </Text>
          </TouchableOpacity>
          {(categories || [])
            .filter((c) => c && c.id != null)
            .map((c) => (
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
                  numberOfLines={1}
                >
                  {c.name || 'Category'}
                </Text>
              </TouchableOpacity>
            ))}
        </ScrollView>
      </View>

      {/* Info bar */}
      <View className="flex-row items-center justify-between px-4 py-2">
        <Text className="flex-1 text-xs font-medium text-[#64748b]">
          Showing {filtered.length} items {debouncedSearch ? `for "${debouncedSearch}"` : ''}
        </Text>
        {error ? (
          <TouchableOpacity className="flex-row items-center gap-1 py-0.5" onPress={() => loadData()}>
            <RefreshCw size={14} color={colors.primary} />
            <Text className="text-xs font-bold text-[#059669]">Retry</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? (
        <View className="mx-4 mb-2 flex-row items-center gap-2 rounded-md border border-[#fecaca] bg-[#fee2e2] p-2.5">
          <TriangleAlert size={16} color={colors.danger} />
          <Text className="flex-1 text-xs font-semibold text-[#ef4444]">{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View className="flex-1 items-center justify-center p-7">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="mt-2 text-[13px] font-semibold text-[#64748b]">Loading products…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, index) => (item?.id != null ? String(item.id) : String(index))}
          contentContainerClassName="gap-2.5 p-4 pb-28"
          renderItem={renderProductCard}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center p-7">
              <Package size={40} color={colors.textLight} />
              <Text className="mt-2 text-[15px] font-bold text-[#0f172a]">
                {debouncedSearch ? 'No Matches' : 'No Products Yet'}
              </Text>
              <Text className="mt-1 text-center text-xs leading-[18px] text-[#64748b]">
                {debouncedSearch
                  ? `No products found for "${debouncedSearch}".`
                  : 'Tap "+ Add" to create your first inventory item'}
              </Text>
            </View>
          }
        />
      )}

      {/* Floating Active Sale Checkout Banner */}
      {items.length > 0 && (
        <View className="absolute bottom-3 left-4 right-4 flex-row items-center justify-between rounded-2xl border border-[#059669] bg-[#059669] p-3.5 shadow-xl">
          <View>
            <Text className="text-[11px] font-extrabold uppercase text-[#d1fae5]">
              Active Sale Cart ({totalItems} items)
            </Text>
            <Text className="text-lg font-black text-white">₹{totalAmount.toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            className="flex-row items-center gap-1.5 rounded-xl bg-white px-4 py-2.5"
            onPress={() => onNavigateTab && onNavigateTab('pos')}
            activeOpacity={0.8}
          >
            <Text className="text-xs font-black text-[#059669]">Go to Sell / POS</Text>
            <ArrowRight size={14} color="#059669" />
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Direct Sell Modal */}
      <Modal
        visible={quickSellModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setQuickSellModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end bg-black/60"
        >
          <View className="max-h-[90%] rounded-t-3xl bg-white px-5 pt-5" style={{ paddingBottom: modalBottomPadding }}>
            <View className="mb-3 flex-row items-center justify-between">
              <View className="flex-1 pr-2">
                <Text className="text-xl font-black text-[#0f172a]" numberOfLines={1}>
                  Quick Sell Product
                </Text>
                <Text className="mt-0.5 text-xs text-[#64748b]" numberOfLines={1}>
                  {quickSellProduct?.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setQuickSellModalOpen(false)} hitSlop={10}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerClassName="pb-2"
              keyboardShouldPersistTaps="handled"
            >
              {quickSellProduct && (
                <View className="mb-3.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-bold text-[#64748b]">Unit Price</Text>
                    <Text className="text-base font-black text-[#059669]">
                      ₹{safeNumber(quickSellProduct.sellingPrice).toFixed(2)}
                    </Text>
                  </View>
                  <View className="mt-1 flex-row items-center justify-between">
                    <Text className="text-xs font-bold text-[#64748b]">Available Stock</Text>
                    <Text className="text-xs font-extrabold text-[#0f172a]">
                      {safeNumber(quickSellProduct.currentQuantity)} {quickSellProduct.unit || 'units'}
                    </Text>
                  </View>
                </View>
              )}

              <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.4px] text-[#64748b]">
                Quantity to Sell *
              </Text>
              <TextInput
                className="mb-3.5 h-12 rounded-xl border border-[#059669] bg-[#f8fafc] px-3.5 text-center text-xl font-black text-[#0f172a]"
                placeholder="1"
                placeholderTextColor={colors.textLight}
                keyboardType="numeric"
                value={quickSellQty}
                onChangeText={setQuickSellQty}
                selectTextOnFocus
              />

              <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.4px] text-[#64748b]">
                Payment Method
              </Text>
              <View className="mb-3.5 flex-row gap-2">
                <TouchableOpacity
                  className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border px-1 py-3 ${
                    quickSellPaymentMethod === 'CASH'
                      ? 'border-[#059669] bg-[#d1fae5]'
                      : 'border-[#e2e8f0] bg-[#f8fafc]'
                  }`}
                  onPress={() => setQuickSellPaymentMethod('CASH')}
                >
                  <Banknote
                    size={18}
                    color={quickSellPaymentMethod === 'CASH' ? colors.primary : colors.textMuted}
                  />
                  <Text
                    className={`text-xs font-bold ${
                      quickSellPaymentMethod === 'CASH' ? 'text-[#059669]' : 'text-[#64748b]'
                    }`}
                  >
                    Cash
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border px-1 py-3 ${
                    quickSellPaymentMethod === 'UPI'
                      ? 'border-[#059669] bg-[#d1fae5]'
                      : 'border-[#e2e8f0] bg-[#f8fafc]'
                  }`}
                  onPress={() => setQuickSellPaymentMethod('UPI')}
                >
                  <QrCode
                    size={18}
                    color={quickSellPaymentMethod === 'UPI' ? colors.primary : colors.textMuted}
                  />
                  <Text
                    className={`text-xs font-bold ${
                      quickSellPaymentMethod === 'UPI' ? 'text-[#059669]' : 'text-[#64748b]'
                    }`}
                  >
                    UPI
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border px-1 py-3 ${
                    quickSellPaymentMethod === 'CARD'
                      ? 'border-[#059669] bg-[#d1fae5]'
                      : 'border-[#e2e8f0] bg-[#f8fafc]'
                  }`}
                  onPress={() => setQuickSellPaymentMethod('CARD')}
                >
                  <CreditCard
                    size={18}
                    color={quickSellPaymentMethod === 'CARD' ? colors.primary : colors.textMuted}
                  />
                  <Text
                    className={`text-xs font-bold ${
                      quickSellPaymentMethod === 'CARD' ? 'text-[#059669]' : 'text-[#64748b]'
                    }`}
                  >
                    Card
                  </Text>
                </TouchableOpacity>
              </View>

              <View className="mb-2 flex-row items-center justify-between rounded-xl bg-[#ecfdf5] p-3.5 border border-[#a7f3d0]">
                <Text className="text-xs font-extrabold text-[#059669]">Total Amount</Text>
                <Text className="text-lg font-black text-[#059669]">
                  ₹{(safeNumber(quickSellProduct?.sellingPrice) * (parseFloat(quickSellQty) || 0)).toFixed(2)}
                </Text>
              </View>
            </ScrollView>

            <View className="flex-row gap-2.5 border-t border-[#e2e8f0] pt-3">
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center rounded-xl border border-[#e2e8f0] bg-[#f8fafc] py-3"
                onPress={() => setQuickSellModalOpen(false)}
                disabled={quickSelling}
              >
                <Text className="text-sm font-bold text-[#0f172a]">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-[2] flex-row items-center justify-center gap-1.5 rounded-xl bg-[#059669] py-3"
                onPress={handleQuickSellSubmit}
                disabled={quickSelling}
              >
                {quickSelling ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <CircleCheck size={18} color="#fff" />
                    <Text className="text-sm font-black text-white">Complete Sale</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add / Edit Modal */}
      <Modal
        visible={formModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setFormModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end bg-black/60"
        >
          <View className="max-h-[90%] rounded-t-3xl bg-white px-5 pt-5" style={{ paddingBottom: modalBottomPadding }}>
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-2xl font-extrabold text-[#0f172a]">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </Text>
              <TouchableOpacity onPress={() => setFormModalOpen(false)} hitSlop={10}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerClassName="pb-4" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text className="mb-1.5 text-[11px] font-bold uppercase text-[#64748b]">
                Product Name *
              </Text>
              <TextInput
                className="h-11 rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-3 text-base text-[#0f172a]"
                placeholder="e.g. Basmati Rice 5kg"
                placeholderTextColor={colors.textLight}
                value={name}
                onChangeText={setName}
                maxLength={150}
              />
              <View style={{ height: 12 }} />

              <View className="mb-1.5 flex-row items-center justify-between">
                <Text className="text-[11px] font-bold uppercase text-[#64748b]">Category *</Text>
                <TouchableOpacity onPress={() => setCategoryModalOpen(true)}>
                  <Text className="text-[11px] font-bold text-[#059669]">+ New Category</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                {(categories || []).length === 0 ? (
                  <Text className="py-1 text-xs italic text-[#64748b]">
                    No categories yet — create one.
                  </Text>
                ) : (
                  (categories || [])
                    .filter((cat) => cat && cat.id != null)
                    .map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        className={`mr-1.5 rounded-lg border px-3 py-1.5 ${
                          categoryId === cat.id
                            ? 'border-[#059669] bg-[#d1fae5]'
                            : 'border-[#e2e8f0] bg-[#f8fafc]'
                        }`}
                        onPress={() => setCategoryId(cat.id)}
                      >
                        <Text
                          className={`text-[11px] font-bold ${
                            categoryId === cat.id ? 'text-[#059669]' : 'text-[#64748b]'
                          }`}
                        >
                          {cat.name || 'Category'}
                        </Text>
                      </TouchableOpacity>
                    ))
                )}
              </ScrollView>

              <Text className="mb-1.5 text-[11px] font-bold uppercase text-[#64748b]">
                Unit of Measure *
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                {UNITS.map((u) => (
                  <TouchableOpacity
                    key={u}
                    className={`mr-1.5 rounded-lg border px-3 py-1.5 ${
                      unit === u ? 'border-[#059669] bg-[#d1fae5]' : 'border-[#e2e8f0] bg-[#f8fafc]'
                    }`}
                    onPress={() => setUnit(u)}
                  >
                    <Text
                      className={`text-[11px] font-bold ${
                        unit === u ? 'text-[#059669]' : 'text-[#64748b]'
                      }`}
                    >
                      {u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text className="mb-1.5 text-[11px] font-bold uppercase text-[#64748b]">
                Barcode / SKU
              </Text>
              <View className="mb-3 flex-row items-center gap-2">
                <TextInput
                  className="h-11 flex-1 rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-3 text-base text-[#0f172a]"
                  placeholder="Scan or enter barcode"
                  placeholderTextColor={colors.textLight}
                  value={sku}
                  onChangeText={(v) => setSku(sanitizeSku(v))}
                  autoCapitalize="characters"
                  maxLength={50}
                />
                <TouchableOpacity
                  className="h-11 w-11 items-center justify-center rounded-[10px] bg-[#059669]"
                  onPress={() => setScannerOpen(true)}
                >
                  <Camera size={18} color="#fff" />
                </TouchableOpacity>
              </View>

              <View className="flex-row gap-2.5">
                <View style={{ flex: 1 }}>
                  <Text className="mb-1.5 text-[11px] font-bold uppercase text-[#64748b]">Brand</Text>
                  <TextInput
                    className="h-11 rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-3 text-base text-[#0f172a]"
                    placeholder="e.g. Nestle"
                    placeholderTextColor={colors.textLight}
                    value={brand}
                    onChangeText={(v) => setBrand(v.slice(0, 100))}
                    maxLength={100}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text className="mb-1.5 text-[11px] font-bold uppercase text-[#64748b]">MRP (₹)</Text>
                  <TextInput
                    className="h-11 rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-3 text-base text-[#0f172a]"
                    placeholder="Printed MRP"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                    value={mrp}
                    onChangeText={setMrp}
                    maxLength={12}
                  />
                </View>
              </View>
              <View style={{ height: 12 }} />

              <View className="flex-row gap-2.5">
                <View style={{ flex: 1 }}>
                  <Text className="mb-1.5 text-[11px] font-bold uppercase text-[#64748b]">
                    Purchase Price (₹) *
                  </Text>
                  <TextInput
                    className="h-11 rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-3 text-base text-[#0f172a]"
                    placeholder="Cost price"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                    value={purchasePrice}
                    onChangeText={setPurchasePrice}
                    maxLength={12}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text className="mb-1.5 text-[11px] font-bold uppercase text-[#64748b]">
                    Selling Price (₹) *
                  </Text>
                  <TextInput
                    className="h-11 rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-3 text-base text-[#0f172a]"
                    placeholder="Selling price"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                    value={sellingPrice}
                    onChangeText={setSellingPrice}
                    maxLength={12}
                  />
                </View>
              </View>
              <View style={{ height: 12 }} />

              <View className="flex-row gap-2.5">
                <View style={{ flex: 1 }}>
                  <Text className="mb-1.5 text-[11px] font-bold uppercase text-[#64748b]">
                    Initial Stock
                  </Text>
                  <TextInput
                    className="h-11 rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-3 text-base text-[#0f172a]"
                    placeholder="Quantity"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                    value={currentQuantity}
                    onChangeText={setCurrentQuantity}
                    maxLength={12}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text className="mb-1.5 text-[11px] font-bold uppercase text-[#64748b]">
                    Min Alert Level
                  </Text>
                  <TextInput
                    className="h-11 rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-3 text-base text-[#0f172a]"
                    placeholder="Alert below"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                    value={minimumStockLevel}
                    onChangeText={setMinimumStockLevel}
                    maxLength={12}
                  />
                </View>
              </View>
            </ScrollView>

            <View className="flex-row gap-2.5 border-t border-[#e2e8f0] pt-3">
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center rounded-lg border border-[#e2e8f0] bg-[#f8fafc] py-3"
                onPress={() => setFormModalOpen(false)}
              >
                <Text className="text-base font-bold text-[#0f172a]">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-[2] flex-row items-center justify-center gap-1.5 rounded-lg bg-[#059669] py-3"
                style={{ opacity: saving ? 0.6 : 1 }}
                onPress={handleSaveProduct}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Check size={18} color="#fff" />
                    <Text className="text-base font-extrabold text-white">Save Product</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Category Modal */}
      <Modal
        visible={categoryModalOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setCategoryModalOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/60 p-5">
          <View className="max-h-[80%] rounded-2xl bg-white p-5">
            <Text className="text-2xl font-extrabold text-[#0f172a]">Add New Category</Text>
            <View style={{ height: 12 }} />
            <Text className="mb-1.5 text-[11px] font-bold uppercase text-[#64748b]">Category Name</Text>
            <TextInput
              className="h-11 rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-3 text-base text-[#0f172a]"
              placeholder="e.g. Dairy, Snacks, Beverages"
              placeholderTextColor={colors.textLight}
              value={newCatName}
              onChangeText={(v) => setNewCatName(v.slice(0, 80))}
              maxLength={80}
            />
            <View className="flex-row gap-2.5 border-t border-[#e2e8f0] pt-3">
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center rounded-lg border border-[#e2e8f0] bg-[#f8fafc] py-3"
                onPress={() => setCategoryModalOpen(false)}
              >
                <Text className="text-base font-bold text-[#0f172a]">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg bg-[#059669] py-3"
                onPress={handleCreateCategory}
              >
                <Text className="text-base font-extrabold text-white">Add Category</Text>
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
          onScan={(scanned) => {
            setSku(sanitizeSku(scanned));
            setScannerOpen(false);
          }}
          title="Scan Product Barcode"
          subtitle="Align barcode to auto-fill SKU"
        />
      )}

      {/* Completed Quick Sale Receipt Modal */}
      <ReceiptModal
        visible={!!completedSale}
        sale={completedSale}
        shopName={shopProfile?.shopName}
        paymentMethod={quickSellPaymentMethod}
        customerPhone={quickSellPhone}
        onClose={() => setCompletedSale(null)}
      />
    </View>
  );
};
