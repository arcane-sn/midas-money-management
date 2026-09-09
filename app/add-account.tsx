import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useDb } from '@/db/useDb';
import { listAccountGroups, createAccountGroup, createAccount } from '@/db/repositories/accountsRepo';
import { colors, fonts } from '@/theme';
import { sanitizeDigits, groupDigits } from '@/utils/digits';
import { Screen } from '@/components/Screen';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Pill } from '@/components/Pill';
import { TextField } from '@/components/TextField';

type Kind = 'assets' | 'liabilities';

export default function AddAccountScreen() {
  const db = useDb();
  const [kind, setKind] = useState<Kind>('assets');
  const [groups, setGroups] = useState<string[]>([]);
  const [group, setGroup] = useState('');
  const [addingGroup, setAddingGroup] = useState(false);
  const [groupDraft, setGroupDraft] = useState('');
  const [name, setName] = useState('');
  const [amountDigits, setAmountDigits] = useState('');
  const [negative, setNegative] = useState(false);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadGroups = useCallback(
    async (k: Kind) => {
      const list = await listAccountGroups(db, k);
      setGroups(list);
      setGroup((prev) => (list.includes(prev) ? prev : list[0] ?? ''));
    },
    [db]
  );

  useEffect(() => {
    loadGroups(kind);
  }, [kind, loadGroups]);

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
    const amount = parseInt(amountDigits || '0', 10);
    const balance = isNegative ? -amount : amount;
    await createAccount(db, { name: name.trim(), kind, groupLabel: group, balance, description: description.trim() || undefined });
    router.back();
  }, [db, name, amountDigits, isNegative, kind, group, description]);

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.headerBtn}>CANCEL</Text>
        </Pressable>
        <Text style={styles.headerTitle}>NEW ACCOUNT</Text>
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
        onChange={(k) => setKind(k as Kind)}
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
          <Text style={styles.label}>{kind === 'liabilities' ? 'AMOUNT OWED' : 'STARTING AMOUNT'}</Text>
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
        <Text style={styles.hint}>
          {kind === 'liabilities'
            ? 'Liabilities are held as a negative balance, so this counts against your net worth.'
            : 'Tap the sign toggle if this asset is currently overdrawn.'}
        </Text>

        <Text style={styles.label}>DESCRIPTION</Text>
        <View style={styles.field}>
          <TextField value={description} onChangeText={setDescription} placeholder="What is this account for?" multiline />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable style={styles.bigSave} onPress={onSave}>
          <Text style={styles.bigSaveText}>SAVE ACCOUNT</Text>
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
  errorText: { fontFamily: fonts.medium, fontSize: 12, color: colors.danger, paddingHorizontal: 20, paddingTop: 14 },
  bigSave: { backgroundColor: colors.ink, padding: 16, marginHorizontal: 20, marginTop: 24, alignItems: 'center' },
  bigSaveText: { fontFamily: fonts.extraBold, fontSize: 12, letterSpacing: 1.2, color: colors.white },
});
