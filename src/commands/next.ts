import type { Command } from 'commander';
import pc from 'picocolors';
import { JsonStore } from '../core/store.js';
import { getNextTask } from '../core/scheduler.js';
import type { Task } from '../core/types.js';
import { getQuotaStatus, findCategory, getCategoryColorFn } from '../core/categories.js';

export function registerNextCommand(program: Command): void {
  program
    .command('next')
    .description('Get a smart suggestion for what to do next')
    .action(() => {
      const store = new JsonStore();
      const data = store.load();
      const config = store.loadConfig();

      const suggestion = getNextTask(data, config);

      if (!suggestion) {
        console.log(pc.green('All clear! No pending tasks or habits.'));
        return;
      }

      const quotaStatus = getQuotaStatus(data, config);

      console.log(pc.bold('\n  Next up:'));

      if (suggestion.type === 'task') {
        const task = suggestion.item as Task;
        const priorityColor = task.priority === 'high' ? pc.red : task.priority === 'medium' ? pc.yellow : pc.green;
        const cat = findCategory(config, task.category);
        const colorFn = cat ? getCategoryColorFn(cat.color) : pc.white;
        console.log(`  ${pc.bold(task.title)}`);
        console.log(`  ${colorFn(cat?.label ?? task.category)} | ${priorityColor(task.priority)}`);
      } else {
        console.log(`  ${pc.bold(suggestion.item.title)}`);
        console.log(`  ${pc.cyan('habit')}`);
      }

      console.log(`  ${pc.dim(suggestion.reason)}`);

      // Show quota status for all categories that have a dailyQuota
      for (const [key, info] of quotaStatus) {
        const cat = findCategory(config, key);
        const label = cat?.label ?? key;
        console.log(`  ${pc.dim(`${label} today: ${info.done}/${info.quota}`)}`);
      }

      console.log(`  ${pc.dim(`ID: ${suggestion.item.id}`)}\n`);
    });
}
