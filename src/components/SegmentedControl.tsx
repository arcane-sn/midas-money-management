import { View, Pressable, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '@/theme';

interface Segment {
  key: string;
  label: string;
}

interface SegmentedControlProps {
  segments: Segment[];
  value: string;
  onChange: (key: string) => void;
}

export function SegmentedControl({ segments, value, onChange }: SegmentedControlProps) {
  return (
    <View style={styles.row}>
      {segments.map((s, i) => (
        <Pressable
          key={s.key}
          style={[styles.seg, i > 0 && styles.segBorder, value === s.key && styles.segActive]}
          onPress={() => onChange(s.key)}
        >
          <Text style={[styles.text, value === s.key && styles.textActive]}>{s.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', borderTopWidth: 2, borderTopColor: colors.ink, borderBottomWidth: 2, borderBottomColor: colors.ink },
  seg: { flex: 1, paddingVertical: 13, alignItems: 'center', backgroundColor: colors.white },
  segBorder: { borderLeftWidth: 1, borderLeftColor: colors.dividerSoft16 },
  segActive: { backgroundColor: colors.ink },
  text: { fontFamily: fonts.extraBold, fontSize: 10, letterSpacing: 1.2, color: colors.textSecondary },
  textActive: { color: colors.white },
});
