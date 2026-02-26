# Jim CLI

Assistant personnel pour gérer tes tâches pro/perso et tes habitudes, directement depuis le terminal.

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
jim add "Configurer filtre Brita" -c personal
jim add "Appeler le plombier" -c personal -p high

# Habitude récurrente
jim add "Promener le chien" --habit --frequency 4 --period week
jim add "Méditer" --habit --frequency 1 --period day
```

Options :
- `-c, --category <pro|personal>` — Catégorie (défaut: `pro`)
- `-p, --priority <high|medium|low>` — Priorité (défaut: `medium`)
- `--habit` — Créer une habitude au lieu d'une tâche
- `--frequency <n>` — Nombre de fois par période (habitudes)
- `--period <day|week>` — Période de l'habitude (défaut: `week`)

### `jim list` — Voir les tâches et habitudes

```bash
jim list                    # Tâches en cours + habitudes
jim list -c personal        # Seulement les tâches perso
jim list --all              # Inclure les tâches terminées
```

Les tâches perso non faites depuis 3+ jours apparaissent avec un tag `[STALE]`.

### `jim next` — Suggestion intelligente

```bash
jim next
```

L'algorithme prend en compte :
- La priorité de la tâche
- Le quota perso quotidien (2 par défaut) — si pas atteint, les tâches perso sont boostées
- L'ancienneté des tâches perso (staleness boost)
- L'urgence des habitudes en fin de période

### `jim done <id>` — Marquer comme fait

```bash
jim done 222d8738           # Par ID (préfixe partiel accepté)
jim done --last             # Complète la dernière suggestion de `jim next`
```

### `jim remind` — Rappel rapide

```bash
jim remind
```

Affiche un résumé concis : tâches en cours par catégorie, progression des habitudes, alertes stale.

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
  "personalDailyQuota": 2,
  "reminderEnabled": true
}
```

- `personalDailyQuota` — Nombre de tâches perso à faire par jour avant que l'algo arrête de les booster
- `reminderEnabled` — Active/désactive le rappel terminal

## Données

Stockées dans `~/.jim/data.json`. Le répertoire et les fichiers sont créés automatiquement au premier lancement.

## Dev

```bash
bun run build       # Compiler TypeScript
bun run dev         # Compiler en mode watch
bun test            # Lancer les tests
bun run test:watch  # Tests en mode watch
```
