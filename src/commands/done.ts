import type { Command } from 'commander';
import pc from 'picocolors';
import { JsonStore } from '../core/store.js';
import { getNextTask } from '../core/scheduler.js';
import { getCompletionsThisPeriod } from '../core/utils.js';
import type { Habit } from '../core/types.js';

export function registerDoneCommand(program: Command): void {
  program
    .command('done [id]')
    .description('Mark a task or habit as completed')
    .option('--last', 'Complete the task suggested by `jim next`')
    .action((id: string | undefined, opts: { last?: boolean }) => {
      const store = new JsonStore();
      const data = store.load();

      let targetId: string;

      if (opts.last) {
        const config = store.loadConfig();
        const suggestion = getNextTask(data, config);
        if (!suggestion) {
          console.log(pc.yellow('No pending tasks or habits to complete.'));
          return;
        }
        targetId = suggestion.item.id;
      } else if (id) {
        targetId = id;
      } else {
        console.log(pc.red('Please provide a task/habit ID or use --last'));
        process.exitCode = 1;
        return;
      }

      // Find matching tasks
      const matchingTasks = data.tasks.filter((t) => t.id === targetId || t.id.startsWith(targetId));
      const matchingHabits = data.habits.filter((h) => h.id === targetId || h.id.startsWith(targetId));
      const totalMatches = matchingTasks.length + matchingHabits.length;

      if (totalMatches === 0) {
        console.log(pc.red(`No task or habit found matching "${targetId}"`));
        process.exitCode = 1;
        return;
      }

      if (totalMatches > 1) {
        console.log(pc.yellow(`Ambiguous ID "${targetId}" matches ${totalMatches} items:`));
        for (const t of matchingTasks) {
          console.log(pc.dim(`  task: ${t.title} (${t.id})`));
        }
        for (const h of matchingHabits) {
          console.log(pc.dim(`  habit: ${h.title} (${h.id})`));
        }
        console.log(pc.yellow('Please provide a longer ID prefix.'));
        process.exitCode = 1;
        return;
      }

      // Exactly one match
      if (matchingTasks.length === 1) {
        const task = matchingTasks[0];
        if (task.done) {
          console.log(pc.yellow(`Task "${task.title}" is already done.`));
          return;
        }
        task.done = true;
        task.completedAt = new Date().toISOString();
        store.save(data);
        console.log(pc.green(`✓ Done: "${task.title}"`));
      } else {
        const habit = matchingHabits[0] as Habit;
        habit.completions.push(new Date().toISOString());
        store.save(data);
        const periodCount = getCompletionsThisPeriod(habit);
        console.log(pc.green(`✓ Habit checked: "${habit.title}" (${periodCount}/${habit.frequency} this ${habit.period})`));
      }
    });
}
