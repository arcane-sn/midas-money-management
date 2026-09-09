import { Tabs } from 'expo-router';
import { colors, fonts } from '@/theme';
import { HomeIcon, AccountsIcon, BudgetsIcon, LedgerIcon, SettingsIcon } from '@/components/icons/TabIcons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { backgroundColor: colors.white, borderTopWidth: 2, borderTopColor: colors.dividerStrong },
        tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.6 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'HOME', tabBarIcon: ({ color }) => <HomeIcon color={String(color)} /> }} />
      <Tabs.Screen name="accounts" options={{ title: 'ACCOUNTS', tabBarIcon: ({ color }) => <AccountsIcon color={String(color)} /> }} />
      <Tabs.Screen name="budgets" options={{ title: 'PLANNING', tabBarIcon: ({ color }) => <BudgetsIcon color={String(color)} /> }} />
      <Tabs.Screen name="ledger" options={{ title: 'LEDGER', tabBarIcon: ({ color }) => <LedgerIcon color={String(color)} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'SETTINGS', tabBarIcon: ({ color }) => <SettingsIcon color={String(color)} /> }} />
    </Tabs>
  );
}
