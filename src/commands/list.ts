import type { Command } from 'commander';
import pc from 'picocolors';
import { JsonStore } from '../core/store.js';
import { getCompletionsThisPeriod, isReviewedToday } from '../core/utils.js';
import { getDormantTasks } from '../core/scheduler.js';
import type { Task, Habit } from '../core/types.js';

function priorityOrder(priority: string): number {
  if (priority === 'high') return 0;
  if (priority === 'medium') return 1;
  return 2;
}

function priorityLabel(priority: string): string {
  if (priority === 'high') return pc.red('● high');
  if (priority === 'medium') return pc.yellow('● med ');
  return pc.green('● low ');
}

function statusLabel(task: Task): string {
  if (task.done) return pc.dim('✓ done');
  if (task.status === 'dropped') return pc.red('✗ drop');
  if (task.status === 'dormant' || !isReviewedToday(task)) return pc.yellow('◌ dorm');
  return '';
}

function pad(str: string, len: number): string {
  // Strip ANSI codes to measure visible length
  const visible = str.replace(/\x1b\[[0-9;]*m/g, '');
  const diff = len - visible.length;
  return diff > 0 ? str + ' '.repeat(diff) : str;
}

interface Section {
  label: string;
  rows: string[][];
}

function drawUnifiedTable(sections: Section[]): void {
  const nonEmpty = sections.filter((s) => s.rows.length > 0);
  if (nonEmpty.length === 0) return;

  // Compute column widths across ALL sections
  const cols = nonEmpty[0].rows[0].length;
  const widths: number[] = [];
  for (let c = 0; c < cols; c++) {
    widths[c] = 0;
    for (const section of nonEmpty) {
      for (const row of section.rows) {
        if (c < row.length) {
          const visible = row[c].replace(/\x1b\[[0-9;]*m/g, '').length;
          if (visible > widths[c]) widths[c] = visible;
        }
      }
    }
  }

  const separatorLine = widths.map((w) => '─'.repeat(w + 2)).join('┬');
  const totalWidth = separatorLine.replace(/┬/g, '─').length;

  // Top border
  console.log(`  ${pc.dim('╭')}${pc.dim('─'.repeat(totalWidth))}${pc.dim('╮')}`);

  for (let i = 0; i < nonEmpty.length; i++) {
    const section = nonEmpty[i];

    // Section header
    console.log(`  ${pc.dim('│')} ${pc.bold(pad(section.label, totalWidth - 2))} ${pc.dim('│')}`);
    console.log(`  ${pc.dim('├')}${pc.dim(separatorLine)}${pc.dim('┤')}`);

    // Rows
    for (const row of section.rows) {
      const cells = row.map((cell, c) => pad(cell, widths[c]));
      console.log(`  ${pc.dim('│')} ${cells.join(` ${pc.dim('│')} `)} ${pc.dim('│')}`);
    }

    // Section separator or bottom border
    if (i < nonEmpty.length - 1) {
      console.log(`  ${pc.dim('├')}${pc.dim('─'.repeat(totalWidth))}${pc.dim('┤')}`);
    } else {
      console.log(`  ${pc.dim('╰')}${pc.dim(separatorLine.replace(/┬/g, '┴'))}${pc.dim('╯')}`);
    }
  }
}

function buildTaskRows(tasks: Task[], showStatusTags: boolean): string[][] {
  const sorted = [...tasks].sort((a, b) => priorityOrder(a.priority) - priorityOrder(b.priority));
  return sorted.map((task) => {
    const icon = task.done ? pc.dim('✓') : '○';
    const title = task.done ? pc.strikethrough(task.title) : task.title;
    const row = [
      `${icon} ${title}`,
      priorityLabel(task.priority),
      pc.dim(task.id.slice(0, 8)),
    ];
    if (showStatusTags) {
      const status = statusLabel(task);
      row.push(status || pc.green('● act '));
    }
    return row;
  });
}

function buildHabitRows(habits: Habit[]): string[][] {
  return habits.map((habit) => {
    const done = getCompletionsThisPeriod(habit);
    const total = habit.frequency;
    const progress = done >= total ? pc.green(`${done}/${total}`) : pc.yellow(`${done}/${total}`);
    return [
      `○ ${habit.title}`,
      `${progress} this ${habit.period}`,
      pc.dim(habit.id.slice(0, 8)),
    ];
  });
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

      console.log('');

      const sections: Section[] = [];

      const proRows = buildTaskRows(proTasks, showStatusTags);
      if (proRows.length > 0) sections.push({ label: 'PRO', rows: proRows });

      const persoRows = buildTaskRows(persoTasks, showStatusTags);
      if (persoRows.length > 0) sections.push({ label: 'PERSO', rows: persoRows });

      if (!opts.category) {
        const habitRows = buildHabitRows(data.habits);
        if (habitRows.length > 0) sections.push({ label: 'HABITS', rows: habitRows });
      }

      drawUnifiedTable(sections);

      console.log('');
    });
}
