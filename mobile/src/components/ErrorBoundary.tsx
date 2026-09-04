import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { TriangleAlert, RefreshCw } from 'lucide-react-native';

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
        <View className="flex-1 items-center justify-center bg-[#f8fafc] p-5">
          <View className="w-full max-w-[340px] items-center rounded-2xl border border-[#e2e8f0] bg-white p-5">
            <TriangleAlert size={36} color={colors.danger} />
            <Text className="mt-3 text-[17px] font-extrabold text-[#0f172a]">Something went wrong</Text>
            <Text className="mt-1.5 text-center text-xs text-[#64748b]">{this.state.message}</Text>
            <Text className="mb-4 mt-2 text-center text-[11px] text-[#64748b]">The app recovered from a crash. Tap retry to continue.</Text>
            <TouchableOpacity className="flex-row items-center gap-1.5 rounded-[10px] bg-[#059669] px-[18px] py-2.5" onPress={this.handleReset} activeOpacity={0.8}>
              <RefreshCw size={16} color="#fff" />
              <Text className="text-[13px] font-extrabold text-white">Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

