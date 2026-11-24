# Cahier des charges général

Projet : KIT-Pulse. Code : KITPULSE. Version : 0.1. Niveau : Intermediate. Durée : 3 jours. Équipe : 7.

## Contexte et problème
Les ressources humaines de KIT-HUB n'ont pas de vue unique sur les entrées, sorties, retards, absences et tâches. La coordination ne sait pas qui est disponible pour une nouvelle tâche.

## Objectif
Une personne pointe seulement si son poste est sur un réseau KIT-HUB dont la **MAC du routeur** est reconnue. Les RH, la coordination et l'admin voient les chiffres auxquels leur rôle donne droit.

## Utilisateurs et droits
| Rôle | Peut |
|---|---|
| MEMBER | Pointer, justifier, gérer ses tâches, son agenda, son statut |
| COORDINATOR | + voir tâches, agendas, présents, bilans ; attribuer des tâches. Ne voit pas les motifs de justification |
| HR | + voir journées et justifications, corriger un pointage |
| ADMIN | + tout voir, créer et modifier comptes et IDs, désactiver, approuver les postes, gérer les MAC |

## Must Have
Entrées et sorties vérifiées ; retards et absences justifiés ou non ; tâches quotidiennes et progression ; agenda par personne ; icône de disponibilité (libre, occupation, réunion, terrain) ; attribution de tâches ; tableau de bord équipe et individuel ; gestion des comptes et des IDs ; désactivation.

## Should Have
Correction manuelle auditée, tentatives refusées, MAC gérées dans l'interface, jours fériés, journal d'audit.

## Could Have
Export CSV, statut déduit de l'agenda, graphiques de tendance.

## Hors scope
Application mobile native, paie, congés avec soldes, notifications, messagerie, géolocalisation, reconnaissance faciale, événements récurrents, pièces jointes, capture d'écran ou surveillance du poste, agent Mac/Linux, classement des personnes.

## MVP terminé quand
1. Un pointage réel passe sur chacun des deux Wi-Fi et est refusé ailleurs.
2. Une journée avec retard, absence et justification s'affiche correctement.
3. Une tâche est attribuée à une personne libre puis avance jusqu'à 100 %.
4. Le tableau de bord donne les mêmes chiffres que l'API.
5. Un compte désactivé perd son accès immédiatement.

## User stories
1. En tant que membre, je veux pointer depuis KIT-HUB, afin que ma présence soit enregistrée.
2. En tant que membre, je veux justifier un retard, afin qu'il ne soit pas compté sans motif.
3. En tant que membre, je veux indiquer mon statut, afin qu'on sache si je peux recevoir une tâche.
4. En tant que coordination, je veux voir qui fait quoi et quand, afin de répartir le travail.
5. En tant que RH, je veux voir retards et absences sur une période, afin de suivre l'équipe.
6. En tant qu'admin, je veux désactiver un compte, afin de couper l'accès d'une personne qui part.

## Exigences non fonctionnelles
Heure du serveur uniquement. Refus par défaut. Mots de passe hachés (scrypt). Droits vérifiés par l'API. Actions sensibles auditées. Interface en français, utilisable au clavier, contraste AA. Cible MVP : environ 50 personnes.

## Hypothèses à confirmer
Horaires lundi-vendredi 08:00-17:00, tolérance 10 minutes ; fuseau UTC+2 (Africa/Bujumbura) ; postes Windows ; dépôt sur GitHub ; IDs au format KH-001.

## Données personnelles
Informer les personnes avant l'ouverture : ce qui est collecté (pointages, MAC du routeur, IP, poste), pourquoi, qui le voit, combien de temps. Durée de conservation : à décider par KIT-HUB.
