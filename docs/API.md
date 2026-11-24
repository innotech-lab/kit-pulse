# Contrat d'API (généré depuis packages/contracts/src/routes.ts)

Préfixe `/api`. Écritures : en-tête `X-KitPulse: 1`. Erreurs : `{ "error": { "code", "message", "details" } }`.
Périodes : `?from=AAAA-MM-JJ&to=AAAA-MM-JJ`. Dates-heures en UTC. Route non développée : 501.

Sans compte : l'agent local expose `GET /__agent/status` et `POST /__agent/attest` sur 127.0.0.1 uniquement.

| Méthode | Route | Droits | Ticket | Responsable | Rôle |
|---|---|---|---|---|---|
| POST | /auth/login | PUBLIC | AUTH-001 | Daniel | Connexion |
| POST | /auth/logout | ALL | AUTH-001 | Daniel | Deconnexion |
| GET | /auth/me | ALL | AUTH-001 | Daniel | Compte connecte |
| POST | /auth/change-password | ALL | AUTH-002 | Daniel | Changer son mot de passe |
| GET | /users/directory | ALL | USER-001 | Daniel | Annuaire minimal des comptes actifs |
| GET | /users | ADMIN, HR | USER-001 | Daniel | Lister les comptes |
| POST | /users | ADMIN | USER-002 | Daniel | Creer un compte et son ID KIT-HUB |
| PATCH | /users/:id | ADMIN | USER-003 | Daniel | Modifier un compte ou son ID KIT-HUB |
| POST | /users/:id/deactivate | ADMIN | USER-004 | Daniel | Desactiver et couper les sessions |
| POST | /users/:id/activate | ADMIN | USER-004 | Daniel | Reactiver |
| POST | /users/:id/reset-password | ADMIN | USER-005 | Daniel | Reinitialiser le mot de passe |
| GET | /audit | ADMIN | AUDIT-001 | Beoline | Journal des actions |
| GET | /reports/me | ALL | REP-001 | Daniel | Mon bilan |
| GET | /reports/team | ADMIN, HR, COORDINATOR | REP-001 | Daniel | Bilan de toute une equipe |
| GET | /reports/users/:id | ADMIN, HR, COORDINATOR | REP-002 | Daniel | Bilan individuel |
| GET | /networks | ADMIN | NET-001 | Stany | Lister reseaux et MAC |
| POST | /networks/:id/macs | ADMIN | NET-002 | Stany | Ajouter une MAC |
| DELETE | /networks/:id/macs/:macId | ADMIN | NET-002 | Stany | Retirer une MAC |
| POST | /devices/enroll | ALL | DEV-001 | Stany | Enregistrer ce poste |
| GET | /devices | ADMIN | DEV-002 | Stany | Lister les postes |
| POST | /devices/:id/approve | ADMIN | DEV-002 | Stany | Approuver un poste (personnel ou borne) |
| POST | /devices/:id/revoke | ADMIN | DEV-002 | Stany | Revoquer un poste |
| POST | /presence/challenge | ALL | PRES-001 | Stany | Demander un defi de pointage |
| POST | /presence/punch | ALL | PRES-001 | Stany | Pointer avec la preuve reseau signee |
| GET | /presence/me/today | ALL | PRES-002 | Stany | Mes pointages du jour |
| GET | /presence/today | ADMIN, HR, COORDINATOR | PRES-003 | Stany | Qui est present maintenant |
| GET | /presence | ADMIN, HR | PRES-003 | Stany | Historique des pointages |
| POST | /presence/manual | ADMIN, HR | PRES-004 | Stany | Correction manuelle motivee et auditee |
| GET | /presence/rejections | ADMIN, HR | PRES-005 | Stany | Tentatives refusees |
| GET | /attendance/me | ALL | ATT-001 | Dancile | Mes journees |
| GET | /attendance | ADMIN, HR | ATT-002 | Dancile | Journees de toute une equipe |
| GET | /attendance/schedule | ALL | ATT-003 | Dancile | Horaire de travail |
| PUT | /attendance/schedule | ADMIN, HR | ATT-003 | Dancile | Modifier les horaires |
| GET | /attendance/holidays | ALL | ATT-004 | Dancile | Jours feries |
| POST | /attendance/holidays | ADMIN, HR | ATT-004 | Dancile | Ajouter un jour ferie |
| POST | /justifications | ALL | JUS-001 | Dancile | Justifier un retard ou une absence |
| GET | /justifications/me | ALL | JUS-001 | Dancile | Mes justifications |
| GET | /justifications | ADMIN, HR | JUS-002 | Dancile | Justifications a traiter |
| POST | /justifications/:id/review | ADMIN, HR | JUS-002 | Dancile | Accepter ou refuser |
| GET | /tasks/me | ALL | TASK-001 | Beoline | Mes taches |
| GET | /tasks | ADMIN, HR, COORDINATOR | TASK-002 | Beoline | Taches de toute une equipe |
| POST | /tasks | ALL | TASK-003 | Beoline | Creer (pour soi, ou attribuer si ADMIN/HR/COORDINATOR) |
| PATCH | /tasks/:id | ALL | TASK-003 | Beoline | Modifier |
| POST | /tasks/:id/progress | ALL | TASK-004 | Beoline | Declarer une progression |
| GET | /availability | ALL | AVL-001 | Beoline | Disponibilite de chaque personne |
| PUT | /availability/me | ALL | AVL-002 | Beoline | Changer ma disponibilite |
| GET | /agenda/me | ALL | AGD-001 | Alain | Mon agenda |
| GET | /agenda | ADMIN, HR, COORDINATOR | AGD-002 | Alain | Agendas de toute une equipe |
| POST | /agenda | ALL | AGD-003 | Alain | Creer un evenement |
| PATCH | /agenda/:id | ALL | AGD-003 | Alain | Modifier |
| DELETE | /agenda/:id | ALL | AGD-003 | Alain | Supprimer |

Déjà fournis et testés : AUTH-001, DEV-001, PRES-001, et l'approbation d'un poste (partie de DEV-002).
