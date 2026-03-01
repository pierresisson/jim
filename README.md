# Jim CLI

> Your todo list shouldn't stress you out. Jim is a Bullet Journal for the terminal — fast, local, no account needed. Each morning starts clean. Overdue tasks don't scream at you: you decide what to keep and what to let go. Dropping a task isn't failure, it's a decision. Tasks, habits, grocery lists, birthdays — everything lives in `~/.jim/`.

**Philosophy**: each morning starts empty. Tasks don't carry over automatically — you consciously decide to keep, snooze, or drop each one via `jim review`. No shame, no "stale", just intentional choices.

## Claude Code Integration

Jim integrates with Claude Code via a global skill. Claude automatically detects when you talk about tasks and uses `jim` behind the scenes.

```bash
# The skill lives in ~/.claude/skills/jim.md
# The pointer is in ~/.claude/CLAUDE.md
# Nothing to invoke — Claude does it on its own
```

## Installation

```bash
# Clone and install
git clone git@github.com:pierresisson/Jim.git
cd Jim
bun install
bun run build
bun link
```

Requires [Bun](https://bun.sh) >= 1.0.

## Commands

### `jim add <title>` — Add a task or habit

Quotes are optional — `jim add buy groceries` works just as well as `jim add "buy groceries"`.

```bash
# Work task (default)
jim add Review PR #42
jim add Review PR #42 -c pro -p high

# Personal task
jim add Set up Brita filter -c perso
jim add Call the plumber -c perso -p high

# Recurring habit
jim add "Walk the dog" --habit --frequency 4 --period week
jim add "Meditate" --habit --frequency 1 --period day
```

Options:
- `-c, --category <key>` — Category (default: first one defined in config, e.g. `pro`)
- `-p, --priority <high|medium|low>` — Priority (default: `medium`)
- `--habit` — Create a habit instead of a task
- `--frequency <n>` — Times per period (habits)
- `--period <day|week>` — Habit period (default: `week`)

### `jim tasks` — View tasks and habits

```bash
jim tasks                    # Today's active tasks + habits
jim tasks -c perso           # Only personal tasks
jim tasks --all              # All tasks (active, dormant, dropped, done)
jim tasks --dormant          # Dormant tasks (not reviewed today)
jim tasks --dropped          # Dropped tasks
jim tasks --done             # Completed tasks
```

By default, only active tasks (reviewed today) are shown. Older tasks become dormant and wait for your `jim review`.

### `jim list` — Manage lists

Persistent lists for anything that isn't a task: birthdays, groceries, ideas...

```bash
jim list                             # Show all lists
jim list create <name>               # Create an empty list
jim list show <name>                 # Show items in a list
jim list add <name> <text...> [-d]   # Add an item (--date optional)
jim list done <name> <id>            # Check off an item
jim list rm <name> [id]              # Remove an item, or the entire list if no id
```

Name lookup is case-insensitive and supports partial prefixes (`birth` → `Birthdays`).

### `jim review` — Review dormant tasks

```bash
jim review
```

Walks through dormant tasks one by one. For each task:
- **[k]eep** — Reactivate the task for today
- **[d]rop** — Drop the task (a conscious choice, not a failure)
- **[s]nooze** — Snooze until a future date
- **d[o]ne** — Mark the task as completed

### `jim next` — Smart suggestion

```bash
jim next
```

The algorithm takes into account:
- Task priority
- Daily quota per category (if set) — if not met, tasks from that category get boosted
- Habit urgency near end of period

Only active tasks (reviewed today) are suggested.

### `jim done <id>` — Mark as done

```bash
jim done 222d8738           # By ID (partial prefix accepted)
jim done --last             # Complete the task suggested by `jim next`
```

### `jim delete <id>` — Permanently delete

```bash
jim delete 222d8738         # By ID (partial prefix accepted)
```

Permanently removes a task or habit from the data file.

### `jim remind` — Quick reminder

```bash
jim remind
```

Shows a concise summary: active tasks by category, habit progress. If dormant tasks exist, suggests running `jim review`.

## Automatic terminal reminder

Add this line to your `~/.zshrc` (or `~/.bashrc`):

```bash
source /path/to/Jim/.jim-hook.sh
```

Every time you open a terminal, `jim remind` will run automatically.

## Configuration

The `~/.jim/config.json` file contains:

```json
{
  "categories": [
    { "key": "pro", "label": "PRO", "color": "cyan" },
    { "key": "perso", "label": "PERSO", "color": "magenta", "dailyQuota": 2 }
  ],
  "reminderEnabled": true,
  "dailyGoal": 5
}
```

### Daily goal

Set `dailyGoal` to a number to track how many tasks you want to complete each day. Progress is shown in `jim tasks`, `jim next`, and `jim remind`. Turns green when you hit the target. Optional — if omitted, nothing is displayed.

### Flexible categories

You can define as many categories as you want. Each category has:

- `key` — Unique identifier (used with `-c` in commands)
- `label` — Display name in tables and reminders
- `color` — Label color (`red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`, `gray`)
- `dailyQuota` (optional) — Number of tasks to do per day; if not met, `jim next` boosts tasks from that category

Example with custom categories:

```json
{
  "categories": [
    { "key": "pro", "label": "PRO", "color": "cyan" },
    { "key": "freelance", "label": "Freelance", "color": "blue" },
    { "key": "perso", "label": "PERSO", "color": "magenta", "dailyQuota": 2 },
    { "key": "health", "label": "Health", "color": "green", "dailyQuota": 1 }
  ],
  "reminderEnabled": true
}
```

The order in the `categories` array determines the display order in `jim tasks`.

> **Migration**: the old format (`persoDailyQuota: 2`) is automatically migrated in memory on load. No manual changes needed.

### Other options

- `reminderEnabled` — Enable/disable the terminal reminder

## Data

Stored in `~/.jim/data.json`. The directory and files are created automatically on first run. Old data files without `status`/`lastReviewedAt` fields are auto-migrated on load.

## Dev

```bash
bun run build       # Compile TypeScript
bun run dev         # Compile in watch mode
bun test            # Run tests
bun run test:watch  # Tests in watch mode
```
