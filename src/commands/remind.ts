import type { Command } from 'commander';
import pc from 'picocolors';
import { JsonStore } from '../core/store.js';
import { getCompletionsThisPeriod } from '../core/utils.js';
import { getActiveTasks, getDormantTasks } from '../core/scheduler.js';

export function registerRemindCommand(program: Command): void {
  program
    .command('remind')
    .description('Show a brief reminder of pending tasks and habits')
    .action(() => {
      const store = new JsonStore();
      const data = store.load();
      const config = store.loadConfig();

      if (!config.reminderEnabled) {
        if (process.argv.includes('remind')) {
          console.log(pc.dim('Reminders are disabled. Edit ~/.jim/config.json to enable.'));
        }
        return;
      }

      const active = getActiveTasks(data);
      const dormant = getDormantTasks(data);
      const activePro = active.filter((t) => t.category === 'pro').length;
      const activePersonal = active.filter((t) => t.category === 'personal').length;

      const habitSummary = data.habits.map((h) => {
        const done = getCompletionsThisPeriod(h);
        return { title: h.title, done, total: h.frequency, period: h.period };
      });

      if (activePro === 0 && activePersonal === 0 && data.habits.length === 0 && dormant.length === 0) return;

      console.log(pc.bold('Jim:') + ` ${activePro} pro, ${activePersonal} personal active today`);

      if (habitSummary.length > 0) {
        const parts = habitSummary.map((h) => `${h.title} ${h.done}/${h.total}`);
        console.log(pc.dim(`  Habits: ${parts.join(' | ')}`));
      }

      if (dormant.length > 0) {
        console.log(pc.yellow(`  ${dormant.length} task${dormant.length > 1 ? 's' : ''} from before — run \`jim review\``));
      }
    });
}
