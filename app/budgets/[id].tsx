import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useDb } from '@/db/useDb';
import { getBudgetView, getBudgetTransactions, updateBudgetAmount, type BudgetView } from '@/db/repositories/budgetsRepo';
import { subcategoryNameLookup, type Transaction } from '@/db/repositories/transactionsRepo';
import { colors, fonts } from '@/theme';
import { formatRupiah } from '@/utils/currency';
import { daysInMonth, currentMonthKey, dayOfMonth, todayISO } from '@/utils/date';
import { sanitizeDigits, groupDigits } from '@/utils/digits';
import { BudgetBar } from '@/components/BudgetBar';
import { Screen } from '@/components/Screen';
import { BottomSheet } from '@/components/BottomSheet';
import { TextField } from '@/components/TextField';

export default function BudgetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const [budget, setBudget] = useState<BudgetView | null>(null);
  const [tx, setTx] = useState<Transaction[]>([]);
  const [subNames, setSubNames] = useState<Map<string, string>>(new Map());
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [limitDigits, setLimitDigits] = useState('');

  const load = useCallback(async () => {
    const [b, t, sub] = await Promise.all([getBudgetView(db, id), getBudgetTransactions(db, id), subcategoryNameLookup(db)]);
    setBudget(b);
    setTx(t);
    setSubNames(sub);
  }, [db, id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onSaveLimit = useCallback(async () => {
    const amount = parseInt(limitDigits || '0', 10);
    if (!amount) return;
    await updateBudgetAmount(db, id, amount);
    setEditSheetOpen(false);
    load();
  }, [db, id, limitDigits, load]);

  if (!budget) return <View style={styles.screen} />;

  const day = dayOfMonth(todayISO());
  const total = daysInMonth(currentMonthKey());
  const safeDays = Math.max(1, total - day);
  const dailyPace = budget.spent / Math.max(1, day);
  const safePerDay = budget.locked ? 0 : budget.remain / safeDays;

  return (
    <Screen>
    <ScrollView style={styles.screen}>
      <Pressable style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← BUDGETS</Text>
      </Pressable>
      <View style={styles.head}>
        <BudgetBar budget={budget} big />
      </View>
      <View style={styles.splitRow}>
        <View style={styles.splitCell}>
          <Text style={styles.splitLabel}>DAILY PACE</Text>
          <Text style={styles.splitValue}>{formatRupiah(dailyPace)}</Text>
        </View>
        <View style={[styles.splitCell, styles.splitCellLast]}>
          <Text style={styles.splitLabel}>SAFE PER DAY LEFT</Text>
          <Text style={styles.splitValue}>{formatRupiah(safePerDay)}</Text>
        </View>
      </View>
      <Text style={styles.sectionLabel}>WHAT DREW IT DOWN</Text>
      {tx.map((t) => (
        <View key={t.id} style={styles.txRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.txTitle} numberOfLines={1}>
              {t.note || subNames.get(t.subcategoryId ?? '') || 'Entry'}
            </Text>
            <Text style={styles.txSub} numberOfLines={1}>
              {subNames.get(t.subcategoryId ?? '') ?? ''}
            </Text>
          </View>
          <Text style={styles.txAmount}>−{formatRupiah(t.amount)}</Text>
        </View>
      ))}
      <View style={styles.raiseWrap}>
        <Pressable
          style={styles.raiseBtn}
          onPress={() => {
            setLimitDigits(String(budget.limitAmount));
            setEditSheetOpen(true);
          }}
        >
          <Text style={styles.raiseBtnText}>EDIT AMOUNT</Text>
        </Pressable>
      </View>
    </ScrollView>

    <BottomSheet visible={editSheetOpen} onClose={() => setEditSheetOpen(false)}>
      <View style={{ padding: 20 }}>
        <Text style={styles.sheetLabel}>MONTHLY LIMIT</Text>
        <View style={{ marginTop: 8 }}>
          <TextField
            value={groupDigits(limitDigits)}
            onChangeText={(v) => setLimitDigits(sanitizeDigits(v))}
            keyboardType="numeric"
            placeholder="0"
            prefix="Rp"
          />
        </View>
        <Pressable style={styles.sheetSaveBtn} onPress={onSaveLimit}>
          <Text style={styles.sheetSaveBtnText}>SAVE AMOUNT</Text>
        </Pressable>
      </View>
    </BottomSheet>
  </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  back: { padding: 20, paddingBottom: 0 },
  backText: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1, color: colors.textMuted },
  head: { padding: 20 },
  splitRow: { flexDirection: 'row', borderTopWidth: 2, borderTopColor: colors.ink, borderBottomWidth: 2, borderBottomColor: colors.ink, backgroundColor: colors.white },
  splitCell: { flex: 1, padding: 14, borderRightWidth: 1, borderRightColor: colors.dividerSoft16 },
  splitCellLast: { borderRightWidth: 0 },
  splitLabel: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1.4, color: colors.textMuted },
  splitValue: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink, marginTop: 3 },
  sectionLabel: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.6, color: colors.textMuted, paddingHorizontal: 20, paddingVertical: 12 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.dividerSoft12, backgroundColor: colors.white },
  txTitle: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.ink },
  txSub: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  txAmount: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  raiseWrap: { padding: 20, borderTopWidth: 2, borderTopColor: colors.ink, marginTop: 14 },
  raiseBtn: { backgroundColor: colors.ink, padding: 14 },
  raiseBtnText: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, color: colors.white },
  sheetLabel: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.6, color: colors.textMuted },
  sheetSaveBtn: { backgroundColor: colors.ink, padding: 16, marginTop: 20, alignItems: 'center' },
  sheetSaveBtnText: { fontFamily: fonts.extraBold, fontSize: 12, letterSpacing: 1.2, color: colors.white },
});
