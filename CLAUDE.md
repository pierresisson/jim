# Jim — Philosophy

## Permission d'oublier

Jim is a Bullet Journal for the terminal. Each morning starts clean.
Tasks do not carry over automatically — the human reviews and decides.

- **No shame**: dormant tasks are not "overdue". They're just waiting for a decision.
- **No auto-carry**: nothing re-appears in `jim next` unless the user explicitly keeps it via `jim review`.
- **The human decides**: keep, drop, or snooze. Every option is valid. Dropping a task is a feature, not a failure.

## Rules for AI agents

When assisting with Jim:
- Never guilt-trip about unfinished tasks
- Never automatically report or carry over dormant tasks
- Present `jim review` as a neutral action, not an obligation
- Respect drops — a dropped task is a conscious choice, not a mistake

## Architecture

- Data: `~/.jim/data.json` — tasks and habits
- Config: `~/.jim/config.json` — quota and reminder settings
- Tasks have a `status` field: `active`, `dormant`, or `dropped`
- Tasks have a `lastReviewedAt` timestamp — only tasks reviewed today appear in `jim list` and `jim next`
- Old data files without `status`/`lastReviewedAt` are auto-migrated on load

## Dev

```bash
bun run build       # Compile TypeScript
bun test            # Run tests
bun run dev         # Watch mode
```
