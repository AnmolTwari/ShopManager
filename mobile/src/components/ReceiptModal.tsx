import React from 'react';
import {
  Linking,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { SaleResponse } from '../types';
import { colors } from '../theme/colors';
import { CircleCheck, Printer, MessageSquare } from 'lucide-react-native';

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
  shopName = 'ShopManager Store',
  customerPhone,
  paymentMethod = 'CASH',
  onClose,
}) => {
  if (!sale) return null;

  const formattedDate = new Date(sale.createdAt || Date.now()).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const totalAmount = typeof sale.totalAmount === 'number' ? sale.totalAmount : parseFloat(sale.totalAmount) || 0;

  const items = sale.items || [];
  const calculatedProfit = items.reduce((acc, item) => {
    const qty = typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity)) || 0;
    const sell = typeof item.unitPrice === 'number' ? item.unitPrice : parseFloat(String(item.unitPrice)) || 0;
    const buy = typeof item.purchasePrice === 'number' ? item.purchasePrice : parseFloat(String(item.purchasePrice)) || 0;
    return acc + qty * (sell - buy);
  }, 0);

  const handleWhatsAppShare = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const itemsList = items
        .map((i, idx) => {
          const qty = typeof i.quantity === 'number' ? i.quantity : parseFloat(String(i.quantity)) || 0;
          const total = typeof i.lineTotal === 'number' ? i.lineTotal : parseFloat(String(i.lineTotal)) || 0;
          return `${idx + 1}. *${i.productName}* x${qty} = ₹${total.toFixed(2)}`;
        })
        .join('\n');

      const message = `🧾 *INVOICE #${sale.id}*\n🏬 *${shopName}*\n📅 ${formattedDate}\n\n*Items:*\n${itemsList}\n\n-------------------------\n💰 *TOTAL AMOUNT: ₹${totalAmount.toFixed(2)}*\n💳 Payment Mode: ${paymentMethod}\n-------------------------\nThank you for shopping with us! 🙏`;

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
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            body { font-family: 'Courier New', Courier, monospace; padding: 20px; font-size: 12px; color: #111; }
            .center { text-align: center; }
            .header { margin-bottom: 15px; }
            .title { font-size: 16px; font-weight: bold; }
            .divider { border-top: 1px dashed #444; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th { text-align: left; border-bottom: 1px dashed #444; padding: 4px 0; }
            td { padding: 4px 0; }
            .right { text-align: right; }
            .total-row { font-size: 14px; font-weight: bold; }
            .footer { margin-top: 20px; text-align: center; font-size: 10px; }
          </style>
        </head>
        <body>
          <div class="center header">
            <div class="title">${shopName}</div>
            <div>Invoice #${sale.id}</div>
            <div>${formattedDate}</div>
          </div>
          <div class="divider"></div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th class="right">Qty</th>
                <th class="right">Rate</th>
                <th class="right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map((i) => {
                  const qty = typeof i.quantity === 'number' ? i.quantity : parseFloat(String(i.quantity)) || 0;
                  const rate = typeof i.unitPrice === 'number' ? i.unitPrice : parseFloat(String(i.unitPrice)) || 0;
                  const total = typeof i.lineTotal === 'number' ? i.lineTotal : parseFloat(String(i.lineTotal)) || 0;
                  return `
                    <tr>
                      <td>${i.productName}</td>
                      <td class="right">${qty}</td>
                      <td class="right">₹${rate.toFixed(2)}</td>
                      <td class="right">₹${total.toFixed(2)}</td>
                    </tr>
                  `;
                })
                .join('')}
            </tbody>
          </table>
          <div class="divider"></div>
          <table>
            <tr class="total-row">
              <td>Grand Total:</td>
              <td class="right">₹${totalAmount.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Payment:</td>
              <td class="right">${paymentMethod}</td>
            </tr>
          </table>
          <div class="divider"></div>
          <div class="footer">
            Thank you for your visit!<br/>Powered by ShopManager
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
    } catch (e) {
      console.warn('Print error:', e);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/70 p-4">
        <View className="max-h-[90%] w-full overflow-hidden rounded-3xl bg-white">
          {/* Top Success Banner */}
          <View className="items-center border-b border-[#bbf7d0] bg-[#d1fae5] pb-3 pt-5">
            <CircleCheck size={32} color={colors.success} />
            <Text className="mt-1.5 text-base font-extrabold text-[#10b981]">Sale Recorded Successfully!</Text>
            <Text className="mt-0.5 text-xs font-semibold text-[#64748b]">Invoice #{sale.id}</Text>
          </View>

          {/* Receipt Card */}
          <ScrollView className="max-h-80" contentContainerClassName="p-4">
            <View className="rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
              <Text className="text-center text-[15px] font-extrabold text-[#0f172a]">{shopName}</Text>
              <Text className="mt-0.5 text-center text-[11px] text-[#64748b]">{formattedDate}</Text>
              <View className="my-3 h-px border border-dashed border-[#e2e8f0]" />

              {/* Items Table */}
              <View className="gap-2.5">
                {items.map((item, index) => {
                  const qty = typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity)) || 0;
                  const rate = typeof item.unitPrice === 'number' ? item.unitPrice : parseFloat(String(item.unitPrice)) || 0;
                  const total = typeof item.lineTotal === 'number' ? item.lineTotal : parseFloat(String(item.lineTotal)) || 0;

                  return (
                    <View key={index} className="flex-row items-center justify-between">
                      <View className="mr-2.5 flex-1">
                        <Text className="text-[13px] font-bold text-[#0f172a]" numberOfLines={1}>
                          {item.productName}
                        </Text>
                        <Text className="mt-px text-[11px] text-[#64748b]">
                          {qty} x ₹{rate.toFixed(2)}
                        </Text>
                      </View>
                      <Text className="text-[13px] font-bold text-[#0f172a]">₹{total.toFixed(2)}</Text>
                    </View>
                  );
                })}
              </View>

              <View className="my-3 h-px border border-dashed border-[#e2e8f0]" />

              {/* Total & Profit */}
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-extrabold text-[#0f172a]">Total Amount</Text>
                <Text className="text-lg font-black text-[#059669]">₹{totalAmount.toFixed(2)}</Text>
              </View>

              {calculatedProfit > 0 && (
                <View className="mt-1 flex-row items-center justify-between">
                  <Text className="text-[11px] font-semibold text-[#64748b]">Net Profit</Text>
                  <Text className="text-xs font-bold text-[#10b981]">+₹{calculatedProfit.toFixed(2)}</Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View className="gap-2.5 border-t border-[#e2e8f0] bg-white p-4">
            <TouchableOpacity className="flex-row items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3" onPress={handleWhatsAppShare}>
              <MessageSquare size={18} color="#fff" />
              <Text className="text-sm font-bold text-white">Share on WhatsApp</Text>
            </TouchableOpacity>

            <View className="flex-row gap-2.5">
              <TouchableOpacity className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] py-2.5" onPress={handlePrintPdf}>
                <Printer size={16} color={colors.text} />
                <Text className="text-[13px] font-bold text-[#0f172a]">Print / PDF</Text>
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

