import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useDb } from '@/db/useDb';
import { getAccountDetail, type AccountDetail } from '@/db/repositories/accountsRepo';
import { accountNameLookup, subcategoryNameLookup } from '@/db/repositories/transactionsRepo';
import { colors, fonts } from '@/theme';
import { formatRupiah } from '@/utils/currency';
import { TxRow } from '@/components/TxRow';
import { Screen } from '@/components/Screen';

export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const [detail, setDetail] = useState<AccountDetail | null>(null);
  const [names, setNames] = useState<{ acc: Map<string, string>; sub: Map<string, string> }>({ acc: new Map(), sub: new Map() });

  useFocusEffect(
    useCallback(() => {
      Promise.all([getAccountDetail(db, id), accountNameLookup(db), subcategoryNameLookup(db)]).then(([d, acc, sub]) => {
        setDetail(d);
        setNames({ acc, sub });
      });
    }, [db, id])
  );

  if (!detail) return <View style={styles.screen} />;
  const { account } = detail;

  return (
    <Screen>
    <ScrollView style={styles.screen}>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>← ACCOUNTS</Text>
        </Pressable>
        <Pressable onPress={() => router.push({ pathname: '/edit-account', params: { id: account.id } })}>
          <Text style={styles.editText}>EDIT</Text>
        </Pressable>
      </View>
      <View style={styles.head}>
        <Text style={styles.meta}>
          {account.kind === 'assets' ? 'Assets' : 'Liabilities'} · {account.groupLabel}
        </Text>
        <Text style={styles.name}>{account.name}</Text>
        <Text style={[styles.balance, account.balance < 0 && styles.negative]}>
          {account.balance < 0 ? '−' : ''}
          {formatRupiah(account.balance)}
        </Text>
      </View>
      <View style={styles.splitRow}>
        <View style={styles.splitCell}>
          <Text style={styles.splitLabel}>IN THIS MONTH</Text>
          <Text style={styles.splitValue}>{formatRupiah(detail.inMonth)}</Text>
        </View>
        <View style={[styles.splitCell, styles.splitCellLast]}>
          <Text style={styles.splitLabel}>OUT THIS MONTH</Text>
          <Text style={styles.splitValue}>{formatRupiah(detail.outMonth)}</Text>
        </View>
      </View>
      <Text style={styles.sectionLabel}>ACTIVITY</Text>
      {detail.transactions.map((t) => (
        <TxRow
          key={t.id}
          tx={t}
          accountName={names.acc.get(t.accountId) ?? ''}
          toAccountName={t.toAccountId ? names.acc.get(t.toAccountId) : undefined}
          subcategoryName={t.subcategoryId ? names.sub.get(t.subcategoryId) : undefined}
          onPress={() => router.push({ pathname: '/add-transaction', params: { id: t.id } })}
        />
      ))}
      <View style={{ height: 28 }} />
    </ScrollView>
  </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 0 },
  backText: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1, color: colors.textMuted },
  editText: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1, color: colors.accentLink },
  head: { padding: 20 },
  meta: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.6, color: colors.textMuted },
  name: { fontFamily: fonts.extraBold, fontSize: 24, color: colors.ink, marginTop: 6 },
  balance: { fontFamily: fonts.extraBold, fontSize: 34, color: colors.ink, marginTop: 10 },
  negative: { color: colors.danger },
  splitRow: { flexDirection: 'row', borderTopWidth: 2, borderTopColor: colors.ink, borderBottomWidth: 2, borderBottomColor: colors.ink, backgroundColor: colors.white },
  splitCell: { flex: 1, padding: 14, borderRightWidth: 1, borderRightColor: colors.dividerSoft16 },
  splitCellLast: { borderRightWidth: 0 },
  splitLabel: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1.4, color: colors.textMuted },
  splitValue: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink, marginTop: 3 },
  sectionLabel: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.6, color: colors.textMuted, paddingHorizontal: 20, paddingVertical: 12 },
});
