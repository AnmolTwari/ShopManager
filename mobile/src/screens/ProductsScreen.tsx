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
import { StockBadge } from '../components/StockBadge';
import { productsApi } from '../services/shopApi';
import { colors } from '../theme/colors';
import { Category, Product, ProductRequest, ProductUnit } from '../types';
import {
  Plus,
  Search,
  Camera,
  Edit2,
  Archive,
  RotateCcw,
  Package,
  X,
  Check,
  FolderPlus,
} from 'lucide-react-native';

const UNITS: ProductUnit[] = ['PIECE', 'PACKET', 'BOX', 'BOTTLE', 'KG', 'GRAM', 'LITRE', 'ML'];

export const ProductsScreen: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'ALL'>('ALL');
  const [showArchived, setShowArchived] = useState<boolean>(false);

  // Form Modal State
  const [formModalOpen, setFormModalOpen] = useState<boolean>(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [scannerOpen, setScannerOpen] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Form Fields
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
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [prodData, catData] = await Promise.all([productsApi.list(), productsApi.listCategories()]);
      setProducts(prodData);
      setCategories(catData);
    } catch (e) {
      console.warn('Error loading products:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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
    setName(p.name);
    setCategoryId(p.categoryId || (categories.length > 0 ? categories[0].id : null));
    setBrand(p.brand || '');
    setSku(p.sku || '');
    setUnit(p.unit || 'PIECE');
    setPurchasePrice(p.purchasePrice?.toString() || '');
    setSellingPrice(p.sellingPrice?.toString() || '');
    setMrp(p.mrp?.toString() || '');
    setCurrentQuantity((p.currentQuantity !== undefined ? p.currentQuantity : 0).toString());
    setMinimumStockLevel((p.minimumStockLevel !== undefined ? p.minimumStockLevel : 5).toString());
    setFormModalOpen(true);
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const created = await productsApi.createCategory({ name: newCatName.trim() });
      setCategories([...categories, created]);
      setCategoryId(created.id);
      setNewCatName('');
      setCategoryModalOpen(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not create category.');
    }
  };

  const handleSaveProduct = async () => {
    if (!name.trim() || !purchasePrice.trim() || !sellingPrice.trim()) {
      Alert.alert('Missing Info', 'Please enter product name, purchase price, and selling price.');
      return;
    }

    let targetCatId = categoryId;
    if (!targetCatId) {
      if (categories.length > 0) {
        targetCatId = categories[0].id;
      } else {
        // Auto-create default category if none exists
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
        name: name.trim(),
        categoryId: targetCatId,
        brand: brand.trim() || null,
        sku: sku.trim() || null,
        unit: unit,
        purchasePrice: parseFloat(purchasePrice) || 0,
        sellingPrice: parseFloat(sellingPrice) || 0,
        mrp: mrp.trim() ? parseFloat(mrp) : null,
        currentQuantity: parseFloat(currentQuantity) || 0,
        minimumStockLevel: parseFloat(minimumStockLevel) || 5,
      };

      if (editingProduct) {
        await productsApi.update(editingProduct.id, payload);
      } else {
        await productsApi.create(payload);
      }

      setFormModalOpen(false);
      loadData();
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Could not save product.');
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveToggle = async (p: Product) => {
    try {
      if (p.active) {
        Alert.alert('Archive Product', `Are you sure you want to archive "${p.name}"?`, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Archive',
            style: 'destructive',
            onPress: async () => {
              await productsApi.delete(p.id);
              loadData();
            },
          },
        ]);
      } else {
        await productsApi.restore(p.id);
        loadData();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Operation failed.');
    }
  };

  const filtered = products.filter((p) => {
    if (!showArchived && !p.active) return false;
    if (showArchived && p.active) return false;
    if (selectedCategory !== 'ALL' && p.categoryId !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <View style={styles.container}>
      <Header title="Product Catalog" subtitle={`${products.filter((p) => p.active).length} active products`} />

      {/* Top Search & Actions */}
      <View style={styles.searchBarRow}>
        <View style={styles.searchBox}>
          <Search size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products or SKU..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={openCreateModal}>
          <Plus size={18} color="#fff" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Category Pills Slider */}
      <View style={styles.categoryBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          <TouchableOpacity
            style={[styles.categoryPill, selectedCategory === 'ALL' && styles.categoryPillActive]}
            onPress={() => setSelectedCategory('ALL')}
          >
            <Text style={[styles.categoryPillText, selectedCategory === 'ALL' && styles.categoryPillTextActive]}>
              All Categories
            </Text>
          </TouchableOpacity>

          {categories.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.categoryPill, selectedCategory === c.id && styles.categoryPillActive]}
              onPress={() => setSelectedCategory(c.id)}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  selectedCategory === c.id && styles.categoryPillTextActive,
                ]}
              >
                {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Toggle Active / Archived */}
      <View style={styles.toggleRow}>
        <Text style={styles.countText}>Showing {filtered.length} items</Text>
        <TouchableOpacity
          style={styles.archiveToggle}
          onPress={() => setShowArchived((a) => !a)}
        >
          <Text style={[styles.archiveToggleText, showArchived && styles.archiveToggleTextActive]}>
            {showArchived ? 'Viewing Archived Products' : 'View Archived'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Product List */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filtered.length > 0 ? (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.productCard}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{item.name}</Text>
                  <Text style={styles.productSku}>
                    {item.categoryName ? `${item.categoryName} • ` : ''}
                    {item.brand ? `${item.brand} • ` : ''}
                    SKU: {item.sku || 'N/A'}
                  </Text>
                </View>
                <StockBadge
                  status={item.stockStatus}
                  quantity={item.currentQuantity}
                  minLevel={item.minimumStockLevel}
                />
              </View>

              <View style={styles.priceRow}>
                <View>
                  <Text style={styles.priceLabel}>Selling Price</Text>
                  <Text style={styles.sellingPrice}>₹{item.sellingPrice.toFixed(2)}</Text>
                </View>

                <View>
                  <Text style={styles.priceLabel}>Purchase Price</Text>
                  <Text style={styles.costPrice}>₹{item.purchasePrice.toFixed(2)}</Text>
                </View>

                <View>
                  <Text style={styles.priceLabel}>Unit / Margin</Text>
                  <Text style={styles.marginText}>
                    {item.unit} (+₹{(item.sellingPrice - item.purchasePrice).toFixed(2)})
                  </Text>
                </View>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => openEditModal(item)}
                >
                  <Edit2 size={14} color={colors.text} />
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.archiveBtn, !item.active && styles.restoreBtn]}
                  onPress={() => handleArchiveToggle(item)}
                >
                  {item.active ? (
                    <>
                      <Archive size={14} color={colors.danger} />
                      <Text style={styles.archiveBtnText}>Archive</Text>
                    </>
                  ) : (
                    <>
                      <RotateCcw size={14} color={colors.primary} />
                      <Text style={styles.restoreBtnText}>Restore</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      ) : (
        <View style={styles.emptyBox}>
          <Package size={40} color={colors.textLight} />
          <Text style={styles.emptyTitle}>No Products Found</Text>
          <Text style={styles.emptyDesc}>Tap "+ Add" to create your first inventory item</Text>
        </View>
      )}

      {/* Add / Edit Product Modal */}
      <Modal visible={formModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </Text>
              <TouchableOpacity onPress={() => setFormModalOpen(false)}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formBody}>
              <Text style={styles.inputLabel}>Product Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Basmati Rice 5kg"
                placeholderTextColor={colors.textLight}
                value={name}
                onChangeText={setName}
              />

              {/* Category Selector */}
              <View style={styles.labelWithAction}>
                <Text style={styles.inputLabel}>Category *</Text>
                <TouchableOpacity onPress={() => setCategoryModalOpen(true)}>
                  <Text style={styles.addCategoryLink}>+ New Category</Text>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitPickerScroll}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.unitPill, categoryId === cat.id && styles.unitPillActive]}
                    onPress={() => setCategoryId(cat.id)}
                  >
                    <Text style={[styles.unitText, categoryId === cat.id && styles.unitTextActive]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Unit Enum Selector */}
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

              {/* Barcode / SKU with Camera Scan Button */}
              <Text style={styles.inputLabel}>Barcode / SKU</Text>
              <View style={styles.skuInputRow}>
                <TextInput
                  style={[styles.formInput, { flex: 1, marginBottom: 0 }]}
                  placeholder="Scan or enter barcode"
                  placeholderTextColor={colors.textLight}
                  value={sku}
                  onChangeText={setSku}
                />
                <TouchableOpacity
                  style={styles.scanSkuBtn}
                  onPress={() => setScannerOpen(true)}
                >
                  <Camera size={18} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Brand & MRP */}
              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Brand</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Nestle"
                    placeholderTextColor={colors.textLight}
                    value={brand}
                    onChangeText={setBrand}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>MRP (₹)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Printed MRP"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                    value={mrp}
                    onChangeText={setMrp}
                  />
                </View>
              </View>

              {/* Pricing */}
              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Purchase Price (₹) *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Cost price"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                    value={purchasePrice}
                    onChangeText={setPurchasePrice}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Selling Price (₹) *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Selling price"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                    value={sellingPrice}
                    onChangeText={setSellingPrice}
                  />
                </View>
              </View>

              {/* Quantity & Min Stock */}
              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Initial Stock</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Quantity"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                    value={currentQuantity}
                    onChangeText={setCurrentQuantity}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Min Alert Level</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Alert below"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                    value={minimumStockLevel}
                    onChangeText={setMinimumStockLevel}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setFormModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSaveProduct}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Check size={18} color="#fff" />
                    <Text style={styles.saveBtnText}>Save Product</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* New Category Modal */}
      <Modal visible={categoryModalOpen} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 240 }]}>
            <Text style={styles.modalTitle}>Add New Category</Text>
            <Text style={styles.inputLabel}>Category Name</Text>
            <TextInput
              style={styles.formInput}
              placeholder="e.g. Dairy, Snacks, Beverages"
              placeholderTextColor={colors.textLight}
              value={newCatName}
              onChangeText={setNewCatName}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setCategoryModalOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreateCategory}>
                <Text style={styles.saveBtnText}>Add Category</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Barcode Scanner for SKU */}
      <BarcodeScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(scanned) => {
          setSku(scanned);
          setScannerOpen(false);
        }}
        title="Scan Product Barcode"
        subtitle="Align product barcode to auto-fill SKU"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  searchBarRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: colors.surface,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 13,
    color: colors.text,
    marginLeft: 6,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 4,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  categoryBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryPill: {
    backgroundColor: colors.bg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryPillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  categoryPillTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  countText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  archiveToggle: {
    paddingVertical: 2,
  },
  archiveToggleText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  archiveToggleTextActive: {
    color: colors.danger,
  },
  listContent: {
    padding: 16,
    gap: 10,
    paddingBottom: 40,
  },
  productCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  productName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  productSku: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.bg,
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  priceLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  sellingPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 2,
  },
  costPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  marginText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.success,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  archiveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerLight,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  archiveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.danger,
  },
  restoreBtn: {
    backgroundColor: colors.primaryLight,
  },
  restoreBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
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
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
  },
  emptyDesc: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
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
  formBody: {
    paddingBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  labelWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  addCategoryLink: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  unitPickerScroll: {
    marginBottom: 12,
  },
  unitPill: {
    backgroundColor: colors.bg,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 6,
  },
  unitPillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  unitText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  unitTextActive: {
    color: colors.primary,
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
  skuInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  scanSkuBtn: {
    width: 44,
    height: 44,
    backgroundColor: colors.primary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  twoCol: {
    flexDirection: 'row',
    gap: 10,
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
