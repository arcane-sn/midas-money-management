import { eq } from 'drizzle-orm';
import type { Database } from '../client';
import { categories, subcategories } from '../schema';
import { slugify } from '../../utils/slug';

export type Category = typeof categories.$inferSelect;
export type Subcategory = typeof subcategories.$inferSelect;

export interface CategoryWithSubs extends Category {
  subs: Subcategory[];
}

export async function listCategoriesWithSubs(db: Database): Promise<CategoryWithSubs[]> {
  const cats = await db.select().from(categories);
  const subs = await db.select().from(subcategories);
  return cats.map((cat) => ({ ...cat, subs: subs.filter((s) => s.categoryId === cat.id) }));
}

export interface CreateCategoryInput {
  kind: 'expense' | 'income' | 'transfer';
  categoryName: string;
  subName?: string;
  description?: string;
}

export async function getCategory(db: Database, id: string): Promise<Category | null> {
  const rows = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function renameCategory(db: Database, id: string, newName: string): Promise<void> {
  const name = newName.trim();
  if (!name) return;
  await db.update(categories).set({ name }).where(eq(categories.id, id));
}

export async function createCategory(db: Database, input: CreateCategoryInput): Promise<void> {
  const catId = slugify(input.categoryName);
  const existingCat = await db.select().from(categories).where(eq(categories.id, catId)).limit(1);
  if (existingCat.length === 0) {
    await db.insert(categories).values({ id: catId, name: input.categoryName, kind: input.kind, isSystem: false });
  }
  const subName = input.subName?.trim();
  if (subName) {
    const subId = `${catId}__${slugify(subName)}`;
    const existingSub = await db.select().from(subcategories).where(eq(subcategories.id, subId)).limit(1);
    if (existingSub.length === 0) {
      await db.insert(subcategories).values({ id: subId, categoryId: catId, name: subName });
    }
  }
}
