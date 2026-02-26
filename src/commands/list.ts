import type { Command } from 'commander';
import pc from 'picocolors';
import { JsonStore } from '../core/store.js';
import { daysSince, getCompletionsThisPeriod } from '../core/utils.js';
import type { Task, Habit } from '../core/types.js';

const STALE_DAYS = 3;

function priorityColor(priority: string): (text: string) => string {
  if (priority === 'high') return pc.red;
  if (priority === 'medium') return pc.yellow;
  return pc.green;
}

function priorityOrder(priority: string): number {
  if (priority === 'high') return 0;
  if (priority === 'medium') return 1;
  return 2;
}

function displayTasks(tasks: Task[], category: string): void {
  if (tasks.length === 0) return;

  console.log(pc.bold(pc.underline(`\n${category.toUpperCase()}`)));

  const sorted = [...tasks].sort((a, b) => priorityOrder(a.priority) - priorityOrder(b.priority));

  for (const task of sorted) {
    const color = priorityColor(task.priority);
    const status = task.done ? pc.dim('✓') : '○';
    const stale = !task.done && task.category === 'personal' && daysSince(task.createdAt) >= STALE_DAYS;
    const staleTag = stale ? pc.red(' [STALE]') : '';
    const doneStyle = task.done ? pc.strikethrough : (s: string) => s;

    console.log(
      `  ${status} ${doneStyle(task.title)} ${color(task.priority)}${staleTag} ${pc.dim(task.id.slice(0, 8))}`
    );
  }
}

function displayHabits(habits: Habit[]): void {
  if (habits.length === 0) return;

  console.log(pc.bold(pc.underline('\nHABITS')));

  for (const habit of habits) {
    const done = getCompletionsThisPeriod(habit);
    const total = habit.frequency;
    const progress = done >= total ? pc.green(`${done}/${total}`) : pc.yellow(`${done}/${total}`);
    console.log(`  ○ ${habit.title} ${progress} this ${habit.period} ${pc.dim(habit.id.slice(0, 8))}`);
  }
}

export function registerListCommand(program: Command): void {
  program
    .command('list')
    .description('List tasks and habits')
    .option('-c, --category <category>', 'Filter by category: pro or personal')
    .option('-a, --all', 'Show completed tasks too')
    .action((opts: { category?: string; all?: boolean }) => {
      const store = new JsonStore();
      const data = store.load();

      let tasks = data.tasks;
      if (!opts.all) {
        tasks = tasks.filter((t) => !t.done);
      }
      if (opts.category) {
        tasks = tasks.filter((t) => t.category === opts.category);
      }

      const proTasks = tasks.filter((t) => t.category === 'pro');
      const personalTasks = tasks.filter((t) => t.category === 'personal');

      if (proTasks.length === 0 && personalTasks.length === 0 && data.habits.length === 0) {
        console.log(pc.dim('No tasks or habits yet. Use `jim add` to get started.'));
        return;
      }

      displayTasks(proTasks, 'pro');
      displayTasks(personalTasks, 'personal');

      if (!opts.category) {
        displayHabits(data.habits);
      }

      console.log('');
    });
}
