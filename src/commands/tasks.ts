import type { Command } from 'commander';
import pc from 'picocolors';
import { JsonStore } from '../core/store.js';
import { getCompletionsThisPeriod, isReviewedToday } from '../core/utils.js';
import { getDormantTasks } from '../core/scheduler.js';
import type { Task, Habit } from '../core/types.js';
import { findCategory, getCategoryColorFn } from '../core/categories.js';

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

function visibleLength(str: string): number {
  return str.replace(/\x1b\[[0-9;]*m/g, '').length;
}

function truncateVisible(str: string, maxLen: number): string {
  const fullLen = visibleLength(str);
  if (fullLen <= maxLen) return str;
  if (maxLen <= 1) return '…';

  const ansiRegex = /\x1b\[[0-9;]*m/g;
  const targetLen = maxLen - 1; // room for …
  let visible = 0;
  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = ansiRegex.exec(str)) !== null) {
    const textBefore = str.slice(lastIndex, match.index);
    for (const char of textBefore) {
      if (visible >= targetLen) return result + '…';
      result += char;
      visible++;
    }
    result += match[0]; // ANSI codes don't count
    lastIndex = match.index + match[0].length;
  }

  const remaining = str.slice(lastIndex);
  for (const char of remaining) {
    if (visible >= targetLen) return result + '…';
    result += char;
    visible++;
  }

  return result;
}

function fitCell(str: string, len: number): string {
  const truncated = truncateVisible(str, len);
  const diff = len - visibleLength(truncated);
  return diff > 0 ? truncated + ' '.repeat(diff) : truncated;
}

interface Section {
  label: string;
  rows: string[][];
}

function drawUnifiedTable(sections: Section[]): void {
  const nonEmpty = sections.filter((s) => s.rows.length > 0);
  if (nonEmpty.length === 0) return;

  // Compute natural column widths across ALL sections
  const cols = nonEmpty[0].rows[0].length;
  const widths: number[] = [];
  for (let c = 0; c < cols; c++) {
    widths[c] = 0;
    for (const section of nonEmpty) {
      for (const row of section.rows) {
        if (c < row.length) {
          const visible = visibleLength(row[c]);
          if (visible > widths[c]) widths[c] = visible;
        }
      }
    }
  }

  // Responsive: shrink title column (col 0) to fit terminal width
  const termWidth = process.stdout.columns || 80;
  const overhead = 3 + 3 * cols; // borders + padding
  const fixedColsWidth = widths.slice(1).reduce((a, b) => a + b, 0);
  const naturalTotal = overhead + widths[0] + fixedColsWidth;

  if (naturalTotal > termWidth) {
    widths[0] = Math.max(12, termWidth - overhead - fixedColsWidth);
  }

  const separatorLine = widths.map((w) => '─'.repeat(w + 2)).join('┬');
  const totalWidth = separatorLine.replace(/┬/g, '─').length;

  // Top border
  console.log(`  ${pc.dim('╭')}${pc.dim('─'.repeat(totalWidth))}${pc.dim('╮')}`);

  for (let i = 0; i < nonEmpty.length; i++) {
    const section = nonEmpty[i];

    // Section header
    console.log(`  ${pc.dim('│')} ${pc.bold(fitCell(section.label, totalWidth - 2))} ${pc.dim('│')}`);
    console.log(`  ${pc.dim('├')}${pc.dim(separatorLine)}${pc.dim('┤')}`);

    // Rows
    for (const row of section.rows) {
      const cells = row.map((cell, c) => fitCell(cell, widths[c]));
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

export function registerTasksCommand(program: Command): void {
  program
    .command('tasks')
    .description('List tasks and habits')
    .option('-c, --category <category>', 'Filter by category')
    .option('-a, --all', 'Show all tasks (active, dormant, dropped, done)')
    .option('--dormant', 'Show dormant tasks (not reviewed today)')
    .option('--dropped', 'Show dropped tasks')
    .action((opts: { category?: string; all?: boolean; dormant?: boolean; dropped?: boolean }) => {
      const store = new JsonStore();
      const config = store.loadConfig();
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

      // Group tasks by category
      const tasksByCategory = new Map<string, Task[]>();
      for (const task of tasks) {
        const existing = tasksByCategory.get(task.category) ?? [];
        existing.push(task);
        tasksByCategory.set(task.category, existing);
      }

      const totalTasks = tasks.length;
      if (totalTasks === 0 && data.habits.length === 0) {
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

      // Build sections in config order
      for (const cat of config.categories) {
        const catTasks = tasksByCategory.get(cat.key);
        if (catTasks && catTasks.length > 0) {
          const colorFn = getCategoryColorFn(cat.color);
          const rows = buildTaskRows(catTasks, showStatusTags);
          sections.push({ label: colorFn(cat.label), rows });
          tasksByCategory.delete(cat.key);
        }
      }

      // Any remaining categories not in config (unknown categories)
      for (const [key, catTasks] of tasksByCategory) {
        const rows = buildTaskRows(catTasks, showStatusTags);
        sections.push({ label: key.toUpperCase(), rows });
      }

      if (!opts.category) {
        const habitRows = buildHabitRows(data.habits);
        if (habitRows.length > 0) sections.push({ label: 'HABITS', rows: habitRows });
      }

      drawUnifiedTable(sections);

      console.log('');
    });
}
