import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '@/theme';
import { formatRupiah } from '@/utils/currency';
import type { BudgetView } from '@/db/repositories/budgetsRepo';

interface BudgetBarProps {
  budget: BudgetView;
  big?: boolean;
}

export function BudgetBar({ budget, big = false }: BudgetBarProps) {
  const fill = budget.locked ? colors.danger : budget.tight ? colors.accentGold : colors.ink;
  const remainText = budget.locked ? 'SPENT OUT' : `${formatRupiah(budget.remain)} left`;
  const remainColor = budget.locked ? colors.danger : budget.tight ? colors.accentLink : colors.textSecondary;
  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <Text style={[styles.name, big && styles.nameBig]}>{budget.name}</Text>
        <Text style={[styles.remain, { color: remainColor }]}>{remainText}</Text>
      </View>
      <View style={[styles.track, { height: big ? 20 : 14 }]}>
        <View style={[styles.fill, { width: `${budget.percent}%`, backgroundColor: fill }]} />
      </View>
      <Text style={styles.sub}>
        {formatRupiah(budget.spent)} of {formatRupiah(budget.limitAmount)} · {budget.percent}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  name: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.ink },
  nameBig: { fontSize: 26, fontFamily: fonts.extraBold },
  remain: { fontFamily: fonts.bold, fontSize: 12 },
  track: { backgroundColor: colors.surface, position: 'relative', overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  sub: { fontFamily: fonts.medium, fontSize: 10, letterSpacing: 0.6, color: colors.textFaint },
});
