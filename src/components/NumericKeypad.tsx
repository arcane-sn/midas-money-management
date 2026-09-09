import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, fonts } from '@/theme';

interface NumericKeypadProps {
  onPress: (key: string) => void;
  onDelete: () => void;
  onClear: () => void;
  onConfirm: () => void;
}

const KEYS = ['1', '2', '3', 'del', '4', '5', '6', 'clr', '7', '8', '9', '000', '.', '0', '00', 'ok'];

export function NumericKeypad({ onPress, onDelete, onClear, onConfirm }: NumericKeypadProps) {
  const handle = (key: string) => {
    if (key === 'del') return onDelete();
    if (key === 'clr') return onClear();
    if (key === 'ok') return onConfirm();
    onPress(key === '.' ? '0' : key);
  };

  return (
    <View style={styles.grid}>
      {KEYS.map((k) => {
        const isAction = k === 'del' || k === 'clr' || k === 'ok';
        const label = k === 'del' ? '⌫' : k === 'clr' ? 'C' : k === 'ok' ? '✓' : k;
        return (
          <Pressable
            key={k}
            style={[styles.key, k === 'ok' && styles.keyOk, isAction && k !== 'ok' && styles.keyAction]}
            onPress={() => handle(k)}
          >
            <Text style={[styles.keyText, k === 'ok' && styles.keyTextOk, !isAction && styles.keyTextDigit]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  key: { width: '25%', paddingVertical: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, borderWidth: 0.5, borderColor: colors.dividerSoft12 },
  keyAction: { backgroundColor: colors.surface },
  keyOk: { backgroundColor: colors.ink },
  keyText: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  keyTextDigit: { fontSize: 19 },
  keyTextOk: { color: colors.white },
});
