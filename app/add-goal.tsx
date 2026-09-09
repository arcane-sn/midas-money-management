import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useDb } from '@/db/useDb';
import { listAccounts, type Account } from '@/db/repositories/accountsRepo';
import { getGoalView, createGoal, updateGoal } from '@/db/repositories/goalsRepo';
import { colors, fonts } from '@/theme';
import { sanitizeDigits, groupDigits } from '@/utils/digits';
import { Screen } from '@/components/Screen';
import { Pill } from '@/components/Pill';
import { TextField } from '@/components/TextField';

export default function AddGoalScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const db = useDb();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [name, setName] = useState('');
  const [targetDigits, setTargetDigits] = useState('');
  const [accountIds, setAccountIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listAccounts(db), id ? getGoalView(db, id) : Promise.resolve(null)]).then(([accs, existing]) => {
      setAccounts(accs);
      if (existing) {
        setName(existing.name);
        setTargetDigits(String(existing.targetAmount));
        setAccountIds(existing.accountIds);
      }
    });
  }, [db, id]);

  const toggleAccount = useCallback((accountId: string) => {
    setAccountIds((prev) => (prev.includes(accountId) ? prev.filter((a) => a !== accountId) : [...prev, accountId]));
  }, []);

  const onSave = useCallback(async () => {
    const target = parseInt(targetDigits || '0', 10);
    if (!name.trim()) {
      setError('Give the goal a name.');
      return;
    }
    if (!target) {
      setError('Set a target amount first.');
      return;
    }
    if (accountIds.length === 0) {
      setError('Link at least one account to track progress.');
      return;
    }
    const payload = { name: name.trim(), targetAmount: target, accountIds };
    if (id) {
      await updateGoal(db, id, payload);
    } else {
      await createGoal(db, payload);
    }
    router.back();
  }, [db, id, name, targetDigits, accountIds]);

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.headerBtn}>CANCEL</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{id ? 'EDIT GOAL' : 'NEW GOAL'}</Text>
        <Pressable onPress={onSave}>
          <Text style={[styles.headerBtn, styles.headerSave]}>SAVE</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.label}>NAME</Text>
        <View style={styles.field}>
          <TextField value={name} onChangeText={setName} placeholder="Emergency fund" />
        </View>

        <View style={styles.limitBlock}>
          <Text style={styles.label}>TARGET AMOUNT</Text>
          <View style={{ marginTop: 8 }}>
            <TextField
              value={groupDigits(targetDigits)}
              onChangeText={(v) => setTargetDigits(sanitizeDigits(v))}
              keyboardType="numeric"
              placeholder="0"
              prefix="Rp"
            />
          </View>
        </View>

        <Text style={styles.label}>LINKED ACCOUNTS</Text>
        <View style={styles.pillRow}>
          {accounts.map((a) => (
            <Pill key={a.id} label={a.name.toUpperCase()} active={accountIds.includes(a.id)} onPress={() => toggleAccount(a.id)} />
          ))}
        </View>
        <Text style={styles.hint}>Progress tracks the combined current balance of the accounts you pick here against your target.</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable style={styles.bigSave} onPress={onSave}>
          <Text style={styles.bigSaveText}>SAVE GOAL</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  headerBtn: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.8, color: colors.textMuted },
  headerSave: { color: colors.ink },
  headerTitle: { fontFamily: fonts.extraBold, fontSize: 11, letterSpacing: 1.6, color: colors.ink },
  label: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.6, color: colors.textMuted, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8 },
  field: { paddingHorizontal: 20 },
  limitBlock: { backgroundColor: colors.white, padding: 20, marginTop: 4 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20 },
  hint: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.textMuted, paddingHorizontal: 20, paddingTop: 10 },
  errorText: { fontFamily: fonts.medium, fontSize: 12, color: colors.danger, paddingHorizontal: 20, paddingTop: 14 },
  bigSave: { backgroundColor: colors.ink, padding: 16, marginHorizontal: 20, marginTop: 24, alignItems: 'center' },
  bigSaveText: { fontFamily: fonts.extraBold, fontSize: 12, letterSpacing: 1.2, color: colors.white },
});
