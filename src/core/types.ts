export type TaskStatus = 'active' | 'dormant' | 'dropped';

export interface Task {
  id: string;
  title: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
  completedAt?: string;
  done: boolean;
  lastReviewedAt: string;
  status: TaskStatus;
  snoozedUntil?: string;
  droppedAt?: string;
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

export interface CategoryDef {
  key: string;
  label: string;
  color: string;
  dailyQuota?: number;
}

export interface JimConfig {
  categories: CategoryDef[];
  reminderEnabled: boolean;
}

export interface IStore {
  load(): JimData;
  save(data: JimData): void;
  loadConfig(): JimConfig;
  saveConfig(config: JimConfig): void;
}
