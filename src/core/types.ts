export interface Task {
  id: string;
  title: string;
  category: 'pro' | 'personal';
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
  completedAt?: string;
  done: boolean;
}

export interface Habit {
  id: string;
  title: string;
  frequency: number;
  period: 'day' | 'week';
  completions: string[];
}

export interface JimData {
  tasks: Task[];
  habits: Habit[];
}

export interface JimConfig {
  personalDailyQuota: number;
  reminderEnabled: boolean;
}

export interface IStore {
  load(): JimData;
  save(data: JimData): void;
  loadConfig(): JimConfig;
  saveConfig(config: JimConfig): void;
}
