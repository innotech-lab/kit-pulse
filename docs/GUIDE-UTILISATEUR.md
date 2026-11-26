# Guide utilisateur KIT-Pulse

Ce guide décrit les pages Web et leurs limites actuelles. Les données affichées avec la mention **Démonstration** sont fictives et locales au navigateur : elles ne décrivent aucune personne réelle et ne sont pas enregistrées par le serveur.

## Se connecter et naviguer

Connectez-vous avec votre compte KIT-Pulse. Les pages autorisées pour votre rôle apparaissent dans la navigation. Les contrôles de rôle de l’interface facilitent la navigation ; l’API reste responsable de vérifier les droits à chaque requête. En cas d’erreur de chargement, un message est affiché dans la page. Réessayez lorsque le service est disponible ou contactez votre administrateur si votre session a expiré.

## Équipe et disponibilités

Ouvrez **Équipe** pour consulter les disponibilités renvoyées par le service. Le statut est indiqué par un symbole accompagné d’un libellé textuel : Libre, Occupé, En réunion, Sur le terrain ou Hors ligne. Vous pouvez filtrer la liste par nom et par statut.

Le formulaire **Mon statut** permet de choisir votre statut et une note facultative, puis de sélectionner **Mettre à jour mon statut**. Attendez le message de résultat avant de quitter la page. Si l’API n’est pas encore disponible, une démonstration peut être montrée en environnement de développement ; les changements locaux ne sont alors pas publiés.

## Mes tâches

Ouvrez **Mes tâches** pour voir les tâches du jour ainsi que les tâches inachevées des jours précédents. Le titre, la description, la date, la priorité, le statut et la progression sont affichés. Déplacez le curseur puis sélectionnez **Enregistrer la progression** ; atteindre 100 % passe la tâche à Terminée. Une tâche annulée ne peut pas être modifiée par le curseur.

Le formulaire **Créer une tâche** demande un titre, une date de travail, une priorité et, si nécessaire, une description. Un membre crée une tâche pour soi. Les rôles ADMIN, HR et COORDINATOR peuvent choisir un destinataire ; son statut de disponibilité est affiché au moment du choix. Sélectionnez **Créer la tâche** et vérifiez le message de résultat.

La liste réelle dépend de TASK-001, la création de TASK-003 et la sauvegarde de la progression de TASK-004. L’attribution à une autre personne dépend aussi de l’API de disponibilités AVL-001. Quand une route répond 501 en développement, la page peut montrer une simulation locale clairement identifiée. Les personnes fictives proposées en démo ne peuvent pas être destinataires d’une vraie création. Une simulation ne constitue pas une tâche réelle et disparaît au rechargement. Une erreur autre que 501 est signalée et n’est pas transformée en succès.

## Pointage et présences

Le pointage se fait depuis la page **Pointage** avec l’agent KIT-Pulse, un poste approuvé et un réseau autorisé. Suivez les instructions affichées par cette page si l’agent est arrêté, si le poste attend une approbation ou si le réseau est refusé. Cette page et les mécanismes de pointage sont fournis par le ticket WEB-PUNCH-001.

La page **Présences** présente le statut de chaque journée, les heures d’entrée et de sortie, les retards et l’état de justification. « Justifié » et « non justifié » sont indiqués séparément ; une demande en attente ou refusée ne compte pas comme acceptée. Si aucune sortie n’est enregistrée, la page l’indique.

La consultation des journées dépend d’ATT-001, qui renvoie actuellement 501. Les journées affichées en démonstration ne sont que des exemples et ne sont pas vos données de présence.

## Déposer une justification

Dans **Présences**, choisissez Retard ou Absence, indiquez la date concernée et saisissez un motif (1 000 caractères maximum), puis sélectionnez **Déposer la justification**. Le message confirme si le dépôt a été reçu. Après réception réelle, son état apparaît dans **Mes justifications** : en attente, acceptée ou refusée, avec la note de traitement éventuelle.

Le dépôt et la consultation personnelle dépendent de JUS-001. Tant que ces routes répondent 501, les entrées faites en démonstration restent locales et ne sont ni transmises ni conservées par le serveur. Ne les considérez pas comme une demande déposée.

## Traiter les justifications (ADMIN et HR)

La page **Justifications à traiter** est réservée aux rôles ADMIN et HR. Pour chaque demande en attente, vérifiez le type, la date et le motif. Choisissez **Accepter** ou **Refuser**. Une confirmation est demandée avant un refus.

Le traitement réel dépend de JUS-002. L’API doit enregistrer et auditer la décision. Si la page indique que vous êtes en démonstration, les actions sont simulées localement et ne constituent pas une décision officielle. N’utilisez pas la démonstration pour traiter une demande réelle.

## Fonctionnalités non décrites comme disponibles

L’agenda apparaît dans la navigation, mais sa réalisation est encore en cours. Les simulations locales de tâches, disponibilités, présences et justifications sont destinées au développement uniquement. Une page qui affiche une erreur ne signifie pas que l’action a été enregistrée.
