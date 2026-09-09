import { useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';

export function useDb() {
  const expo = useSQLiteContext();
  return useMemo(() => drizzle(expo), [expo]);
}
