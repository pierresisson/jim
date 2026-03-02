import type { Command } from 'commander';
import { Option } from 'commander';
import pc from 'picocolors';
import { JsonStore } from '../core/store.js';
import { getCategoryKeys } from '../core/categories.js';

export function registerEditCommand(program: Command): void {
  program
    .command('edit <id>')
    .description('Edit a task (title, category, priority)')
    .option('-t, --title <title>', 'New title')
    .option('-c, --category <category>', 'New category')
    .addOption(new Option('-p, --priority <priority>', 'New priority').choices(['high', 'medium', 'low']))
    .action((id: string, opts: { title?: string; category?: string; priority?: 'high' | 'medium' | 'low' }) => {
      if (!opts.title && !opts.category && !opts.priority) {
        console.log(pc.red('Please provide at least one option: -t, -c, or -p'));
        process.exitCode = 1;
        return;
      }

      const store = new JsonStore();
      const config = store.loadConfig();
      const data = store.load();

      if (opts.category) {
        const validKeys = getCategoryKeys(config);
        if (!validKeys.includes(opts.category)) {
          console.log(pc.red(`Unknown category "${opts.category}". Valid: ${validKeys.join(', ')}`));
          process.exitCode = 1;
          return;
        }
      }

      const matching = data.tasks.filter((t) => t.status !== 'dropped' && (t.id === id || t.id.startsWith(id)));

      if (matching.length === 0) {
        console.log(pc.red(`No task found matching "${id}"`));
        process.exitCode = 1;
        return;
      }

      if (matching.length > 1) {
        console.log(pc.yellow(`Ambiguous ID "${id}" matches ${matching.length} tasks:`));
        for (const t of matching) {
          console.log(pc.dim(`  ${t.title} (${t.id})`));
        }
        console.log(pc.yellow('Please provide a longer ID prefix.'));
        process.exitCode = 1;
        return;
      }

      const task = matching[0];
      const changes: string[] = [];

      if (opts.title) {
        task.title = opts.title;
        changes.push(`title → "${opts.title}"`);
      }
      if (opts.category) {
        task.category = opts.category;
        changes.push(`category → ${opts.category}`);
      }
      if (opts.priority) {
        task.priority = opts.priority;
        changes.push(`priority → ${opts.priority}`);
      }

      store.save(data);
      console.log(pc.green(`✓ Updated "${task.title}"`));
      for (const c of changes) {
        console.log(pc.dim(`  ${c}`));
      }
    });
}
