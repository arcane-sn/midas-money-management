import { eq } from 'drizzle-orm';
import type { Database } from '../client';
import { settings } from '../schema';

export async function getSetting(db: Database, key: string, fallback: string): Promise<string> {
  const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return rows[0]?.value ?? fallback;
}

export async function setSetting(db: Database, key: string, value: string): Promise<void> {
  await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
}
