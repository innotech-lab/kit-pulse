# Cahier des charges : Stany

Projet : KIT-Pulse (KITPULSE). Du mercredi 25 au vendredi 27 novembre 2026.
Rôle : Backend, pointage et vérification du routeur

## Mission
Rendre impossible un pointage normal hors des réseaux KIT-HUB : MAC du routeur, poste approuvé, preuve signée.

## Zone de travail exclusive
- `apps/agent`
- `apps/api/src/modules/networks`, `devices`, `presence`
- `db/seed/20_presence.ts`
- `docs/RESEAU.md`

Aucun autre fichier. Besoin ailleurs : demander à la personne propriétaire (`docs/ANTI-CONFLITS.md`).
Fichiers de départ : modules/presence/index.ts, modules/devices/index.ts, modules/networks/index.ts.

## Démarrer
```
npm ci
npm run setup
npm run dev:api      (terminal 1)
npm run dev:agent    (terminal 2)
npm run dev:web      (terminal 3) puis http://127.0.0.1:5173
```
Comptes de développement : `prenom@kitpulse.local`, `admin@`, `rh@`, `coordination@` ; mot de passe `KitPulse-dev-2026`.

Première branche : `feature/PRES-002-mes-pointages` (une branche par ticket, depuis `develop` à jour).
Relecture de tes Pull Requests : Daniel.
Plage de migrations réservée : 02xx (toujours validée par Daniel).

## Tâches
| ID | Tâche | Description | Priorité | Estimation | Dépendances | Échéance | Critère de complétion |
|---|---|---|---|---|---|---|---|
| NET-000 | Relever les MAC sur place | `npm run agent:scan` connecté à KIT-HUB_Starlink puis à Kit-Hub3, près de chaque point d'accès. Transmettre à l'admin hors du dépôt. | P0 | 1 h | SETUP-001 | mer. 25/11 10:30 | Deux routeurs relevés deux fois avec le même résultat |
| PRES-002 | Mes pointages du jour | GET /presence/me/today. | P0 | 1 h | SETUP-001 | mer. 25/11 12:00 | Jour local, pas UTC |
| PRES-003 | Présents maintenant et historique | GET /presence/today et GET /presence. | P0 | 3 h | PRES-002 | mer. 25/11 17:00 | MAC et IP absentes de la réponse du rôle COORDINATOR |
| DEV-002 | Gérer les postes | GET /devices et POST /devices/:id/revoke. | P0 | 2 h | SETUP-001 | jeu. 26/11 10:30 | Poste révoqué : pointage refusé |
| NET-001 | Lister réseaux et MAC | GET /networks. | P1 | 1 h | SETUP-001 | jeu. 26/11 11:30 | Réservé ADMIN |
| NET-002 | Ajouter et retirer une MAC | POST et DELETE, avec `normalizeMac`. | P1 | 2 h | NET-001 | jeu. 26/11 14:00 | MAC invalide : 400 ; MAC venant de .env non supprimable ici ; action auditée |
| PRES-004 | Correction manuelle | POST /presence/manual, motif obligatoire. | P0 | 2 h | PRES-003 | jeu. 26/11 16:30 | Auditée ; interdite sur son propre compte |
| PRES-005 | Tentatives refusées | GET /presence/rejections. | P1 | 1 h | PRES-003 | ven. 27/11 09:30 | Réservé ADMIN et HR |
| AGENT-001 | Test réel sur les deux réseaux | AGENT_SIMULATE_NETWORK=false, vrais routeurs, vrai partage de connexion refusé. | P0 | 2 h | NET-000 | ven. 27/11 10:30 | Accepté sur les 2 Wi-Fi ; refusé en 4G, sur un autre Wi-Fi et sur un faux point d'accès du même nom |

P0 = indispensable au MVP. P1 = attendu. P2 = seulement si le reste est terminé.

## Routes à livrer
| Méthode | Route | Droits | Ticket |
|---|---|---|---|
| GET | /api/networks | ADMIN | NET-001 |
| POST | /api/networks/:id/macs | ADMIN | NET-002 |
| DELETE | /api/networks/:id/macs/:macId | ADMIN | NET-002 |
| POST | /api/devices/enroll | ALL | DEV-001 |
| GET | /api/devices | ADMIN | DEV-002 |
| POST | /api/devices/:id/approve | ADMIN | DEV-002 |
| POST | /api/devices/:id/revoke | ADMIN | DEV-002 |
| POST | /api/presence/challenge | ALL | PRES-001 |
| POST | /api/presence/punch | ALL | PRES-001 |
| GET | /api/presence/me/today | ALL | PRES-002 |
| GET | /api/presence/today | ADMIN, HR, COORDINATOR | PRES-003 |
| GET | /api/presence | ADMIN, HR | PRES-003 |
| POST | /api/presence/manual | ADMIN, HR | PRES-004 |
| GET | /api/presence/rejections | ADMIN, HR | PRES-005 |

Formats d'entrée et de sortie : `packages/contracts/src/schemas.ts` (gelé).

## Cas à tester
- Faux point d'accès nommé « Kit-Hub3 » : refus
- VPN actif : refus avec message clair
- Câble Ethernet sur le routeur : accepté en mode gateway
- Rejeu, expiration, signature modifiée : refus (tests fournis)
- Deux clics rapides : un seul pointage
- Poste d'une autre personne : refus, sauf borne

## Definition of Done
- [ ] Critère de complétion vérifié, tests écrits dans ma zone (remplacer `test.todo`)
- [ ] `npm run owner:check -- Stany` et `npm run check` passent
- [ ] Pull Request relue par Daniel, aucun bug bloquant
- [ ] Aucun secret, aucune MAC réelle, aucun mot de passe dans le code

Blocage de plus de 30 minutes : le dire dans le groupe avec l'ID du ticket.
