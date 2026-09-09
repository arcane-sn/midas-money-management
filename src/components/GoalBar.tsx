import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '@/theme';
import { formatRupiah } from '@/utils/currency';
import type { GoalView } from '@/db/repositories/goalsRepo';

interface GoalBarProps {
  goal: GoalView;
  big?: boolean;
}

export function GoalBar({ goal, big = false }: GoalBarProps) {
  const reached = goal.percent >= 100;
  const remainText = reached ? 'TARGET REACHED' : `${goal.percent}% there`;
  const remainColor = reached ? colors.accentLink : colors.textSecondary;

  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <Text style={[styles.name, big && styles.nameBig]}>{goal.name}</Text>
        <Text style={[styles.remain, { color: remainColor }]}>{remainText}</Text>
      </View>
      <View style={[styles.track, { height: big ? 20 : 14 }]}>
        <View style={[styles.fill, { width: `${goal.percent}%`, backgroundColor: reached ? colors.accentGold : colors.ink }]} />
      </View>
      <Text style={styles.sub}>
        {formatRupiah(goal.currentAmount)} of {formatRupiah(goal.targetAmount)} · {goal.percent}%
      </Text>
      {goal.accountNames.length > 0 ? (
        <Text style={styles.accounts} numberOfLines={1}>
          {goal.accountNames.join(' · ')}
        </Text>
      ) : null}
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
  accounts: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },
});
