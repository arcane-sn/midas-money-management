import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useDb } from '@/db/useDb';
import { listAccounts, type Account } from '@/db/repositories/accountsRepo';
import { listCategoriesWithSubs, type CategoryWithSubs } from '@/db/repositories/categoriesRepo';
import { findBudgetViewFor, raiseBudget, type BudgetView } from '@/db/repositories/budgetsRepo';
import { createTransaction, updateTransaction, getTransaction } from '@/db/repositories/transactionsRepo';
import { RAISE_INCREMENT } from '@/db/repositories/budgetLogic';
import { getSetting } from '@/db/repositories/settingsRepo';
import { colors, fonts } from '@/theme';
import { formatRupiah } from '@/utils/currency';
import { formatDateLabel, todayISO, daysAgoISO } from '@/utils/date';
import { groupDigits, sanitizeDigits } from '@/utils/digits';
import { Screen } from '@/components/Screen';
import { SegmentedControl } from '@/components/SegmentedControl';
import { BottomSheet } from '@/components/BottomSheet';
import { NumericKeypad } from '@/components/NumericKeypad';

type TxType = 'expense' | 'income' | 'transfer';
type SheetKind = 'category' | 'account' | 'accountTo' | 'date' | 'note' | 'lock' | null;

const NOTE_SUGGESTIONS = ['Coffee run', 'Groceries', 'Ride-hailing', 'Rent', 'Salary', 'Freelance work'];

export default function AddTransactionScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const db = useDb();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cats, setCats] = useState<CategoryWithSubs[]>([]);
  const [lockBehavior, setLockBehavior] = useState<'lock' | 'hidden'>('lock');

  const [type, setType] = useState<TxType>('expense');
  const [amountDigits, setAmountDigits] = useState('');
  const [accountId, setAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [lockBudget, setLockBudget] = useState<BudgetView | null>(null);
  const [pendingSelection, setPendingSelection] = useState<{ catId: string; subId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subBudgetMap, setSubBudgetMap] = useState<Map<string, BudgetView>>(new Map());

  useEffect(() => {
    Promise.all([
      listAccounts(db),
      listCategoriesWithSubs(db),
      getSetting(db, 'lockBehavior', 'lock'),
      id ? getTransaction(db, id) : Promise.resolve(null),
    ]).then(([accs, categoriesWithSubs, behavior, existing]) => {
      setAccounts(accs);
      setCats(categoriesWithSubs);
      setLockBehavior(behavior === 'hidden' ? 'hidden' : 'lock');
      if (existing) {
        setType(existing.type);
        setAmountDigits(String(existing.amount));
        setAccountId(existing.accountId);
        setToAccountId(existing.toAccountId ?? accs[1]?.id ?? accs[0]?.id ?? '');
        setCategoryId(existing.categoryId);
        setSubcategoryId(existing.subcategoryId);
        setDate(existing.date);
        setNote(existing.note ?? '');
      } else if (accs.length > 0) {
        setAccountId(accs[0].id);
        setToAccountId(accs[1]?.id ?? accs[0].id);
      }
    });
  }, [db, id]);

  const pickerCats = useMemo(
    () => cats.filter((c) => c.kind === (type === 'income' ? 'income' : 'expense')),
    [cats, type]
  );

  useEffect(() => {
    if (sheet !== 'category' || type === 'income') return;
    let cancelled = false;
    Promise.all(
      pickerCats.flatMap((c) => c.subs.map(async (s) => [s.id, await findBudgetViewFor(db, c.id, s.id)] as const))
    ).then((pairs) => {
      if (cancelled) return;
      const map = new Map<string, BudgetView>();
      for (const [subId, budget] of pairs) {
        if (budget) map.set(subId, budget);
      }
      setSubBudgetMap(map);
    });
    return () => {
      cancelled = true;
    };
  }, [sheet, type, pickerCats, db]);

  const selectedCategory = cats.find((c) => c.id === categoryId);
  const selectedSub = selectedCategory?.subs.find((s) => s.id === subcategoryId);
  const adminCategory = cats.find((c) => c.isSystem);

  const categoryLabel = type === 'transfer' ? `${adminCategory?.name ?? 'Admin'} › Transfer between accounts` : selectedSub ? `${selectedCategory?.name} › ${selectedSub.name}` : 'Choose a category';

  const onPressDigit = useCallback((d: string) => {
    setAmountDigits((prev) => {
      if (prev.length > 10) return prev;
      if (d === '000' && !prev) return prev;
      return sanitizeDigits(prev + d);
    });
  }, []);
  const onDelete = useCallback(() => setAmountDigits((prev) => prev.slice(0, -1)), []);
  const onClear = useCallback(() => setAmountDigits(''), []);

  const checkLockAndSelect = useCallback(
    async (catId: string, subId: string) => {
      const budget = await findBudgetViewFor(db, catId, subId);
      if (budget?.locked) {
        setLockBudget(budget);
        setPendingSelection({ catId, subId });
        setSheet('lock');
        return;
      }
      setCategoryId(catId);
      setSubcategoryId(subId);
      setSheet(null);
    },
    [db]
  );

  const onRaiseAndUse = useCallback(async () => {
    if (!lockBudget || !pendingSelection) return;
    await raiseBudget(db, lockBudget.id, RAISE_INCREMENT);
    setCategoryId(pendingSelection.catId);
    setSubcategoryId(pendingSelection.subId);
    setSheet(null);
    setLockBudget(null);
    setPendingSelection(null);
  }, [db, lockBudget, pendingSelection]);

  const onSave = useCallback(async () => {
    const amount = parseInt(amountDigits || '0', 10);
    if (!amount) {
      setError('Add an amount first.');
      return;
    }
    if (type !== 'transfer' && !subcategoryId) {
      setSheet('category');
      return;
    }
    const payload = {
      date,
      type,
      amount,
      accountId,
      toAccountId: type === 'transfer' ? toAccountId : null,
      categoryId: type === 'transfer' ? adminCategory?.id ?? null : categoryId,
      subcategoryId: type === 'transfer' ? null : subcategoryId,
      note: note || null,
    };
    if (id) {
      await updateTransaction(db, id, payload);
    } else {
      await createTransaction(db, payload);
    }
    router.back();
  }, [db, id, amountDigits, type, accountId, toAccountId, categoryId, subcategoryId, date, note, adminCategory]);

  const onSelectType = useCallback((key: string) => {
    setType(key as TxType);
    setCategoryId(null);
    setSubcategoryId(null);
  }, []);

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.headerBtn}>CANCEL</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{id ? 'EDIT ENTRY' : 'NEW ENTRY'}</Text>
        <Pressable onPress={onSave}>
          <Text style={[styles.headerBtn, styles.headerSave]}>SAVE</Text>
        </Pressable>
      </View>

      <SegmentedControl
        segments={[
          { key: 'expense', label: 'EXPENSE' },
          { key: 'income', label: 'INCOME' },
          { key: 'transfer', label: 'TRANSFER' },
        ]}
        value={type}
        onChange={onSelectType}
      />

      <View style={styles.amountBlock}>
        <Text style={styles.amountLabel}>{type === 'income' ? 'AMOUNT RECEIVED' : type === 'transfer' ? 'AMOUNT TO MOVE' : 'AMOUNT SPENT'}</Text>
        <Text style={styles.amountValue}>Rp{groupDigits(amountDigits)}</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <ScrollView style={styles.rows}>
        <FormRow label="CATEGORY" value={categoryLabel} set={type === 'transfer' || !!subcategoryId} disabled={type === 'transfer'} onPress={() => setSheet('category')} />
        {type === 'transfer' ? (
          <>
            <FormRow label="FROM" value={accounts.find((a) => a.id === accountId)?.name ?? ''} set onPress={() => setSheet('account')} />
            <FormRow label="TO" value={accounts.find((a) => a.id === toAccountId)?.name ?? ''} set onPress={() => setSheet('accountTo')} />
          </>
        ) : (
          <FormRow label="ACCOUNT" value={accounts.find((a) => a.id === accountId)?.name ?? ''} set onPress={() => setSheet('account')} />
        )}
        <FormRow label="DATE" value={formatDateLabel(date)} set onPress={() => setSheet('date')} />
        <FormRow label="NOTE" value={note || 'Add a note'} set={!!note} onPress={() => setSheet('note')} />
      </ScrollView>

      <NumericKeypad onPress={onPressDigit} onDelete={onDelete} onClear={onClear} onConfirm={onSave} />

      <BottomSheet visible={sheet === 'category'} onClose={() => setSheet(null)}>
        <ScrollView>
          {pickerCats.map((c) => (
            <View key={c.id}>
              <Text style={styles.sheetGroupLabel}>{c.name.toUpperCase()}</Text>
              {c.subs
                .filter((s) => lockBehavior !== 'hidden' || !subBudgetMap.get(s.id)?.locked)
                .map((s) => {
                  const budget = subBudgetMap.get(s.id);
                  const locked = !!budget?.locked;
                  return (
                    <Pressable key={s.id} style={styles.sheetRow} onPress={() => checkLockAndSelect(c.id, s.id)}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.sheetRowText, locked && styles.sheetRowTextLocked]}>{s.name}</Text>
                        {budget ? (
                          <Text style={[styles.sheetRowNote, locked && styles.sheetRowNoteLocked]}>
                            {locked ? `Budget spent out · ${formatRupiah(budget.limitAmount)} used` : `${formatRupiah(budget.remain)} left in budget`}
                          </Text>
                        ) : null}
                      </View>
                      {locked ? <Text style={styles.sheetLock}>⊘</Text> : subcategoryId === s.id ? <Text style={styles.sheetCheck}>✓</Text> : null}
                    </Pressable>
                  );
                })}
            </View>
          ))}
        </ScrollView>
      </BottomSheet>

      <BottomSheet visible={sheet === 'account'} onClose={() => setSheet(null)}>
        <ScrollView>
          {accounts.map((a) => (
            <Pressable
              key={a.id}
              style={styles.sheetRow}
              onPress={() => {
                setAccountId(a.id);
                setSheet(null);
              }}
            >
              <Text style={styles.sheetRowText}>{a.name}</Text>
              <Text style={styles.sheetMeta}>{formatRupiah(a.balance)}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </BottomSheet>

      <BottomSheet visible={sheet === 'accountTo'} onClose={() => setSheet(null)}>
        <ScrollView>
          {accounts.map((a) => (
            <Pressable
              key={a.id}
              style={styles.sheetRow}
              onPress={() => {
                setToAccountId(a.id);
                setSheet(null);
              }}
            >
              <Text style={styles.sheetRowText}>{a.name}</Text>
              <Text style={styles.sheetMeta}>{formatRupiah(a.balance)}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </BottomSheet>

      <BottomSheet visible={sheet === 'date'} onClose={() => setSheet(null)}>
        <ScrollView>
          {[0, 1, 2, 3, 4, 5, 6].map((n) => {
            const iso = daysAgoISO(n);
            return (
              <Pressable
                key={iso}
                style={styles.sheetRow}
                onPress={() => {
                  setDate(iso);
                  setSheet(null);
                }}
              >
                <Text style={styles.sheetRowText}>{n === 0 ? 'Today' : n === 1 ? 'Yesterday' : formatDateLabel(iso)}</Text>
                <Text style={styles.sheetMeta}>{formatDateLabel(iso)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </BottomSheet>

      <BottomSheet visible={sheet === 'note'} onClose={() => setSheet(null)}>
        <View style={{ padding: 20 }}>
          <Text style={styles.sheetGroupLabel}>NOTE</Text>
          {NOTE_SUGGESTIONS.map((n) => (
            <Pressable
              key={n}
              style={styles.sheetRow}
              onPress={() => {
                setNote(n);
                setSheet(null);
              }}
            >
              <Text style={styles.sheetRowText}>{n}</Text>
            </Pressable>
          ))}
        </View>
      </BottomSheet>

      <BottomSheet visible={sheet === 'lock'} onClose={() => setSheet(null)}>
        {lockBudget ? (
          <View style={{ padding: 20 }}>
            <Text style={styles.lockTitle}>{lockBudget.name} is spent out</Text>
            <Text style={styles.lockBody}>
              You've used {formatRupiah(lockBudget.spent)} of the {formatRupiah(lockBudget.limitAmount)} budget. Raise the
              limit to keep logging here.
            </Text>
            <Pressable style={styles.raiseBtn} onPress={onRaiseAndUse}>
              <Text style={styles.raiseBtnText}>RAISE LIMIT BY {formatRupiah(RAISE_INCREMENT)}</Text>
            </Pressable>
            <Pressable style={styles.pickElseBtn} onPress={() => setSheet('category')}>
              <Text style={styles.pickElseText}>PICK SOMETHING ELSE</Text>
            </Pressable>
          </View>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}

interface FormRowProps {
  label: string;
  value: string;
  set: boolean;
  disabled?: boolean;
  onPress: () => void;
}

function FormRow({ label, value, set, disabled, onPress }: FormRowProps) {
  return (
    <Pressable style={styles.formRow} onPress={disabled ? undefined : onPress} disabled={disabled}>
      <Text style={styles.formRowLabel}>{label}</Text>
      <Text style={[styles.formRowValue, set ? styles.formRowValueSet : null]} numberOfLines={1}>
        {value}
      </Text>
      {!disabled ? <Text style={styles.chevron}>›</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  headerBtn: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.8, color: colors.textMuted },
  headerSave: { color: colors.ink },
  headerTitle: { fontFamily: fonts.extraBold, fontSize: 11, letterSpacing: 1.6, color: colors.ink },
  amountBlock: { backgroundColor: colors.white, padding: 20, alignItems: 'flex-start' },
  amountLabel: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.6, color: colors.textMuted },
  amountValue: { fontFamily: fonts.extraBold, fontSize: 34, color: colors.ink, marginTop: 6 },
  errorText: { fontFamily: fonts.medium, fontSize: 12, color: colors.danger, marginTop: 8 },
  rows: { flexGrow: 0, maxHeight: 220 },
  formRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.dividerSoft12, backgroundColor: colors.white },
  formRowLabel: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1, color: colors.textMuted, width: 74 },
  formRowValue: { flex: 1, fontFamily: fonts.semiBold, fontSize: 14, color: colors.textFaint },
  formRowValueSet: { color: colors.ink },
  chevron: { fontSize: 15, color: colors.textFaint },
  sheetGroupLabel: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.4, color: colors.textMuted, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 13, borderTopWidth: 1, borderTopColor: colors.dividerSoft12 },
  sheetRowText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.ink },
  sheetRowTextLocked: { color: colors.textFaint },
  sheetRowNote: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  sheetRowNoteLocked: { color: colors.danger },
  sheetLock: { fontFamily: fonts.bold, fontSize: 15, color: colors.danger },
  sheetMeta: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  sheetCheck: { fontFamily: fonts.bold, fontSize: 15, color: colors.accentGold },
  lockTitle: { fontFamily: fonts.extraBold, fontSize: 18, color: colors.ink },
  lockBody: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.textSecondaryDark, marginTop: 10 },
  raiseBtn: { backgroundColor: colors.ink, padding: 14, marginTop: 18 },
  raiseBtnText: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, color: colors.white },
  pickElseBtn: { padding: 12, marginTop: 8 },
  pickElseText: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.8, color: colors.textMuted },
});
