import type { Command } from 'commander';
import pc from 'picocolors';
import { JsonStore } from '../core/store.js';
import { getCompletionsThisPeriod, isReviewedToday } from '../core/utils.js';
import { getDormantTasks } from '../core/scheduler.js';
import type { Task, Habit } from '../core/types.js';

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

function statusTag(task: Task): string {
  if (task.status === 'dormant') return pc.yellow(' [DORMANT]');
  if (task.status === 'dropped') return pc.red(' [DROPPED]');
  return '';
}

function displayTasks(tasks: Task[], category: string, showStatusTags: boolean): void {
  if (tasks.length === 0) return;

  console.log(pc.bold(pc.underline(`\n${category.toUpperCase()}`)));

  const sorted = [...tasks].sort((a, b) => priorityOrder(a.priority) - priorityOrder(b.priority));

  for (const task of sorted) {
    const color = priorityColor(task.priority);
    const status = task.done ? pc.dim('✓') : '○';
    const tag = showStatusTags ? statusTag(task) : '';
    const doneStyle = task.done ? pc.strikethrough : (s: string) => s;

    console.log(
      `  ${status} ${doneStyle(task.title)} ${color(task.priority)}${tag} ${pc.dim(task.id.slice(0, 8))}`
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
    .option('-c, --category <category>', 'Filter by category: pro or perso')
    .option('-a, --all', 'Show all tasks (active, dormant, dropped, done)')
    .option('--dormant', 'Show dormant tasks (not reviewed today)')
    .option('--dropped', 'Show dropped tasks')
    .action((opts: { category?: string; all?: boolean; dormant?: boolean; dropped?: boolean }) => {
      const store = new JsonStore();
      const data = store.load();

      let tasks: Task[];
      let showStatusTags = false;

      if (opts.all) {
        tasks = data.tasks;
        showStatusTags = true;
      } else if (opts.dormant) {
        tasks = getDormantTasks(data);
        showStatusTags = true;
      } else if (opts.dropped) {
        tasks = data.tasks.filter((t) => t.status === 'dropped');
        showStatusTags = true;
      } else {
        // Default: only active tasks reviewed today (not done)
        tasks = data.tasks.filter((t) => !t.done && t.status === 'active' && isReviewedToday(t));
      }

      if (opts.category) {
        tasks = tasks.filter((t) => t.category === opts.category);
      }

      const proTasks = tasks.filter((t) => t.category === 'pro');
      const persoTasks = tasks.filter((t) => t.category === 'perso');

      if (proTasks.length === 0 && persoTasks.length === 0 && data.habits.length === 0) {
        const dormant = getDormantTasks(data);
        if (dormant.length > 0) {
          console.log(pc.dim(`No active tasks today. ${dormant.length} dormant — run \`jim review\` to decide.`));
        } else {
          console.log(pc.dim('No tasks or habits yet. Use `jim add` to get started.'));
        }
        return;
      }

      displayTasks(proTasks, 'pro', showStatusTags);
      displayTasks(persoTasks, 'perso', showStatusTags);

      if (!opts.category) {
        displayHabits(data.habits);
      }

      console.log('');
    });
}
