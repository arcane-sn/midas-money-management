import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDb } from '@/db/useDb';
import { listCategoriesWithSubs, type CategoryWithSubs } from '@/db/repositories/categoriesRepo';
import { colors, fonts } from '@/theme';
import { Screen } from '@/components/Screen';

export default function CategoriesScreen() {
  const db = useDb();
  const insets = useSafeAreaInsets();
  const [cats, setCats] = useState<CategoryWithSubs[]>([]);

  useFocusEffect(
    useCallback(() => {
      listCategoriesWithSubs(db).then(setCats);
    }, [db])
  );

  return (
    <Screen>
      <Pressable style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← SETTINGS</Text>
      </Pressable>
      <View style={styles.head}>
        <Text style={styles.title}>Categories</Text>
        <Text style={styles.subtitle}>Tap a sub-category to attach a budget.</Text>
      </View>
      <View style={{ paddingHorizontal: 20, paddingBottom: 18 }}>
        <Pressable style={styles.addBtn} onPress={() => router.push('/add-category')}>
          <Text style={styles.addBtnText}>+ ADD A CATEGORY</Text>
        </Pressable>
      </View>
      <ScrollView>
        {cats.map((c) => (
          <View key={c.id} style={styles.group}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupName}>{c.name.toUpperCase()}</Text>
              <View style={styles.groupHeaderRight}>
                <Text style={styles.groupKind}>{c.kind.toUpperCase()}</Text>
                <Pressable
                  hitSlop={8}
                  onPress={() => router.push({ pathname: '/edit-category', params: { id: c.id } })}
                >
                  <Text style={styles.editIcon}>✎</Text>
                </Pressable>
              </View>
            </View>
            {c.subs.map((s) => (
              <Pressable
                key={s.id}
                style={styles.subRow}
                disabled={c.kind !== 'expense'}
                onPress={() => router.push({ pathname: '/add-budget', params: { categoryId: c.id, subcategoryId: s.id } })}
              >
                <Text style={styles.subName}>{s.name}</Text>
                <Text style={styles.subTag}>{c.kind === 'expense' ? 'BUDGETABLE' : c.kind.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
        ))}
        <View style={{ height: Math.max(insets.bottom, 16) + 28 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { padding: 20, paddingBottom: 0 },
  backText: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1, color: colors.textMuted },
  head: { padding: 20, paddingBottom: 14 },
  title: { fontFamily: fonts.extraBold, fontSize: 24, color: colors.ink },
  subtitle: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, marginTop: 3 },
  addBtn: { borderWidth: 2, borderColor: colors.ink, padding: 13 },
  addBtnText: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, color: colors.ink },
  group: { borderTopWidth: 2, borderTopColor: colors.ink },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  groupName: { fontFamily: fonts.extraBold, fontSize: 12, letterSpacing: 1, color: colors.ink },
  groupHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  groupKind: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1.2, color: colors.textMuted },
  editIcon: { fontSize: 13, color: colors.textMuted },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 11, borderTopWidth: 1, borderTopColor: colors.dividerSoft12, backgroundColor: colors.white },
  subName: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  subTag: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.8, color: colors.textMuted },
});
