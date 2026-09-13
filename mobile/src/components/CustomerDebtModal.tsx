import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { debtStorage } from '../services/debtStorage';
import { colors } from '../theme/colors';
import { CustomerDebtAccount, DebtLedgerEntry } from '../types';
import { formatDateTime } from '../utils/dateUtils';
import {
  X,
  Search,
  Plus,
  CircleCheck,
  Phone,
  Banknote,
  QrCode,
  Clock,
  Trash2,
  Receipt,
  User,
  ArrowDownLeft,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';

interface CustomerDebtModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectCustomerForCredit?: (customer: CustomerDebtAccount) => void;
}

export const CustomerDebtModal: React.FC<CustomerDebtModalProps> = ({
  visible,
  onClose,
  onSelectCustomerForCredit,
}) => {
  const insets = useSafeAreaInsets();
  const modalBottomPadding = Math.max(
    insets.bottom > 0 ? insets.bottom + 16 : 0,
    Platform.OS === 'android' ? 40 : 20
  );

  const [debts, setDebts] = useState<CustomerDebtAccount[]>(() => debtStorage.getCachedCustomerDebts() ?? []);
  const [loading, setLoading] = useState<boolean>(!debtStorage.getCachedCustomerDebts());
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Settle Payment Modal State
  const [settleModalOpen, setSettleModalOpen] = useState<boolean>(false);
  const [settleCustomer, setSettleCustomer] = useState<CustomerDebtAccount | null>(null);
  const [settleAmount, setSettleAmount] = useState<string>('');
  const [settleMethod, setSettleMethod] = useState<'CASH' | 'UPI'>('CASH');
  const [settleNote, setSettleNote] = useState<string>('');
  const [settling, setSettling] = useState<boolean>(false);

  // Add Debt Modal State
  const [addDebtModalOpen, setAddDebtModalOpen] = useState<boolean>(false);
  const [debtTargetCustomer, setDebtTargetCustomer] = useState<CustomerDebtAccount | null>(null);
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustPhone, setNewCustPhone] = useState<string>('');
  const [newDebtAmount, setNewDebtAmount] = useState<string>('');
  const [newDebtNote, setNewDebtNote] = useState<string>('');
  const [addingDebt, setAddingDebt] = useState<boolean>(false);

  // History Expand State
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);

  const loadDebts = useCallback(async () => {
    try {
      const data = await debtStorage.getCustomerDebts();
      setDebts([...data]);
    } catch (e) {
      console.warn('Error loading customer debts:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadDebts();
    }
  }, [visible, loadDebts]);

  const filteredDebts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return debts;
    return debts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q))
    );
  }, [debts, searchQuery]);

  const totalOutstanding = useMemo(() => {
    return debts.reduce((sum, c) => sum + (c.totalDebt || 0), 0);
  }, [debts]);

  const activeDebtorsCount = useMemo(() => {
    return debts.filter((c) => (c.totalDebt || 0) > 0).length;
  }, [debts]);

  // Open Settle Payment Modal
  const handleOpenSettle = (customer: CustomerDebtAccount) => {
    setSettleCustomer(customer);
    setSettleAmount(String(customer.totalDebt));
    setSettleMethod('CASH');
    setSettleNote('');
    setSettleModalOpen(true);
  };

  // Submit Payment Settlement
  const handleSubmitSettle = async () => {
    if (!settleCustomer) return;
    const amount = parseFloat(settleAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount.');
      return;
    }
    if (amount > settleCustomer.totalDebt) {
      Alert.alert(
        'Excess Amount',
        `The amount ₹${amount.toFixed(2)} is greater than the outstanding debt ₹${settleCustomer.totalDebt.toFixed(2)}. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Yes, Settle',
            onPress: () => processSettle(amount),
          },
        ]
      );
      return;
    }
    await processSettle(amount);
  };

  const processSettle = async (amount: number) => {
    if (!settleCustomer) return;
    setSettling(true);
    try {
      await debtStorage.recordDebtPayment(
        settleCustomer.id,
        amount,
        settleMethod,
        settleNote.trim() || 'Payment received'
      );
      setSettleModalOpen(false);
      await loadDebts();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to record payment');
    } finally {
      setSettling(false);
    }
  };

  // Open Add Debt Modal
  const handleOpenAddDebt = (customer?: CustomerDebtAccount) => {
    if (customer) {
      setDebtTargetCustomer(customer);
      setNewCustName(customer.name);
      setNewCustPhone(customer.phone || '');
    } else {
      setDebtTargetCustomer(null);
      setNewCustName('');
      setNewCustPhone('');
    }
    setNewDebtAmount('');
    setNewDebtNote('');
    setAddDebtModalOpen(true);
  };

  // Submit Add Debt
  const handleSubmitAddDebt = async () => {
    const cleanName = newCustName.trim();
    if (!cleanName) {
      Alert.alert('Customer Name Required', 'Please enter the customer name.');
      return;
    }
    const amount = parseFloat(newDebtAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid debt amount.');
      return;
    }

    setAddingDebt(true);
    try {
      await debtStorage.addManualDebt(
        {
          id: debtTargetCustomer?.id,
          name: cleanName,
          phone: newCustPhone.trim() || undefined,
        },
        amount,
        newDebtNote.trim() || 'Credit / Udhaar added'
      );
      setAddDebtModalOpen(false);
      await loadDebts();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add debt');
    } finally {
      setAddingDebt(false);
    }
  };

  // Delete Customer Account
  const handleDeleteCustomer = (customer: CustomerDebtAccount) => {
    Alert.alert(
      'Remove Customer Record',
      `Are you sure you want to remove ${customer.name}'s debt profile?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await debtStorage.deleteCustomerDebt(customer.id);
            await loadDebts();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <View
          className="max-h-[92%] min-h-[75%] rounded-t-[32px] bg-[#f8fafc]"
          style={{ paddingBottom: modalBottomPadding }}
        >
          {/* Header Bar */}
          <View className="flex-row items-center justify-between border-b border-[#e2e8f0] bg-white px-5 py-4">
            <View>
              <Text className="text-lg font-black text-[#0f172a]">Customer Debt Book</Text>
              <Text className="text-xs font-semibold text-[#64748b]">
                {activeDebtorsCount} customers with pending balance
              </Text>
            </View>
            <TouchableOpacity
              className="h-8 w-8 items-center justify-center rounded-full bg-[#f1f5f9]"
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X size={18} color="#0f172a" />
            </TouchableOpacity>
          </View>

          {/* Outstanding Total Banner */}
          <View className="mx-4 mt-3.5 overflow-hidden rounded-2xl bg-[#0f172a] p-4 shadow-sm">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
                  Total Outstanding Debt
                </Text>
                <Text className="mt-1 text-2xl font-black text-[#f87171]" numberOfLines={1}>
                  ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>

              <TouchableOpacity
                className="flex-row items-center gap-1.5 rounded-xl bg-[#059669] px-3 py-2.5"
                onPress={() => handleOpenAddDebt()}
                activeOpacity={0.8}
              >
                <Plus size={15} color="#fff" />
                <Text className="text-xs font-extrabold text-white">Add Debt</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar */}
          <View className="mx-4 mt-3 flex-row items-center rounded-xl border border-[#e2e8f0] bg-white px-3 py-2 shadow-xs">
            <Search size={16} color={colors.textMuted} />
            <TextInput
              className="ml-2 flex-1 text-xs font-medium text-[#0f172a]"
              placeholder="Search customer name or phone..."
              placeholderTextColor={colors.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={14} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Customer Debt List */}
          {loading ? (
            <View className="flex-1 items-center justify-center py-12">
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : filteredDebts.length === 0 ? (
            <View className="flex-1 items-center justify-center p-6 py-12">
              <CircleCheck size={40} color="#10b981" />
              <Text className="mt-3 text-base font-extrabold text-[#0f172a]">Zero Pending Debts</Text>
              <Text className="mt-1 text-center text-xs font-medium text-[#64748b]">
                {searchQuery ? 'No customer matched your search.' : 'All customer accounts are clear and settled.'}
              </Text>
              <TouchableOpacity
                className="mt-4 flex-row items-center gap-1.5 rounded-xl bg-[#059669] px-4 py-2.5"
                onPress={() => handleOpenAddDebt()}
              >
                <Plus size={15} color="#fff" />
                <Text className="text-xs font-extrabold text-white">Add Customer Debt</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredDebts}
              keyExtractor={(item) => item.id}
              contentContainerClassName="p-4 pt-3 pb-8"
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isExpanded = expandedCustomerId === item.id;
                const hasDebt = item.totalDebt > 0;

                return (
                  <View className="mb-3 overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white p-3.5 shadow-xs">
                    {/* Customer Header */}
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 pr-2">
                        <View className="flex-row items-center gap-1.5">
                          <User size={15} color={colors.primary} />
                          <Text className="text-sm font-black text-[#0f172a]" numberOfLines={1}>
                            {item.name}
                          </Text>
                        </View>
                        {item.phone && (
                          <View className="mt-1 flex-row items-center gap-1">
                            <Phone size={11} color={colors.textMuted} />
                            <Text className="text-[11px] font-semibold text-[#64748b]">{item.phone}</Text>
                          </View>
                        )}
                        <Text className="mt-0.5 text-[10px] text-[#94a3b8]">
                          Updated {formatDateTime(item.lastUpdated)}
                        </Text>
                      </View>

                      <View className="items-end">
                        <Text
                          className={`text-base font-black ${
                            hasDebt ? 'text-[#ef4444]' : 'text-[#10b981]'
                          }`}
                        >
                          {hasDebt
                            ? `₹${item.totalDebt.toFixed(2)}`
                            : 'Settled ✓'}
                        </Text>
                        <Text className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
                          {hasDebt ? 'Pending Due' : 'Zero Balance'}
                        </Text>
                      </View>
                    </View>

                    {/* Action Buttons */}
                    <View className="mt-3 flex-row items-center gap-2 border-t border-[#f1f5f9] pt-2.5">
                      {hasDebt && (
                        <TouchableOpacity
                          className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-[#059669] py-2 shadow-xs"
                          onPress={() => handleOpenSettle(item)}
                          activeOpacity={0.8}
                        >
                          <Banknote size={14} color="#fff" />
                          <Text className="text-xs font-black text-white">Settle / Pay</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] py-2"
                        onPress={() => handleOpenAddDebt(item)}
                        activeOpacity={0.7}
                      >
                        <Plus size={14} color={colors.primary} />
                        <Text className="text-xs font-bold text-[#0f172a]">Add Amount</Text>
                      </TouchableOpacity>

                      {/* Expand History Button */}
                      <TouchableOpacity
                        className="h-8 w-8 items-center justify-center rounded-xl border border-[#e2e8f0] bg-[#f8fafc]"
                        onPress={() => setExpandedCustomerId(isExpanded ? null : item.id)}
                        activeOpacity={0.7}
                      >
                        {isExpanded ? (
                          <ChevronUp size={15} color={colors.textMuted} />
                        ) : (
                          <ChevronDown size={15} color={colors.textMuted} />
                        )}
                      </TouchableOpacity>

                      {!hasDebt && (
                        <TouchableOpacity
                          className="h-8 w-8 items-center justify-center rounded-xl border border-[#fecaca] bg-[#fef2f2]"
                          onPress={() => handleDeleteCustomer(item)}
                          activeOpacity={0.7}
                        >
                          <Trash2 size={14} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Collapsible Ledger History */}
                    {isExpanded && (
                      <View className="mt-3 border-t border-dashed border-[#e2e8f0] pt-2.5">
                        <Text className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
                          Transaction History
                        </Text>
                        {item.entries && item.entries.length > 0 ? (
                          item.entries.slice(0, 10).map((entry) => (
                            <View
                              key={entry.id}
                              className="mb-1.5 flex-row items-start justify-between rounded-lg bg-[#f8fafc] p-2"
                            >
                              <View className="flex-1 pr-2">
                                <View className="flex-row items-center gap-1">
                                  {entry.type === 'PAYMENT_RECEIVED' ? (
                                    <ArrowDownLeft size={12} color="#10b981" />
                                  ) : (
                                    <Receipt size={12} color="#ef4444" />
                                  )}
                                  <Text className="text-xs font-bold text-[#0f172a]">
                                    {entry.type === 'PAYMENT_RECEIVED'
                                      ? `Payment (${entry.paymentMethod || 'CASH'})`
                                      : entry.saleId
                                      ? `Sale #${entry.saleId}`
                                      : 'Credit Added'}
                                  </Text>
                                </View>
                                {entry.itemsSummary && entry.itemsSummary.length > 0 && (
                                  <Text className="mt-0.5 text-[10px] text-[#64748b]" numberOfLines={1}>
                                    {entry.itemsSummary.join(', ')}
                                  </Text>
                                )}
                                {entry.note && (
                                  <Text className="text-[10px] italic text-[#94a3b8]">{entry.note}</Text>
                                )}
                                <Text className="text-[9px] text-[#94a3b8]">
                                  {formatDateTime(entry.date)}
                                </Text>
                              </View>

                              <Text
                                className={`text-xs font-black ${
                                  entry.type === 'PAYMENT_RECEIVED'
                                    ? 'text-[#10b981]'
                                    : 'text-[#ef4444]'
                                }`}
                              >
                                {entry.type === 'PAYMENT_RECEIVED' ? '-' : '+'}₹
                                {entry.amount.toFixed(2)}
                              </Text>
                            </View>
                          ))
                        ) : (
                          <Text className="text-xs italic text-[#94a3b8]">No ledger transactions recorded.</Text>
                        )}
                      </View>
                    )}
                  </View>
                );
              }}
            />
          )}

          {/* Settle / Collect Payment Sub-Modal */}
          <Modal visible={settleModalOpen} transparent animationType="fade">
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              className="flex-1 items-center justify-center bg-black/60 p-4"
            >
              <View className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
                <View className="flex-row items-center justify-between border-b border-[#f1f5f9] pb-3">
                  <View>
                    <Text className="text-base font-black text-[#0f172a]">Record Payment</Text>
                    <Text className="text-xs font-semibold text-[#64748b]">
                      Customer: {settleCustomer?.name}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSettleModalOpen(false)}>
                    <X size={18} color="#0f172a" />
                  </TouchableOpacity>
                </View>

                <View className="mt-3.5">
                  <Text className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
                    Current Pending Due: ₹{settleCustomer?.totalDebt.toFixed(2)}
                  </Text>

                  <Text className="mb-1 mt-3 text-xs font-extrabold text-[#0f172a]">Amount Received (₹) *</Text>
                  <TextInput
                    className="h-12 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3.5 text-base font-bold text-[#0f172a]"
                    placeholder="0.00"
                    placeholderTextColor={colors.textLight}
                    keyboardType="decimal-pad"
                    value={settleAmount}
                    onChangeText={setSettleAmount}
                  />

                  {/* Payment Method */}
                  <Text className="mb-1 mt-3 text-xs font-extrabold text-[#0f172a]">Payment Mode</Text>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border py-2.5 ${
                        settleMethod === 'CASH'
                          ? 'border-[#059669] bg-[#d1fae5]'
                          : 'border-[#e2e8f0] bg-[#f8fafc]'
                      }`}
                      onPress={() => setSettleMethod('CASH')}
                    >
                      <Banknote size={16} color={settleMethod === 'CASH' ? colors.primary : colors.textMuted} />
                      <Text
                        className={`text-xs font-bold ${
                          settleMethod === 'CASH' ? 'text-[#059669]' : 'text-[#64748b]'
                        }`}
                      >
                        Cash
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border py-2.5 ${
                        settleMethod === 'UPI'
                          ? 'border-[#059669] bg-[#d1fae5]'
                          : 'border-[#e2e8f0] bg-[#f8fafc]'
                      }`}
                      onPress={() => setSettleMethod('UPI')}
                    >
                      <QrCode size={16} color={settleMethod === 'UPI' ? colors.primary : colors.textMuted} />
                      <Text
                        className={`text-xs font-bold ${
                          settleMethod === 'UPI' ? 'text-[#059669]' : 'text-[#64748b]'
                        }`}
                      >
                        UPI / Online
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text className="mb-1 mt-3 text-xs font-extrabold text-[#0f172a]">Notes (Optional)</Text>
                  <TextInput
                    className="h-10 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 text-xs font-medium text-[#0f172a]"
                    placeholder="e.g. Paid in cash at shop counter"
                    placeholderTextColor={colors.textLight}
                    value={settleNote}
                    onChangeText={setSettleNote}
                  />

                  <View className="mt-4 flex-row gap-2">
                    <TouchableOpacity
                      className="flex-1 items-center justify-center rounded-xl border border-[#e2e8f0] bg-[#f8fafc] py-3"
                      onPress={() => setSettleModalOpen(false)}
                    >
                      <Text className="text-xs font-bold text-[#64748b]">Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-[#059669] py-3 shadow-xs"
                      onPress={handleSubmitSettle}
                      disabled={settling}
                    >
                      {settling ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text className="text-xs font-black text-white">Save Payment</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>

          {/* Add / Adjust Debt Sub-Modal */}
          <Modal visible={addDebtModalOpen} transparent animationType="fade">
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              className="flex-1 items-center justify-center bg-black/60 p-4"
            >
              <View className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
                <View className="flex-row items-center justify-between border-b border-[#f1f5f9] pb-3">
                  <Text className="text-base font-black text-[#0f172a]">
                    {debtTargetCustomer ? `Add Debt: ${debtTargetCustomer.name}` : 'New Customer Debt'}
                  </Text>
                  <TouchableOpacity onPress={() => setAddDebtModalOpen(false)}>
                    <X size={18} color="#0f172a" />
                  </TouchableOpacity>
                </View>

                <View className="mt-3.5">
                  {!debtTargetCustomer && (
                    <>
                      <Text className="mb-1 text-xs font-extrabold text-[#0f172a]">Customer Name *</Text>
                      <TextInput
                        className="mb-2.5 h-11 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3.5 text-xs font-medium text-[#0f172a]"
                        placeholder="e.g. Ramesh Kumar"
                        placeholderTextColor={colors.textLight}
                        value={newCustName}
                        onChangeText={setNewCustName}
                      />

                      <Text className="mb-1 text-xs font-extrabold text-[#0f172a]">Phone Number (Optional)</Text>
                      <TextInput
                        className="mb-2.5 h-11 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3.5 text-xs font-medium text-[#0f172a]"
                        placeholder="e.g. 9876543210"
                        placeholderTextColor={colors.textLight}
                        keyboardType="phone-pad"
                        value={newCustPhone}
                        onChangeText={setNewCustPhone}
                      />
                    </>
                  )}

                  <Text className="mb-1 text-xs font-extrabold text-[#0f172a]">Debt Amount (₹) *</Text>
                  <TextInput
                    className="h-12 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3.5 text-base font-bold text-[#ef4444]"
                    placeholder="0.00"
                    placeholderTextColor={colors.textLight}
                    keyboardType="decimal-pad"
                    value={newDebtAmount}
                    onChangeText={setNewDebtAmount}
                  />

                  <Text className="mb-1 mt-2.5 text-xs font-extrabold text-[#0f172a]">Notes / Reason (Optional)</Text>
                  <TextInput
                    className="h-10 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 text-xs font-medium text-[#0f172a]"
                    placeholder="e.g. Grocery items on credit"
                    placeholderTextColor={colors.textLight}
                    value={newDebtNote}
                    onChangeText={setNewDebtNote}
                  />

                  <View className="mt-4 flex-row gap-2">
                    <TouchableOpacity
                      className="flex-1 items-center justify-center rounded-xl border border-[#e2e8f0] bg-[#f8fafc] py-3"
                      onPress={() => setAddDebtModalOpen(false)}
                    >
                      <Text className="text-xs font-bold text-[#64748b]">Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-[#059669] py-3 shadow-xs"
                      onPress={handleSubmitAddDebt}
                      disabled={addingDebt}
                    >
                      {addingDebt ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text className="text-xs font-black text-white">Save Debt</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>
        </View>
      </View>
    </Modal>
  );
};
