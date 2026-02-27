import type { Habit, Task } from './types.js';

export function daysSince(isoDate: string): number {
  const diff = Date.now() - new Date(isoDate).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getCompletionsThisPeriod(habit: Habit): number {
  const now = new Date();
  return habit.completions.filter((d) => {
    const date = new Date(d);
    if (habit.period === 'day') {
      return date.toDateString() === now.toDateString();
    }
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return date >= startOfWeek;
  }).length;
}

export function isReviewedToday(task: Task): boolean {
  return new Date(task.lastReviewedAt).toDateString() === new Date().toDateString();
}

export function isSnoozedPastToday(task: Task): boolean {
  if (!task.snoozedUntil) return false;
  const snoozeDate = new Date(task.snoozedUntil);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return snoozeDate > today;
}

/** Migrate a task from the old schema (no status/lastReviewedAt) to the new one. */
export function migrateTask(task: Task): Task {
  if (!task.status) {
    task.status = 'active';
  }
  if (!task.lastReviewedAt) {
    task.lastReviewedAt = task.createdAt;
  }
  return task;
}
