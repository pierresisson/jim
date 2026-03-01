import readline from 'node:readline';
import type { Command } from 'commander';
import pc from 'picocolors';
import { JsonStore } from '../core/store.js';
import { getDormantTasks } from '../core/scheduler.js';
import type { Task } from '../core/types.js';
import { daysSince } from '../core/utils.js';
import { findCategory, getCategoryColorFn } from '../core/categories.js';

function askQuestion(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => resolve(answer.trim().toLowerCase()));
  });
}

function askDate(rl: readline.Interface): Promise<string> {
  return new Promise((resolve) => {
    rl.question(pc.dim('  Snooze until (YYYY-MM-DD): '), (answer) => {
      const date = new Date(answer.trim());
      if (isNaN(date.getTime())) {
        console.log(pc.red('  Invalid date, keeping task active instead.'));
        resolve('');
      } else {
        resolve(date.toISOString());
      }
    });
  });
}

export function registerReviewCommand(program: Command): void {
  program
    .command('review')
    .description('Review dormant tasks — keep, drop, or snooze each one')
    .action(async () => {
      const store = new JsonStore();
      const config = store.loadConfig();
      const data = store.load();
      const dormant = getDormantTasks(data);

      if (dormant.length === 0) {
        console.log(pc.green('Nothing to review — all tasks are up to date.'));
        return;
      }

      console.log(pc.bold(`\n${dormant.length} task${dormant.length > 1 ? 's' : ''} to review:\n`));

      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

      let kept = 0;
      let dropped = 0;
      let snoozed = 0;
      let completed = 0;

      for (const task of dormant) {
        const age = daysSince(task.createdAt);
        const priorityColor = task.priority === 'high' ? pc.red : task.priority === 'medium' ? pc.yellow : pc.green;
        const cat = findCategory(config, task.category);
        const catColorFn = cat ? getCategoryColorFn(cat.color) : pc.white;
        const catLabel = cat?.label ?? task.category;

        console.log(`  ${pc.bold(task.title)}`);
        console.log(`  ${catColorFn(catLabel)} | ${priorityColor(task.priority)} | ${age}d old ${pc.dim(task.id.slice(0, 8))}`);

        let valid = false;
        while (!valid) {
          const answer = await askQuestion(rl, pc.cyan('  [k]eep  [d]rop  [s]nooze  d[o]ne → '));

          // Find the actual task in data.tasks (not the filtered copy)
          const realTask = data.tasks.find((t) => t.id === task.id) as Task;

          if (answer === 'k' || answer === 'keep') {
            realTask.status = 'active';
            realTask.lastReviewedAt = new Date().toISOString();
            kept++;
            console.log(pc.green('  → Kept\n'));
            valid = true;
          } else if (answer === 'd' || answer === 'drop') {
            realTask.status = 'dropped';
            realTask.droppedAt = new Date().toISOString();
            dropped++;
            console.log(pc.dim('  → Dropped\n'));
            valid = true;
          } else if (answer === 'o' || answer === 'done') {
            realTask.done = true;
            realTask.completedAt = new Date().toISOString();
            realTask.status = 'active';
            realTask.lastReviewedAt = new Date().toISOString();
            completed++;
            console.log(pc.green('  → Done ✓\n'));
            valid = true;
          } else if (answer === 's' || answer === 'snooze') {
            const dateStr = await askDate(rl);
            if (dateStr) {
              realTask.snoozedUntil = dateStr;
              realTask.status = 'dormant';
              snoozed++;
              console.log(pc.yellow(`  → Snoozed until ${dateStr.slice(0, 10)}\n`));
            } else {
              realTask.status = 'active';
              realTask.lastReviewedAt = new Date().toISOString();
              kept++;
              console.log(pc.green('  → Kept\n'));
            }
            valid = true;
          } else {
            console.log(pc.dim('  Please press k, d, s, or o'));
          }
        }
      }

      rl.close();
      store.save(data);

      const parts = [];
      if (kept) parts.push(`${kept} kept`);
      if (dropped) parts.push(`${dropped} dropped`);
      if (snoozed) parts.push(`${snoozed} snoozed`);
      if (completed) parts.push(`${completed} done`);
      console.log(pc.bold('Review complete:') + ` ${parts.join(', ')}`);
    });
}
