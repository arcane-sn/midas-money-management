import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useDb } from '@/db/useDb';
import { getLedger, accountNameLookup, subcategoryNameLookup } from '@/db/repositories/transactionsRepo';
import type { Transaction } from '@/db/repositories/transactionsRepo';
import type { PeriodFilter } from '@/db/repositories/ledgerLogic';
import { listAccounts } from '@/db/repositories/accountsRepo';
import type { Account } from '@/db/repositories/accountsRepo';
import { colors, fonts } from '@/theme';
import { formatRupiah, formatSigned } from '@/utils/currency';
import { dayHeading } from '@/utils/date';
import { TxRow } from '@/components/TxRow';
import { Screen } from '@/components/Screen';
import { BottomSheet } from '@/components/BottomSheet';

const TYPE_FILTERS: { key: Transaction['type']; label: string }[] = [
  { key: 'expense', label: 'OUT' },
  { key: 'income', label: 'IN' },
  { key: 'transfer', label: 'TRANSFERS' },
];

const PERIOD_FILTERS: { key: PeriodFilter; label: string }[] = [
  { key: 'all', label: 'ALL TIME' },
  { key: 'week', label: 'THIS WEEK' },
  { key: 'month', label: 'THIS MONTH' },
];

export default function LedgerScreen() {
  const db = useDb();
  const [typeFilter, setTypeFilter] = useState<Transaction['type']>('expense');
  const [accountFilter, setAccountFilter] = useState<'all' | string>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [days, setDays] = useState<{ date: string; net: number; transactions: Transaction[] }[]>([]);
  const [names, setNames] = useState<{ acc: Map<string, string>; sub: Map<string, string> }>({ acc: new Map(), sub: new Map() });

  const load = useCallback(async () => {
    const [ledger, accs, accLookup, subLookup] = await Promise.all([
      getLedger(db, typeFilter, accountFilter, periodFilter),
      listAccounts(db),
      accountNameLookup(db),
      subcategoryNameLookup(db),
    ]);
    setDays(ledger.days);
    setAccounts(accs);
    setNames({ acc: accLookup, sub: subLookup });
  }, [db, typeFilter, accountFilter, periodFilter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const totalCount = days.reduce((sum, d) => sum + d.transactions.length, 0);
  const hasActiveFilter = periodFilter !== 'all' || accountFilter !== 'all';

  return (
    <Screen>
    <ScrollView style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Money in & out</Text>
          <Text style={styles.count}>{totalCount} entries</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.filterActionBtn} onPress={() => setFilterSheetOpen(true)}>
            <Text style={styles.filterActionBtnText}>FILTER</Text>
            {hasActiveFilter ? <View style={styles.filterDot} /> : null}
          </Pressable>
          <Pressable style={styles.addBtn} onPress={() => router.push('/add-transaction')}>
            <Text style={styles.addBtnText}>+ ADD</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.filterRow}>
        {TYPE_FILTERS.map((f) => (
          <Pressable
            key={f.key}
            style={[styles.filterBtn, typeFilter === f.key && styles.filterBtnActive]}
            onPress={() => setTypeFilter(f.key)}
          >
            <Text style={[styles.filterText, typeFilter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>

      {days.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Nothing here yet. Try another filter.</Text>
        </View>
      ) : (
        days.map((d) => (
          <View key={d.date}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayLabel}>{dayHeading(d.date)}</Text>
              <Text style={styles.dayTotal}>{d.net === 0 ? formatRupiah(0) : formatSigned(d.net)}</Text>
            </View>
            {d.transactions.map((t) => (
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
        ))
      )}
      <View style={{ height: 28 }} />
    </ScrollView>

    <BottomSheet visible={filterSheetOpen} onClose={() => setFilterSheetOpen(false)}>
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>FILTERS</Text>
        <Pressable onPress={() => setFilterSheetOpen(false)}>
          <Text style={styles.sheetDone}>DONE</Text>
        </Pressable>
      </View>
      <ScrollView>
        <Text style={styles.sheetGroupLabel}>PERIOD</Text>
        <View style={styles.sheetChipRow}>
          {PERIOD_FILTERS.map((f) => (
            <Pressable
              key={f.key}
              style={[styles.periodChip, periodFilter === f.key && styles.periodChipActive]}
              onPress={() => setPeriodFilter(f.key)}
            >
              <Text style={[styles.periodChipText, periodFilter === f.key && styles.periodChipTextActive]}>{f.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sheetGroupLabel}>ACCOUNT</Text>
        <View style={styles.sheetChipRow}>
          <Pressable style={[styles.accChip, accountFilter === 'all' && styles.accChipActive]} onPress={() => setAccountFilter('all')}>
            <Text style={[styles.accChipText, accountFilter === 'all' && styles.accChipTextActive]}>ALL ACCOUNTS</Text>
          </Pressable>
          {accounts.map((a) => (
            <Pressable key={a.id} style={[styles.accChip, accountFilter === a.id && styles.accChipActive]} onPress={() => setAccountFilter(a.id)}>
              <Text style={[styles.accChipText, accountFilter === a.id && styles.accChipTextActive]}>{a.name.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </BottomSheet>
  </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', padding: 20, paddingBottom: 12 },
  title: { fontFamily: fonts.extraBold, fontSize: 24, color: colors.ink },
  count: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, marginTop: 3 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 2, borderColor: colors.ink, paddingHorizontal: 12, paddingVertical: 7 },
  filterActionBtnText: { fontFamily: fonts.extraBold, fontSize: 11, letterSpacing: 1, color: colors.ink },
  filterDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accentGold },
  addBtn: { backgroundColor: colors.ink, paddingHorizontal: 12, paddingVertical: 8 },
  addBtnText: { fontFamily: fonts.extraBold, fontSize: 11, letterSpacing: 1, color: colors.white },
  filterRow: { flexDirection: 'row', borderTopWidth: 2, borderTopColor: colors.ink, borderBottomWidth: 2, borderBottomColor: colors.ink },
  filterBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.bg },
  filterBtnActive: { backgroundColor: colors.ink },
  filterText: { fontFamily: fonts.bold, fontSize: 11, color: colors.textMuted },
  filterTextActive: { color: colors.white },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.dividerSoft12 },
  sheetTitle: { fontFamily: fonts.extraBold, fontSize: 11, letterSpacing: 1.6, color: colors.ink },
  sheetDone: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.8, color: colors.accentLink },
  sheetGroupLabel: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.4, color: colors.textMuted, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8 },
  sheetChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20 },
  periodChip: { borderWidth: 1, borderColor: colors.dividerSoft16, paddingHorizontal: 10, paddingVertical: 6 },
  periodChipActive: { backgroundColor: colors.accentGold, borderColor: colors.accentGold },
  periodChipText: { fontFamily: fonts.bold, fontSize: 10, color: colors.textSecondary },
  periodChipTextActive: { color: colors.white },
  accChip: { borderWidth: 1, borderColor: colors.dividerSoft16, paddingHorizontal: 10, paddingVertical: 6 },
  accChipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  accChipText: { fontFamily: fonts.bold, fontSize: 10, color: colors.textSecondary },
  accChipTextActive: { color: colors.white },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.bg },
  dayLabel: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1, color: colors.textSecondary },
  dayTotal: { fontFamily: fonts.bold, fontSize: 10, color: colors.textSecondary },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
});
