import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useDb } from '@/db/useDb';
import { listBudgetViews, type BudgetView } from '@/db/repositories/budgetsRepo';
import { listGoalViews, type GoalView } from '@/db/repositories/goalsRepo';
import { colors, fonts } from '@/theme';
import { formatRupiah } from '@/utils/currency';
import { monthLabel } from '@/utils/date';
import { BudgetBar } from '@/components/BudgetBar';
import { GoalBar } from '@/components/GoalBar';
import { Screen } from '@/components/Screen';
import { SegmentedControl } from '@/components/SegmentedControl';

type Tab = 'budgets' | 'goals';

export default function BudgetsScreen() {
  const db = useDb();
  const [tab, setTab] = useState<Tab>('budgets');
  const [budgets, setBudgets] = useState<BudgetView[]>([]);
  const [goals, setGoals] = useState<GoalView[]>([]);

  useFocusEffect(
    useCallback(() => {
      Promise.all([listBudgetViews(db), listGoalViews(db)]).then(([b, g]) => {
        setBudgets(b);
        setGoals(g);
      });
    }, [db])
  );

  const left = budgets.reduce((sum, b) => sum + Math.max(0, b.remain), 0);

  return (
    <Screen>
    <ScrollView style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{tab === 'budgets' ? 'Budgets' : 'Goals'}</Text>
          <Text style={styles.period}>{monthLabel()}</Text>
        </View>
        {tab === 'budgets' ? (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.leftLabel}>LEFT</Text>
            <Text style={styles.leftValue}>{formatRupiah(left)}</Text>
          </View>
        ) : null}
      </View>

      <SegmentedControl
        segments={[
          { key: 'budgets', label: 'BUDGETS' },
          { key: 'goals', label: 'GOALS' },
        ]}
        value={tab}
        onChange={(k) => setTab(k as Tab)}
      />

      {tab === 'budgets' ? (
        <>
          <View style={{ padding: 20, paddingBottom: 4 }}>
            <Pressable style={styles.addBtn} onPress={() => router.push('/add-budget')}>
              <Text style={styles.addBtnText}>+ ADD A BUDGET</Text>
            </Pressable>
          </View>
          <View style={styles.list}>
            {budgets.map((b) => (
              <Pressable key={b.id} onPress={() => router.push(`/budgets/${b.id}`)}>
                <BudgetBar budget={b} />
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <>
          <View style={{ padding: 20, paddingBottom: 4 }}>
            <Pressable style={styles.addBtn} onPress={() => router.push('/add-goal')}>
              <Text style={styles.addBtnText}>+ ADD A GOAL</Text>
            </Pressable>
          </View>
          <View style={styles.list}>
            {goals.map((g) => (
              <Pressable key={g.id} onPress={() => router.push({ pathname: '/add-goal', params: { id: g.id } })}>
                <GoalBar goal={g} />
              </Pressable>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', padding: 20, paddingBottom: 12 },
  title: { fontFamily: fonts.extraBold, fontSize: 24, color: colors.ink },
  period: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, marginTop: 3 },
  leftLabel: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1.4, color: colors.textMuted },
  leftValue: { fontFamily: fonts.extraBold, fontSize: 16, color: colors.ink },
  addBtn: { borderWidth: 2, borderColor: colors.ink, padding: 13 },
  addBtnText: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, color: colors.ink },
  list: { padding: 20, gap: 18 },
});
