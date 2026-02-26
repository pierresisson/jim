import type { Task, Habit, JimData, JimConfig } from './types.js';
import { daysSince, getCompletionsThisPeriod } from './utils.js';

export interface Suggestion {
  item: Task | Habit;
  type: 'task' | 'habit';
  score: number;
  reason: string;
}

function personalTasksDoneToday(data: JimData): number {
  const today = new Date().toDateString();
  return data.tasks.filter(
    (t) => t.category === 'personal' && t.done && t.completedAt && new Date(t.completedAt).toDateString() === today
  ).length;
}

function getDaysLeftInPeriod(period: 'day' | 'week'): number {
  if (period === 'day') return 0;
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sunday
  // Week starts Sunday, so days left = 6 - dayOfWeek
  // But Sunday is day 0 of the week, so there are 6 days left
  // Saturday (6) has 0 days left — correct
  // To include today as a usable day, we count today + remaining
  return 6 - dayOfWeek;
}

const PRIORITY_SCORE: Record<string, number> = { high: 10, medium: 5, low: 2 };

export function getNextTask(data: JimData, config: JimConfig): Suggestion | null {
  const suggestions: Suggestion[] = [];
  const personalDoneToday = personalTasksDoneToday(data);
  const quotaNotMet = personalDoneToday < config.personalDailyQuota;

  for (const task of data.tasks) {
    if (task.done) continue;

    let score = PRIORITY_SCORE[task.priority] ?? 5;
    let reason = `Priority: ${task.priority}`;

    if (task.category === 'personal') {
      const stale = daysSince(task.createdAt);
      if (stale > 0) {
        score += stale;
        if (stale >= 3) {
          reason = `Sitting for ${stale} days — time to tackle it`;
        }
      }
    }

    if (task.category === 'personal' && quotaNotMet) {
      score += 15;
      reason = `You haven't done any personal tasks today (0/${config.personalDailyQuota} quota)`;
      if (personalDoneToday > 0) {
        reason = `Personal quota not met yet (${personalDoneToday}/${config.personalDailyQuota})`;
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
