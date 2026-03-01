import type { Command } from 'commander';
import pc from 'picocolors';
import crypto from 'node:crypto';
import { JsonStore } from '../core/store.js';
import type { List, ListItem } from '../core/types.js';

function findList(lists: List[], name: string): List | undefined {
  const lower = name.toLowerCase();
  return lists.find((l) => l.name.toLowerCase() === lower)
    ?? lists.find((l) => l.name.toLowerCase().startsWith(lower));
}

export function registerListCommand(program: Command): void {
  const list = program
    .command('list')
    .description('Manage persistent lists')
    .action(() => {
      const store = new JsonStore();
      const data = store.load();

      if (data.lists.length === 0) {
        console.log(pc.dim('No lists yet. Use `jim list create <name>` to get started.'));
        return;
      }

      console.log('');
      for (const l of data.lists) {
        const doneCount = l.items.filter((i) => i.done).length;
        const total = l.items.length;
        const summary = total === 0
          ? pc.dim('empty')
          : `${doneCount}/${total} done`;
        console.log(`  ${pc.bold(l.name)}  ${summary}`);
      }
      console.log('');
    });

  list
    .command('create <name>')
    .description('Create a new list')
    .action((name: string) => {
      const store = new JsonStore();
      const data = store.load();

      if (findList(data.lists, name)) {
        console.log(pc.red(`List "${name}" already exists.`));
        process.exitCode = 1;
        return;
      }

      const newList: List = {
        id: crypto.randomUUID(),
        name,
        createdAt: new Date().toISOString(),
        items: [],
      };
      data.lists.push(newList);
      store.save(data);
      console.log(pc.green(`List "${name}" created.`));
    });

  list
    .command('show <name>')
    .description('Show items in a list')
    .action((name: string) => {
      const store = new JsonStore();
      const data = store.load();
      const l = findList(data.lists, name);

      if (!l) {
        console.log(pc.red(`List "${name}" not found.`));
        process.exitCode = 1;
        return;
      }

      console.log('');
      console.log(`  ${pc.bold(l.name)}`);

      if (l.items.length === 0) {
        console.log(pc.dim('  (empty)'));
      } else {
        for (const item of l.items) {
          const check = item.done ? pc.green('✓') : '○';
          const text = item.done ? pc.strikethrough(item.text) : item.text;
          const date = item.date ? pc.dim(` (${item.date})`) : '';
          const id = pc.dim(item.id.slice(0, 8));
          console.log(`  ${check} ${text}${date}  ${id}`);
        }
      }
      console.log('');
    });

  list
    .command('add <name> <text...>')
    .description('Add an item to a list')
    .option('-d, --date <date>', 'Date in YYYY-MM-DD format')
    .action((name: string, textParts: string[], opts: { date?: string }) => {
      const store = new JsonStore();
      const data = store.load();
      const l = findList(data.lists, name);

      if (!l) {
        console.log(pc.red(`List "${name}" not found.`));
        process.exitCode = 1;
        return;
      }

      const item: ListItem = {
        id: crypto.randomUUID(),
        text: textParts.join(' '),
        done: false,
        createdAt: new Date().toISOString(),
      };
      if (opts.date) item.date = opts.date;

      l.items.push(item);
      store.save(data);
      console.log(pc.green(`Added "${item.text}" to ${l.name}.`));
    });

  list
    .command('done <name> <id>')
    .description('Mark an item as done')
    .action((name: string, id: string) => {
      const store = new JsonStore();
      const data = store.load();
      const l = findList(data.lists, name);

      if (!l) {
        console.log(pc.red(`List "${name}" not found.`));
        process.exitCode = 1;
        return;
      }

      const item = l.items.find((i) => i.id.startsWith(id));
      if (!item) {
        console.log(pc.red(`Item "${id}" not found in ${l.name}.`));
        process.exitCode = 1;
        return;
      }

      item.done = true;
      item.completedAt = new Date().toISOString();
      store.save(data);
      console.log(pc.green(`Marked "${item.text}" as done.`));
    });

  list
    .command('rm <name> [id]')
    .description('Remove an item or an entire list')
    .action((name: string, id?: string) => {
      const store = new JsonStore();
      const data = store.load();
      const l = findList(data.lists, name);

      if (!l) {
        console.log(pc.red(`List "${name}" not found.`));
        process.exitCode = 1;
        return;
      }

      if (id) {
        const idx = l.items.findIndex((i) => i.id.startsWith(id));
        if (idx === -1) {
          console.log(pc.red(`Item "${id}" not found in ${l.name}.`));
          process.exitCode = 1;
          return;
        }
        const removed = l.items.splice(idx, 1)[0];
        store.save(data);
        console.log(pc.green(`Removed "${removed.text}" from ${l.name}.`));
      } else {
        data.lists = data.lists.filter((x) => x.id !== l.id);
        store.save(data);
        console.log(pc.green(`List "${l.name}" deleted.`));
      }
    });
}
