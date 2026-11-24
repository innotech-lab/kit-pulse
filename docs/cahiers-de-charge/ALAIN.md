# Cahier des charges : Alain

Projet : KIT-Pulse (KITPULSE). Du mercredi 25 au vendredi 27 novembre 2026.
Rôle : Fullstack, contrats, socle web, pointage et agenda

## Mission
Relier le web à l'API, garder les contrats stables, livrer l'agenda et la page de pointage.

## Zone de travail exclusive
- `packages/contracts`
- `apps/api/src/modules/agenda`
- `apps/web/` : racine et `src/core`
- `apps/web/src/features/punch`, `agenda`
- `db/seed/50_agenda.ts`, `docs/API.md`

Aucun autre fichier. Besoin ailleurs : demander à la personne propriétaire (`docs/ANTI-CONFLITS.md`).
Fichiers de départ : modules/agenda/index.ts, features/agenda/index.tsx, features/punch/index.tsx.

## Démarrer
```
npm ci
npm run setup
npm run dev:api      (terminal 1)
npm run dev:agent    (terminal 2)
npm run dev:web      (terminal 3) puis http://127.0.0.1:5173
```
Comptes de développement : `prenom@kitpulse.local`, `admin@`, `rh@`, `coordination@` ; mot de passe `KitPulse-dev-2026`.

Première branche : `feature/AGD-001-mon-agenda` (une branche par ticket, depuis `develop` à jour).
Relecture de tes Pull Requests : Daniel.
Plage de migrations réservée : 05xx (toujours validée par Daniel).

## Tâches
| ID | Tâche | Description | Priorité | Estimation | Dépendances | Échéance | Critère de complétion |
|---|---|---|---|---|---|---|---|
| AGD-001 | Mon agenda (API) | GET /agenda/me avec période. | P0 | 1 h | SETUP-001 | mer. 25/11 11:30 | Un événement à cheval sur la période est renvoyé |
| AGD-003 | Créer, modifier, supprimer (API) | POST, PATCH, DELETE /agenda. | P0 | 3 h | AGD-001 | mer. 25/11 15:30 | Fin après début ; pas touche à l'agenda d'autrui sans rôle DATA |
| AGD-002 | Agenda de l'équipe (API) | GET /agenda. | P0 | 1 h | AGD-001 | mer. 25/11 17:00 | Réservé ADMIN, HR, COORDINATOR |
| WEB-PUNCH-001 | Finaliser le pointage | États : agent arrêté, poste en attente, réseau refusé, succès. | P0 | 2 h | - | jeu. 26/11 10:30 | Chaque refus affiche quoi faire |
| WEB-PUNCH-002 | Pointages du jour | Afficher GET /presence/me/today. | P0 | 1 h | PRES-002 | jeu. 26/11 12:00 | Se met à jour après un pointage |
| WEB-AGD-001 | Page agenda | Vue semaine, création et modification. | P0 | 4 h | AGD-003 | jeu. 26/11 17:00 | Utilisable au clavier et sur petit écran |
| WEB-AUTH-001 | Changement de mot de passe | Écran obligatoire si `mustChangePassword`. | P1 | 1 h | AUTH-002 | ven. 27/11 09:30 | Impossible de continuer sans changer |

P0 = indispensable au MVP. P1 = attendu. P2 = seulement si le reste est terminé.

## Routes à livrer
| Méthode | Route | Droits | Ticket |
|---|---|---|---|
| GET | /api/agenda/me | ALL | AGD-001 |
| GET | /api/agenda | ADMIN, HR, COORDINATOR | AGD-002 |
| POST | /api/agenda | ALL | AGD-003 |
| PATCH | /api/agenda/:id | ALL | AGD-003 |
| DELETE | /api/agenda/:id | ALL | AGD-003 |

Formats d'entrée et de sortie : `packages/contracts/src/schemas.ts` (gelé).

## Cas à tester
- Agent arrêté pendant le pointage
- Session expirée : retour à la connexion
- Événement qui finit avant de commencer : refus
- API coupée : message lisible

## Definition of Done
- [ ] Critère de complétion vérifié, tests écrits dans ma zone (remplacer `test.todo`)
- [ ] `npm run owner:check -- Alain` et `npm run check` passent
- [ ] Pull Request relue par Daniel, aucun bug bloquant
- [ ] Aucun secret, aucune MAC réelle, aucun mot de passe dans le code

Blocage de plus de 30 minutes : le dire dans le groupe avec l'ID du ticket.
