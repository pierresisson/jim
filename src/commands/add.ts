import crypto from 'node:crypto';
import type { Command } from 'commander';
import { Option } from 'commander';
import pc from 'picocolors';
import { JsonStore } from '../core/store.js';
import type { Task, Habit } from '../core/types.js';

export function registerAddCommand(program: Command): void {
  program
    .command('add <title>')
    .description('Add a task or habit')
    .addOption(new Option('-c, --category <category>', 'Category: pro or personal').choices(['pro', 'personal']).default('pro'))
    .addOption(new Option('-p, --priority <priority>', 'Priority: high, medium, or low').choices(['high', 'medium', 'low']).default('medium'))
    .option('--habit', 'Create a recurring habit instead of a task')
    .option('--frequency <n>', 'How many times per period (for habits)', '1')
    .addOption(new Option('--period <period>', 'Period: day or week (for habits)').choices(['day', 'week']).default('week'))
    .action((title: string, opts: {
      category: 'pro' | 'personal';
      priority: 'high' | 'medium' | 'low';
      habit?: boolean;
      frequency: string;
      period: 'day' | 'week';
    }) => {
      const store = new JsonStore();
      const data = store.load();

      if (opts.habit) {
        const freq = parseInt(opts.frequency, 10);
        if (isNaN(freq) || freq < 1) {
          console.log(pc.red('Error: --frequency must be a positive number'));
          process.exitCode = 1;
          return;
        }
        const habit: Habit = {
          id: crypto.randomUUID(),
          title,
          frequency: freq,
          period: opts.period,
          completions: [],
        };
        data.habits.push(habit);
        store.save(data);
        console.log(pc.green(`✓ Habit added: "${title}" (${habit.frequency}x/${habit.period})`));
        console.log(pc.dim(`  ID: ${habit.id}`));
      } else {
        const now = new Date().toISOString();
        const task: Task = {
          id: crypto.randomUUID(),
          title,
          category: opts.category,
          priority: opts.priority,
          createdAt: now,
          done: false,
          lastReviewedAt: now,
          status: 'active',
        };
        data.tasks.push(task);
        store.save(data);

        const priorityColor = opts.priority === 'high' ? pc.red : opts.priority === 'medium' ? pc.yellow : pc.green;
        console.log(pc.green(`✓ Task added: "${title}"`));
        console.log(pc.dim(`  ${opts.category} | ${priorityColor(opts.priority)} | ID: ${task.id}`));
      }
    });
}
