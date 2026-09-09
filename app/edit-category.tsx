import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useDb } from '@/db/useDb';
import { getCategory, renameCategory } from '@/db/repositories/categoriesRepo';
import { colors, fonts } from '@/theme';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';

export default function EditCategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const [name, setName] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCategory(db, id).then((category) => {
      if (category) setName(category.name);
      setLoaded(true);
    });
  }, [db, id]);

  const onSave = async () => {
    if (!name.trim()) {
      setError('Give the category a name.');
      return;
    }
    await renameCategory(db, id, name.trim());
    router.back();
  };

  if (!loaded) return <Screen><View style={{ flex: 1 }} /></Screen>;

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.headerBtn}>CANCEL</Text>
        </Pressable>
        <Text style={styles.headerTitle}>EDIT CATEGORY</Text>
        <Pressable onPress={onSave}>
          <Text style={[styles.headerBtn, styles.headerSave]}>SAVE</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>CATEGORY NAME</Text>
      <View style={styles.field}>
        <TextField value={name} onChangeText={setName} placeholder="Personal" />
      </View>
      <Text style={styles.hint}>Renaming keeps its sub-categories and budgets attached.</Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
  hint: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.textMuted, paddingHorizontal: 20, paddingTop: 10 },
  errorText: { fontFamily: fonts.medium, fontSize: 12, color: colors.danger, paddingHorizontal: 20, paddingTop: 14 },
});
