import { eq } from 'drizzle-orm';
import type { Database } from '../client';
import { goals, goalAccounts, accounts } from '../schema';
import { generateId } from '../../utils/id';

export type Goal = typeof goals.$inferSelect;

export interface GoalView {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  percent: number;
  accountIds: string[];
  accountNames: string[];
}

async function toView(db: Database, goal: Goal): Promise<GoalView> {
  const links = await db.select().from(goalAccounts).where(eq(goalAccounts.goalId, goal.id));
  const allAccounts = await db.select().from(accounts);
  const accountById = new Map(allAccounts.map((a) => [a.id, a]));
  const linkedAccounts = links.map((l) => accountById.get(l.accountId)).filter((a): a is typeof accounts.$inferSelect => !!a);
  const currentAmount = linkedAccounts.reduce((sum, a) => sum + a.balance, 0);
  const percent = goal.targetAmount > 0 ? Math.min(100, Math.round((currentAmount / goal.targetAmount) * 100)) : 0;
  return {
    id: goal.id,
    name: goal.name,
    targetAmount: goal.targetAmount,
    currentAmount,
    percent,
    accountIds: linkedAccounts.map((a) => a.id),
    accountNames: linkedAccounts.map((a) => a.name),
  };
}

export async function listGoalViews(db: Database): Promise<GoalView[]> {
  const all = await db.select().from(goals);
  return Promise.all(all.map((g) => toView(db, g)));
}

export async function getGoal(db: Database, id: string): Promise<Goal | null> {
  const rows = await db.select().from(goals).where(eq(goals.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getGoalView(db: Database, id: string): Promise<GoalView | null> {
  const goal = await getGoal(db, id);
  if (!goal) return null;
  return toView(db, goal);
}

export interface GoalInput {
  name: string;
  targetAmount: number;
  accountIds: string[];
}

async function setGoalAccounts(db: Database, goalId: string, accountIds: string[]): Promise<void> {
  await db.delete(goalAccounts).where(eq(goalAccounts.goalId, goalId));
  for (const accountId of accountIds) {
    await db.insert(goalAccounts).values({ id: generateId('ga'), goalId, accountId });
  }
}

export async function createGoal(db: Database, input: GoalInput): Promise<void> {
  const id = generateId('goal');
  await db.insert(goals).values({ id, name: input.name, targetAmount: input.targetAmount });
  await setGoalAccounts(db, id, input.accountIds);
}

export async function updateGoal(db: Database, id: string, input: GoalInput): Promise<void> {
  await db.update(goals).set({ name: input.name, targetAmount: input.targetAmount }).where(eq(goals.id, id));
  await setGoalAccounts(db, id, input.accountIds);
}
