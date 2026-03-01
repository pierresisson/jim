#!/usr/bin/env bun

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Command } from 'commander';
import { registerAddCommand } from './commands/add.js';
import { registerTasksCommand } from './commands/tasks.js';
import { registerListCommand } from './commands/list.js';
import { registerNextCommand } from './commands/next.js';
import { registerDoneCommand } from './commands/done.js';
import { registerRemindCommand } from './commands/remind.js';
import { registerReviewCommand } from './commands/review.js';
import { registerDeleteCommand } from './commands/delete.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

const program = new Command();

program
  .name('jim')
  .version(pkg.version)
  .description('Personal task & habits assistant');

registerAddCommand(program);
registerTasksCommand(program);
registerListCommand(program);
registerNextCommand(program);
registerDoneCommand(program);
registerRemindCommand(program);
registerReviewCommand(program);
registerDeleteCommand(program);

program.parse(process.argv);
