import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useDb } from '@/db/useDb';
import { listCategoriesWithSubs, createCategory, type CategoryWithSubs } from '@/db/repositories/categoriesRepo';
import { colors, fonts } from '@/theme';
import { Screen } from '@/components/Screen';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Pill } from '@/components/Pill';
import { TextField } from '@/components/TextField';

type Kind = 'expense' | 'income';

export default function AddCategoryScreen() {
  const db = useDb();
  const [kind, setKind] = useState<Kind>('expense');
  const [existing, setExisting] = useState<CategoryWithSubs[]>([]);
  const [categoryName, setCategoryName] = useState('');
  const [subName, setSubName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCategoriesWithSubs(db).then((all) => setExisting(all.filter((c) => c.kind === kind)));
  }, [db, kind]);

  const onSave = useCallback(async () => {
    if (!categoryName.trim()) {
      setError('Name the category first.');
      return;
    }
    await createCategory(db, { kind, categoryName: categoryName.trim(), subName: subName.trim() || undefined, description: description.trim() || undefined });
    router.back();
  }, [db, kind, categoryName, subName, description]);

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.headerBtn}>CANCEL</Text>
        </Pressable>
        <Text style={styles.headerTitle}>NEW CATEGORY</Text>
        <Pressable onPress={onSave}>
          <Text style={[styles.headerBtn, styles.headerSave]}>SAVE</Text>
        </Pressable>
      </View>

      <SegmentedControl
        segments={[
          { key: 'expense', label: 'EXPENSE' },
          { key: 'income', label: 'INCOME' },
        ]}
        value={kind}
        onChange={(k) => setKind(k as Kind)}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.label}>CATEGORY</Text>
        <View style={styles.field}>
          <TextField value={categoryName} onChangeText={setCategoryName} placeholder="Health" />
        </View>

        {existing.length > 0 ? (
          <>
            <Text style={styles.hint2}>Or add into one you already have:</Text>
            <View style={styles.pillRow}>
              {existing.map((c) => (
                <Pill key={c.id} label={c.name.toUpperCase()} active={categoryName === c.name} onPress={() => setCategoryName(c.name)} />
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.label}>SUB-CATEGORY</Text>
        <View style={styles.field}>
          <TextField value={subName} onChangeText={setSubName} placeholder="Pharmacy" />
        </View>
        <Text style={styles.hint}>Optional — you can attach a budget to this sub-category later.</Text>

        <Text style={styles.label}>DESCRIPTION</Text>
        <View style={styles.field}>
          <TextField value={description} onChangeText={setDescription} placeholder="What belongs in here?" multiline />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable style={styles.bigSave} onPress={onSave}>
          <Text style={styles.bigSaveText}>SAVE CATEGORY</Text>
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
  hint2: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, paddingHorizontal: 20, paddingTop: 10 },
  hint: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.textMuted, paddingHorizontal: 20, paddingTop: 7 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, paddingTop: 8 },
  errorText: { fontFamily: fonts.medium, fontSize: 12, color: colors.danger, paddingHorizontal: 20, paddingTop: 14 },
  bigSave: { backgroundColor: colors.ink, padding: 16, marginHorizontal: 20, marginTop: 24, alignItems: 'center' },
  bigSaveText: { fontFamily: fonts.extraBold, fontSize: 12, letterSpacing: 1.2, color: colors.white },
});
