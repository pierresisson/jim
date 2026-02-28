import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { JsonStore, DEFAULT_DATA, DEFAULT_CONFIG } from './store.js';

describe('JsonStore', () => {
  let tmpDir: string;
  let store: JsonStore;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jim-test-'));
    store = new JsonStore(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('load()', () => {
    it('creates default data file when missing', () => {
      const data = store.load();
      expect(data).toEqual(DEFAULT_DATA);
      expect(fs.existsSync(path.join(tmpDir, 'data.json'))).toBe(true);
    });

    it('reads existing data', () => {
      const existing = { tasks: [{ id: '1', title: 'test', category: 'pro', priority: 'high', createdAt: '', done: false }], habits: [] };
      fs.writeFileSync(path.join(tmpDir, 'data.json'), JSON.stringify(existing));
      const data = store.load();
      expect(data.tasks).toHaveLength(1);
      expect(data.tasks[0].title).toBe('test');
    });

    it('returns default data on corrupt JSON', () => {
      fs.writeFileSync(path.join(tmpDir, 'data.json'), '{broken json!!!');
      const data = store.load();
      expect(data).toEqual({ tasks: [], habits: [] });
    });
  });

  describe('save()', () => {
    it('persists data to disk', () => {
      const data = { tasks: [], habits: [{ id: 'h1', title: 'Walk', frequency: 3, period: 'week' as const, completions: [] }] };
      store.save(data);
      const raw = fs.readFileSync(path.join(tmpDir, 'data.json'), 'utf-8');
      expect(JSON.parse(raw)).toEqual(data);
    });
  });

  describe('loadConfig()', () => {
    it('creates default config when missing', () => {
      const config = store.loadConfig();
      expect(config.categories).toEqual(DEFAULT_CONFIG.categories);
      expect(config.reminderEnabled).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'config.json'))).toBe(true);
    });

    it('returns default config on corrupt JSON', () => {
      fs.writeFileSync(path.join(tmpDir, 'config.json'), 'not json');
      const config = store.loadConfig();
      expect(config.categories).toBeDefined();
      expect(config.categories.find((c) => c.key === 'perso')?.dailyQuota).toBe(2);
    });

    it('reads new-format config with categories array', () => {
      const newConfig = {
        categories: [
          { key: 'pro', label: 'PRO', color: 'cyan' },
          { key: 'health', label: 'Health', color: 'green', dailyQuota: 1 },
        ],
        reminderEnabled: false,
      };
      fs.writeFileSync(path.join(tmpDir, 'config.json'), JSON.stringify(newConfig));
      const config = store.loadConfig();
      expect(config.categories).toHaveLength(2);
      expect(config.categories[1].key).toBe('health');
      expect(config.reminderEnabled).toBe(false);
    });

    it('migrates old-format config with persoDailyQuota', () => {
      const oldConfig = { persoDailyQuota: 5, reminderEnabled: true };
      fs.writeFileSync(path.join(tmpDir, 'config.json'), JSON.stringify(oldConfig));
      const config = store.loadConfig();
      expect(config.categories).toBeDefined();
      const perso = config.categories.find((c) => c.key === 'perso');
      expect(perso?.dailyQuota).toBe(5);
      expect(config.reminderEnabled).toBe(true);
    });

    it('migrates old-format config with personalDailyQuota', () => {
      const oldConfig = { personalDailyQuota: 3, reminderEnabled: false };
      fs.writeFileSync(path.join(tmpDir, 'config.json'), JSON.stringify(oldConfig));
      const config = store.loadConfig();
      const perso = config.categories.find((c) => c.key === 'perso');
      expect(perso?.dailyQuota).toBe(3);
      expect(config.reminderEnabled).toBe(false);
    });
  });

  describe('saveConfig()', () => {
    it('persists config to disk', () => {
      const config = {
        categories: [{ key: 'pro', label: 'PRO', color: 'cyan' }],
        reminderEnabled: false,
      };
      store.saveConfig(config);
      const raw = fs.readFileSync(path.join(tmpDir, 'config.json'), 'utf-8');
      const parsed = JSON.parse(raw);
      expect(parsed.categories).toHaveLength(1);
      expect(parsed.reminderEnabled).toBe(false);
    });
  });

  describe('ensureDir()', () => {
    it('creates directory if it does not exist', () => {
      const nested = path.join(tmpDir, 'sub', 'deep');
      const nestedStore = new JsonStore(nested);
      nestedStore.load();
      expect(fs.existsSync(nested)).toBe(true);
    });
  });
});
