import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useDb } from '@/db/useDb';
import { listCategoriesWithSubs, type CategoryWithSubs } from '@/db/repositories/categoriesRepo';
import { createBudget } from '@/db/repositories/budgetsRepo';
import { colors, fonts } from '@/theme';
import { sanitizeDigits, groupDigits } from '@/utils/digits';
import { Screen } from '@/components/Screen';
import { BottomSheet } from '@/components/BottomSheet';
import { TextField } from '@/components/TextField';

export default function AddBudgetScreen() {
  const db = useDb();
  const params = useLocalSearchParams<{ categoryId?: string; subcategoryId?: string }>();
  const [cats, setCats] = useState<CategoryWithSubs[]>([]);
  const [limitDigits, setLimitDigits] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(params.categoryId ?? null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(params.subcategoryId ?? null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCategoriesWithSubs(db).then((all) => setCats(all.filter((c) => c.kind === 'expense')));
  }, [db]);

  const selectedCategory = cats.find((c) => c.id === categoryId);
  const selectedSub = selectedCategory?.subs.find((s) => s.id === subcategoryId);
  const scopeText = selectedCategory ? (selectedSub ? `${selectedCategory.name} › ${selectedSub.name}` : `${selectedCategory.name} (whole category)`) : 'Choose what this spends on';

  const onSave = useCallback(async () => {
    const limit = parseInt(limitDigits || '0', 10);
    if (!limit) {
      setError('Set a limit first — that is what Midas counts down.');
      return;
    }
    if (!categoryId) {
      setSheetOpen(true);
      return;
    }
    await createBudget(db, { categoryId, subcategoryId, limitAmount: limit });
    router.back();
  }, [db, limitDigits, categoryId, subcategoryId]);

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.headerBtn}>CANCEL</Text>
        </Pressable>
        <Text style={styles.headerTitle}>NEW BUDGET</Text>
        <Pressable onPress={onSave}>
          <Text style={[styles.headerBtn, styles.headerSave]}>SAVE</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.limitBlock}>
          <Text style={styles.label}>MONTHLY LIMIT</Text>
          <View style={{ marginTop: 8 }}>
            <TextField
              value={groupDigits(limitDigits)}
              onChangeText={(v) => setLimitDigits(sanitizeDigits(v))}
              keyboardType="numeric"
              placeholder="0"
              prefix="Rp"
            />
          </View>
        </View>

        <Pressable style={styles.scopeRow} onPress={() => setSheetOpen(true)}>
          <Text style={styles.scopeLabel}>SPENDS ON</Text>
          <Text style={[styles.scopeValue, categoryId && styles.scopeValueSet]} numberOfLines={1}>
            {scopeText}
          </Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Text style={[styles.label, styles.periodLabel]}>PERIOD</Text>
        <View style={styles.periodRow}>
          <View style={styles.periodPillActive}>
            <Text style={styles.periodTextActive}>MONTHLY</Text>
          </View>
        </View>
        <Text style={styles.hint}>Resets automatically at the start of each calendar month.</Text>

        <View style={styles.lockNote}>
          <Text style={styles.lockNoteText}>
            Spending inside this scope draws the limit down. At zero, the sub-category locks in the picker until you raise
            it.
          </Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable style={styles.bigSave} onPress={onSave}>
          <Text style={styles.bigSaveText}>SAVE BUDGET</Text>
        </Pressable>
      </ScrollView>

      <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)}>
        <ScrollView>
          {cats.map((c) => (
            <View key={c.id}>
              <Pressable
                style={styles.sheetCatRow}
                onPress={() => {
                  setCategoryId(c.id);
                  setSubcategoryId(null);
                  setSheetOpen(false);
                }}
              >
                <Text style={styles.sheetCatText}>{c.name} (whole category)</Text>
              </Pressable>
              {c.subs.map((s) => (
                <Pressable
                  key={s.id}
                  style={styles.sheetRow}
                  onPress={() => {
                    setCategoryId(c.id);
                    setSubcategoryId(s.id);
                    setSheetOpen(false);
                  }}
                >
                  <Text style={styles.sheetRowText}>{s.name}</Text>
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  headerBtn: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.8, color: colors.textMuted },
  headerSave: { color: colors.ink },
  headerTitle: { fontFamily: fonts.extraBold, fontSize: 11, letterSpacing: 1.6, color: colors.ink },
  limitBlock: { backgroundColor: colors.white, padding: 20 },
  label: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.6, color: colors.textMuted },
  periodLabel: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8 },
  scopeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, borderTopWidth: 2, borderTopColor: colors.ink, backgroundColor: colors.white },
  scopeLabel: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.4, color: colors.textMuted, width: 74 },
  scopeValue: { flex: 1, fontFamily: fonts.semiBold, fontSize: 14, color: colors.textFaint },
  scopeValueSet: { color: colors.ink },
  chevron: { fontSize: 14, color: colors.textFaint },
  periodRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8 },
  periodPillActive: { borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.ink, paddingHorizontal: 12, paddingVertical: 8 },
  periodTextActive: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.6, color: colors.white },
  hint: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.textMuted, paddingHorizontal: 20, paddingTop: 10 },
  lockNote: { margin: 20, borderTopWidth: 2, borderTopColor: colors.ink, borderBottomWidth: 2, borderBottomColor: colors.ink, backgroundColor: colors.surfaceAlt, padding: 14 },
  lockNoteText: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textSecondary },
  errorText: { fontFamily: fonts.medium, fontSize: 12, color: colors.danger, paddingHorizontal: 20, paddingBottom: 10 },
  bigSave: { backgroundColor: colors.ink, padding: 16, marginHorizontal: 20, alignItems: 'center' },
  bigSaveText: { fontFamily: fonts.extraBold, fontSize: 12, letterSpacing: 1.2, color: colors.white },
  sheetCatRow: { paddingHorizontal: 20, paddingVertical: 13, backgroundColor: colors.surfaceAlt, borderTopWidth: 1, borderTopColor: colors.dividerSoft12 },
  sheetCatText: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.6, color: colors.ink },
  sheetRow: { paddingHorizontal: 32, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.dividerSoft12 },
  sheetRowText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.ink },
});
