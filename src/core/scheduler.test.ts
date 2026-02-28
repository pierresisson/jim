import { describe, it, expect } from 'vitest';
import { getNextTask, getActiveTasks, getDormantTasks } from './scheduler.js';
import type { JimData, JimConfig, Task, Habit } from './types.js';
import { DEFAULT_CATEGORIES } from './categories.js';

const defaultConfig: JimConfig = { categories: [...DEFAULT_CATEGORIES], reminderEnabled: true };

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Test task',
    category: 'pro',
    priority: 'medium',
    createdAt: new Date().toISOString(),
    done: false,
    lastReviewedAt: new Date().toISOString(),
    status: 'active',
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
    // No quota categories → no boost interference
    const config: JimConfig = { categories: [{ key: 'pro', label: 'PRO', color: 'cyan' }], reminderEnabled: true };
    const result = getNextTask(data, config);
    expect(result?.item.id).toBe('high');
  });

  it('boosts perso tasks when daily quota not met', () => {
    const data: JimData = {
      tasks: [
        makeTask({ id: 'pro-high', priority: 'high', category: 'pro' }),
        makeTask({ id: 'perso-low', priority: 'low', category: 'perso' }),
      ],
      habits: [],
    };
    const result = getNextTask(data, defaultConfig);
    // perso-low gets low(2) + quota boost(15) = 17, pro-high gets 10
    expect(result?.item.id).toBe('perso-low');
  });

  it('boosts custom category tasks when their quota is not met', () => {
    const config: JimConfig = {
      categories: [
        { key: 'pro', label: 'PRO', color: 'cyan' },
        { key: 'health', label: 'Health', color: 'green', dailyQuota: 1 },
      ],
      reminderEnabled: true,
    };
    const data: JimData = {
      tasks: [
        makeTask({ id: 'pro-high', priority: 'high', category: 'pro' }),
        makeTask({ id: 'health-low', priority: 'low', category: 'health' }),
      ],
      habits: [],
    };
    const result = getNextTask(data, config);
    // health-low gets low(2) + quota boost(15) = 17, pro-high gets 10
    expect(result?.item.id).toBe('health-low');
  });

  it('ignores dormant tasks (not reviewed today)', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const data: JimData = {
      tasks: [
        makeTask({ id: 'dormant', priority: 'high', lastReviewedAt: yesterday }),
      ],
      habits: [],
    };
    const result = getNextTask(data, defaultConfig);
    expect(result).toBeNull();
  });

  it('ignores dropped tasks', () => {
    const data: JimData = {
      tasks: [
        makeTask({ id: 'dropped', priority: 'high', status: 'dropped' }),
      ],
      habits: [],
    };
    const result = getNextTask(data, defaultConfig);
    expect(result).toBeNull();
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
      tasks: [makeTask({ category: 'perso' })],
      habits: [],
    };
    const result = getNextTask(data, defaultConfig);
    expect(result?.reason).toBeTruthy();
  });

  it('uses English reason strings for quota boost', () => {
    const data: JimData = {
      tasks: [makeTask({ category: 'perso' })],
      habits: [],
    };
    const result = getNextTask(data, defaultConfig);
    expect(result?.reason).toContain('PERSO');
    expect(result?.reason).toContain('quota');
  });
});

describe('getActiveTasks', () => {
  it('returns only active tasks reviewed today', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const data: JimData = {
      tasks: [
        makeTask({ id: 'active-today', status: 'active' }),
        makeTask({ id: 'dormant', status: 'active', lastReviewedAt: yesterday }),
        makeTask({ id: 'dropped', status: 'dropped' }),
        makeTask({ id: 'done', done: true }),
      ],
      habits: [],
    };
    const result = getActiveTasks(data);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('active-today');
  });
});

describe('getDormantTasks', () => {
  it('returns not-reviewed, non-dropped, non-done tasks', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const data: JimData = {
      tasks: [
        makeTask({ id: 'dormant-1', lastReviewedAt: yesterday }),
        makeTask({ id: 'active-today' }),
        makeTask({ id: 'dropped', status: 'dropped', lastReviewedAt: yesterday }),
        makeTask({ id: 'done', done: true, lastReviewedAt: yesterday }),
      ],
      habits: [],
    };
    const result = getDormantTasks(data);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('dormant-1');
  });
});
