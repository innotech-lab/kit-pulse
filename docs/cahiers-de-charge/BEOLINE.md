# Cahier des charges : Beoline

Projet : KIT-Pulse (KITPULSE). Du mercredi 25 au vendredi 27 novembre 2026.
Rôle : Backend, tâches, disponibilité et audit

## Mission
Savoir qui fait quoi, où en est chaque tâche, et à qui on peut en attribuer une.

## Zone de travail exclusive
- `apps/api/src/modules/tasks`, `availability`, `audit`
- `db/seed/40_tasks.ts`

Aucun autre fichier. Besoin ailleurs : demander à la personne propriétaire (`docs/ANTI-CONFLITS.md`).
Fichiers de départ : modules/tasks/index.ts, modules/availability/index.ts, modules/audit/index.ts.

## Démarrer
```
npm ci
npm run setup
npm run dev:api      (terminal 1)
npm run dev:agent    (terminal 2)
npm run dev:web      (terminal 3) puis http://127.0.0.1:5173
```
Comptes de développement : `prenom@kitpulse.local`, `admin@`, `rh@`, `coordination@` ; mot de passe `KitPulse-dev-2026`.

Première branche : `feature/TASK-001-mes-taches` (une branche par ticket, depuis `develop` à jour).
Relecture de tes Pull Requests : Stany.
Plage de migrations réservée : 04xx (toujours validée par Daniel).

## Tâches
| ID | Tâche | Description | Priorité | Estimation | Dépendances | Échéance | Critère de complétion |
|---|---|---|---|---|---|---|---|
| TASK-001 | Mes tâches | GET /tasks/me avec période. | P0 | 2 h | SETUP-001 | mer. 25/11 11:30 | Tâches non terminées des jours passés incluses |
| AVL-001 | Disponibilité de l'équipe | GET /availability. | P0 | 1 h | SETUP-001 | mer. 25/11 13:30 | `until` dépassé ou compte sans ligne : OFFLINE |
| AVL-002 | Changer ma disponibilité | PUT /availability/me. | P0 | 1 h | AVL-001 | mer. 25/11 15:00 | `until` dans le passé : 400 |
| TASK-003 | Créer et modifier | POST /tasks et PATCH /tasks/:id. | P0 | 3 h | TASK-001 | jeu. 26/11 10:30 | MEMBER : uniquement pour soi ; compte inactif non attribuable |
| TASK-004 | Progression | POST /tasks/:id/progress. | P0 | 2 h | TASK-003 | jeu. 26/11 12:00 | DONE met 100 % ; historique dans task_updates |
| TASK-002 | Tâches de l'équipe | GET /tasks, filtre `userId`. | P0 | 1 h | TASK-001 | jeu. 26/11 15:00 | Réservé ADMIN, HR, COORDINATOR |
| AUDIT-001 | Journal des actions | GET /audit, plus récent en premier, limite 200. | P1 | 1 h | SETUP-001 | jeu. 26/11 16:30 | Réservé ADMIN |

P0 = indispensable au MVP. P1 = attendu. P2 = seulement si le reste est terminé.

## Routes à livrer
| Méthode | Route | Droits | Ticket |
|---|---|---|---|
| GET | /api/audit | ADMIN | AUDIT-001 |
| GET | /api/tasks/me | ALL | TASK-001 |
| GET | /api/tasks | ADMIN, HR, COORDINATOR | TASK-002 |
| POST | /api/tasks | ALL | TASK-003 |
| PATCH | /api/tasks/:id | ALL | TASK-003 |
| POST | /api/tasks/:id/progress | ALL | TASK-004 |
| GET | /api/availability | ALL | AVL-001 |
| PUT | /api/availability/me | ALL | AVL-002 |

Formats d'entrée et de sortie : `packages/contracts/src/schemas.ts` (gelé).

## Cas à tester
- 100 % sans DONE et DONE sans 100 % : cohérence imposée
- Modifier la tâche d'une autre personne en MEMBER : 403
- Tâche annulée : plus de progression
- Statut MEETING expiré : repasse OFFLINE

## Definition of Done
- [ ] Critère de complétion vérifié, tests écrits dans ma zone (remplacer `test.todo`)
- [ ] `npm run owner:check -- Beoline` et `npm run check` passent
- [ ] Pull Request relue par Stany, aucun bug bloquant
- [ ] Aucun secret, aucune MAC réelle, aucun mot de passe dans le code

Blocage de plus de 30 minutes : le dire dans le groupe avec l'ID du ticket.
