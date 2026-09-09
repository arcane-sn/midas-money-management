import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useDb } from '@/db/useDb';
import { listBudgetViews, type BudgetView } from '@/db/repositories/budgetsRepo';
import { listRecentTransactions, accountNameLookup, subcategoryNameLookup, type Transaction } from '@/db/repositories/transactionsRepo';
import { colors, fonts } from '@/theme';
import { monthLabel } from '@/utils/date';
import { Logo } from '@/components/Logo';
import { Divider } from '@/components/Divider';
import { SectionLabel } from '@/components/SectionLabel';
import { BudgetBar } from '@/components/BudgetBar';
import { TxRow } from '@/components/TxRow';
import { Screen } from '@/components/Screen';

export default function HomeScreen() {
  const db = useDb();
  const [budgets, setBudgets] = useState<BudgetView[]>([]);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [names, setNames] = useState<{ acc: Map<string, string>; sub: Map<string, string> }>({ acc: new Map(), sub: new Map() });

  const load = useCallback(async () => {
    const [b, r, accLookup, subLookup] = await Promise.all([
      listBudgetViews(db),
      listRecentTransactions(db, 4),
      accountNameLookup(db),
      subcategoryNameLookup(db),
    ]);
    setBudgets(b);
    setRecent(r);
    setNames({ acc: accLookup, sub: subLookup });
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <Screen>
    <ScrollView style={styles.screen}>
      <View style={styles.header}>
        <Logo size={26} />
        <View style={styles.headerRight}>
          <Text style={styles.monthLabel}>{monthLabel()}</Text>
          <Pressable style={styles.addBtn} onPress={() => router.push('/add-transaction')}>
            <Text style={styles.addBtnText}>+ ADD</Text>
          </Pressable>
        </View>
      </View>
      <Divider />

      <SectionLabel right="All budgets" onPressRight={() => router.push('/budgets')}>BUDGET BURN-DOWN</SectionLabel>
      <View style={styles.budgetList}>
        {budgets.slice(0, 4).map((b) => (
          <Pressable key={b.id} onPress={() => router.push(`/budgets/${b.id}`)}>
            <BudgetBar budget={b} />
          </Pressable>
        ))}
      </View>
      <Divider />

      <SectionLabel right="See all" onPressRight={() => router.push('/ledger')}>RECENT</SectionLabel>
      <View style={{ paddingBottom: 24 }}>
        {recent.map((t) => (
          <TxRow
            key={t.id}
            tx={t}
            accountName={names.acc.get(t.accountId) ?? ''}
            toAccountName={t.toAccountId ? names.acc.get(t.toAccountId) : undefined}
            subcategoryName={t.subcategoryId ? names.sub.get(t.subcategoryId) : undefined}
            onPress={() => router.push({ pathname: '/add-transaction', params: { id: t.id } })}
          />
        ))}
      </View>
    </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, paddingTop: 20 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  monthLabel: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.4, color: colors.textMuted },
  addBtn: { backgroundColor: colors.ink, paddingHorizontal: 12, paddingVertical: 8 },
  addBtnText: { fontFamily: fonts.extraBold, fontSize: 11, letterSpacing: 1, color: colors.white },
  budgetList: { paddingHorizontal: 20, paddingBottom: 18, gap: 16 },
});
