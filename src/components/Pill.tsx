import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '@/theme';

interface PillProps {
  label: string;
  active: boolean;
  onPress: () => void;
  dashed?: boolean;
}

export function Pill({ label, active, onPress, dashed = false }: PillProps) {
  return (
    <Pressable
      style={[
        styles.pill,
        dashed ? styles.dashed : null,
        active ? styles.active : null,
      ]}
      onPress={onPress}
    >
      <Text style={[styles.text, active ? styles.textActive : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: { borderWidth: 2, borderColor: colors.dividerSoft16, paddingHorizontal: 11, paddingVertical: 8 },
  dashed: { borderStyle: 'dashed', borderColor: colors.textSecondary },
  active: { borderColor: colors.ink, backgroundColor: colors.ink },
  text: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.4, color: colors.textSecondary },
  textActive: { color: colors.white },
});
