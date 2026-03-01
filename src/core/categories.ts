import pc from 'picocolors';
import type { CategoryDef, JimConfig, JimData } from './types.js';

export const DEFAULT_CATEGORIES: CategoryDef[] = [
  { key: 'pro', label: 'PRO', color: 'cyan' },
  { key: 'perso', label: 'PERSO', color: 'magenta', dailyQuota: 2 },
];

const COLOR_MAP: Record<string, (s: string) => string> = {
  red: pc.red,
  green: pc.green,
  yellow: pc.yellow,
  blue: pc.blue,
  magenta: pc.magenta,
  cyan: pc.cyan,
  white: pc.white,
  gray: pc.gray,
};

export function getCategoryColorFn(color: string): (s: string) => string {
  return COLOR_MAP[color] ?? pc.white;
}

export function findCategory(config: JimConfig, key: string): CategoryDef | undefined {
  return config.categories.find((c) => c.key === key);
}

export function getCategoryKeys(config: JimConfig): string[] {
  return config.categories.map((c) => c.key);
}

export function categoryDoneToday(data: JimData, key: string): number {
  const today = new Date().toDateString();
  return data.tasks.filter(
    (t) => t.category === key && t.done && t.completedAt && new Date(t.completedAt).toDateString() === today
  ).length;
}

export interface QuotaInfo {
  done: number;
  quota: number;
  unmet: boolean;
}

export function totalDoneToday(data: JimData): number {
  const today = new Date().toDateString();
  return data.tasks.filter(
    (t) => t.done && t.completedAt && new Date(t.completedAt).toDateString() === today
  ).length;
}

export interface DailyGoalInfo {
  done: number;
  goal: number;
}

export function getDailyGoalStatus(data: JimData, config: JimConfig): DailyGoalInfo | null {
  if (config.dailyGoal == null || config.dailyGoal <= 0) return null;
  return { done: totalDoneToday(data), goal: config.dailyGoal };
}

export function getQuotaStatus(data: JimData, config: JimConfig): Map<string, QuotaInfo> {
  const result = new Map<string, QuotaInfo>();
  for (const cat of config.categories) {
    if (cat.dailyQuota != null && cat.dailyQuota > 0) {
      const done = categoryDoneToday(data, cat.key);
      result.set(cat.key, { done, quota: cat.dailyQuota, unmet: done < cat.dailyQuota });
    }
  }
  return result;
}
