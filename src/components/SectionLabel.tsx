import { Text, View, Pressable, StyleSheet } from 'react-native';
import { colors, fonts } from '@/theme';

interface SectionLabelProps {
  children: string;
  right?: string;
  onPressRight?: () => void;
}

export function SectionLabel({ children, right, onPressRight }: SectionLabelProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{children}</Text>
      {right ? (
        onPressRight ? (
          <Pressable onPress={onPressRight}>
            <Text style={styles.right}>{right}</Text>
          </Pressable>
        ) : (
          <Text style={styles.right}>{right}</Text>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6 },
  label: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.6, color: colors.textMuted },
  right: { fontFamily: fonts.bold, fontSize: 11, color: colors.accentLink },
});
