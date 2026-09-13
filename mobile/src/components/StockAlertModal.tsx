import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { productsApi } from '../services/shopApi';
import { colors } from '../theme/colors';
import { Product } from '../types';
import {
  TriangleAlert,
  ArrowDownLeft,
  ArrowRight,
  Package,
  PackageX,
  X,
  Layers,
} from 'lucide-react-native';

interface StockAlertModalProps {
  visible: boolean;
  onClose: () => void;
  onRestockProduct: (product: { id?: number; name: string }) => void;
  onViewAllProducts: (stockFilter?: 'OUT_OF_STOCK' | 'LOW_STOCK') => void;
  outOfStockNames?: string[];
  lowStockNames?: string[];
  outOfStockCount?: number;
  lowStockCount?: number;
}

type StockTabFilter = 'ALL' | 'OUT_OF_STOCK' | 'LOW_STOCK';

export const StockAlertModal: React.FC<StockAlertModalProps> = ({
  visible,
  onClose,
  onRestockProduct,
  onViewAllProducts,
  outOfStockNames = [],
  lowStockNames = [],
  outOfStockCount = 0,
  lowStockCount = 0,
}) => {
  const insets = useSafeAreaInsets();
  const modalBottomPadding = Math.max(
    insets.bottom > 0 ? insets.bottom + 16 : 0,
    Platform.OS === 'android' ? 40 : 20
  );

  const [activeTab, setActiveTab] = useState<StockTabFilter>('ALL');
  const [loading, setLoading] = useState<boolean>(false);
  const [detailedProducts, setDetailedProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!visible) return;

    let isMounted = true;
    const loadAlertProducts = async () => {
      setLoading(true);
      try {
        const [outData, lowData] = await Promise.all([
          productsApi.list({ stockStatus: 'OUT_OF_STOCK', size: 100 }),
          productsApi.list({ stockStatus: 'LOW_STOCK', size: 100 }),
        ]);
        if (!isMounted) return;

        const outList = Array.isArray(outData) ? outData : [];
        const lowList = Array.isArray(lowData) ? lowData : [];

        // Combine unique products
        const map = new Map<number, Product>();
        outList.forEach((p) => map.set(p.id, { ...p, stockStatus: 'OUT_OF_STOCK' }));
        lowList.forEach((p) => {
          if (!map.has(p.id)) {
            map.set(p.id, { ...p, stockStatus: 'LOW_STOCK' });
          }
        });

        setDetailedProducts(Array.from(map.values()));
      } catch (err) {
        console.warn('Failed to load detailed alert products, using fallback:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadAlertProducts();

    return () => {
      isMounted = false;
    };
  }, [visible]);

  // Combine fetched products or build fallback items from dashboard summary names
  const allItems = useMemo(() => {
    if (detailedProducts.length > 0) {
      return detailedProducts;
    }

    // Fallback if API hasn't resolved or network is constrained
    const fallbackList: Array<Partial<Product> & { id: number; name: string; stockStatus: 'OUT_OF_STOCK' | 'LOW_STOCK' }> = [];
    outOfStockNames.forEach((name, idx) => {
      fallbackList.push({
        id: -(idx + 1),
        name,
        currentQuantity: 0,
        minimumStockLevel: 5,
        stockStatus: 'OUT_OF_STOCK',
      });
    });
    lowStockNames.forEach((name, idx) => {
      fallbackList.push({
        id: -(idx + 100),
        name,
        currentQuantity: 1,
        minimumStockLevel: 5,
        stockStatus: 'LOW_STOCK',
      });
    });
    return fallbackList as Product[];
  }, [detailedProducts, outOfStockNames, lowStockNames]);

  const filteredItems = useMemo(() => {
    if (activeTab === 'OUT_OF_STOCK') {
      return allItems.filter(
        (p) => p.stockStatus === 'OUT_OF_STOCK' || (p.currentQuantity != null && p.currentQuantity <= 0)
      );
    }
    if (activeTab === 'LOW_STOCK') {
      return allItems.filter(
        (p) => p.stockStatus === 'LOW_STOCK' || (p.currentQuantity != null && p.currentQuantity > 0)
      );
    }
    return allItems;
  }, [allItems, activeTab]);

  const totalOut = Math.max(
    outOfStockCount,
    allItems.filter((p) => p.stockStatus === 'OUT_OF_STOCK' || (p.currentQuantity != null && p.currentQuantity <= 0)).length
  );
  const totalLow = Math.max(
    lowStockCount,
    allItems.filter((p) => p.stockStatus === 'LOW_STOCK' || (p.currentQuantity != null && p.currentQuantity > 0 && p.currentQuantity <= (p.minimumStockLevel ?? 5))).length
  );
  const totalAttention = totalOut + totalLow;

  const renderProductItem = ({ item }: { item: Product }) => {
    const isOut = item.stockStatus === 'OUT_OF_STOCK' || (item.currentQuantity != null && item.currentQuantity <= 0);
    const qty = typeof item.currentQuantity === 'number' ? item.currentQuantity : 0;
    const minLevel = typeof item.minimumStockLevel === 'number' ? item.minimumStockLevel : 5;
    const price = typeof item.sellingPrice === 'number' ? item.sellingPrice : 0;

    return (
      <View
        className="mb-2.5 rounded-2xl border p-3.5 shadow-sm"
        style={{
          borderColor: isOut ? '#fecaca' : '#fde68a',
          backgroundColor: isOut ? '#fff5f5' : '#fffbeb',
        }}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-2">
            <View className="flex-row items-center gap-1.5">
              {isOut ? (
                <PackageX size={16} color={colors.danger} />
              ) : (
                <TriangleAlert size={16} color={colors.warning} />
              )}
              <Text className="flex-1 text-sm font-black text-[#0f172a]" numberOfLines={1}>
                {item.name}
              </Text>
            </View>

            <Text className="mt-1 text-[11px] text-[#64748b]" numberOfLines={1}>
              {item.categoryName ? `${item.categoryName} • ` : ''}
              {item.brand ? `${item.brand} • ` : ''}
              {item.sku ? `SKU: ${item.sku}` : `Unit: ${item.unit || 'PIECE'}`}
            </Text>
          </View>

          {/* Status Badge */}
          <View
            className="rounded-full px-2.5 py-1"
            style={{ backgroundColor: isOut ? '#fee2e2' : '#fef3c7' }}
          >
            <Text
              className="text-[10px] font-black uppercase tracking-wider"
              style={{ color: isOut ? colors.danger : colors.warning }}
            >
              {isOut ? 'Out of Stock' : 'Low Stock'}
            </Text>
          </View>
        </View>

        {/* Stock Level & Price Summary */}
        <View className="mt-2.5 flex-row items-center justify-between rounded-xl bg-white/80 p-2.5 border border-[#f1f5f9]">
          <View>
            <Text className="text-[10px] font-bold uppercase text-[#64748b]">Current Stock</Text>
            <Text
              className="text-xs font-black"
              style={{ color: isOut ? colors.danger : colors.warning }}
            >
              {isOut ? '0 units (Empty)' : `${qty} units left (Min: ${minLevel})`}
            </Text>
          </View>

          {price > 0 && (
            <View className="items-end">
              <Text className="text-[10px] font-bold uppercase text-[#64748b]">Selling Price</Text>
              <Text className="text-xs font-black text-[#0f172a]">₹{price.toFixed(2)}</Text>
            </View>
          )}
        </View>

        {/* Action Button: Restock */}
        <TouchableOpacity
          className="mt-2.5 flex-row items-center justify-center gap-1.5 rounded-xl bg-[#059669] py-2.5 shadow-sm"
          onPress={() => {
            onClose();
            onRestockProduct({ id: item.id > 0 ? item.id : undefined, name: item.name });
          }}
          activeOpacity={0.8}
        >
          <ArrowDownLeft size={15} color="#fff" />
          <Text className="text-xs font-black text-white">Stock-In / Restock This Item</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/60">
        <View
          className="max-h-[88%] rounded-t-3xl bg-[#f8fafc] px-4 pt-4 shadow-2xl"
          style={{ paddingBottom: modalBottomPadding }}
        >
          {/* Top Handle Bar */}
          <View className="mb-2 h-1 w-12 self-center rounded-full bg-[#cbd5e1]" />

          {/* Modal Header */}
          <View className="mb-3 flex-row items-center justify-between">
            <View className="flex-1 pr-2">
              <View className="flex-row items-center gap-2">
                <View className="h-8 w-8 items-center justify-center rounded-xl bg-[#fef3c7]">
                  <TriangleAlert size={18} color={colors.warning} />
                </View>
                <View>
                  <Text className="text-lg font-black text-[#0f172a]">
                    Stock Alerts & Restock
                  </Text>
                  <Text className="text-xs font-bold text-[#b45309]">
                    {totalAttention} {totalAttention === 1 ? 'product needs' : 'products need'} restock
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              hitSlop={12}
              className="h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm border border-[#e2e8f0]"
            >
              <X size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Filter Tabs */}
          <View className="mb-3 flex-row gap-2 rounded-xl bg-[#e2e8f0]/60 p-1">
            <TouchableOpacity
              className={`flex-1 items-center justify-center rounded-lg py-2 ${
                activeTab === 'ALL' ? 'bg-white shadow-sm' : ''
              }`}
              onPress={() => setActiveTab('ALL')}
            >
              <Text
                className={`text-xs font-black ${
                  activeTab === 'ALL' ? 'text-[#0f172a]' : 'text-[#64748b]'
                }`}
              >
                All ({totalAttention})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 items-center justify-center rounded-lg py-2 ${
                activeTab === 'OUT_OF_STOCK' ? 'bg-white shadow-sm' : ''
              }`}
              onPress={() => setActiveTab('OUT_OF_STOCK')}
            >
              <Text
                className={`text-xs font-black ${
                  activeTab === 'OUT_OF_STOCK' ? 'text-[#ef4444]' : 'text-[#64748b]'
                }`}
              >
                Out of Stock ({totalOut})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 items-center justify-center rounded-lg py-2 ${
                activeTab === 'LOW_STOCK' ? 'bg-white shadow-sm' : ''
              }`}
              onPress={() => setActiveTab('LOW_STOCK')}
            >
              <Text
                className={`text-xs font-black ${
                  activeTab === 'LOW_STOCK' ? 'text-[#d97706]' : 'text-[#64748b]'
                }`}
              >
                Low Stock ({totalLow})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Product Items List */}
          {loading && allItems.length === 0 ? (
            <View className="items-center justify-center py-12">
              <ActivityIndicator size="large" color={colors.primary} />
              <Text className="mt-3 text-xs font-bold text-[#64748b]">Loading out-of-stock items…</Text>
            </View>
          ) : (
            <FlatList
              data={filteredItems}
              keyExtractor={(item, index) => (item.id ? String(item.id) : String(index))}
              renderItem={renderProductItem}
              showsVerticalScrollIndicator={false}
              contentContainerClassName="pb-4 pt-1"
              initialNumToRender={8}
              maxToRenderPerBatch={10}
              windowSize={5}
              ListEmptyComponent={
                <View className="items-center justify-center py-10">
                  <Package size={36} color={colors.textLight} />
                  <Text className="mt-2 text-sm font-bold text-[#0f172a]">
                    No items in this category
                  </Text>
                  <Text className="mt-0.5 text-xs text-[#64748b]">
                    All products are properly stocked.
                  </Text>
                </View>
              }
            />
          )}

          {/* Footer Quick Nav Buttons */}
          <View className="flex-row gap-2 border-t border-[#e2e8f0] bg-[#f8fafc] pt-3">
            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-white py-3 shadow-sm"
              onPress={() => {
                onClose();
                onViewAllProducts(activeTab === 'OUT_OF_STOCK' ? 'OUT_OF_STOCK' : activeTab === 'LOW_STOCK' ? 'LOW_STOCK' : undefined);
              }}
              activeOpacity={0.8}
            >
              <Layers size={15} color={colors.primary} />
              <Text className="text-xs font-bold text-[#0f172a]">View in Catalog</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-[#059669] py-3 shadow-sm"
              onPress={() => {
                onClose();
                onRestockProduct({ name: '' });
              }}
              activeOpacity={0.8}
            >
              <Text className="text-xs font-black text-white">Open Stock Inflow</Text>
              <ArrowRight size={15} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
