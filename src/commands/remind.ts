import type { Command } from 'commander';
import pc from 'picocolors';
import { JsonStore } from '../core/store.js';
import { getCompletionsThisPeriod } from '../core/utils.js';
import { getActiveTasks, getDormantTasks } from '../core/scheduler.js';
import { findCategory, getCategoryColorFn } from '../core/categories.js';

export function registerRemindCommand(program: Command): void {
  program
    .command('remind')
    .description('Show a brief reminder of pending tasks and habits')
    .action(() => {
      const store = new JsonStore();
      const data = store.load();
      const config = store.loadConfig();

      if (!config.reminderEnabled) {
        if (process.argv.includes('remind')) {
          console.log(pc.dim('Reminders are disabled. Edit ~/.jim/config.json to enable.'));
        }
        return;
      }

      const active = getActiveTasks(data);
      const dormant = getDormantTasks(data);

      // Count active tasks per category dynamically
      const countsByCategory = new Map<string, number>();
      for (const task of active) {
        countsByCategory.set(task.category, (countsByCategory.get(task.category) ?? 0) + 1);
      }

      const habitSummary = data.habits.map((h) => {
        const done = getCompletionsThisPeriod(h);
        return { title: h.title, done, total: h.frequency, period: h.period };
      });

      if (countsByCategory.size === 0 && data.habits.length === 0 && dormant.length === 0) return;

      // Build category counts string in config order
      const parts: string[] = [];
      for (const cat of config.categories) {
        const count = countsByCategory.get(cat.key);
        if (count != null && count > 0) {
          parts.push(`${count} ${cat.key}`);
          countsByCategory.delete(cat.key);
        }
      }
      // Any remaining unknown categories
      for (const [key, count] of countsByCategory) {
        if (count > 0) parts.push(`${count} ${key}`);
      }

      const summary = parts.length > 0 ? parts.join(', ') + ' active today' : 'no active tasks today';
      console.log(pc.bold('Jim:') + ` ${summary}`);

      if (habitSummary.length > 0) {
        const habitParts = habitSummary.map((h) => `${h.title} ${h.done}/${h.total}`);
        console.log(pc.dim(`  Habits: ${habitParts.join(' | ')}`));
      }

      if (dormant.length > 0) {
        console.log(pc.yellow(`  ${dormant.length} task${dormant.length > 1 ? 's' : ''} from before — run \`jim review\``));
      }
    });
}
