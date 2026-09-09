import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useDb } from '@/db/useDb';
import { getAccountsOverview, type AccountsOverview } from '@/db/repositories/accountsRepo';
import { colors, fonts } from '@/theme';
import { formatRupiah } from '@/utils/currency';
import { SectionLabel } from '@/components/SectionLabel';
import { Divider } from '@/components/Divider';
import { Screen } from '@/components/Screen';

export default function AccountsScreen() {
  const db = useDb();
  const [overview, setOverview] = useState<AccountsOverview | null>(null);

  useFocusEffect(
    useCallback(() => {
      getAccountsOverview(db).then(setOverview);
    }, [db])
  );

  if (!overview) return <View style={styles.screen} />;

  return (
    <Screen>
    <ScrollView style={styles.screen}>
      <View style={styles.top}>
        <SectionLabel>NET WORTH</SectionLabel>
        <Text style={[styles.netWorth, overview.netWorth < 0 && styles.negative]}>{overview.netWorth < 0 ? '−' : ''}{formatRupiah(overview.netWorth)}</Text>
      </View>
      <View style={styles.splitRow}>
        <View style={styles.splitCell}>
          <Text style={styles.splitLabel}>ASSETS</Text>
          <Text style={styles.splitValue}>{formatRupiah(overview.assetsTotal)}</Text>
        </View>
        <View style={[styles.splitCell, styles.splitCellLast]}>
          <Text style={styles.splitLabel}>LIABILITIES</Text>
          <Text style={[styles.splitValue, { color: colors.danger }]}>{formatRupiah(overview.liabilitiesTotal)}</Text>
        </View>
      </View>

      <View style={{ padding: 20 }}>
        <Pressable
          style={styles.addBtn}
          onPress={() => router.push('/add-account')}
        >
          <Text style={styles.addBtnText}>+ ADD AN ACCOUNT</Text>
        </Pressable>
      </View>

      {[...overview.assets, ...overview.liabilities].map((group) => (
        <View key={group.label}>
          <View style={styles.groupHeader}>
            <Text style={styles.groupLabel}>{group.label.toUpperCase()}</Text>
            <Text style={styles.groupTotal}>{formatRupiah(group.total)}</Text>
          </View>
          {group.accounts.map((a) => (
            <Pressable key={a.id} style={styles.accRow} onPress={() => router.push(`/accounts/${a.id}`)}>
              <View style={styles.accChip}>
                <Text style={styles.accChipText}>{a.name.slice(0, 2).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.accName}>{a.name}</Text>
                <Text style={styles.accMeta}>
                  {a.kind === 'assets' ? 'Assets' : 'Liabilities'} · {a.groupLabel}
                </Text>
              </View>
              <Text style={[styles.accBalance, a.balance < 0 && styles.negative]}>{a.balance < 0 ? '−' : ''}{formatRupiah(a.balance)}</Text>
            </Pressable>
          ))}
        </View>
      ))}
      <View style={{ height: 28 }} />
    </ScrollView>
  </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  top: { padding: 20, paddingBottom: 12 },
  netWorth: { fontFamily: fonts.extraBold, fontSize: 34, color: colors.ink, marginTop: 4 },
  negative: { color: colors.danger },
  splitRow: { flexDirection: 'row', borderTopWidth: 2, borderTopColor: colors.ink, borderBottomWidth: 2, borderBottomColor: colors.ink, backgroundColor: colors.white },
  splitCell: { flex: 1, padding: 14, borderRightWidth: 1, borderRightColor: colors.dividerSoft16 },
  splitCellLast: { borderRightWidth: 0 },
  splitLabel: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1.4, color: colors.textMuted },
  splitValue: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink, marginTop: 3 },
  addBtn: { borderWidth: 2, borderColor: colors.ink, padding: 13 },
  addBtnText: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, color: colors.ink },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.bg },
  groupLabel: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.6, color: colors.ink },
  groupTotal: { fontFamily: fonts.bold, fontSize: 10, color: colors.textMuted },
  accRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 13, borderTopWidth: 1, borderTopColor: colors.dividerSoft12, backgroundColor: colors.white },
  accChip: { width: 34, height: 34, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  accChipText: { fontFamily: fonts.bold, fontSize: 11, color: colors.ink },
  accName: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.ink },
  accMeta: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  accBalance: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
});
