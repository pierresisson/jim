import type { Habit } from './types.js';

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
