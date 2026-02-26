import type { Command } from 'commander';
import pc from 'picocolors';
import { JsonStore } from '../core/store.js';
import { daysSince, getCompletionsThisPeriod } from '../core/utils.js';

const STALE_DAYS = 3;

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

      const pendingPro = data.tasks.filter((t) => !t.done && t.category === 'pro').length;
      const pendingPersonal = data.tasks.filter((t) => !t.done && t.category === 'personal').length;
      const stale = data.tasks.filter(
        (t) => !t.done && t.category === 'personal' && daysSince(t.createdAt) >= STALE_DAYS
      );

      const habitSummary = data.habits.map((h) => {
        const done = getCompletionsThisPeriod(h);
        return { title: h.title, done, total: h.frequency, period: h.period };
      });

      if (pendingPro === 0 && pendingPersonal === 0 && data.habits.length === 0) return;

      console.log(pc.bold('Jim:') + ` ${pendingPro} pro, ${pendingPersonal} personal pending`);

      if (habitSummary.length > 0) {
        const parts = habitSummary.map((h) => `${h.title} ${h.done}/${h.total}`);
        console.log(pc.dim(`  Habits: ${parts.join(' | ')}`));
      }

      if (stale.length > 0) {
        console.log(pc.red(`  ⚠ ${stale.length} personal task${stale.length > 1 ? 's' : ''} stale (>3 days)`));
      }
    });
}
