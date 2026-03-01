import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import type { IStore, JimData, JimConfig } from './types.js';
import { migrateTask } from './utils.js';
import { DEFAULT_CATEGORIES } from './categories.js';

export const DEFAULT_DATA: JimData = { tasks: [], habits: [], lists: [] };
export const DEFAULT_CONFIG: JimConfig = { categories: [...DEFAULT_CATEGORIES], reminderEnabled: true };

function atomicWrite(filePath: string, content: string): void {
  const tmpPath = filePath + '.' + crypto.randomUUID() + '.tmp';
  fs.writeFileSync(tmpPath, content);
  fs.renameSync(tmpPath, filePath);
}

function safeParse<T>(filePath: string, fallback: T): T {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export class JsonStore implements IStore {
  private readonly dir: string;
  private readonly dataFile: string;
  private readonly configFile: string;

  constructor(dir?: string) {
    this.dir = dir ?? path.join(os.homedir(), '.jim');
    this.dataFile = path.join(this.dir, 'data.json');
    this.configFile = path.join(this.dir, 'config.json');
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir, { recursive: true });
    }
  }

  load(): JimData {
    this.ensureDir();
    if (!fs.existsSync(this.dataFile)) {
      atomicWrite(this.dataFile, JSON.stringify(DEFAULT_DATA, null, 2));
      return { tasks: [], habits: [], lists: [] };
    }
    const data = safeParse<JimData>(this.dataFile, { tasks: [], habits: [], lists: [] });
    data.tasks = data.tasks.map(migrateTask);
    data.lists = data.lists ?? [];
    return data;
  }

  save(data: JimData): void {
    this.ensureDir();
    atomicWrite(this.dataFile, JSON.stringify(data, null, 2));
  }

  loadConfig(): JimConfig {
    this.ensureDir();
    if (!fs.existsSync(this.configFile)) {
      atomicWrite(this.configFile, JSON.stringify(DEFAULT_CONFIG, null, 2));
      return { ...DEFAULT_CONFIG, categories: [...DEFAULT_CONFIG.categories] };
    }
    const raw = safeParse<Record<string, unknown>>(this.configFile, {});
    const enabled = (raw.reminderEnabled ?? DEFAULT_CONFIG.reminderEnabled) as boolean;
    const dailyGoal = raw.dailyGoal as number | undefined;

    // New format: categories array exists
    if (Array.isArray(raw.categories)) {
      return { categories: raw.categories as JimConfig['categories'], reminderEnabled: enabled, dailyGoal };
    }

    // Old format: migrate persoDailyQuota / personalDailyQuota into default categories
    const oldQuota = (raw.persoDailyQuota ?? raw.personalDailyQuota ?? 2) as number;
    const categories = DEFAULT_CATEGORIES.map((c) =>
      c.key === 'perso' ? { ...c, dailyQuota: oldQuota } : { ...c }
    );
    return { categories, reminderEnabled: enabled, dailyGoal };
  }

  saveConfig(config: JimConfig): void {
    this.ensureDir();
    atomicWrite(this.configFile, JSON.stringify(config, null, 2));
  }
}
