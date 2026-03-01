# Jim CLI

Assistant personnel pour gérer tes tâches et habitudes par catégories flexibles, directement depuis le terminal.

**Philosophie** : chaque matin commence vide. Tes tâches ne se reportent pas automatiquement — tu décides consciemment de garder, reporter ou abandonner chaque tâche via `jim review`. Pas de honte, pas de "stale", juste une décision intentionnelle.

## Intégration Claude Code

Jim s'intègre avec Claude Code via un skill global. Claude détecte automatiquement quand tu parles de tâches et utilise `jim` en arrière-plan.

```bash
# Le skill est installé dans ~/.claude/skills/jim.md
# Le pointeur est dans ~/.claude/CLAUDE.md
# Rien à invoquer — Claude le fait tout seul
```

## Installation

```bash
# Cloner et installer
git clone git@github.com:pierresisson/Jim.git
cd Jim
bun install
bun run build
bun link
```

Requires [Bun](https://bun.sh) >= 1.0.

## Commandes

### `jim add <title>` — Ajouter une tâche ou habitude

Les guillemets sont optionnels — `jim add faire les courses` marche aussi bien que `jim add "faire les courses"`.

```bash
# Tâche pro (défaut)
jim add Review PR #42
jim add Review PR #42 -c pro -p high

# Tâche perso
jim add Configurer filtre Brita -c perso
jim add Appeler le plombier -c perso -p high

# Habitude récurrente
jim add "Promener le chien" --habit --frequency 4 --period week
jim add "Méditer" --habit --frequency 1 --period day
```

Options :
- `-c, --category <key>` — Catégorie (défaut: la première définie dans la config, ex: `pro`)
- `-p, --priority <high|medium|low>` — Priorité (défaut: `medium`)
- `--habit` — Créer une habitude au lieu d'une tâche
- `--frequency <n>` — Nombre de fois par période (habitudes)
- `--period <day|week>` — Période de l'habitude (défaut: `week`)

### `jim tasks` — Voir les tâches et habitudes

```bash
jim tasks                    # Tâches actives aujourd'hui + habitudes
jim tasks -c perso           # Seulement les tâches perso
jim tasks --all              # Toutes les tâches (actives, dormantes, abandonnées, terminées)
jim tasks --dormant          # Tâches dormantes (pas encore revues aujourd'hui)
jim tasks --dropped          # Tâches abandonnées
```

Par défaut, seules les tâches actives (revues aujourd'hui) apparaissent. Les anciennes tâches deviennent dormantes et attendent ton `jim review`.

### `jim list` — Gérer des listes

Listes persistantes pour tout ce qui n'est pas une tâche : anniversaires, courses, idées…

```bash
jim list                             # Affiche toutes les listes
jim list create <name>               # Crée une liste vide
jim list show <name>                 # Affiche les items d'une liste
jim list add <name> <text...> [-d]   # Ajoute un item (--date optionnel)
jim list done <name> <id>            # Coche un item
jim list rm <name> [id]              # Supprime un item, ou la liste entière si pas d'id
```

Le lookup par nom est case-insensitive et supporte les préfixes partiels (`anniv` → `Anniversaires`).

### `jim review` — Revoir les tâches dormantes

```bash
jim review
```

Parcourt les tâches dormantes une par une. Pour chaque tâche :
- **[k]eep** — Remet la tâche active pour aujourd'hui
- **[d]rop** — Abandonne la tâche (décision consciente, pas une honte)
- **[s]nooze** — Reporte à une date future
- **d[o]ne** — Marque la tâche comme terminée

### `jim next` — Suggestion intelligente

```bash
jim next
```

L'algorithme prend en compte :
- La priorité de la tâche
- Le quota quotidien par catégorie (si défini) — si pas atteint, les tâches de cette catégorie sont boostées
- L'urgence des habitudes en fin de période

Seules les tâches actives (revues aujourd'hui) sont suggérées.

### `jim done <id>` — Marquer comme fait

```bash
jim done 222d8738           # Par ID (préfixe partiel accepté)
jim done --last             # Complète la dernière suggestion de `jim next`
```

### `jim delete <id>` — Supprimer définitivement

```bash
jim delete 222d8738         # Par ID (préfixe partiel accepté)
```

Supprime définitivement une tâche ou une habitude du fichier de données.

### `jim remind` — Rappel rapide

```bash
jim remind
```

Affiche un résumé concis : tâches actives par catégorie, progression des habitudes. Si des tâches dormantes existent, te suggère de lancer `jim review`.

## Rappel automatique au terminal

Ajoute cette ligne à ton `~/.zshrc` (ou `~/.bashrc`) :

```bash
source /chemin/vers/Jim/.jim-hook.sh
```

A chaque ouverture de terminal, `jim remind` s'exécutera automatiquement.

## Configuration

Le fichier `~/.jim/config.json` contient :

```json
{
  "categories": [
    { "key": "pro", "label": "PRO", "color": "cyan" },
    { "key": "perso", "label": "PERSO", "color": "magenta", "dailyQuota": 2 }
  ],
  "reminderEnabled": true
}
```

### Catégories flexibles

Tu peux définir autant de catégories que tu veux. Chaque catégorie a :

- `key` — Identifiant unique (utilisé avec `-c` dans les commandes)
- `label` — Nom affiché dans les tableaux et rappels
- `color` — Couleur du label (`red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`, `gray`)
- `dailyQuota` (optionnel) — Nombre de tâches à faire par jour ; si le quota n'est pas atteint, `jim next` booste les tâches de cette catégorie

Exemple avec des catégories personnalisées :

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

L'ordre dans le tableau `categories` détermine l'ordre d'affichage dans `jim tasks`.

> **Migration** : l'ancien format (`persoDailyQuota: 2`) est automatiquement migré en mémoire au chargement. Pas de manipulation manuelle nécessaire.

### Autres options

- `reminderEnabled` — Active/désactive le rappel terminal

## Données

Stockées dans `~/.jim/data.json`. Le répertoire et les fichiers sont créés automatiquement au premier lancement. Les anciens fichiers sans les champs `status`/`lastReviewedAt` sont migrés automatiquement au chargement.

## Dev

```bash
bun run build       # Compiler TypeScript
bun run dev         # Compiler en mode watch
bun test            # Lancer les tests
bun run test:watch  # Tests en mode watch
```
