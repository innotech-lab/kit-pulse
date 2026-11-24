# Cahier des charges : Francis

Projet : KIT-Pulse (KITPULSE). Du mercredi 25 au vendredi 27 novembre 2026.
Rôle : Expert UI-UX, charte, tableau de bord, administration

## Mission
Donner une identité cohérente tirée du logo KiT Hub, livrer le tableau de bord et l'administration.

## Zone de travail exclusive
- `apps/web/src/ui`, `apps/web/public`
- `apps/web/src/features/dashboard`, `admin`
- `docs/`, `README.md`, `.github/`, `.githooks/`, `scripts/`, `.gitignore`, `.gitattributes`

Aucun autre fichier. Besoin ailleurs : demander à la personne propriétaire (`docs/ANTI-CONFLITS.md`).
Fichiers de départ : ui/tokens.css, ui/components.tsx, ui/Layout.tsx, features/dashboard, features/admin.

## Démarrer
```
npm ci
npm run setup
npm run dev:api      (terminal 1)
npm run dev:agent    (terminal 2)
npm run dev:web      (terminal 3) puis http://127.0.0.1:5173
```
Comptes de développement : `prenom@kitpulse.local`, `admin@`, `rh@`, `coordination@` ; mot de passe `KitPulse-dev-2026`.

Première branche : `feature/UI-001-composants` (une branche par ticket, depuis `develop` à jour).
Relecture de tes Pull Requests : Alain.
Plage de migrations réservée : aucune (toujours validée par Daniel).

## Tâches
| ID | Tâche | Description | Priorité | Estimation | Dépendances | Échéance | Critère de complétion |
|---|---|---|---|---|---|---|---|
| UI-001 | Charte et composants | Tokens, boutons, champs, table, badge, modale, barre de progression, icône de statut. | P0 | 3 h | - | mer. 25/11 12:00 | Contraste AA ; les noms exportés existants ne changent pas |
| UI-002 | Maquettes des 4 écrans clés | Pointage, tâches, équipe, tableau de bord. | P0 | 2 h | - | mer. 25/11 14:30 | Validées par Alain et Abigael |
| WEB-DASH-001 | Tableau de bord équipe | Présences, retards, absences, tâches, sur une période. | P0 | 4 h | REP-001 (démo avant) | jeu. 26/11 14:00 | Justifié et non justifié séparés ; chiffres = API |
| WEB-DASH-002 | Vue d'une personne | Détail depuis le tableau de bord. | P0 | 2 h | REP-002 (démo avant) | jeu. 26/11 17:00 | Aucun classement public des personnes |
| WEB-ADM-001 | Comptes et IDs | Créer, modifier, désactiver. | P0 | 3 h | USER-004 | ven. 27/11 09:30 | Confirmation avant désactivation |
| WEB-ADM-002 | Postes et réseaux | Approuver, révoquer, voir les MAC. | P0 | 2 h | DEV-002, NET-001 | ven. 27/11 10:30 | Réservé ADMIN |
| DEMO-001 | Support de démo | Scénario de 10 minutes et rapport final. | P1 | 1 h | - | ven. 27/11 14:00 | Répété une fois |

P0 = indispensable au MVP. P1 = attendu. P2 = seulement si le reste est terminé.

## Cas à tester
- Période sans données
- Rôle MEMBER : menus absents ET API en 403
- Contraste et focus visibles
- Aucune donnée sensible pour COORDINATOR (motifs)

## Definition of Done
- [ ] Critère de complétion vérifié, tests écrits dans ma zone (remplacer `test.todo`)
- [ ] `npm run owner:check -- Francis` et `npm run check` passent
- [ ] Pull Request relue par Alain, aucun bug bloquant
- [ ] Aucun secret, aucune MAC réelle, aucun mot de passe dans le code

Blocage de plus de 30 minutes : le dire dans le groupe avec l'ID du ticket.
