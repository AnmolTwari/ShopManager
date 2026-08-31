import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
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
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState<boolean>(false);
  const [manualSku, setManualSku] = useState<string>('');
  const [scannedRecently, setScannedRecently] = useState<boolean>(false);

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
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Camera Viewfinder or Permission Request */}
          <View style={styles.cameraContainer}>
            {!permission ? (
              <View style={styles.permissionBox}>
                <Text style={styles.permissionText}>Loading camera...</Text>
              </View>
            ) : !permission.granted ? (
              <View style={styles.permissionBox}>
                <CameraIcon size={44} color={colors.primary} />
                <Text style={styles.permissionTitle}>Camera Access Required</Text>
                <Text style={styles.permissionDesc}>
                  ShopManager uses your camera to scan barcodes for instant billing and inventory management.
                </Text>
                <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
                  <Text style={styles.grantBtnText}>Grant Camera Permission</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <CameraView
                style={styles.camera}
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
                <View style={styles.reticleContainer}>
                  <View style={styles.reticle}>
                    <View style={[styles.corner, styles.topLeft]} />
                    <View style={[styles.corner, styles.topRight]} />
                    <View style={[styles.corner, styles.bottomLeft]} />
                    <View style={[styles.corner, styles.bottomRight]} />
                    <View style={styles.laserLine} />
                  </View>
                </View>

                {/* Torch Toggle */}
                <TouchableOpacity
                  style={styles.torchBtn}
                  onPress={() => setTorch((t) => !t)}
                >
                  {torch ? <ZapOff size={20} color="#fff" /> : <Zap size={20} color="#fff" />}
                  <Text style={styles.torchText}>{torch ? 'Flash Off' : 'Flash On'}</Text>
                </TouchableOpacity>
              </CameraView>
            )}
          </View>

          {/* Manual Input Fallback */}
          <View style={styles.manualContainer}>
            <Text style={styles.manualLabel}>Or enter SKU / Barcode manually:</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="e.g. 8901030383820"
                placeholderTextColor={colors.textLight}
                value={manualSku}
                onChangeText={setManualSku}
                autoCapitalize="characters"
                returnKeyType="search"
                onSubmitEditing={handleManualSubmit}
              />
              <TouchableOpacity
                style={[styles.searchBtn, !manualSku.trim() && styles.searchBtnDisabled]}
                onPress={handleManualSubmit}
                disabled={!manualSku.trim()}
              >
                <Search size={18} color="#fff" />
                <Text style={styles.searchBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraContainer: {
    height: 280,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reticleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  reticle: {
    width: 240,
    height: 140,
    position: 'relative',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: colors.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  laserLine: {
    height: 2,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
  torchBtn: {
    position: 'absolute',
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
  },
  torchText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.bg,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
    marginBottom: 6,
  },
  permissionDesc: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  permissionText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  grantBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  grantBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  manualContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  manualLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: colors.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.text,
  },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
  },
  searchBtnDisabled: {
    opacity: 0.5,
  },
  searchBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
