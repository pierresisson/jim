import type { Command } from 'commander';
import pc from 'picocolors';
import { JsonStore } from '../core/store.js';
import { getNextTask } from '../core/scheduler.js';
import type { Task } from '../core/types.js';

function personalTasksDoneToday(store: JsonStore): number {
  const data = store.load();
  const today = new Date().toDateString();
  return data.tasks.filter(
    (t) => t.category === 'personal' && t.done && t.completedAt && new Date(t.completedAt).toDateString() === today
  ).length;
}

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

      const doneToday = personalTasksDoneToday(store);

      console.log(pc.bold('\n  Next up:'));

      if (suggestion.type === 'task') {
        const task = suggestion.item as Task;
        const priorityColor = task.priority === 'high' ? pc.red : task.priority === 'medium' ? pc.yellow : pc.green;
        console.log(`  ${pc.bold(task.title)}`);
        console.log(`  ${task.category} | ${priorityColor(task.priority)}`);
      } else {
        console.log(`  ${pc.bold(suggestion.item.title)}`);
        console.log(`  ${pc.cyan('habit')}`);
      }

      console.log(`  ${pc.dim(suggestion.reason)}`);
      console.log(`  ${pc.dim(`Personal today: ${doneToday}/${config.personalDailyQuota}`)}`);
      console.log(`  ${pc.dim(`ID: ${suggestion.item.id}`)}\n`);
    });
}
