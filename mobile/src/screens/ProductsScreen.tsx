import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
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
import { ui } from '../theme/ui';
import { Category, Product, ProductRequest, ProductUnit } from '../types';
import {
  Plus,
  Search,
  Camera,
  Edit2,
  Archive,
  Package,
  X,
  Check,
  RefreshCw,
  AlertTriangle,
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

  const filtered = useMemo(() => products, [products]);

  const renderProductCard = ({ item }: { item: Product }) => {
    const selling = safeNumber(item.sellingPrice, 0);
    const purchase = safeNumber(item.purchasePrice, 0);
    const margin = selling - purchase;
    const qty = safeNumber(item.currentQuantity, 0);
    const minL = safeNumber(item.minimumStockLevel, 5);
    return (
      <View style={styles.productCard}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.productSku} numberOfLines={1}>
              {item.categoryName ? `${item.categoryName} • ` : ''}
              {item.brand ? `${item.brand} • ` : ''}
              SKU: {item.sku || 'N/A'}
            </Text>
          </View>
          <StockBadge status={item.stockStatus} quantity={qty} minLevel={minL} />
        </View>

        <View style={styles.priceRow}>
          <View style={styles.priceCell}>
            <Text style={styles.priceLabel}>Selling</Text>
            <Text style={styles.sellingPrice}>{fmtCurrency(selling)}</Text>
          </View>
          <View style={styles.priceCell}>
            <Text style={styles.priceLabel}>Cost</Text>
            <Text style={styles.costPrice}>{fmtCurrency(purchase)}</Text>
          </View>
          <View style={styles.priceCell}>
            <Text style={styles.priceLabel}>Unit / Margin</Text>
            <Text style={[styles.marginText, margin < 0 && { color: colors.danger }]}>
              {item.unit} {margin >= 0 ? `(+${fmtCurrency(margin)})` : `(${fmtCurrency(margin)})`}
            </Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)} activeOpacity={0.7}>
            <Edit2 size={14} color={colors.text} />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.archiveBtn} onPress={() => handleArchiveToggle(item)} activeOpacity={0.7}>
            <Archive size={14} color={colors.danger} />
            <Text style={styles.archiveBtnText}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={ui.screen}>
      <Header title="Product Catalog" subtitle={`${products.length} active products`} onRefresh={onRefresh} isRefreshing={refreshing} />

      {/* Search & Add - uses framework ui.searchBox/ui.searchInput */}
      <View style={styles.searchBarRow}>
        <View style={ui.searchBox}>
          <Search size={16} color={colors.textMuted} />
          <TextInput
            style={ui.searchInput}
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
        <TouchableOpacity style={styles.addBtn} onPress={openCreateModal} activeOpacity={0.85}>
          <Plus size={18} color="#fff" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.categoryBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          <TouchableOpacity
            style={[styles.categoryPill, selectedCategory === 'ALL' && styles.categoryPillActive]}
            onPress={() => setSelectedCategory('ALL')}
          >
            <Text style={[styles.categoryPillText, selectedCategory === 'ALL' && styles.categoryPillTextActive]}>All</Text>
          </TouchableOpacity>
          {categories.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.categoryPill, selectedCategory === c.id && styles.categoryPillActive]}
              onPress={() => setSelectedCategory(c.id)}
            >
              <Text style={[styles.categoryPillText, selectedCategory === c.id && styles.categoryPillTextActive]} numberOfLines={1}>
                {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.countText}>Showing {filtered.length} items {debouncedSearch ? `for "${debouncedSearch}"` : ''}</Text>
        {error ? (
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadData()}>
            <RefreshCw size={14} color={colors.primary} />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? (
        <View style={ui.errorBanner}>
          <AlertTriangle size={16} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={ui.emptyBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading products…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={renderProductCard}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={ui.emptyBox}>
              <Package size={40} color={colors.textLight} />
              <Text style={styles.emptyTitle}>{debouncedSearch ? 'No Matches' : 'No Products Yet'}</Text>
              <Text style={styles.emptyDesc}>
                {debouncedSearch ? `No products found for "${debouncedSearch}".` : 'Tap "+ Add" to create your first inventory item'}
              </Text>
            </View>
          }
        />
      )}

      {/* Add / Edit Modal - uses framework ui.modalOverlay/ui.modalContent/ui.modalHeader/ui.input */}
      <Modal visible={formModalOpen} animationType="slide" transparent onRequestClose={() => setFormModalOpen(false)}>
        <View style={ui.modalOverlay}>
          <View style={ui.modalContent}>
            <View style={ui.modalHeader}>
              <Text style={ui.modalTitle}>{editingProduct ? 'Edit Product' : 'Add New Product'}</Text>
              <TouchableOpacity onPress={() => setFormModalOpen(false)} hitSlop={10}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>Product Name *</Text>
              <TextInput
                style={ui.input}
                placeholder="e.g. Basmati Rice 5kg"
                placeholderTextColor={colors.textLight}
                value={name}
                onChangeText={setName}
                maxLength={150}
              />
              <View style={{ height: 12 }} />

              <View style={styles.labelWithAction}>
                <Text style={styles.inputLabel}>Category *</Text>
                <TouchableOpacity onPress={() => setCategoryModalOpen(true)}>
                  <Text style={styles.addCategoryLink}>+ New Category</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitPickerScroll}>
                {categories.length === 0 ? (
                  <Text style={styles.hintText}>No categories yet — create one.</Text>
                ) : (
                  categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.unitPill, categoryId === cat.id && styles.unitPillActive]}
                      onPress={() => setCategoryId(cat.id)}
                    >
                      <Text style={[styles.unitText, categoryId === cat.id && styles.unitTextActive]}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>

              <Text style={styles.inputLabel}>Unit of Measure *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitPickerScroll}>
                {UNITS.map((u) => (
                  <TouchableOpacity
                    key={u}
                    style={[styles.unitPill, unit === u && styles.unitPillActive]}
                    onPress={() => setUnit(u)}
                  >
                    <Text style={[styles.unitText, unit === u && styles.unitTextActive]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Barcode / SKU</Text>
              <View style={styles.skuInputRow}>
                <TextInput
                  style={[ui.input, { flex: 1 }]}
                  placeholder="Scan or enter barcode"
                  placeholderTextColor={colors.textLight}
                  value={sku}
                  onChangeText={(v) => setSku(sanitizeSku(v))}
                  autoCapitalize="characters"
                  maxLength={50}
                />
                <TouchableOpacity style={styles.scanSkuBtn} onPress={() => setScannerOpen(true)}>
                  <Camera size={18} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Brand</Text>
                  <TextInput
                    style={ui.input}
                    placeholder="e.g. Nestle"
                    placeholderTextColor={colors.textLight}
                    value={brand}
                    onChangeText={(v) => setBrand(v.slice(0, 100))}
                    maxLength={100}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>MRP (₹)</Text>
                  <TextInput
                    style={ui.input}
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

              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Purchase Price (₹) *</Text>
                  <TextInput
                    style={ui.input}
                    placeholder="Cost price"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                    value={purchasePrice}
                    onChangeText={setPurchasePrice}
                    maxLength={12}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Selling Price (₹) *</Text>
                  <TextInput
                    style={ui.input}
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

              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Initial Stock</Text>
                  <TextInput
                    style={ui.input}
                    placeholder="Quantity"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                    value={currentQuantity}
                    onChangeText={setCurrentQuantity}
                    maxLength={12}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Min Alert Level</Text>
                  <TextInput
                    style={ui.input}
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

            <View style={ui.modalActions}>
              <TouchableOpacity style={[ui.btnGhost, { flex: 1 }]} onPress={() => setFormModalOpen(false)}>
                <Text style={ui.btnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[ui.btnPrimary, { flex: 2, opacity: saving ? 0.6 : 1 }]} onPress={handleSaveProduct} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Check size={18} color="#fff" />
                    <Text style={ui.btnPrimaryText}>Save Product</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={categoryModalOpen} animationType="fade" transparent onRequestClose={() => setCategoryModalOpen(false)}>
        <View style={ui.modalOverlayCenter}>
          <View style={ui.modalContentCenter}>
            <Text style={ui.modalTitle}>Add New Category</Text>
            <View style={{ height: 12 }} />
            <Text style={styles.inputLabel}>Category Name</Text>
            <TextInput
              style={ui.input}
              placeholder="e.g. Dairy, Snacks, Beverages"
              placeholderTextColor={colors.textLight}
              value={newCatName}
              onChangeText={(v) => setNewCatName(v.slice(0, 80))}
              maxLength={80}
            />
            <View style={ui.modalActions}>
              <TouchableOpacity style={[ui.btnGhost, { flex: 1 }]} onPress={() => setCategoryModalOpen(false)}>
                <Text style={ui.btnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[ui.btnPrimary, { flex: 1 }]} onPress={handleCreateCategory}>
                <Text style={ui.btnPrimaryText}>Add Category</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    </View>
  );
};

// Only screen-specific styles remain - dead/shared CSS removed and moved to theme/ui.ts framework
const styles = StyleSheet.create({
  searchBarRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: colors.surface,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 4,
    elevation: 2,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  categoryBar: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8 },
  categoryScroll: { paddingHorizontal: 16, gap: 8, flexDirection: 'row' },
  categoryPill: {
    backgroundColor: colors.bg,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryPillActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  categoryPillText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  categoryPillTextActive: { color: colors.primary, fontWeight: '700' },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  countText: { fontSize: 12, color: colors.textMuted, fontWeight: '500', flex: 1 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2 },
  retryText: { fontSize: 12, color: colors.primary, fontWeight: '700' },
  errorText: { flex: 1, fontSize: 12, color: colors.danger, fontWeight: '600' },
  loadingText: { fontSize: 13, color: colors.textMuted, fontWeight: '600', marginTop: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 8 },
  emptyDesc: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 4, lineHeight: 18 },
  listContent: { padding: 16, gap: 10, paddingBottom: 40 },
  productCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  productName: { fontSize: 14, fontWeight: '800', color: colors.text },
  productSku: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.bg, padding: 10, borderRadius: 10, marginBottom: 10, gap: 6 },
  priceCell: { flex: 1 },
  priceLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase' },
  sellingPrice: { fontSize: 14, fontWeight: '800', color: colors.primary, marginTop: 2 },
  costPrice: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 2 },
  marginText: { fontSize: 12, fontWeight: '700', color: colors.success, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 8 },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  editBtnText: { fontSize: 12, fontWeight: '700', color: colors.text },
  archiveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerLight,
    paddingVertical: 9,
    borderRadius: 8,
    gap: 4,
  },
  archiveBtnText: { fontSize: 12, fontWeight: '700', color: colors.danger },
  formBody: { paddingBottom: 16 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 5 },
  labelWithAction: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  addCategoryLink: { fontSize: 11, fontWeight: '700', color: colors.primary },
  hintText: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic', paddingVertical: 4 },
  unitPickerScroll: { marginBottom: 12 },
  unitPill: {
    backgroundColor: colors.bg,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 6,
  },
  unitPillActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  unitText: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  unitTextActive: { color: colors.primary },
  skuInputRow: { flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'center' },
  scanSkuBtn: { width: 44, height: 44, backgroundColor: colors.primary, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  twoCol: { flexDirection: 'row', gap: 10 },
});
