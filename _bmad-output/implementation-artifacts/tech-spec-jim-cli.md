---
title: 'Jim CLI - Personal Task & Habits Assistant'
slug: 'jim-cli'
created: '2026-02-26'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['TypeScript', 'Node.js', 'Commander.js', 'Picocolors', 'Vitest']
files_to_modify: ['src/index.ts', 'src/commands/add.ts', 'src/commands/list.ts', 'src/commands/next.ts', 'src/commands/done.ts', 'src/commands/remind.ts', 'src/core/store.ts', 'src/core/config.ts', 'src/core/types.ts', 'src/core/scheduler.ts', '.jim-hook.sh', 'package.json', 'tsconfig.json']
code_patterns: ['command-pattern: each CLI command in separate file exporting a function', 'store-abstraction: interface-based data access layer for future DB swap', 'modular-core: business logic decoupled from CLI layer']
test_patterns: ['vitest', 'unit tests on core/ modules', 'test files colocated as *.test.ts']
---

# Tech-Spec: Jim CLI - Personal Task & Habits Assistant

**Created:** 2026-02-26

## Overview

### Problem Statement

Pierre has professional tasks (features to develop, PRs to review) that take priority because they're paid work, but personal tasks and habits (configuring a Brita filter, setting up an alarm clock, walking the dog, exercising) keep getting postponed indefinitely. There's no unified tool to manage both pro and personal tasks with a mechanism that enforces a healthy balance between the two.

### Solution

A CLI tool built with Node.js/TypeScript that manages tasks (pro + personal) and recurring habits, featuring an active terminal reminder system and a smart `jim next` command that intelligently suggests the next action based on priority, category balance, and staleness of postponed tasks.

### Scope

**In Scope:**
- `jim add` — add a task (pro/personal) or a habit
- `jim list` — view tasks by category/priority
- `jim next` — smart suggestion for what to do next
- `jim done` — mark a task as completed
- Recurring habits with frequency tracking (e.g., walk dog 4x/week, exercise)
- One-off personal tasks with "stale" detection (tasks postponed too long get boosted)
- Active reminder when opening terminal (shell hook)
- Local JSON file persistence (abstracted behind interface for future DB migration)
- Categories: pro / personal
- Simple priorities: high / medium / low
- Configurable daily personal task quota

**Out of Scope:**
- Tech/AI news feed, stock trends, material trends (future modules)
- Web interface
- Cloud sync / multi-device
- External integrations (calendar, GitHub, etc.)
- Mobile notifications

## Context for Development

### Codebase Patterns

- **Greenfield project** — confirmed clean slate, no legacy constraints
- TypeScript with Node.js runtime, strict mode
- **Command pattern**: each CLI command lives in its own file under `src/commands/`, exports a registration function that takes the Commander program instance
- **Store abstraction**: `IStore` interface in `src/core/store.ts` — today backed by JSON file, designed for easy swap to SQLite/Postgres later. `data.json` serves as the implicit schema reference for future migrations.
- **Modular core**: business logic in `src/core/` is fully decoupled from CLI layer in `src/commands/` — enables future web/API interfaces
- **Config pattern**: user preferences loaded once at startup from `~/.jim/config.json`

### Files to Create

| File | Purpose |
| ---- | ------- |
| `package.json` | Project manifest, dependencies, bin entry pointing to `dist/index.js` |
| `tsconfig.json` | TypeScript strict config, output to `dist/` |
| `src/index.ts` | CLI entry point — Commander.js setup, command registration, shebang |
| `src/commands/add.ts` | `jim add` — add task or habit |
| `src/commands/list.ts` | `jim list` — display tasks by category/priority |
| `src/commands/next.ts` | `jim next` — smart suggestion engine |
| `src/commands/done.ts` | `jim done` — mark task/habit complete |
| `src/commands/remind.ts` | `jim remind` — lightweight shell hook output |
| `src/core/types.ts` | Interfaces: Task, Habit, JimData, JimConfig, IStore |
| `src/core/store.ts` | IStore interface + JsonStore implementation |
| `src/core/config.ts` | Load/save/init user config from `~/.jim/config.json` |
| `src/core/scheduler.ts` | `jim next` algorithm: priority + category balance + staleness |
| `.jim-hook.sh` | Shell snippet to source in `.zshrc`/`.bashrc` |

### Technical Decisions

- **CLI framework:** Commander.js — fastest startup, minimal overhead (critical for shell hook)
- **Terminal styling:** Picocolors — 6 kB, fastest option
- **Persistence:** JSON file at `~/.jim/data.json`, abstracted behind `IStore` interface
- **Config:** `~/.jim/config.json` for user preferences (daily personal quota, categories, etc.)
- **Testing:** Vitest — fast, native TypeScript support
- **Build:** `tsc` to `dist/`, `bin` entry in package.json points to `dist/index.js`
- **Shell hook:** `.jim-hook.sh` calls `jim remind` — a dedicated lightweight command that only reads and displays, no parsing overhead
- **DB migration path:** `IStore` interface means swapping JSON for SQLite/Postgres only requires a new implementation class — `data.json` structure serves as schema reference

## Implementation Plan

### Tasks

- [x] Task 1: Initialize project scaffold
  - File: `package.json`
  - Action: Create with name `jim-cli`, bin entry `"jim": "dist/index.js"`, dependencies (commander, picocolors), devDependencies (typescript, vitest, @types/node), scripts (build, dev, test)
  - File: `tsconfig.json`
  - Action: Create with strict mode, target ES2022, module NodeNext, outDir `dist/`, rootDir `src/`

- [x] Task 2: Define core types
  - File: `src/core/types.ts`
  - Action: Create interfaces:
    - `Task { id: string; title: string; category: 'pro' | 'personal'; priority: 'high' | 'medium' | 'low'; createdAt: string; completedAt?: string; done: boolean }`
    - `Habit { id: string; title: string; frequency: number; period: 'day' | 'week'; completions: string[] }` — completions stores ISO date strings of each check-in
    - `JimData { tasks: Task[]; habits: Habit[] }`
    - `JimConfig { personalDailyQuota: number; reminderEnabled: boolean }`
    - `IStore { load(): JimData; save(data: JimData): void; loadConfig(): JimConfig; saveConfig(config: JimConfig): void }`

- [x] Task 3: Implement store abstraction
  - File: `src/core/store.ts`
  - Action: Create `JsonStore` class implementing `IStore`. Reads/writes `~/.jim/data.json` and `~/.jim/config.json`. Auto-creates `~/.jim/` directory and default files on first run. Uses `fs.readFileSync`/`writeFileSync` for simplicity (CLI is synchronous).

- [x] Task 4: Implement config helper
  - File: `src/core/config.ts`
  - Action: Create `getConfig()` and `initConfig()` functions. `initConfig()` creates default config if none exists (personalDailyQuota: 2, reminderEnabled: true). Export default config values.

- [x] Task 5: Implement `jim add` command
  - File: `src/commands/add.ts`
  - Action: Register `add <title>` command with options: `--category, -c` (pro/personal, default: pro), `--priority, -p` (high/medium/low, default: medium), `--habit` flag with `--frequency` and `--period` options. Generate UUID for id. Save to store. Print confirmation with color.

- [x] Task 6: Implement `jim list` command
  - File: `src/commands/list.ts`
  - Action: Register `list` command with optional `--category` filter and `--all` flag (show completed too). Display tasks grouped by category, sorted by priority. Show habits with completion progress (e.g., "Walk dog 2/4 this week"). Use picocolors for priority coloring (red=high, yellow=medium, green=low). Show stale indicator for personal tasks older than 3 days.

- [x] Task 7: Implement scheduler / next algorithm
  - File: `src/core/scheduler.ts`
  - Action: Create `getNextTask(data: JimData, config: JimConfig): Task | Habit | null`. Algorithm:
    1. Filter to incomplete tasks and habits needing completion this period
    2. Score each item: base score from priority (high=10, medium=5, low=2)
    3. Staleness boost: +1 per day since creation for personal tasks
    4. Category balance: if personal quota not met today, boost personal tasks by +15
    5. Habit urgency: boost habits approaching end of period with incomplete frequency
    6. Return highest scored item

- [x] Task 8: Implement `jim next` command
  - File: `src/commands/next.ts`
  - Action: Register `next` command. Call `getNextTask()`. Display suggestion with context: why this task was chosen (e.g., "You haven't done any personal tasks today" or "This has been sitting for 5 days"). Show daily progress summary (X/Y personal tasks done today).

- [x] Task 9: Implement `jim done` command
  - File: `src/commands/done.ts`
  - Action: Register `done <id>` command. For tasks: mark `done: true`, set `completedAt`. For habits: add today's date to `completions[]`. Print confirmation. Also support `done --last` to complete the last suggested task from `jim next`.

- [x] Task 10: Implement `jim remind` and shell hook
  - File: `src/commands/remind.ts`
  - Action: Register `remind` command (lightweight, no args). Load data, show: count of pending tasks per category, habit progress for today/this week, any stale personal tasks (>3 days). Keep output to max 3-4 lines.
  - File: `.jim-hook.sh`
  - Action: Create shell script: `if command -v jim &> /dev/null; then jim remind; fi`. Include comment with install instructions (add `source /path/to/.jim-hook.sh` to `.zshrc`).

- [x] Task 11: Wire up CLI entry point
  - File: `src/index.ts`
  - Action: Create with shebang `#!/usr/bin/env node`. Import Commander, create program with name `jim`, version `0.1.0`, description. Register all commands. Parse `process.argv`.

- [x] Task 12: Build, link, and smoke test
  - Action: Run `npm install`, `npm run build`, `npm link`. Test all commands manually: `jim add`, `jim list`, `jim next`, `jim done`, `jim remind`.

### Acceptance Criteria

- [x] AC 1: Given no `~/.jim/` directory, when running any `jim` command, then it creates `~/.jim/`, `data.json` with empty tasks/habits, and `config.json` with defaults
- [x] AC 2: Given `jim add "Review PR #42" -c pro -p high`, when listing tasks, then the task appears under pro category with high priority
- [x] AC 3: Given `jim add "Config Brita" -c personal`, when 3 days pass without completion, then `jim list` shows a stale indicator next to it
- [x] AC 4: Given `jim add "Walk dog" --habit --frequency 4 --period week`, when checking habits, then it shows completion progress (e.g., 0/4 this week)
- [x] AC 5: Given 0 personal tasks completed today and personalDailyQuota is 2, when running `jim next`, then it prioritizes a personal task and explains why
- [x] AC 6: Given a high-priority pro task and a 5-day-old personal task with quota met, when running `jim next`, then it suggests the pro task
- [x] AC 7: Given `jim done <task-id>`, when listing tasks, then the task shows as completed and is hidden by default (shown with `--all`)
- [x] AC 8: Given `jim done <habit-id>`, when listing habits, then the completion count increments for the current period
- [x] AC 9: Given `jim remind` runs, when there are pending tasks, then it outputs a concise 3-4 line summary in under 200ms
- [x] AC 10: Given `.jim-hook.sh` is sourced in `.zshrc`, when opening a new terminal, then `jim remind` output appears automatically

## Additional Context

### Dependencies

**Production:**
- `commander` ^12.x — CLI framework
- `picocolors` ^1.x — terminal colors

**Development:**
- `typescript` ^5.x — compiler
- `vitest` ^2.x — test framework
- `@types/node` ^22.x — Node.js type definitions

### Testing Strategy

**Unit Tests (Vitest):**
- `src/core/scheduler.test.ts` — Test scoring algorithm: priority weighting, staleness boost, category balance, habit urgency. This is the most complex logic and needs thorough coverage.
- `src/core/store.test.ts` — Test read/write with temp directory, auto-init, malformed JSON handling.
- `src/core/config.test.ts` — Test default creation, load, save.

**Manual Smoke Tests:**
- Full CLI workflow: add tasks/habits, list, next, done, remind
- Shell hook integration in new terminal

### Notes

- Future extensibility is a key concern — the architecture should make it easy to add "modules" (news, stocks, materials) later
- The `jim next` algorithm should factor in: task priority, category (pro vs personal), personal daily quota progress, and how long a task has been sitting idle
- Habits are recurring and tracked by completion count per period (week)
- Store abstraction is the key architectural decision — keeps v1 simple (JSON) while making DB migration trivial
- UUID generation: use `crypto.randomUUID()` (built-in Node.js, no extra dependency)
- Stale threshold: 3 days for personal tasks — configurable later

## Review Notes
- Adversarial review completed
- Findings: 17 total, 17 fixed, 0 skipped
- Resolution approach: auto-fix all
