import { View } from 'react-native';
import { colors } from '@/theme';

interface DividerProps {
  thick?: boolean;
}

export function Divider({ thick = true }: DividerProps) {
  return <View style={{ height: thick ? 2 : 1, backgroundColor: thick ? colors.dividerStrong : colors.dividerSoft12 }} />;
}
