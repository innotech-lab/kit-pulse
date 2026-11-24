# Travailler à 7 sans conflit

Un conflit arrive quand deux personnes modifient les mêmes lignes. Ici, **chaque fichier a une seule personne responsable** (`scripts/ownership.json`). Aucune méthode ne garantit zéro conflit si ces règles ne sont pas suivies.

## Règles
1. Je ne modifie que ma zone. Contrôle : `npm run owner:check -- MonPrenom`.
2. Une branche par ticket, depuis `develop` à jour : `feature/<TICKET>-<description>` ou `fix/<TICKET>-<description>`. Durée : une journée maximum.
3. Personne ne pousse sur `main` ni `develop` : Pull Request + une relecture.
4. Avant chaque PR : récupérer `develop`, lancer `npm run check`.
5. Pas de reformatage ni de renommage hors de son ticket. Pas d'éditeur qui reformate tout le dossier.
6. `.env`, base locale et `node_modules` ne sont jamais versionnés.

## Fichiers gelés
| Fichier | Seule personne qui modifie | Pour demander |
|---|---|---|
| `packages/contracts/` | Alain | Ticket + exemple JSON ; annonce à l'équipe |
| `db/migrations/`, `db/lib.ts`, `db/seed/index.ts`, `db/fingerprint.json` | Daniel | Voir BASE-DE-DONNEES.md |
| `package.json`, `package-lock.json`, `.env.example` | Daniel | Nom + raison. Ajout uniquement à 12:00 ou 17:00, seul dans sa PR |
| `apps/api/src/core/`, `app.ts`, `testing.ts` | Daniel | Ticket |
| `apps/web/src/core/`, `apps/web/package.json` | Alain | Ticket (dépendance : avec Daniel) |
| `apps/web/src/ui/` | Francis | Ticket ; on ne copie pas un composant chez soi |

Aucune nouvelle dépendance n'est prévue pour les 3 jours. Installer avec `npm ci`, jamais `npm install`, sauf Daniel.

## Intégration
Fenêtres : 12:00 et 17:00 (vendredi 10:30 et 12:00). Ordre : contrats, base, modules API, web. Daniel fusionne l'API, Alain fusionne le web. Le lockfile et l'empreinte sont marqués `-merge` : en cas de divergence, Daniel les régénère, on ne les fusionne jamais à la main.

## Réglages à faire sur le dépôt (par la personne qui l'administre)
- Protéger `main` et `develop` : PR obligatoire, 1 relecture, CI verte.
- Remplir `.github/CODEOWNERS` avec les vrais comptes (non fournis à ce jour).
- Chaque personne active le garde-fou local : `git config core.hooksPath .githooks`
