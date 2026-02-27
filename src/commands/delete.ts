import type { Command } from 'commander';
import pc from 'picocolors';
import { JsonStore } from '../core/store.js';

export function registerDeleteCommand(program: Command): void {
  program
    .command('delete <id>')
    .description('Permanently delete a task or habit')
    .action((id: string) => {
      const store = new JsonStore();
      const data = store.load();

      const matchingTasks = data.tasks.filter((t) => t.id === id || t.id.startsWith(id));
      const matchingHabits = data.habits.filter((h) => h.id === id || h.id.startsWith(id));
      const totalMatches = matchingTasks.length + matchingHabits.length;

      if (totalMatches === 0) {
        console.log(pc.red(`No task or habit found matching "${id}"`));
        process.exitCode = 1;
        return;
      }

      if (totalMatches > 1) {
        console.log(pc.yellow(`Ambiguous ID "${id}" matches ${totalMatches} items:`));
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

      if (matchingTasks.length === 1) {
        const task = matchingTasks[0];
        data.tasks = data.tasks.filter((t) => t.id !== task.id);
        store.save(data);
        console.log(pc.green(`✓ Deleted task: "${task.title}"`));
      } else {
        const habit = matchingHabits[0];
        data.habits = data.habits.filter((h) => h.id !== habit.id);
        store.save(data);
        console.log(pc.green(`✓ Deleted habit: "${habit.title}"`));
      }
    });
}
