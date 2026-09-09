import type { ReactNode } from 'react';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors } from '@/theme';

interface ScreenProps {
  children: ReactNode;
  edges?: Edge[];
}

export function Screen({ children, edges = ['top'] }: ScreenProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={edges}>
      {children}
    </SafeAreaView>
  );
}
