import type { Database } from '../db/client';
import { createCategory } from '../db/repositories/categoriesRepo';
import { createBudget } from '../db/repositories/budgetsRepo';
import { slugify } from '../utils/slug';

interface PendingAction {
  id: string;
  type: string;
  payload: string;
  created_at: string;
  consumed: number;
}

interface CreateBudgetPayload {
  categoryName: string;
  subcategoryName: string | null;
  limitAmount: number;
}

function hasPendingActionsShape(value: unknown): value is { actions: unknown[] } {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return Array.isArray(record.actions);
}

function isPendingAction(value: unknown): value is PendingAction {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string' && typeof record.type === 'string' && typeof record.payload === 'string';
}

async function applyCreateBudget(db: Database, payload: CreateBudgetPayload): Promise<void> {
  const categoryId = slugify(payload.categoryName);
  await createCategory(db, {
    kind: 'expense',
    categoryName: payload.categoryName,
    subName: payload.subcategoryName ?? undefined,
  });
  const subcategoryId = payload.subcategoryName ? `${categoryId}__${slugify(payload.subcategoryName)}` : null;
  await createBudget(db, { categoryId, subcategoryId, limitAmount: payload.limitAmount });
}

export async function pullPendingBudgets(db: Database): Promise<number> {
  const baseUrl = process.env.EXPO_PUBLIC_MCP_BASE_URL;
  const token = process.env.EXPO_PUBLIC_MCP_BEARER_TOKEN;
  if (!baseUrl || !token) {
    throw new Error('Sync isn’t configured on this build.');
  }

  const response = await fetch(`${baseUrl}/pending-actions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Server returned ${response.status}.`);
  }

  const body: unknown = await response.json();
  if (!hasPendingActionsShape(body)) {
    throw new Error('Unexpected response from the sync server.');
  }

  let applied = 0;
  for (const action of body.actions) {
    if (!isPendingAction(action) || action.type !== 'create_budget') continue;
    const payload = JSON.parse(action.payload) as CreateBudgetPayload;
    await applyCreateBudget(db, payload);
    applied += 1;
  }
  return applied;
}
