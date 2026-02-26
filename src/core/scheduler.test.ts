import { describe, it, expect } from 'vitest';
import { getNextTask } from './scheduler.js';
import type { JimData, JimConfig, Task, Habit } from './types.js';

const defaultConfig: JimConfig = { personalDailyQuota: 2, reminderEnabled: true };

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Test task',
    category: 'pro',
    priority: 'medium',
    createdAt: new Date().toISOString(),
    done: false,
    ...overrides,
  };
}

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'habit-1',
    title: 'Test habit',
    frequency: 4,
    period: 'week',
    completions: [],
    ...overrides,
  };
}

describe('getNextTask', () => {
  it('returns null when no tasks or habits', () => {
    const data: JimData = { tasks: [], habits: [] };
    expect(getNextTask(data, defaultConfig)).toBeNull();
  });

  it('returns null when all tasks are done', () => {
    const data: JimData = {
      tasks: [makeTask({ done: true })],
      habits: [],
    };
    expect(getNextTask(data, defaultConfig)).toBeNull();
  });

  it('scores high priority above medium', () => {
    const data: JimData = {
      tasks: [
        makeTask({ id: 'med', priority: 'medium', category: 'pro' }),
        makeTask({ id: 'high', priority: 'high', category: 'pro' }),
      ],
      habits: [],
    };
    // Disable personal quota boost by having pro tasks only with quota met
    const config: JimConfig = { personalDailyQuota: 0, reminderEnabled: true };
    const result = getNextTask(data, config);
    expect(result?.item.id).toBe('high');
  });

  it('boosts personal tasks when daily quota not met', () => {
    const data: JimData = {
      tasks: [
        makeTask({ id: 'pro-high', priority: 'high', category: 'pro' }),
        makeTask({ id: 'personal-low', priority: 'low', category: 'personal' }),
      ],
      habits: [],
    };
    const result = getNextTask(data, defaultConfig);
    // personal-low gets low(2) + quota boost(15) = 17, pro-high gets 10
    expect(result?.item.id).toBe('personal-low');
  });

  it('adds staleness boost for old personal tasks', () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const data: JimData = {
      tasks: [
        makeTask({ id: 'stale', priority: 'low', category: 'personal', createdAt: fiveDaysAgo }),
      ],
      habits: [],
    };
    const result = getNextTask(data, defaultConfig);
    expect(result).not.toBeNull();
    // low(2) + staleness(5) + quota(15) = 22
    expect(result!.score).toBeGreaterThanOrEqual(20);
  });

  it('suggests habit when needing completion', () => {
    const data: JimData = {
      tasks: [],
      habits: [makeHabit({ completions: [] })],
    };
    const result = getNextTask(data, defaultConfig);
    expect(result?.type).toBe('habit');
  });

  it('skips habit when frequency met', () => {
    const today = new Date().toISOString();
    const data: JimData = {
      tasks: [],
      habits: [makeHabit({ frequency: 1, period: 'day', completions: [today] })],
    };
    const result = getNextTask(data, defaultConfig);
    expect(result).toBeNull();
  });

  it('includes reason in suggestion', () => {
    const data: JimData = {
      tasks: [makeTask({ category: 'personal' })],
      habits: [],
    };
    const result = getNextTask(data, defaultConfig);
    expect(result?.reason).toBeTruthy();
  });
});
