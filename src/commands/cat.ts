import type { Command } from 'commander';
import { Option } from 'commander';
import pc from 'picocolors';
import { JsonStore } from '../core/store.js';
import { getCategoryColorFn, VALID_COLORS } from '../core/categories.js';

function listCategories(): void {
  const store = new JsonStore();
  const config = store.loadConfig();

  if (config.categories.length === 0) {
    console.log(pc.dim('No categories defined.'));
    return;
  }

  for (const cat of config.categories) {
    const colorFn = getCategoryColorFn(cat.color);
    const quota = cat.dailyQuota != null ? pc.dim(` (quota: ${cat.dailyQuota}/day)`) : '';
    console.log(`  ${colorFn(cat.label)} ${pc.dim(`[${cat.key}]`)} ${pc.dim(cat.color)}${quota}`);
  }
}

export function registerCatCommand(program: Command): void {
  const cat = program
    .command('cat')
    .description('Manage categories');

  cat
    .command('list', { isDefault: true })
    .description('List all categories')
    .action(() => listCategories());

  cat
    .command('add <key>')
    .description('Add a new category')
    .option('--label <label>', 'Display label (defaults to uppercase key)')
    .addOption(new Option('--color <color>', 'Label color').choices([...VALID_COLORS]).default('white'))
    .option('--quota <n>', 'Daily quota')
    .action((key: string, opts: { label?: string; color: string; quota?: string }) => {
      const store = new JsonStore();
      const config = store.loadConfig();

      if (config.categories.some((c) => c.key === key)) {
        console.log(pc.red(`Category "${key}" already exists.`));
        process.exitCode = 1;
        return;
      }

      const label = opts.label ?? key.toUpperCase();
      const dailyQuota = opts.quota ? parseInt(opts.quota, 10) : undefined;

      if (dailyQuota !== undefined && (isNaN(dailyQuota) || dailyQuota < 1)) {
        console.log(pc.red('--quota must be a positive number'));
        process.exitCode = 1;
        return;
      }

      config.categories.push({ key, label, color: opts.color, ...(dailyQuota !== undefined && { dailyQuota }) });
      store.saveConfig(config);

      const colorFn = getCategoryColorFn(opts.color);
      console.log(pc.green(`✓ Category added: ${colorFn(label)} [${key}]`));
    });

  cat
    .command('rm <key>')
    .description('Remove a category')
    .action((key: string) => {
      const store = new JsonStore();
      const config = store.loadConfig();
      const data = store.load();

      const idx = config.categories.findIndex((c) => c.key === key);
      if (idx === -1) {
        console.log(pc.red(`Category "${key}" not found.`));
        process.exitCode = 1;
        return;
      }

      const activeTasks = data.tasks.filter((t) => t.category === key && t.status !== 'dropped' && !t.done);
      if (activeTasks.length > 0) {
        console.log(pc.red(`Cannot remove "${key}": ${activeTasks.length} active task(s) use it.`));
        console.log(pc.dim('Move or complete those tasks first, or use jim edit to change their category.'));
        process.exitCode = 1;
        return;
      }

      const removed = config.categories.splice(idx, 1)[0];
      store.saveConfig(config);
      console.log(pc.green(`✓ Category removed: ${removed.label} [${key}]`));
    });
}
