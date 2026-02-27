import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import type { IStore, JimData, JimConfig } from './types.js';
import { migrateTask } from './utils.js';

export const DEFAULT_DATA: JimData = { tasks: [], habits: [] };
export const DEFAULT_CONFIG: JimConfig = { personalDailyQuota: 2, reminderEnabled: true };

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
      return { tasks: [], habits: [] };
    }
    const data = safeParse<JimData>(this.dataFile, { tasks: [], habits: [] });
    data.tasks = data.tasks.map(migrateTask);
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
      return { ...DEFAULT_CONFIG };
    }
    return safeParse<JimConfig>(this.configFile, { ...DEFAULT_CONFIG });
  }

  saveConfig(config: JimConfig): void {
    this.ensureDir();
    atomicWrite(this.configFile, JSON.stringify(config, null, 2));
  }
}
