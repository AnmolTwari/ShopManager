import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';

interface Props {
  children: React.ReactNode;
}
interface State {
  hasError: boolean;
  message: string | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || 'Unexpected error' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] uncaught', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <AlertTriangle size={36} color={colors.danger} />
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.msg}>{this.state.message}</Text>
            <Text style={styles.hint}>The app recovered from a crash. Tap retry to continue.</Text>
            <TouchableOpacity style={styles.btn} onPress={this.handleReset} activeOpacity={0.8}>
              <RefreshCw size={16} color="#fff" />
              <Text style={styles.btnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: colors.border, width: '100%', maxWidth: 340 },
  title: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 12 },
  msg: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 6 },
  hint: { fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 8, marginBottom: 16 },
  btn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, gap: 6 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
