import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useDb } from '@/db/useDb';
import { getAccount, listAccountGroups, createAccountGroup, updateAccountDetails } from '@/db/repositories/accountsRepo';
import { createTransaction } from '@/db/repositories/transactionsRepo';
import { colors, fonts } from '@/theme';
import { sanitizeDigits, groupDigits } from '@/utils/digits';
import { formatRupiah } from '@/utils/currency';
import { todayISO } from '@/utils/date';
import { Screen } from '@/components/Screen';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Pill } from '@/components/Pill';
import { TextField } from '@/components/TextField';

type Kind = 'assets' | 'liabilities';

export default function EditAccountScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const [loaded, setLoaded] = useState(false);
  const [kind, setKind] = useState<Kind>('assets');
  const [groups, setGroups] = useState<string[]>([]);
  const [group, setGroup] = useState('');
  const [addingGroup, setAddingGroup] = useState(false);
  const [groupDraft, setGroupDraft] = useState('');
  const [name, setName] = useState('');
  const [originalBalance, setOriginalBalance] = useState(0);
  const [amountDigits, setAmountDigits] = useState('');
  const [negative, setNegative] = useState(false);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadGroups = useCallback(
    async (k: Kind) => {
      const list = await listAccountGroups(db, k);
      setGroups(list);
      return list;
    },
    [db]
  );

  useEffect(() => {
    getAccount(db, id).then(async (account) => {
      if (!account) return;
      setKind(account.kind);
      setName(account.name);
      setDescription(account.description ?? '');
      setOriginalBalance(account.balance);
      setAmountDigits(String(Math.abs(account.balance)));
      setNegative(account.balance < 0 && account.kind === 'assets');
      const list = await loadGroups(account.kind);
      setGroup(list.includes(account.groupLabel) ? account.groupLabel : list[0] ?? account.groupLabel);
      setLoaded(true);
    });
  }, [db, id, loadGroups]);

  const onChangeKind = useCallback(
    async (k: Kind) => {
      setKind(k);
      const list = await loadGroups(k);
      setGroup((prev) => (list.includes(prev) ? prev : list[0] ?? ''));
    },
    [loadGroups]
  );

  const onCommitGroup = useCallback(async () => {
    const label = groupDraft.trim();
    if (!label) return;
    await createAccountGroup(db, kind, label);
    setGroupDraft('');
    setAddingGroup(false);
    await loadGroups(kind);
    setGroup(label);
  }, [db, kind, groupDraft, loadGroups]);

  const isNegative = kind === 'liabilities' || negative;

  const onSave = useCallback(async () => {
    if (!name.trim()) {
      setError('Give the account a name.');
      return;
    }
    const magnitude = parseInt(amountDigits || '0', 10);
    const newBalance = isNegative ? -magnitude : magnitude;

    await updateAccountDetails(db, id, { name: name.trim(), kind, groupLabel: group, description: description.trim() || undefined });

    const delta = newBalance - originalBalance;
    if (delta !== 0) {
      await createTransaction(db, {
        date: todayISO(),
        type: delta > 0 ? 'income' : 'expense',
        amount: Math.abs(delta),
        accountId: id,
        note: 'Balance adjustment',
      });
    }
    router.back();
  }, [db, id, name, kind, group, description, amountDigits, isNegative, originalBalance]);

  if (!loaded) return <Screen><View style={{ flex: 1 }} /></Screen>;

  const magnitude = parseInt(amountDigits || '0', 10);
  const newBalance = isNegative ? -magnitude : magnitude;
  const delta = newBalance - originalBalance;

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.headerBtn}>CANCEL</Text>
        </Pressable>
        <Text style={styles.headerTitle}>EDIT ACCOUNT</Text>
        <Pressable onPress={onSave}>
          <Text style={[styles.headerBtn, styles.headerSave]}>SAVE</Text>
        </Pressable>
      </View>

      <SegmentedControl
        segments={[
          { key: 'assets', label: 'ASSETS' },
          { key: 'liabilities', label: 'LIABILITIES' },
        ]}
        value={kind}
        onChange={(k) => onChangeKind(k as Kind)}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.label}>ACCOUNT GROUP</Text>
        <View style={styles.pillRow}>
          {groups.map((g) => (
            <Pill key={g} label={g.toUpperCase()} active={group === g} onPress={() => setGroup(g)} />
          ))}
          <Pill label="+ NEW GROUP" active={false} dashed onPress={() => setAddingGroup((v) => !v)} />
        </View>
        {addingGroup ? (
          <View style={styles.newGroupRow}>
            <View style={{ flex: 1 }}>
              <TextField value={groupDraft} onChangeText={setGroupDraft} placeholder="Investment" />
            </View>
            <Pressable style={styles.addGroupBtn} onPress={onCommitGroup}>
              <Text style={styles.addGroupBtnText}>ADD</Text>
            </Pressable>
          </View>
        ) : null}

        <Text style={styles.label}>NAME</Text>
        <View style={styles.field}>
          <TextField value={name} onChangeText={setName} placeholder="Mandiri Payroll" />
        </View>

        <View style={styles.amountHeader}>
          <Text style={styles.label}>CURRENT AMOUNT</Text>
          {kind === 'assets' ? (
            <Pressable onPress={() => setNegative((v) => !v)}>
              <Text style={styles.signToggle}>{negative ? 'NEGATIVE' : 'POSITIVE'}</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.field}>
          <TextField
            value={groupDigits(amountDigits)}
            onChangeText={(v) => setAmountDigits(sanitizeDigits(v))}
            keyboardType="numeric"
            placeholder="0"
            prefix={isNegative ? '− Rp' : 'Rp'}
          />
        </View>
        {delta !== 0 ? (
          <Text style={styles.deltaHint}>
            Changing the amount logs {delta > 0 ? 'an income' : 'an expense'} of {formatRupiah(Math.abs(delta))} today, so
            your ledger stays accurate — nothing is silently overwritten.
          </Text>
        ) : (
          <Text style={styles.hint}>Editing this amount records the difference as an income or expense automatically.</Text>
        )}

        <Text style={styles.label}>DESCRIPTION</Text>
        <View style={styles.field}>
          <TextField value={description} onChangeText={setDescription} placeholder="What is this account for?" multiline />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable style={styles.bigSave} onPress={onSave}>
          <Text style={styles.bigSaveText}>SAVE CHANGES</Text>
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
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20 },
  newGroupRow: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 10 },
  addGroupBtn: { backgroundColor: colors.ink, paddingHorizontal: 16, justifyContent: 'center' },
  addGroupBtnText: { fontFamily: fonts.extraBold, fontSize: 11, letterSpacing: 1, color: colors.white },
  field: { paddingHorizontal: 20 },
  amountHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8 },
  signToggle: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.8, color: colors.accentLink },
  hint: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.textMuted, paddingHorizontal: 20, paddingTop: 7 },
  deltaHint: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 16, color: colors.accentLink, paddingHorizontal: 20, paddingTop: 7 },
  errorText: { fontFamily: fonts.medium, fontSize: 12, color: colors.danger, paddingHorizontal: 20, paddingTop: 14 },
  bigSave: { backgroundColor: colors.ink, padding: 16, marginHorizontal: 20, marginTop: 24, alignItems: 'center' },
  bigSaveText: { fontFamily: fonts.extraBold, fontSize: 12, letterSpacing: 1.2, color: colors.white },
});
