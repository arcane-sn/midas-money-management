import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';

export const DATABASE_NAME = 'midas.db';

// The actual connection is opened once, inside <SQLiteProvider> (app/_layout.tsx),
// and accessed from components via the useDb() hook — this file only carries the
// shared name/type so repositories don't need to import React hooks.
export type Database = ExpoSQLiteDatabase;
