import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useDb } from '@/db/useDb';
import { listAccounts } from '@/db/repositories/accountsRepo';
import { seedDatabase } from '@/db/seed';
import { colors, fonts } from '@/theme';
import { Logo } from '@/components/Logo';
import { Divider } from '@/components/Divider';
import { Screen } from '@/components/Screen';

const STEPS = [
  { n: '01', title: 'Add your accounts', body: 'Assets and liabilities, grouped how you like.' },
  { n: '02', title: 'Set budgets that hold', body: 'Spend a budget out and the category locks itself.' },
  { n: '03', title: 'Log money in, out and across', body: 'Three taps and a keypad.' },
];

export default function StartGate() {
  const db = useDb();
  const [status, setStatus] = useState<'checking' | 'empty' | 'seeding'>('checking');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      listAccounts(db).then((accs) => {
        if (cancelled) return;
        if (accs.length > 0) {
          router.replace('/(tabs)');
        } else {
          setStatus('empty');
        }
      });
      return () => {
        cancelled = true;
      };
    }, [db])
  );

  const onSampleData = useCallback(async () => {
    setStatus('seeding');
    await seedDatabase(db);
    router.replace('/(tabs)');
  }, [db]);

  const onFirstAccount = useCallback(() => {
    router.push('/add-account');
  }, []);

  if (status === 'checking') return <View style={styles.blank} />;

  return (
    <Screen>
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Logo size={64} />
      <Divider />
      <Text style={styles.kicker}>BUDGET & MONEY MANAGER</Text>
      <Text style={styles.pitch}>
        Every account, every budget, kept on this phone. No sign-in, no sync, nothing leaves the device.
      </Text>

      <View style={styles.steps}>
        {STEPS.map((s) => (
          <View key={s.n} style={styles.step}>
            <View style={styles.stepNoWrap}>
              <Text style={styles.stepNo}>{s.n}</Text>
            </View>
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>{s.title}</Text>
              <Text style={styles.stepText}>{s.body}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.primaryBtn} onPress={onFirstAccount}>
          <Text style={styles.primaryBtnText}>SET UP MY FIRST ACCOUNT</Text>
          <Text style={styles.primaryBtnArrow}>→</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={onSampleData} disabled={status === 'seeding'}>
          <Text style={styles.secondaryBtnText}>
            {status === 'seeding' ? 'SETTING UP…' : 'LOOK AROUND WITH SAMPLE DATA'}
          </Text>
        </Pressable>
        <Text style={styles.footnote}>Optional Face ID lock can be switched on in Settings later.</Text>
      </View>
    </ScrollView>
  </Screen>
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: colors.bg },
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, paddingBottom: 40 },
  kicker: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 2, color: colors.textMuted, marginTop: 10 },
  pitch: { fontFamily: fonts.semiBold, fontSize: 19, lineHeight: 26, color: colors.ink, marginTop: 20 },
  steps: { marginTop: 24, backgroundColor: colors.white, borderTopWidth: 2, borderTopColor: colors.ink, borderBottomWidth: 2, borderBottomColor: colors.ink },
  step: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.dividerSoft14 },
  stepNoWrap: { width: 44, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: colors.dividerSoft14 },
  stepNo: { fontFamily: fonts.extraBold, fontSize: 12, color: colors.accentGold },
  stepBody: { flex: 1, padding: 14 },
  stepTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  stepText: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 3 },
  actions: { marginTop: 28, gap: 10 },
  primaryBtn: { backgroundColor: colors.ink, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  primaryBtnText: { fontFamily: fonts.extraBold, fontSize: 12, letterSpacing: 1.2, color: colors.white },
  primaryBtnArrow: { fontSize: 15, color: colors.white },
  secondaryBtn: { borderWidth: 2, borderColor: colors.ink, padding: 13, alignItems: 'flex-start' },
  secondaryBtnText: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, color: colors.ink },
  footnote: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.textFaint, marginTop: 4 },
});
