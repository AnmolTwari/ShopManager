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
import { StockBadge } from '../components/StockBadge';
import { productsApi } from '../services/shopApi';
import { colors } from '../theme/colors';
import { Category, Product, ProductRequest, ProductUnit } from '../types';
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

export const ProductsScreen: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'ALL'>('ALL');

  const [formModalOpen, setFormModalOpen] = useState<boolean>(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [scannerOpen, setScannerOpen] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

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

  const loadData = useCallback(async (opts: { showSpinner?: boolean; isRefresh?: boolean } = {}) => {
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
  }, [debouncedSearch, selectedCategory]);

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
      const msg = err?.message || err?.fieldErrors ? Object.values(err.fieldErrors).join(' ') : 'Could not save product.';
      Alert.alert('Save Failed', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveToggle = async (p: Product) => {
    Alert.alert('Remove Product', `Remove "${p.name}"? If it has history it will be archived; otherwise deleted permanently.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await productsApi.delete(p.id);
            setProducts((prev) => prev.filter((x) => x.id !== p.id));
            Alert.alert('Removed', res.archived ? 'Product archived (history retained).' : 'Product deleted permanently.');
            loadData({ showSpinner: false });
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Operation failed.');
          }
        },
      },
    ]);
  };

  const filtered = useMemo(() => (Array.isArray(products) ? products : []), [products]);

  const renderProductCard = ({ item }: { item: Product }) => {
    if (!item) return null;
    const selling = safeNumber(item.sellingPrice, 0);
    const purchase = safeNumber(item.purchasePrice, 0);
    const margin = selling - purchase;
    const qty = safeNumber(item.currentQuantity, 0);
    const minL = safeNumber(item.minimumStockLevel, 5);
    return (
      <View className="rounded-[14px] border border-[#e2e8f0] bg-white p-3.5 shadow-sm">
        <View className="mb-2.5 flex-row items-start justify-between">
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
            <Text className="mt-0.5 text-xs font-bold text-[#10b981]" style={margin < 0 ? { color: colors.danger } : undefined}>
              {item.unit || 'PIECE'} {margin >= 0 ? `(+${fmtCurrency(margin)})` : `(${fmtCurrency(margin)})`}
            </Text>
          </View>
        </View>

        <View className="flex-row gap-2">
          <TouchableOpacity className="flex-1 flex-row items-center justify-center gap-1 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] py-2" onPress={() => openEditModal(item)} activeOpacity={0.7}>
            <Pencil size={14} color={colors.text} />
            <Text className="text-xs font-bold text-[#0f172a]">Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 flex-row items-center justify-center gap-1 rounded-lg bg-[#fee2e2] py-2" onPress={() => handleArchiveToggle(item)} activeOpacity={0.7}>
            <Archive size={14} color={colors.danger} />
            <Text className="text-xs font-bold text-[#ef4444]">Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#f8fafc]">
      <Header title="Product Catalog" subtitle={`${(products || []).length} active products`} onRefresh={onRefresh} isRefreshing={refreshing} />

      {/* Search & Add - uses framework ui.searchBox/ui.searchInput */}
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
        <TouchableOpacity className="flex-row items-center gap-1 rounded-[10px] bg-[#059669] px-3.5" onPress={openCreateModal} activeOpacity={0.85}>
          <Plus size={18} color="#fff" />
          <Text className="text-[13px] font-bold text-white">Add</Text>
        </TouchableOpacity>
      </View>

      <View className=" py-3 border-b border-[#e2e8f0] bg-white">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="flex-row gap-2 px-4">
          <TouchableOpacity
            className={`rounded-full border px-3 py-1.5 ${selectedCategory === 'ALL' ? 'border-[#059669] bg-[#d1fae5]' : 'border-[#e2e8f0] bg-[#f8fafc]'}`}
            onPress={() => setSelectedCategory('ALL')}
          >
            <Text className={` text-xs font-semibold ${selectedCategory === 'ALL' ? 'text-[#059669]' : 'text-[#64748b]'}`}>All</Text>
          </TouchableOpacity>
          {(categories || []).filter((c) => c && c.id != null).map((c) => (
            <TouchableOpacity
              key={c.id}
              className={`rounded-full border px-3 py-1.5 ${selectedCategory === c.id ? 'border-[#059669] bg-[#d1fae5]' : 'border-[#e2e8f0] bg-[#f8fafc]'}`}
              onPress={() => setSelectedCategory(c.id)}
            >
              <Text className={`text-xs font-semibold ${selectedCategory === c.id ? 'text-[#059669]' : 'text-[#64748b]'}`} numberOfLines={1}>
                {c.name || 'Category'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View className="flex-row items-center justify-between px-4 py-2">
        <Text className="flex-1 text-xs font-medium text-[#64748b]">Showing {filtered.length} items {debouncedSearch ? `for "${debouncedSearch}"` : ''}</Text>
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
          contentContainerClassName="gap-2.5 p-4 pb-10"
          renderItem={renderProductCard}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center p-7">
              <Package size={40} color={colors.textLight} />
              <Text className="mt-2 text-[15px] font-bold text-[#0f172a]">{debouncedSearch ? 'No Matches' : 'No Products Yet'}</Text>
              <Text className="mt-1 text-center text-xs leading-[18px] text-[#64748b]">
                {debouncedSearch ? `No products found for "${debouncedSearch}".` : 'Tap "+ Add" to create your first inventory item'}
              </Text>
            </View>
          }
        />
      )}

      {/* Add / Edit Modal - uses framework ui.modalOverlay/ui.modalContent/ui.modalHeader/ui.input */}
      <Modal visible={formModalOpen} animationType="slide" transparent onRequestClose={() => setFormModalOpen(false)}>
        <View className="flex-1 justify-end bg-black/60">
          <View className="max-h-[90%] rounded-t-3xl bg-white p-5">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-2xl font-extrabold text-[#0f172a]">{editingProduct ? 'Edit Product' : 'Add New Product'}</Text>
              <TouchableOpacity onPress={() => setFormModalOpen(false)} hitSlop={10}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerClassName="pb-4" keyboardShouldPersistTaps="handled">
              <Text className="mb-1.5 text-[11px] font-bold uppercase text-[#64748b]">Product Name *</Text>
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
                  <Text className="py-1 text-xs italic text-[#64748b]">No categories yet — create one.</Text>
                ) : (
                  (categories || []).filter((cat) => cat && cat.id != null).map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      className={`mr-1.5 rounded-lg border px-3 py-1.5 ${categoryId === cat.id ? 'border-[#059669] bg-[#d1fae5]' : 'border-[#e2e8f0] bg-[#f8fafc]'}`}
                      onPress={() => setCategoryId(cat.id)}
                    >
                      <Text className={`text-[11px] font-bold ${categoryId === cat.id ? 'text-[#059669]' : 'text-[#64748b]'}`}>{cat.name || 'Category'}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>

              <Text className="mb-1.5 text-[11px] font-bold uppercase text-[#64748b]">Unit of Measure *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                {UNITS.map((u) => (
                  <TouchableOpacity
                    key={u}
                    className={`mr-1.5 rounded-lg border px-3 py-1.5 ${unit === u ? 'border-[#059669] bg-[#d1fae5]' : 'border-[#e2e8f0] bg-[#f8fafc]'}`}
                    onPress={() => setUnit(u)}
                  >
                    <Text className={`text-[11px] font-bold ${unit === u ? 'text-[#059669]' : 'text-[#64748b]'}`}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text className="mb-1.5 text-[11px] font-bold uppercase text-[#64748b]">Barcode / SKU</Text>
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
                <TouchableOpacity className="h-11 w-11 items-center justify-center rounded-[10px] bg-[#059669]" onPress={() => setScannerOpen(true)}>
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
                  <Text className="mb-1.5 text-[11px] font-bold uppercase text-[#64748b]">Purchase Price (₹) *</Text>
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
                  <Text className="mb-1.5 text-[11px] font-bold uppercase text-[#64748b]">Selling Price (₹) *</Text>
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
                  <Text className="mb-1.5 text-[11px] font-bold uppercase text-[#64748b]">Initial Stock</Text>
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
                  <Text className="mb-1.5 text-[11px] font-bold uppercase text-[#64748b]">Min Alert Level</Text>
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
              <TouchableOpacity className="flex-1 flex-row items-center justify-center rounded-lg border border-[#e2e8f0] bg-[#f8fafc] py-3" onPress={() => setFormModalOpen(false)}>
                <Text className="text-base font-bold text-[#0f172a]">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-[2] flex-row items-center justify-center gap-1.5 rounded-lg bg-[#059669] py-3" style={{ opacity: saving ? 0.6 : 1 }} onPress={handleSaveProduct} disabled={saving}>
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
        </View>
      </Modal>

      <Modal visible={categoryModalOpen} animationType="fade" transparent onRequestClose={() => setCategoryModalOpen(false)}>
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
              <TouchableOpacity className="flex-1 flex-row items-center justify-center rounded-lg border border-[#e2e8f0] bg-[#f8fafc] py-3" onPress={() => setCategoryModalOpen(false)}>
                <Text className="text-base font-bold text-[#0f172a]">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg bg-[#059669] py-3" onPress={handleCreateCategory}>
                <Text className="text-base font-extrabold text-white">Add Category</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    </View>
  );
};

