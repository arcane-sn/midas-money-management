import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, fonts } from '@/theme';
import { formatRupiah } from '@/utils/currency';
import type { Transaction } from '@/db/repositories/transactionsRepo';

interface TxRowProps {
  tx: Transaction;
  accountName: string;
  toAccountName?: string;
  subcategoryName?: string;
  onPress?: () => void;
}

export function TxRow({ tx, accountName, toAccountName, subcategoryName, onPress }: TxRowProps) {
  const markBg = tx.type === 'income' ? colors.accentGold : tx.type === 'transfer' ? colors.surface : colors.ink;
  const markFg = tx.type === 'transfer' ? colors.ink : colors.white;
  const glyph = tx.type === 'income' ? '↙' : tx.type === 'transfer' ? '⇄' : '↗';
  const sub = tx.type === 'transfer' ? `${accountName} → ${toAccountName ?? ''}` : [subcategoryName, accountName].filter(Boolean).join(' · ');
  const amountText = tx.type === 'income' ? `+${formatRupiah(tx.amount)}` : tx.type === 'transfer' ? formatRupiah(tx.amount) : `−${formatRupiah(tx.amount)}`;
  const amountColor = tx.type === 'income' ? colors.accentLink : tx.type === 'transfer' ? colors.textMuted : colors.ink;

  return (
    <Pressable style={styles.row} onPress={onPress} disabled={!onPress}>
      <View style={[styles.mark, { backgroundColor: markBg }]}>
        <Text style={[styles.markGlyph, { color: markFg }]}>{glyph}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{tx.note || subcategoryName || 'Entry'}</Text>
        <Text style={styles.sub} numberOfLines={1}>{sub}</Text>
      </View>
      <Text style={[styles.amount, { color: amountColor }]}>{amountText}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: colors.dividerSoft12, backgroundColor: colors.white },
  mark: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  markGlyph: { fontSize: 15, fontFamily: fonts.bold },
  body: { flex: 1, minWidth: 0 },
  title: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  amount: { fontFamily: fonts.bold, fontSize: 14, flexShrink: 0 },
});
