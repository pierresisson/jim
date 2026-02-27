# Jim CLI

Assistant personnel pour gérer tes tâches pro/perso et tes habitudes, directement depuis le terminal.

**Philosophie** : chaque matin commence vide. Tes tâches ne se reportent pas automatiquement — tu décides consciemment de garder, reporter ou abandonner chaque tâche via `jim review`. Pas de honte, pas de "stale", juste une décision intentionnelle.

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

```bash
# Tâche pro (défaut)
jim add "Review PR #42"
jim add "Review PR #42" -c pro -p high

# Tâche perso
jim add "Configurer filtre Brita" -c perso
jim add "Appeler le plombier" -c perso -p high

# Habitude récurrente
jim add "Promener le chien" --habit --frequency 4 --period week
jim add "Méditer" --habit --frequency 1 --period day
```

Options :
- `-c, --category <pro|perso>` — Catégorie (défaut: `pro`)
- `-p, --priority <high|medium|low>` — Priorité (défaut: `medium`)
- `--habit` — Créer une habitude au lieu d'une tâche
- `--frequency <n>` — Nombre de fois par période (habitudes)
- `--period <day|week>` — Période de l'habitude (défaut: `week`)

### `jim list` — Voir les tâches et habitudes

```bash
jim list                    # Tâches actives aujourd'hui + habitudes
jim list -c perso        # Seulement les tâches perso
jim list --all              # Toutes les tâches (actives, dormantes, abandonnées, terminées)
jim list --dormant          # Tâches dormantes (pas encore revues aujourd'hui)
jim list --dropped          # Tâches abandonnées
```

Par défaut, seules les tâches actives (revues aujourd'hui) apparaissent. Les anciennes tâches deviennent dormantes et attendent ton `jim review`.

### `jim review` — Revoir les tâches dormantes

```bash
jim review
```

Parcourt les tâches dormantes une par une. Pour chaque tâche :
- **[k]eep** — Remet la tâche active pour aujourd'hui
- **[d]rop** — Abandonne la tâche (décision consciente, pas une honte)
- **[s]nooze** — Reporte à une date future

### `jim next` — Suggestion intelligente

```bash
jim next
```

L'algorithme prend en compte :
- La priorité de la tâche
- Le quota perso quotidien (2 par défaut) — si pas atteint, les tâches perso sont boostées
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
  "persoDailyQuota": 2,
  "reminderEnabled": true
}
```

- `persoDailyQuota` — Nombre de tâches perso à faire par jour avant que l'algo arrête de les booster
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
