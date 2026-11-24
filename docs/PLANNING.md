# Planning : 25 au 27 novembre 2026

Hypothèse : 08:00-17:00 chaque jour.

| Jour | Objectif vérifiable | Intégrations |
|---|---|---|
| Mercredi 25 | Sprint 1 : environnement identique partout, MAC relevées, premières routes de chaque module | 12:00 et 17:00 |
| Jeudi 26 | Sprint 2 : toutes les routes P0 et les pages branchées | 12:00 et 17:00 |
| Vendredi 27 | Sprint 3 : finitions jusqu'à 10:30, **gel du code à 12:00**, tests réels, déploiement, **démo à 15:00**, bilan à 16:00 | 10:30 et 12:00 |

Points d'équipe : 08:15 et 16:45, 10 minutes. Retard de plus d'une demi-journée sur un P0 : on coupe du scope, on ne décale pas la démo.
Ordre de coupe : P2, puis AUDIT-001, NET-002, WEB-AUTH-001, PRES-005.

## Tableau des tâches
| ID | Task | Owner | Priority | Estimate | Dependency | Deadline |
|---|---|---|---|---|---|---|
| SETUP-001 | Générer le lockfile | Daniel | P0 | 1 h | - | mer. 25/11 09:00 |
| USER-001 | Lister les comptes et l'annuaire | Daniel | P0 | 2 h | SETUP-001 | mer. 25/11 11:30 |
| USER-002 | Créer un compte et son ID | Daniel | P0 | 2 h | USER-001 | mer. 25/11 14:30 |
| USER-003 | Modifier un compte ou son ID | Daniel | P0 | 2 h | USER-002 | mer. 25/11 17:00 |
| USER-004 | Désactiver et réactiver | Daniel | P0 | 1 h | USER-002 | jeu. 26/11 10:00 |
| USER-005 | Réinitialiser un mot de passe | Daniel | P1 | 1 h | USER-002 | jeu. 26/11 11:00 |
| AUTH-002 | Changer son mot de passe | Daniel | P1 | 1 h | USER-002 | jeu. 26/11 12:00 |
| REP-001 | Bilan personnel et équipe | Daniel | P0 | 3 h | ATT-001, TASK-001 | jeu. 26/11 16:30 |
| REP-002 | Bilan individuel | Daniel | P0 | 1 h | REP-001 | ven. 27/11 09:30 |
| ATT-001 | Calculer les journées | Dancile | P0 | 5 h | SETUP-001 | mer. 25/11 17:00 |
| ATT-002 | Journées de l'équipe | Dancile | P0 | 1 h | ATT-001 | jeu. 26/11 10:00 |
| JUS-001 | Déposer et voir ses justifications | Dancile | P0 | 2 h | ATT-001 | jeu. 26/11 12:00 |
| JUS-002 | Traiter les justifications | Dancile | P0 | 2 h | JUS-001 | jeu. 26/11 15:00 |
| ATT-003 | Horaire de travail | Dancile | P1 | 2 h | ATT-001 | jeu. 26/11 17:00 |
| ATT-004 | Jours fériés | Dancile | P2 | 1 h | ATT-001 | ven. 27/11 09:30 |
| NET-000 | Relever les MAC sur place | Stany | P0 | 1 h | SETUP-001 | mer. 25/11 10:30 |
| PRES-002 | Mes pointages du jour | Stany | P0 | 1 h | SETUP-001 | mer. 25/11 12:00 |
| PRES-003 | Présents maintenant et historique | Stany | P0 | 3 h | PRES-002 | mer. 25/11 17:00 |
| DEV-002 | Gérer les postes | Stany | P0 | 2 h | SETUP-001 | jeu. 26/11 10:30 |
| NET-001 | Lister réseaux et MAC | Stany | P1 | 1 h | SETUP-001 | jeu. 26/11 11:30 |
| NET-002 | Ajouter et retirer une MAC | Stany | P1 | 2 h | NET-001 | jeu. 26/11 14:00 |
| PRES-004 | Correction manuelle | Stany | P0 | 2 h | PRES-003 | jeu. 26/11 16:30 |
| PRES-005 | Tentatives refusées | Stany | P1 | 1 h | PRES-003 | ven. 27/11 09:30 |
| AGENT-001 | Test réel sur les deux réseaux | Stany | P0 | 2 h | NET-000 | ven. 27/11 10:30 |
| AGD-001 | Mon agenda (API) | Alain | P0 | 1 h | SETUP-001 | mer. 25/11 11:30 |
| AGD-003 | Créer, modifier, supprimer (API) | Alain | P0 | 3 h | AGD-001 | mer. 25/11 15:30 |
| AGD-002 | Agenda de l'équipe (API) | Alain | P0 | 1 h | AGD-001 | mer. 25/11 17:00 |
| WEB-PUNCH-001 | Finaliser le pointage | Alain | P0 | 2 h | - | jeu. 26/11 10:30 |
| WEB-PUNCH-002 | Pointages du jour | Alain | P0 | 1 h | PRES-002 | jeu. 26/11 12:00 |
| WEB-AGD-001 | Page agenda | Alain | P0 | 4 h | AGD-003 | jeu. 26/11 17:00 |
| WEB-AUTH-001 | Changement de mot de passe | Alain | P1 | 1 h | AUTH-002 | ven. 27/11 09:30 |
| TASK-001 | Mes tâches | Beoline | P0 | 2 h | SETUP-001 | mer. 25/11 11:30 |
| AVL-001 | Disponibilité de l'équipe | Beoline | P0 | 1 h | SETUP-001 | mer. 25/11 13:30 |
| AVL-002 | Changer ma disponibilité | Beoline | P0 | 1 h | AVL-001 | mer. 25/11 15:00 |
| TASK-003 | Créer et modifier | Beoline | P0 | 3 h | TASK-001 | jeu. 26/11 10:30 |
| TASK-004 | Progression | Beoline | P0 | 2 h | TASK-003 | jeu. 26/11 12:00 |
| TASK-002 | Tâches de l'équipe | Beoline | P0 | 1 h | TASK-001 | jeu. 26/11 15:00 |
| AUDIT-001 | Journal des actions | Beoline | P1 | 1 h | SETUP-001 | jeu. 26/11 16:30 |
| WEB-TEAM-001 | Page équipe et disponibilité | Abigael | P0 | 3 h | UI-001 | mer. 25/11 17:00 |
| WEB-TASK-001 | Page mes tâches | Abigael | P0 | 4 h | UI-001 | jeu. 26/11 11:00 |
| WEB-TASK-002 | Attribuer une tâche | Abigael | P0 | 2 h | WEB-TASK-001, TASK-003 | jeu. 26/11 14:00 |
| WEB-ATT-001 | Page présences | Abigael | P0 | 3 h | ATT-001, JUS-001 | jeu. 26/11 17:00 |
| WEB-JUS-001 | Justifications à traiter | Abigael | P0 | 2 h | JUS-002 | ven. 27/11 10:00 |
| DOC-001 | Guide utilisateur | Abigael | P1 | 1 h | - | ven. 27/11 11:30 |
| UI-001 | Charte et composants | Francis | P0 | 3 h | - | mer. 25/11 12:00 |
| UI-002 | Maquettes des 4 écrans clés | Francis | P0 | 2 h | - | mer. 25/11 14:30 |
| WEB-DASH-001 | Tableau de bord équipe | Francis | P0 | 4 h | REP-001 (démo avant) | jeu. 26/11 14:00 |
| WEB-DASH-002 | Vue d'une personne | Francis | P0 | 2 h | REP-002 (démo avant) | jeu. 26/11 17:00 |
| WEB-ADM-001 | Comptes et IDs | Francis | P0 | 3 h | USER-004 | ven. 27/11 09:30 |
| WEB-ADM-002 | Postes et réseaux | Francis | P0 | 2 h | DEV-002, NET-001 | ven. 27/11 10:30 |
| DEMO-001 | Support de démo | Francis | P1 | 1 h | - | ven. 27/11 14:00 |
