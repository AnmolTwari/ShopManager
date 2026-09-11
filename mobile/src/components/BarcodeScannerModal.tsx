import React, { useState } from 'react';
import {
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { X, Zap, ZapOff, Search, Camera as CameraIcon } from 'lucide-react-native';

interface BarcodeScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  subtitle?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  visible,
  onClose,
  onScan,
  title = 'Scan Product Barcode',
  subtitle = 'Align barcode inside the frame to scan',
}) => {
  const insets = useSafeAreaInsets();
  const modalBottomPadding = Math.max(
    insets.bottom > 0 ? insets.bottom + 20 : 0,
    Platform.OS === 'android' ? 56 : 24
  );
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState<boolean>(false);
  const [manualSku, setManualSku] = useState<string>('');
  const [scannedRecently, setScannedRecently] = useState<boolean>(false);

  // CRITICAL: Do not mount CameraView or modal in the background when not visible.
  // This prevents native Android/iOS Camera2 hardware lock and crashes.
  if (!visible) {
    return null;
  }

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scannedRecently || !data) return;

    setScannedRecently(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    onScan(data.trim());

    // Debounce scan to avoid duplicate immediate scans
    setTimeout(() => {
      setScannedRecently(false);
    }, 1500);
  };

  const handleManualSubmit = () => {
    if (!manualSku.trim()) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    onScan(manualSku.trim());
    setManualSku('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/70">
        <View className="max-h-[90%] rounded-t-[24px] bg-white" style={{ paddingBottom: modalBottomPadding }}>
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pb-3 pt-[18px]">
            <View>
              <Text className="text-lg font-extrabold text-[#0f172a]">{title}</Text>
              <Text className="mt-0.5 text-xs text-[#64748b]">{subtitle}</Text>
            </View>
            <TouchableOpacity className="h-9 w-9 items-center justify-center rounded-full bg-[#f8fafc]" onPress={onClose}>
              <X size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Camera Viewfinder or Permission Request */}
          <View className="mx-4 h-[280px] overflow-hidden rounded-2xl bg-black">
            {!permission ? (
              <View className="flex-1 items-center justify-center bg-[#f8fafc] p-6">
                <Text className="text-sm text-[#64748b]">Loading camera...</Text>
              </View>
            ) : !permission.granted ? (
              <View className="flex-1 items-center justify-center bg-[#f8fafc] p-6">
                <CameraIcon size={44} color={colors.primary} />
                <Text className="mb-1.5 mt-3 text-base font-bold text-[#0f172a]">Camera Access Required</Text>
                <Text className="mb-4 text-center text-xs leading-[18px] text-[#64748b]">
                  ShopManager uses your camera to scan barcodes for instant billing and inventory management.
                </Text>
                <TouchableOpacity className="rounded-[10px] bg-[#059669] px-[18px] py-2.5" onPress={requestPermission}>
                  <Text className="text-[13px] font-bold text-white">Grant Camera Permission</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <CameraView
                className="flex-1 items-center justify-center"
                enableTorch={torch}
                barcodeScannerSettings={{
                  barcodeTypes: [
                    'ean13',
                    'ean8',
                    'upc_a',
                    'upc_e',
                    'code128',
                    'code39',
                    'code93',
                    'qr',
                    'itf14',
                    'codabar',
                  ],
                }}
                onBarcodeScanned={scannedRecently ? undefined : handleBarcodeScanned}
              >
                {/* Target Reticle Overlay */}
                <View className="flex-1 w-full items-center justify-center">
                  <View className="relative h-[140px] w-[240px] justify-center">
                    <View className="absolute left-0 top-0 h-6 w-6 rounded-tl-lg border-l-[3px] border-t-[3px] border-[#059669]" />
                    <View className="absolute right-0 top-0 h-6 w-6 rounded-tr-lg border-r-[3px] border-t-[3px] border-[#059669]" />
                    <View className="absolute bottom-0 left-0 h-6 w-6 rounded-bl-lg border-b-[3px] border-l-[3px] border-[#059669]" />
                    <View className="absolute bottom-0 right-0 h-6 w-6 rounded-br-lg border-b-[3px] border-r-[3px] border-[#059669]" />
                    <View className="h-0.5 bg-[#059669]" />
                  </View>
                </View>

                {/* Torch Toggle */}
                <TouchableOpacity
                  className="absolute bottom-3.5 flex-row items-center gap-1.5 rounded-full bg-black/60 px-3.5 py-1.5"
                  onPress={() => setTorch((t) => !t)}
                >
                  {torch ? <ZapOff size={20} color="#fff" /> : <Zap size={20} color="#fff" />}
                  <Text className="text-xs font-semibold text-white">{torch ? 'Flash Off' : 'Flash On'}</Text>
                </TouchableOpacity>
              </CameraView>
            )}
          </View>

          {/* Manual Input Fallback */}
          <View className="px-4 pt-4">
            <Text className="mb-2 text-xs font-semibold text-[#64748b]">Or enter SKU / Barcode manually:</Text>
            <View className="flex-row gap-2">
              <TextInput
                className="h-11 flex-1 rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] px-3 text-sm text-[#0f172a]"
                placeholder="e.g. 8901030383820"
                placeholderTextColor={colors.textLight}
                value={manualSku}
                onChangeText={setManualSku}
                autoCapitalize="characters"
                returnKeyType="search"
                onSubmitEditing={handleManualSubmit}
              />
              <TouchableOpacity
                className="flex-row items-center gap-1.5 rounded-[10px] bg-[#059669] px-4"
                style={!manualSku.trim() ? { opacity: 0.5 } : undefined}
                onPress={handleManualSubmit}
                disabled={!manualSku.trim()}
              >
                <Search size={18} color="#fff" />
                <Text className="text-sm font-bold text-white">Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

