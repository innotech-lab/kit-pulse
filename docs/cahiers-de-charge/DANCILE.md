# Cahier des charges : Dancile

Projet : KIT-Pulse (KITPULSE). Du mercredi 25 au vendredi 27 novembre 2026.
Rôle : Backend, assiduité et justifications

## Mission
Transformer les pointages en journées : présence, retard, absence, avec ou sans justification.

## Zone de travail exclusive
- `apps/api/src/modules/attendance`, `justifications`
- `db/seed/30_attendance.ts`

Aucun autre fichier. Besoin ailleurs : demander à la personne propriétaire (`docs/ANTI-CONFLITS.md`).
Fichiers de départ : modules/attendance/index.ts, modules/attendance/public.ts, modules/justifications/index.ts.

## Démarrer
```
npm ci
npm run setup
npm run dev:api      (terminal 1)
npm run dev:agent    (terminal 2)
npm run dev:web      (terminal 3) puis http://127.0.0.1:5173
```
Comptes de développement : `prenom@kitpulse.local`, `admin@`, `rh@`, `coordination@` ; mot de passe `KitPulse-dev-2026`.

Première branche : `feature/ATT-001-mes-journees` (une branche par ticket, depuis `develop` à jour).
Relecture de tes Pull Requests : Beoline.
Plage de migrations réservée : 03xx (toujours validée par Daniel).

## Tâches
| ID | Tâche | Description | Priorité | Estimation | Dépendances | Échéance | Critère de complétion |
|---|---|---|---|---|---|---|---|
| ATT-001 | Calculer les journées | Écrire `computeDays` (signature gelée dans `public.ts`) et GET /attendance/me. | P0 | 5 h | SETUP-001 | mer. 25/11 17:00 | Le seed du 24/11 donne les résultats attendus (voir QA) |
| ATT-002 | Journées de l'équipe | GET /attendance, filtre `userId`. | P0 | 1 h | ATT-001 | jeu. 26/11 10:00 | Réservé ADMIN et HR |
| JUS-001 | Déposer et voir ses justifications | POST /justifications et GET /justifications/me. | P0 | 2 h | ATT-001 | jeu. 26/11 12:00 | Doublon jour + type : 409 |
| JUS-002 | Traiter les justifications | GET /justifications et POST /justifications/:id/review. | P0 | 2 h | JUS-001 | jeu. 26/11 15:00 | On ne valide jamais sa propre justification ; action auditée |
| ATT-003 | Horaire de travail | GET et PUT /attendance/schedule. | P1 | 2 h | ATT-001 | jeu. 26/11 17:00 | Fin après début ; action auditée |
| ATT-004 | Jours fériés | GET et POST /attendance/holidays. | P2 | 1 h | ATT-001 | ven. 27/11 09:30 | Un jour férié n'est jamais une absence |

P0 = indispensable au MVP. P1 = attendu. P2 = seulement si le reste est terminé.

## Routes à livrer
| Méthode | Route | Droits | Ticket |
|---|---|---|---|
| GET | /api/attendance/me | ALL | ATT-001 |
| GET | /api/attendance | ADMIN, HR | ATT-002 |
| GET | /api/attendance/schedule | ALL | ATT-003 |
| PUT | /api/attendance/schedule | ADMIN, HR | ATT-003 |
| GET | /api/attendance/holidays | ALL | ATT-004 |
| POST | /api/attendance/holidays | ADMIN, HR | ATT-004 |
| POST | /api/justifications | ALL | JUS-001 |
| GET | /api/justifications/me | ALL | JUS-001 |
| GET | /api/justifications | ADMIN, HR | JUS-002 |
| POST | /api/justifications/:id/review | ADMIN, HR | JUS-002 |

Formats d'entrée et de sortie : `packages/contracts/src/schemas.ts` (gelé).

## Cas à tester
- 08:10 = présent, 08:11 = retard de 11 minutes (tolérance 10)
- Pas d'entrée pointée avant la fin de la journée : PENDING, pas ABSENT
- Sortie oubliée : `missingOut = true`
- Justification PENDING ou REJECTED : toujours « non justifié »
- Samedi et dimanche : OFF
- 24/11 : 4 et 5 présents, 6 retard non justifié, 7 retard justifié, 8 sortie oubliée, 9 absence non justifiée, 10 absence justifiée

## Definition of Done
- [ ] Critère de complétion vérifié, tests écrits dans ma zone (remplacer `test.todo`)
- [ ] `npm run owner:check -- Dancile` et `npm run check` passent
- [ ] Pull Request relue par Beoline, aucun bug bloquant
- [ ] Aucun secret, aucune MAC réelle, aucun mot de passe dans le code

Blocage de plus de 30 minutes : le dire dans le groupe avec l'ID du ticket.
