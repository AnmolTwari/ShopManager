import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { SaleResponse } from '../types';
import { colors } from '../theme/colors';
import { CircleCheck, Printer, MessageSquare, X, Store } from 'lucide-react-native';
import { formatReceiptDateTime } from '../utils/dateUtils';
import { useAuth } from '../context/AuthContext';

interface ReceiptModalProps {
  visible: boolean;
  sale: SaleResponse | null;
  shopName?: string;
  customerPhone?: string;
  paymentMethod?: string;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  visible,
  sale,
  shopName: propShopName,
  customerPhone,
  paymentMethod = 'CASH',
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const { shopProfile } = useAuth();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  if (!sale) return null;

  const effectiveShopName = propShopName || shopProfile?.shopName || 'ShopManager Store';
  const effectivePhone = shopProfile?.phone || '';
  const effectiveAddress = shopProfile?.address || '';
  const formattedDate = formatReceiptDateTime(sale.createdAt);

  const totalAmount = typeof sale.totalAmount === 'number' ? sale.totalAmount : parseFloat(String(sale.totalAmount)) || 0;

  const items = sale.items || [];
  const calculatedProfit = items.reduce((acc, item) => {
    const qty = typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity)) || 0;
    const sell = typeof item.unitPrice === 'number' ? item.unitPrice : parseFloat(String(item.unitPrice)) || 0;
    const buy = typeof item.purchasePrice === 'number' ? item.purchasePrice : parseFloat(String(item.purchasePrice)) || 0;
    return acc + qty * (sell - buy);
  }, 0);

  const totalMrp = items.reduce((acc, item) => {
    const qty = typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity)) || 0;
    const rate = typeof item.unitPrice === 'number' ? item.unitPrice : parseFloat(String(item.unitPrice)) || 0;
    const mrp = item.mrp != null ? (typeof item.mrp === 'number' ? item.mrp : parseFloat(String(item.mrp)) || 0) : null;
    return acc + (mrp && mrp > 0 ? mrp : rate) * qty;
  }, 0);

  const totalSavings = items.reduce((acc, item) => {
    const qty = typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity)) || 0;
    const rate = typeof item.unitPrice === 'number' ? item.unitPrice : parseFloat(String(item.unitPrice)) || 0;
    const mrp = item.mrp != null ? (typeof item.mrp === 'number' ? item.mrp : parseFloat(String(item.mrp)) || 0) : null;
    return acc + (mrp && mrp > rate ? (mrp - rate) * qty : 0);
  }, 0);

  const handleWhatsAppShare = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const itemsList = items
        .map((i, idx) => {
          const qty = typeof i.quantity === 'number' ? i.quantity : parseFloat(String(i.quantity)) || 0;
          const rate = typeof i.unitPrice === 'number' ? i.unitPrice : parseFloat(String(i.unitPrice)) || 0;
          const total = typeof i.lineTotal === 'number' ? i.lineTotal : parseFloat(String(i.lineTotal)) || 0;
          const mrp = i.mrp != null ? (typeof i.mrp === 'number' ? i.mrp : parseFloat(String(i.mrp)) || 0) : null;
          const hasDiscount = mrp != null && mrp > rate;
          const mrpText = hasDiscount ? ` (MRP ~₹${mrp.toFixed(2)}~)` : '';
          return `${idx + 1}. *${i.productName}*\n   ${qty} x ₹${rate.toFixed(2)}${mrpText} = ₹${total.toFixed(2)}`;
        })
        .join('\n');

      const savingsBlock = totalSavings > 0 ? `\n🎉 *TOTAL SAVINGS: ₹${totalSavings.toFixed(2)}*` : '';

      const message = `🧾 *INVOICE #${sale.id}*\n🏬 *${effectiveShopName}*${effectivePhone ? `\n📞 ${effectivePhone}` : ''}${effectiveAddress ? `\n📍 ${effectiveAddress}` : ''}\n📅 ${formattedDate}\n\n*Items Purchased:*\n${itemsList}\n\n-------------------------\n💰 *TOTAL AMOUNT: ₹${totalAmount.toFixed(2)}*${savingsBlock}\n💳 Payment Mode: ${paymentMethod}\n-------------------------\nThank you for shopping with us! 🙏\n_⚡ Powered by ShopManager_`;

      const encoded = encodeURI(message);
      let url = `whatsapp://send?text=${encoded}`;
      if (customerPhone && customerPhone.trim()) {
        const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
        url = `whatsapp://send?phone=${cleanPhone}&text=${encoded}`;
      }

      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(`https://api.whatsapp.com/send?text=${encoded}`);
      }
    } catch (e) {
      console.warn('Error sharing on WhatsApp:', e);
    }
  };

  const handlePrintPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Invoice #${sale.id} - ${effectiveShopName}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              padding: 24px 18px;
              color: #0f172a;
              font-size: 13px;
              line-height: 1.4;
              max-width: 420px;
              margin: 0 auto;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .header {
              text-align: center;
              padding-bottom: 14px;
              border-bottom: 2px solid #0f172a;
              margin-bottom: 12px;
            }
            .shop-title {
              font-size: 20px;
              font-weight: 900;
              letter-spacing: 0.5px;
              text-transform: uppercase;
              color: #047857;
              margin-bottom: 3px;
            }
            .shop-meta {
              font-size: 11px;
              color: #475569;
              margin-bottom: 2px;
            }
            .invoice-badge {
              display: inline-block;
              background: #f1f5f9;
              padding: 3px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 700;
              margin-top: 6px;
              color: #0f172a;
            }
            .meta-table {
              width: 100%;
              margin: 10px 0;
              font-size: 11px;
              color: #334155;
            }
            .meta-table td { padding: 2px 0; }
            .divider {
              border-top: 1px dashed #cbd5e1;
              margin: 10px 0;
            }
            table.items {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
            }
            table.items th {
              text-align: left;
              font-size: 11px;
              text-transform: uppercase;
              color: #64748b;
              border-bottom: 1px solid #0f172a;
              padding: 6px 0;
            }
            table.items td {
              padding: 6px 0;
              border-bottom: 1px dashed #f1f5f9;
              font-size: 12px;
              vertical-align: top;
            }
            .item-name { font-weight: 600; color: #0f172a; }
            .item-sub { font-size: 10px; color: #64748b; }
            .mrp-strike {
              color: #64748b;
              font-size: 11px;
              text-decoration: line-through;
            }
            .mrp-regular {
              color: #475569;
              font-size: 11px;
            }
            .rate-val {
              font-weight: 700;
              color: #0f172a;
              font-size: 12px;
            }
            .total-val {
              font-weight: 700;
              color: #047857;
              font-size: 12px;
            }
            .discount-pill {
              display: inline-block;
              font-size: 9px;
              font-weight: 700;
              color: #047857;
              background: #ecfdf5;
              border: 0.5px solid #a7f3d0;
              padding: 1px 4px;
              border-radius: 3px;
              margin-top: 2px;
            }
            .totals-table {
              width: 100%;
              margin-top: 8px;
              font-size: 12px;
            }
            .totals-table td { padding: 3px 0; }
            .savings-row {
              color: #047857;
              font-weight: 700;
            }
            .grand-total {
              font-size: 16px;
              font-weight: 900;
              color: #047857;
              border-top: 1px solid #0f172a;
              border-bottom: 1px solid #0f172a;
              padding: 8px 0;
            }
            .savings-banner {
              margin-top: 14px;
              background: #f0fdf4;
              border: 1px dashed #22c55e;
              color: #15803d;
              padding: 8px 12px;
              border-radius: 6px;
              text-align: center;
              font-size: 11px;
              font-weight: 700;
            }
            .footer {
              margin-top: 24px;
              text-align: center;
              padding-top: 12px;
              border-top: 1px dashed #cbd5e1;
            }
            .footer-msg {
              font-size: 12px;
              font-weight: 600;
              color: #334155;
              margin-bottom: 10px;
            }
            .powered-badge {
              display: inline-flex;
              align-items: center;
              gap: 4px;
              font-size: 10px;
              font-weight: 700;
              color: #059669;
              background: #ecfdf5;
              border: 1px solid #a7f3d0;
              padding: 4px 10px;
              border-radius: 999px;
              letter-spacing: 0.3px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="shop-title">${effectiveShopName}</div>
            ${effectiveAddress ? `<div class="shop-meta">📍 ${effectiveAddress}</div>` : ''}
            ${effectivePhone ? `<div class="shop-meta">📞 Phone: ${effectivePhone}</div>` : ''}
            <div class="invoice-badge">TAX INVOICE / CASH BILL</div>
          </div>

          <table class="meta-table">
            <tr>
              <td><strong>Invoice #:</strong> ${sale.id}</td>
              <td class="right"><strong>Mode:</strong> ${paymentMethod}</td>
            </tr>
            <tr>
              <td colspan="2"><strong>Date & Time:</strong> ${formattedDate}</td>
            </tr>
            ${customerPhone ? `<tr><td colspan="2"><strong>Customer Phone:</strong> ${customerPhone}</td></tr>` : ''}
          </table>

          <div class="divider"></div>

          <table class="items">
            <thead>
              <tr>
                <th style="width: 38%;">Item</th>
                <th class="right" style="width: 12%;">Qty</th>
                <th class="right" style="width: 16%;">MRP</th>
                <th class="right" style="width: 16%;">Rate</th>
                <th class="right" style="width: 18%;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map((i) => {
                  const qty = typeof i.quantity === 'number' ? i.quantity : parseFloat(String(i.quantity)) || 0;
                  const rate = typeof i.unitPrice === 'number' ? i.unitPrice : parseFloat(String(i.unitPrice)) || 0;
                  const total = typeof i.lineTotal === 'number' ? i.lineTotal : parseFloat(String(i.lineTotal)) || 0;
                  const rawMrp = i.mrp != null ? (typeof i.mrp === 'number' ? i.mrp : parseFloat(String(i.mrp)) || 0) : null;
                  const hasMrp = rawMrp != null && rawMrp > 0;
                  const isDiscounted = hasMrp && rawMrp > rate;
                  const savings = isDiscounted ? (rawMrp - rate) * qty : 0;

                  return `
                    <tr>
                      <td>
                        <div class="item-name">${i.productName}</div>
                        ${i.productSku ? `<div class="item-sub">SKU: ${i.productSku}</div>` : ''}
                        ${i.unit ? `<div class="item-sub">Unit: ${i.unit}</div>` : ''}
                        ${isDiscounted ? `<div class="discount-pill">Saved ₹${savings.toFixed(2)}</div>` : ''}
                      </td>
                      <td class="right">${qty}</td>
                      <td class="right ${isDiscounted ? 'mrp-strike' : 'mrp-regular'}">
                        ${hasMrp ? `₹${rawMrp.toFixed(2)}` : '-'}
                      </td>
                      <td class="right rate-val">₹${rate.toFixed(2)}</td>
                      <td class="right total-val">₹${total.toFixed(2)}</td>
                    </tr>
                  `;
                })
                .join('')}
            </tbody>
          </table>

          <table class="totals-table">
            <tr>
              <td>Total Items:</td>
              <td class="right">${items.length}</td>
            </tr>
            ${
              totalSavings > 0
                ? `
            <tr>
              <td>Total MRP Value:</td>
              <td class="right">₹${totalMrp.toFixed(2)}</td>
            </tr>
            <tr class="savings-row">
              <td>Total Discount / Savings:</td>
              <td class="right">-₹${totalSavings.toFixed(2)}</td>
            </tr>
            `
                : ''
            }
            <tr class="grand-total">
              <td><strong>GRAND TOTAL:</strong></td>
              <td class="right"><strong>₹${totalAmount.toFixed(2)}</strong></td>
            </tr>
          </table>

          ${
            totalSavings > 0
              ? `
          <div class="savings-banner">
            🎉 You saved a total of ₹${totalSavings.toFixed(2)} on this purchase!
          </div>
          `
              : ''
          }

          <div class="footer">
            <div class="footer-msg">Thank you for your visit! Please visit again. 🙏</div>
            <div class="powered-badge">
              ⚡ Powered by ShopManager
            </div>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: `Invoice #${sale.id} - ${effectiveShopName}`,
        });
      } else {
        // Fallback to system print dialog
        await Print.printAsync({ html });
      }
    } catch (e: any) {
      console.warn('Print error:', e);
      Alert.alert('Print Error', e.message || 'Unable to generate PDF document.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View
        className="flex-1 items-center justify-center bg-black/70 p-4"
        style={{
          paddingBottom: Math.max(
            insets.bottom > 0 ? insets.bottom + 16 : 0,
            Platform.OS === 'android' ? 36 : 20
          ),
        }}
      >
        <View className="max-h-[90%] w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
          {/* Top Success Banner */}
          <View className="items-center border-b border-[#bbf7d0] bg-[#d1fae5] px-4 pb-3 pt-5">
            <TouchableOpacity className="absolute right-3.5 top-3.5 p-1" onPress={onClose}>
              <X size={20} color="#059669" />
            </TouchableOpacity>
            <CircleCheck size={32} color={colors.success} />
            <Text className="mt-1.5 text-base font-extrabold text-[#059669]">Sale Recorded Successfully!</Text>
            <Text className="mt-0.5 text-xs font-semibold text-[#64748b]">Invoice #{sale.id}</Text>
          </View>

          {/* Receipt Card */}
          <ScrollView className="max-h-80" contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
            <View className="rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
              <View className="flex-row items-center justify-center gap-1.5">
                <Store size={16} color={colors.primary} />
                <Text className="text-center text-base font-black text-[#0f172a]">{effectiveShopName}</Text>
              </View>
              {effectiveAddress ? (
                <Text className="mt-0.5 text-center text-[11px] text-[#64748b]">{effectiveAddress}</Text>
              ) : null}
              {effectivePhone ? (
                <Text className="mt-px text-center text-[11px] text-[#64748b]">Phone: {effectivePhone}</Text>
              ) : null}

              <Text className="mt-1 text-center text-[11px] font-medium text-[#64748b]">{formattedDate}</Text>
              <View className="my-3 h-px border border-dashed border-[#cbd5e1]" />

              {/* Items Table */}
              <View className="gap-2.5">
                {items.map((item, index) => {
                  const qty = typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity)) || 0;
                  const rate = typeof item.unitPrice === 'number' ? item.unitPrice : parseFloat(String(item.unitPrice)) || 0;
                  const total = typeof item.lineTotal === 'number' ? item.lineTotal : parseFloat(String(item.lineTotal)) || 0;
                  const rawMrp = item.mrp != null ? (typeof item.mrp === 'number' ? item.mrp : parseFloat(String(item.mrp)) || 0) : null;
                  const hasMrp = rawMrp != null && rawMrp > 0;
                  const isDiscounted = hasMrp && rawMrp > rate;
                  const itemSavings = isDiscounted ? (rawMrp - rate) * qty : 0;

                  return (
                    <View key={index} className="flex-row items-center justify-between">
                      <View className="mr-2.5 flex-1">
                        <Text className="text-[13px] font-bold text-[#0f172a]" numberOfLines={1}>
                          {item.productName}
                        </Text>
                        <View className="mt-0.5 flex-row flex-wrap items-center gap-1.5">
                          <Text className="text-[11px] font-medium text-[#64748b]">
                            {qty} x ₹{rate.toFixed(2)}
                          </Text>
                          {hasMrp && (
                            <Text
                              className={`text-[10px] ${
                                isDiscounted ? 'text-[#94a3b8] line-through' : 'text-[#64748b]'
                              }`}
                            >
                              (MRP ₹{rawMrp.toFixed(2)})
                            </Text>
                          )}
                          {isDiscounted && (
                            <View className="rounded bg-[#dcfce7] px-1.5 py-0.5 border border-[#bbf7d0]">
                              <Text className="text-[9px] font-bold text-[#15803d]">
                                Save ₹{itemSavings.toFixed(2)}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <Text className="text-[13px] font-bold text-[#0f172a]">₹{total.toFixed(2)}</Text>
                    </View>
                  );
                })}
              </View>

              <View className="my-3 h-px border border-dashed border-[#cbd5e1]" />

              {/* Total, Savings & Profit */}
              {totalSavings > 0 && (
                <View className="mb-1 flex-row items-center justify-between">
                  <Text className="text-[11px] font-semibold text-[#047857]">Total Savings</Text>
                  <Text className="text-xs font-bold text-[#047857]">-₹{totalSavings.toFixed(2)}</Text>
                </View>
              )}

              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-extrabold text-[#0f172a]">Total Amount ({paymentMethod})</Text>
                <Text className="text-lg font-black text-[#059669]">₹{totalAmount.toFixed(2)}</Text>
              </View>

              {calculatedProfit > 0 && (
                <View className="mt-1 flex-row items-center justify-between">
                  <Text className="text-[11px] font-semibold text-[#64748b]">Net Profit</Text>
                  <Text className="text-xs font-bold text-[#10b981]">+₹{calculatedProfit.toFixed(2)}</Text>
                </View>
              )}

              {/* Small branding badge in modal */}
              <View className="mt-3.5 items-center justify-center border-t border-[#f1f5f9] pt-2.5">
                <Text className="text-[10px] font-bold text-[#94a3b8]">⚡ Powered by ShopManager</Text>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View className="gap-2.5 border-t border-[#e2e8f0] bg-white p-4">
            <TouchableOpacity className="flex-row items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3" onPress={handleWhatsAppShare}>
              <MessageSquare size={18} color="#fff" />
              <Text className="text-sm font-bold text-white">Share on WhatsApp</Text>
            </TouchableOpacity>

            <View className="flex-row gap-2.5">
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] py-2.5"
                onPress={handlePrintPdf}
                disabled={isGeneratingPdf}
              >
                {isGeneratingPdf ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Printer size={16} color={colors.text} />
                    <Text className="text-[13px] font-bold text-[#0f172a]">Print / PDF</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity className="flex-1 items-center justify-center rounded-xl bg-[#059669] py-2.5" onPress={onClose}>
                <Text className="text-[13px] font-bold text-white">Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

