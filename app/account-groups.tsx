import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDb } from '@/db/useDb';
import { listAllAccountGroups, type AccountGroupRow } from '@/db/repositories/accountsRepo';
import { colors, fonts } from '@/theme';
import { Screen } from '@/components/Screen';

export default function AccountGroupsScreen() {
  const db = useDb();
  const insets = useSafeAreaInsets();
  const [groups, setGroups] = useState<AccountGroupRow[]>([]);

  useFocusEffect(
    useCallback(() => {
      listAllAccountGroups(db).then(setGroups);
    }, [db])
  );

  const sections: { title: string; rows: AccountGroupRow[] }[] = [
    { title: 'ASSETS', rows: groups.filter((g) => g.kind === 'assets') },
    { title: 'LIABILITIES', rows: groups.filter((g) => g.kind === 'liabilities') },
  ];

  return (
    <Screen>
      <Pressable style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← SETTINGS</Text>
      </Pressable>
      <View style={styles.head}>
        <Text style={styles.title}>Account Groups</Text>
        <Text style={styles.subtitle}>Tap a group to rename it.</Text>
      </View>
      <ScrollView>
        {sections.map((section) => (
          <View key={section.title} style={styles.group}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupName}>{section.title}</Text>
            </View>
            {section.rows.map((g) => (
              <Pressable
                key={g.id}
                style={styles.row}
                onPress={() => router.push({ pathname: '/edit-account-group', params: { id: g.id } })}
              >
                <Text style={styles.rowName}>{g.label}</Text>
                <Text style={styles.chevron}>›</Text>
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
  group: { borderTopWidth: 2, borderTopColor: colors.ink },
  groupHeader: { paddingHorizontal: 20, paddingVertical: 12 },
  groupName: { fontFamily: fonts.extraBold, fontSize: 12, letterSpacing: 1, color: colors.ink },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: colors.dividerSoft12,
    backgroundColor: colors.white,
  },
  rowName: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  chevron: { fontSize: 15, color: colors.textFaint },
});
