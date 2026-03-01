import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CATEGORIES,
  getCategoryColorFn,
  findCategory,
  getCategoryKeys,
  categoryDoneToday,
  getQuotaStatus,
  getDailyGoalStatus,
} from './categories.js';
import type { JimConfig, JimData, Task } from './types.js';

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

describe('DEFAULT_CATEGORIES', () => {
  it('has pro and perso', () => {
    expect(DEFAULT_CATEGORIES).toHaveLength(2);
    expect(DEFAULT_CATEGORIES[0].key).toBe('pro');
    expect(DEFAULT_CATEGORIES[1].key).toBe('perso');
  });

  it('perso has dailyQuota of 2', () => {
    expect(DEFAULT_CATEGORIES[1].dailyQuota).toBe(2);
  });
});

describe('getCategoryColorFn', () => {
  it('returns a function for known colors', () => {
    const fn = getCategoryColorFn('cyan');
    expect(typeof fn).toBe('function');
    expect(fn('test')).toContain('test');
  });

  it('returns white for unknown colors', () => {
    const fn = getCategoryColorFn('nope');
    expect(typeof fn).toBe('function');
    expect(fn('test')).toContain('test');
  });
});

describe('findCategory', () => {
  it('finds a category by key', () => {
    const cat = findCategory(defaultConfig, 'pro');
    expect(cat?.label).toBe('PRO');
  });

  it('returns undefined for unknown key', () => {
    expect(findCategory(defaultConfig, 'unknown')).toBeUndefined();
  });
});

describe('getCategoryKeys', () => {
  it('returns all keys', () => {
    expect(getCategoryKeys(defaultConfig)).toEqual(['pro', 'perso']);
  });
});

describe('categoryDoneToday', () => {
  it('counts tasks completed today for a given category', () => {
    const now = new Date().toISOString();
    const data: JimData = {
      tasks: [
        makeTask({ id: '1', category: 'perso', done: true, completedAt: now }),
        makeTask({ id: '2', category: 'perso', done: true, completedAt: now }),
        makeTask({ id: '3', category: 'pro', done: true, completedAt: now }),
        makeTask({ id: '4', category: 'perso', done: false }),
      ],
      habits: [],
      lists: [],
    };
    expect(categoryDoneToday(data, 'perso')).toBe(2);
    expect(categoryDoneToday(data, 'pro')).toBe(1);
  });

  it('ignores tasks completed on other days', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const data: JimData = {
      tasks: [makeTask({ category: 'perso', done: true, completedAt: yesterday })],
      habits: [],
      lists: [],
    };
    expect(categoryDoneToday(data, 'perso')).toBe(0);
  });
});

describe('getQuotaStatus', () => {
  it('returns quota info for categories with dailyQuota', () => {
    const data: JimData = { tasks: [], habits: [] };
    const status = getQuotaStatus(data, defaultConfig);
    // Only perso has a dailyQuota in default config
    expect(status.size).toBe(1);
    expect(status.has('perso')).toBe(true);
    expect(status.get('perso')?.done).toBe(0);
    expect(status.get('perso')?.quota).toBe(2);
    expect(status.get('perso')?.unmet).toBe(true);
  });

  it('tracks done count correctly', () => {
    const now = new Date().toISOString();
    const data: JimData = {
      tasks: [
        makeTask({ id: '1', category: 'perso', done: true, completedAt: now }),
      ],
      habits: [],
      lists: [],
    };
    const status = getQuotaStatus(data, defaultConfig);
    expect(status.get('perso')?.done).toBe(1);
    expect(status.get('perso')?.unmet).toBe(true);
  });

  it('marks quota as met when enough tasks are done', () => {
    const now = new Date().toISOString();
    const data: JimData = {
      tasks: [
        makeTask({ id: '1', category: 'perso', done: true, completedAt: now }),
        makeTask({ id: '2', category: 'perso', done: true, completedAt: now }),
      ],
      habits: [],
      lists: [],
    };
    const status = getQuotaStatus(data, defaultConfig);
    expect(status.get('perso')?.unmet).toBe(false);
  });

  it('handles custom categories with quotas', () => {
    const config: JimConfig = {
      categories: [
        { key: 'health', label: 'Health', color: 'green', dailyQuota: 1 },
        { key: 'pro', label: 'PRO', color: 'cyan' },
      ],
      reminderEnabled: true,
    };
    const data: JimData = { tasks: [], habits: [] };
    const status = getQuotaStatus(data, config);
    expect(status.size).toBe(1);
    expect(status.has('health')).toBe(true);
    expect(status.has('pro')).toBe(false);
  });
});

describe('getDailyGoalStatus', () => {
  it('returns null when dailyGoal is not set', () => {
    const data: JimData = { tasks: [], habits: [], lists: [] };
    expect(getDailyGoalStatus(data, defaultConfig)).toBeNull();
  });

  it('returns done count and goal when dailyGoal is set', () => {
    const now = new Date().toISOString();
    const config: JimConfig = { ...defaultConfig, dailyGoal: 5 };
    const data: JimData = {
      tasks: [
        makeTask({ id: '1', done: true, completedAt: now }),
        makeTask({ id: '2', done: true, completedAt: now }),
        makeTask({ id: '3', done: false }),
      ],
      habits: [],
      lists: [],
    };
    const status = getDailyGoalStatus(data, config);
    expect(status).toEqual({ done: 2, goal: 5 });
  });

  it('ignores tasks completed on other days', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const config: JimConfig = { ...defaultConfig, dailyGoal: 3 };
    const data: JimData = {
      tasks: [makeTask({ done: true, completedAt: yesterday })],
      habits: [],
      lists: [],
    };
    const status = getDailyGoalStatus(data, config);
    expect(status).toEqual({ done: 0, goal: 3 });
  });
});
