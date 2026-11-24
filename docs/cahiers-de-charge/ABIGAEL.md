# Cahier des charges : Abigael

Projet : KIT-Pulse (KITPULSE). Du mercredi 25 au vendredi 27 novembre 2026.
Rôle : UI, pages du quotidien

## Mission
Rendre les pages utilisées chaque jour simples, rapides et lisibles. Les données de démonstration permettent de commencer sans attendre le backend.

## Zone de travail exclusive
- `apps/web/src/features/team`, `tasks`, `attendance`, `reviews`
- `docs/GUIDE-UTILISATEUR.md`

Aucun autre fichier. Besoin ailleurs : demander à la personne propriétaire (`docs/ANTI-CONFLITS.md`).
Fichiers de départ : features/team/index.tsx (exemple), tasks, attendance, reviews.

## Démarrer
```
npm ci
npm run setup
npm run dev:api      (terminal 1)
npm run dev:agent    (terminal 2)
npm run dev:web      (terminal 3) puis http://127.0.0.1:5173
```
Comptes de développement : `prenom@kitpulse.local`, `admin@`, `rh@`, `coordination@` ; mot de passe `KitPulse-dev-2026`.

Première branche : `feature/WEB-TEAM-001-page-equipe` (une branche par ticket, depuis `develop` à jour).
Relecture de tes Pull Requests : Francis.
Plage de migrations réservée : aucune (toujours validée par Daniel).

## Tâches
| ID | Tâche | Description | Priorité | Estimation | Dépendances | Échéance | Critère de complétion |
|---|---|---|---|---|---|---|---|
| WEB-TEAM-001 | Page équipe et disponibilité | Icône libre / occupation / réunion / terrain, filtre, changement de mon statut. | P0 | 3 h | UI-001 | mer. 25/11 17:00 | Le statut se comprend sans la couleur |
| WEB-TASK-001 | Page mes tâches | Liste du jour, progression, création pour soi. | P0 | 4 h | UI-001 | jeu. 26/11 11:00 | Vide, chargement et erreur traités |
| WEB-TASK-002 | Attribuer une tâche | Choix d'une personne avec son statut, si rôle DATA. | P0 | 2 h | WEB-TASK-001, TASK-003 | jeu. 26/11 14:00 | Disponibilité visible au moment du choix |
| WEB-ATT-001 | Page présences | Mes journées, dépôt d'une justification. | P0 | 3 h | ATT-001, JUS-001 | jeu. 26/11 17:00 | Justifié et non justifié distincts |
| WEB-JUS-001 | Justifications à traiter | Accepter ou refuser (ADMIN, HR). | P0 | 2 h | JUS-002 | ven. 27/11 10:00 | Confirmation avant refus |
| DOC-001 | Guide utilisateur | Pointer, justifier, tâches, agenda, statut. | P1 | 1 h | - | ven. 27/11 11:30 | Une personne extérieure y arrive sans aide |

P0 = indispensable au MVP. P1 = attendu. P2 = seulement si le reste est terminé.

## Cas à tester
- Texte très long, liste vide, 50 lignes
- Écran de 360 px
- Navigation au clavier
- Erreur API affichée, jamais un écran blanc

## Definition of Done
- [ ] Critère de complétion vérifié, tests écrits dans ma zone (remplacer `test.todo`)
- [ ] `npm run owner:check -- Abigael` et `npm run check` passent
- [ ] Pull Request relue par Francis, aucun bug bloquant
- [ ] Aucun secret, aucune MAC réelle, aucun mot de passe dans le code

Blocage de plus de 30 minutes : le dire dans le groupe avec l'ID du ticket.
