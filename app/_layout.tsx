import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import * as SplashScreen from 'expo-splash-screen';
import * as LocalAuthentication from 'expo-local-authentication';
import { useFonts } from 'expo-font';
import { colors, fonts, fontsToLoad } from '@/theme';
import { DATABASE_NAME } from '@/db/client';
import { ensureSchema } from '@/db/bootstrap';
import { useDb } from '@/db/useDb';
import { getSetting } from '@/db/repositories/settingsRepo';
import { SETTINGS_KEYS, DEFAULT_BIOMETRIC_LOCK } from '@/db/settingsKeys';

SplashScreen.preventAutoHideAsync();

function AppLock({ onUnlocked }: { onUnlocked: () => void }) {
  const [attempting, setAttempting] = useState(false);

  const attempt = useCallback(async () => {
    setAttempting(true);
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock Midas' });
    setAttempting(false);
    if (result.success) onUnlocked();
  }, [onUnlocked]);

  useEffect(() => {
    attempt();
  }, [attempt]);

  return (
    <View style={styles.center}>
      <Text style={{ fontFamily: fonts.logo, fontSize: 40, color: colors.ink, marginBottom: 24 }}>Midas</Text>
      <Pressable style={styles.unlockBtn} onPress={attempt} disabled={attempting}>
        <Text style={styles.unlockBtnText}>{attempting ? 'CHECKING…' : 'UNLOCK'}</Text>
      </Pressable>
    </View>
  );
}

function AppShell() {
  const expoDb = useSQLiteContext();
  const db = useDb();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [locked, setLocked] = useState<boolean | null>(null);

  useEffect(() => {
    ensureSchema(expoDb)
      .then(() => setReady(true))
      .catch((e: unknown) => setError(e instanceof Error ? e : new Error('Failed to prepare the database')));
  }, [expoDb]);

  useEffect(() => {
    if (!ready) return;
    getSetting(db, SETTINGS_KEYS.biometricLock, DEFAULT_BIOMETRIC_LOCK).then((value) => setLocked(value === 'on'));
  }, [ready, db]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Database setup failed: {error.message}</Text>
      </View>
    );
  }
  if (!ready || locked === null) return <LoadingScreen />;
  if (locked) return <AppLock onUnlocked={() => setLocked(false)} />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="accounts/[id]" />
      <Stack.Screen name="budgets/[id]" />
      <Stack.Screen name="categories" />
      <Stack.Screen name="account-groups" />
      <Stack.Screen name="add-transaction" options={{ presentation: 'modal' }} />
      <Stack.Screen name="add-account" options={{ presentation: 'modal' }} />
      <Stack.Screen name="edit-account" options={{ presentation: 'modal' }} />
      <Stack.Screen name="edit-account-group" options={{ presentation: 'modal' }} />
      <Stack.Screen name="add-category" options={{ presentation: 'modal' }} />
      <Stack.Screen name="edit-category" options={{ presentation: 'modal' }} />
      <Stack.Screen name="add-budget" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontsToLoad);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName={DATABASE_NAME}>
        <AppShell />
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}

export function LoadingScreen() {
  return (
    <View style={styles.center}>
      <Text style={{ fontFamily: fonts.logo, fontSize: 40, color: colors.ink }}>Midas</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: 24 },
  errorText: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger, textAlign: 'center' },
  unlockBtn: { backgroundColor: colors.ink, paddingHorizontal: 24, paddingVertical: 14 },
  unlockBtnText: { fontFamily: fonts.extraBold, fontSize: 12, letterSpacing: 1.2, color: colors.white },
});
