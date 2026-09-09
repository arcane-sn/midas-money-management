import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Switch, Alert, Platform } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useDb } from '@/db/useDb';
import { getSetting, setSetting } from '@/db/repositories/settingsRepo';
import { buildBackupPayload } from '@/db/backup';
import { parseBackupPayload, restoreBackupPayload } from '@/db/restore';
import { clearAllData } from '@/db/reset';
import { pullPendingBudgets } from '@/sync/pullPendingBudgets';
import { SETTINGS_KEYS, DEFAULT_LOCK_BEHAVIOR, DEFAULT_BIOMETRIC_LOCK } from '@/db/settingsKeys';
import { colors, fonts } from '@/theme';
import { Screen } from '@/components/Screen';

export default function SettingsScreen() {
  const db = useDb();
  const [lockBehavior, setLockBehaviorState] = useState<'lock' | 'hidden'>('lock');
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      Promise.all([
        getSetting(db, SETTINGS_KEYS.lockBehavior, DEFAULT_LOCK_BEHAVIOR),
        getSetting(db, SETTINGS_KEYS.biometricLock, DEFAULT_BIOMETRIC_LOCK),
        LocalAuthentication.hasHardwareAsync(),
      ]).then(([behavior, biometric, hasHardware]) => {
        setLockBehaviorState(behavior === 'hidden' ? 'hidden' : 'lock');
        setBiometricEnabled(biometric === 'on');
        setBiometricAvailable(hasHardware);
      });
    }, [db])
  );

  const onToggleLockBehavior = useCallback(
    async (value: boolean) => {
      const next = value ? 'hidden' : 'lock';
      setLockBehaviorState(next);
      await setSetting(db, SETTINGS_KEYS.lockBehavior, next);
    },
    [db]
  );

  const onToggleBiometric = useCallback(
    async (value: boolean) => {
      if (value) {
        const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Confirm to enable Face ID lock' });
        if (!result.success) return;
      }
      setBiometricEnabled(value);
      await setSetting(db, SETTINGS_KEYS.biometricLock, value ? 'on' : 'off');
    },
    [db]
  );

  const onResetAll = useCallback(() => {
    Alert.alert(
      'Erase all data?',
      'This deletes every account, category, budget, and transaction on this phone. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase everything',
          style: 'destructive',
          onPress: async () => {
            await clearAllData(db);
            router.replace('/');
          },
        },
      ]
    );
  }, [db]);

  const onBackup = useCallback(async () => {
    setBackingUp(true);
    try {
      const payload = await buildBackupPayload(db);
      const file = new File(Paths.cache, `midas-backup-${Date.now()}.json`);
      file.write(JSON.stringify(payload, null, 2));
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Back up Midas data' });
      } else {
        Alert.alert('Backup saved', `Saved to ${file.uri}`);
      }
    } catch (e) {
      Alert.alert('Backup failed', e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBackingUp(false);
    }
  }, [db]);

  const runImport = useCallback(
    async (uri: string) => {
      setImporting(true);
      try {
        const raw = await new File(uri).text();
        const payload = parseBackupPayload(raw);
        await restoreBackupPayload(db, payload);
        router.replace('/');
      } catch (e) {
        Alert.alert('Import failed', e instanceof Error ? e.message : 'Something went wrong.');
      } finally {
        setImporting(false);
      }
    },
    [db]
  );

  const onSync = useCallback(async () => {
    setSyncing(true);
    try {
      const count = await pullPendingBudgets(db);
      Alert.alert('Synced', `Added ${count} budget(s) from Claude.`);
    } catch (e) {
      Alert.alert('Sync failed', e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSyncing(false);
    }
  }, [db]);

  const onImport = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
    if (result.canceled) return;
    const uri = result.assets[0]?.uri;
    if (!uri) return;
    Alert.alert(
      'Replace all data?',
      'This erases everything currently on this phone and replaces it with the contents of this backup file. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Replace everything', style: 'destructive', onPress: () => runImport(uri) },
      ]
    );
  }, [runImport]);

  return (
    <Screen>
      <ScrollView>
        <View style={styles.head}>
          <Text style={styles.title}>Settings</Text>
        </View>

        <View style={styles.group}>
          <Text style={styles.groupLabel}>DATA</Text>
          <Pressable style={styles.row} onPress={() => router.push('/categories')}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Categories</Text>
              <Text style={styles.rowNote}>Manage categories and sub-categories</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <Pressable style={styles.row} onPress={() => router.push('/account-groups')}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Account groups</Text>
              <Text style={styles.rowNote}>Rename groups like Cash, Savings, Credit Card</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <Pressable style={styles.row} onPress={onBackup} disabled={backingUp}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Back up data</Text>
              <Text style={styles.rowNote}>Export everything to a file you control</Text>
            </View>
            <Text style={styles.rowValue}>{backingUp ? '…' : '↗'}</Text>
          </Pressable>
          <Pressable style={styles.row} onPress={onImport} disabled={importing}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Import data</Text>
              <Text style={styles.rowNote}>Replace everything on this phone with a backup file</Text>
            </View>
            <Text style={styles.rowValue}>{importing ? '…' : '↙'}</Text>
          </Pressable>
          <Pressable style={styles.row} onPress={onSync} disabled={syncing}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Sync from Claude</Text>
              <Text style={styles.rowNote}>Pull budgets Claude queued for you</Text>
            </View>
            <Text style={styles.rowValue}>{syncing ? '…' : '↓'}</Text>
          </Pressable>
        </View>

        <View style={styles.group}>
          <Text style={styles.groupLabel}>BUDGETS</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Hide spent-out sub-categories</Text>
              <Text style={styles.rowNote}>Off shows them locked instead of hiding them</Text>
            </View>
            <Switch
              value={lockBehavior === 'hidden'}
              onValueChange={onToggleLockBehavior}
              trackColor={{ true: colors.ink, false: colors.dividerSoft16 }}
            />
          </View>
        </View>

        <View style={styles.group}>
          <Text style={styles.groupLabel}>SECURITY</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, !biometricAvailable && styles.rowLabelOff]}>
                Require {Platform.OS === 'ios' ? 'Face ID' : 'biometrics'} to open
              </Text>
              <Text style={styles.rowNote}>{biometricAvailable ? 'Locks the app until you unlock it' : 'Not available on this device'}</Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={onToggleBiometric}
              disabled={!biometricAvailable}
              trackColor={{ true: colors.ink, false: colors.dividerSoft16 }}
            />
          </View>
        </View>

        <View style={styles.group}>
          <Text style={styles.groupLabel}>DANGER ZONE</Text>
          <Pressable style={styles.row} onPress={onResetAll}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, styles.rowLabelDanger]}>Reset all data</Text>
              <Text style={styles.rowNote}>Erase every account, category, budget, and transaction</Text>
            </View>
            <Text style={[styles.chevron, styles.rowLabelDanger]}>›</Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>Midas keeps everything on this phone by default — no account required. "Sync from Claude" is opt-in and only pulls what you ask Claude for.</Text>
        <View style={{ height: 28 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { padding: 20, paddingBottom: 14 },
  title: { fontFamily: fonts.extraBold, fontSize: 24, color: colors.ink },
  group: { borderTopWidth: 2, borderTopColor: colors.ink },
  groupLabel: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.6, color: colors.textMuted, paddingHorizontal: 20, paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.dividerSoft12, backgroundColor: colors.white },
  rowLabel: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.ink },
  rowLabelOff: { color: colors.textFaint },
  rowLabelDanger: { color: colors.danger },
  rowNote: { fontFamily: fonts.regular, fontSize: 11, color: colors.textFaint, marginTop: 2 },
  rowValue: { fontFamily: fonts.bold, fontSize: 14, color: colors.accentLink },
  chevron: { fontSize: 15, color: colors.textFaint },
  footer: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 17, color: colors.textMuted, padding: 20, borderTopWidth: 2, borderTopColor: colors.ink, marginTop: 8 },
});
