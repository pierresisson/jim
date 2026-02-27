import type { Task, Habit, JimData, JimConfig } from './types.js';
import { getCompletionsThisPeriod, isReviewedToday } from './utils.js';

export interface Suggestion {
  item: Task | Habit;
  type: 'task' | 'habit';
  score: number;
  reason: string;
}

function persoTasksDoneToday(data: JimData): number {
  const today = new Date().toDateString();
  return data.tasks.filter(
    (t) => t.category === 'perso' && t.done && t.completedAt && new Date(t.completedAt).toDateString() === today
  ).length;
}

function getDaysLeftInPeriod(period: 'day' | 'week'): number {
  if (period === 'day') return 0;
  const now = new Date();
  const dayOfWeek = now.getDay();
  return 6 - dayOfWeek;
}

const PRIORITY_SCORE: Record<string, number> = { high: 10, medium: 5, low: 2 };

/** Returns tasks that are active and reviewed today (eligible for `jim next`). */
export function getActiveTasks(data: JimData): Task[] {
  return data.tasks.filter((t) => !t.done && t.status === 'active' && isReviewedToday(t));
}

/** Returns tasks that are dormant (not reviewed today, not done, not dropped). */
export function getDormantTasks(data: JimData): Task[] {
  return data.tasks.filter((t) => !t.done && t.status !== 'dropped' && !isReviewedToday(t));
}

export function getNextTask(data: JimData, config: JimConfig): Suggestion | null {
  const suggestions: Suggestion[] = [];
  const persoDoneToday = persoTasksDoneToday(data);
  const quotaNotMet = persoDoneToday < config.persoDailyQuota;

  const activeTasks = getActiveTasks(data);

  for (const task of activeTasks) {
    let score = PRIORITY_SCORE[task.priority] ?? 5;
    let reason = `Priority: ${task.priority}`;

    if (task.category === 'perso' && quotaNotMet) {
      score += 15;
      reason = `Pas encore de tâche perso aujourd'hui (0/${config.persoDailyQuota} quota)`;
      if (persoDoneToday > 0) {
        reason = `Quota perso pas atteint (${persoDoneToday}/${config.persoDailyQuota})`;
      }
    }

    suggestions.push({ item: task, type: 'task', score, reason });
  }

  for (const habit of data.habits) {
    const done = getCompletionsThisPeriod(habit);
    if (done >= habit.frequency) continue;

    let score = 5;
    const remaining = habit.frequency - done;
    const daysLeft = getDaysLeftInPeriod(habit.period);
    let reason = `${done}/${habit.frequency} done this ${habit.period}`;

    if (remaining > daysLeft) {
      score += 10;
      reason = `Urgent: ${remaining} left with only ${daysLeft} days remaining`;
    }

    if (quotaNotMet) {
      score += 10;
    }

    suggestions.push({ item: habit, type: 'habit', score, reason });
  }

  if (suggestions.length === 0) return null;

  suggestions.sort((a, b) => b.score - a.score);
  return suggestions[0];
}
