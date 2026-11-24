# Cahier des charges : Daniel

Projet : KIT-Pulse (KITPULSE). Du mercredi 25 au vendredi 27 novembre 2026.
Rôle : Backend, responsable de la base et du socle API

## Mission
Garantir une seule base identique pour tout le monde, les comptes et leurs IDs KIT-HUB, les bilans de productivité.

## Zone de travail exclusive
- `db/` (sauf les fichiers de seed attribués)
- `apps/api/src/` : `app.ts`, `server.ts`, `testing.ts`, `core/`
- `apps/api/src/modules/auth`, `users`, `reports`
- `package.json`, `package-lock.json`, `.env.example`, `.npmrc`, `.nvmrc`, `tsconfig*.json`

Aucun autre fichier. Besoin ailleurs : demander à la personne propriétaire (`docs/ANTI-CONFLITS.md`).
Fichiers de départ : modules/users/index.ts, modules/reports/index.ts.

## Démarrer
```
npm ci
npm run setup
npm run dev:api      (terminal 1)
npm run dev:agent    (terminal 2)
npm run dev:web      (terminal 3) puis http://127.0.0.1:5173
```
Comptes de développement : `prenom@kitpulse.local`, `admin@`, `rh@`, `coordination@` ; mot de passe `KitPulse-dev-2026`.

Première branche : `feature/USER-001-liste-comptes` (une branche par ticket, depuis `develop` à jour).
Relecture de tes Pull Requests : Dancile.
Plage de migrations réservée : 01xx (toujours validée par Daniel).

## Tâches
| ID | Tâche | Description | Priorité | Estimation | Dépendances | Échéance | Critère de complétion |
|---|---|---|---|---|---|---|---|
| SETUP-001 | Générer le lockfile | Une seule machine lance `npm install` sur Wi-Fi puis `npm run check`. | P0 | 1 h | - | mer. 25/11 09:00 | Lockfile complet ; `npm ci` et `npm run check` passent sur une autre machine |
| USER-001 | Lister les comptes et l'annuaire | GET /users et GET /users/directory. | P0 | 2 h | SETUP-001 | mer. 25/11 11:30 | Aucun `password_hash` renvoyé ; annuaire limité aux comptes actifs |
| USER-002 | Créer un compte et son ID | POST /users avec `badgeId` unique, mot de passe haché, changement obligatoire. | P0 | 2 h | USER-001 | mer. 25/11 14:30 | ID ou email déjà pris : 409 ; action auditée |
| USER-003 | Modifier un compte ou son ID | PATCH /users/:id. | P0 | 2 h | USER-002 | mer. 25/11 17:00 | Le dernier admin actif ne peut pas perdre son rôle |
| USER-004 | Désactiver et réactiver | POST /users/:id/deactivate et /activate. | P0 | 1 h | USER-002 | jeu. 26/11 10:00 | Sessions coupées immédiatement ; impossible de se désactiver soi-même |
| USER-005 | Réinitialiser un mot de passe | POST /users/:id/reset-password. | P1 | 1 h | USER-002 | jeu. 26/11 11:00 | Sessions coupées, changement obligatoire |
| AUTH-002 | Changer son mot de passe | POST /auth/change-password. | P1 | 1 h | USER-002 | jeu. 26/11 12:00 | Ancien mot de passe vérifié, autres sessions coupées |
| REP-001 | Bilan personnel et équipe | GET /reports/me et /reports/team, via `attendance/public.ts`. | P0 | 3 h | ATT-001, TASK-001 | jeu. 26/11 16:30 | Chiffres identiques aux journées calculées par ATT-001 |
| REP-002 | Bilan individuel | GET /reports/users/:id. | P0 | 1 h | REP-001 | ven. 27/11 09:30 | Interdit au rôle MEMBER |

P0 = indispensable au MVP. P1 = attendu. P2 = seulement si le reste est terminé.

## Routes à livrer
| Méthode | Route | Droits | Ticket |
|---|---|---|---|
| POST | /api/auth/login | PUBLIC | AUTH-001 |
| POST | /api/auth/logout | ALL | AUTH-001 |
| GET | /api/auth/me | ALL | AUTH-001 |
| POST | /api/auth/change-password | ALL | AUTH-002 |
| GET | /api/users/directory | ALL | USER-001 |
| GET | /api/users | ADMIN, HR | USER-001 |
| POST | /api/users | ADMIN | USER-002 |
| PATCH | /api/users/:id | ADMIN | USER-003 |
| POST | /api/users/:id/deactivate | ADMIN | USER-004 |
| POST | /api/users/:id/activate | ADMIN | USER-004 |
| POST | /api/users/:id/reset-password | ADMIN | USER-005 |
| GET | /api/reports/me | ALL | REP-001 |
| GET | /api/reports/team | ADMIN, HR, COORDINATOR | REP-001 |
| GET | /api/reports/users/:id | ADMIN, HR, COORDINATOR | REP-002 |

Formats d'entrée et de sortie : `packages/contracts/src/schemas.ts` (gelé).

## Cas à tester
- Dernier admin désactivé : refus
- Modifier l'ID vers un ID déjà pris : 409
- Bilan sur une période vide : zéros, pas d'erreur
- Compte désactivé avec session ouverte : 401

## Definition of Done
- [ ] Critère de complétion vérifié, tests écrits dans ma zone (remplacer `test.todo`)
- [ ] `npm run owner:check -- Daniel` et `npm run check` passent
- [ ] Pull Request relue par Dancile, aucun bug bloquant
- [ ] Aucun secret, aucune MAC réelle, aucun mot de passe dans le code

Blocage de plus de 30 minutes : le dire dans le groupe avec l'ID du ticket.
