# Plan V2 : pointage sans agent, reconnaissance faciale, appareils, notifications

Validé avec Francis le 28/11/2026. Rien n'est codé tant que Francis n'a pas donné le feu vert.
Répartition : **Claude** (C) et **Codex** (X). Chaque lot = une branche de travail sur `develop`, un commit par lot, `npm run check` vert avant push.

## Principe

L'agent installé sur les PC disparaît. Une arrivée réunit **quatre indices**, montrés à la RH, qui **valide toujours** :

| Indice | Source | Ce qu'il prouve |
|---|---|---|
| Appareil | clé d'appareil du navigateur (non extractible) + passkey WebAuthn + empreinte de secours | l'appareil est-il celui de la personne, d'un collègue (nommé), ou jamais vu |
| Visage | empreinte faciale calculée **sur le serveur** à partir de la photo, comparée à celle enregistrée chez l'admin | c'est bien la personne |
| Lieu | géolocalisation du navigateur (+ précision) comparée au KiT Hub (rayon configurable, 100 m proposé) | la personne est dans les enceintes |
| Photo | webcam, déjà en place (PRES-006) | preuve visuelle, décor du KiT Hub ; gardée 7 jours |

La sortie : appareil + lieu, sans photo ni visage. Rien ne bloque une personne : tout ce qui est douteux remonte à la RH.

## Décisions déjà prises

- Validation RH obligatoire pour toute arrivée, même reconnue (la reconnaissance trie, la RH décide).
- « Appareil inconnu » = jamais vu ; « appareil de [Nom] » quand on utilise l'appareil d'un collègue ; « ressemble à l'appareil de [Nom] » (probabilité, via empreinte) ; « navigation privée » signalée quand détectable.
- Un appareil appartient à un seul compte ; un compte peut avoir plusieurs appareils.
- Enregistrement chez l'admin : consentement écrit, 3 à 5 photos (seule l'empreinte faciale est gardée), enregistrement de l'appareil. Empreinte faciale supprimée à la désactivation du compte.
- Photos d'arrivée : 7 jours (inchangé).

## À fournir par Francis avant le lot 2

- Coordonnées GPS du KiT Hub (Google Maps > clic droit sur le bâtiment).
- Rayon accepté (100 m proposé).

## Lots

### Lot 0 — Socle commun (C) — à faire en premier, tout le monde en dépend
- Migration `0005` : appareils web (clé publique, empreinte, propriétaire, statut), passkeys, empreintes faciales, réglages du lieu (lat, lng, rayon), notifications, indices d'arrivée (appareil, visage, lieu).
- Contrats (schémas + routes) de tous les lots ci-dessous, pour que C et X codent en parallèle sans se bloquer.

### Lot 1 — Reconnaissance de l'appareil (C)
- Navigateur : clé ECDSA non extractible (IndexedDB) indépendante du compte ; empreinte de secours ; détection de navigation privée.
- WebAuthn : enregistrement et vérification d'une passkey par appareil.
- Serveur : à chaque pointage, identifie l'appareil → « à la personne », « à [collègue] », « ressemble à [collègue] », « jamais vu ».

### Lot 2 — Nouveau pointage (C)
- Page Pointage : géolocalisation + photo + signature de l'appareil ; plus d'appel à l'agent.
- Serveur : calcul de la distance au KiT Hub, enregistrement des indices, arrivée en attente RH (comme aujourd'hui).

### Lot 3 — Reconnaissance faciale (C)
- Service séparé sur le VPS (systemd : `CPUQuota=50%`, `MemoryMax=700M`), file d'attente, modèle léger (détection + empreinte faciale, ONNX).
- Contrôle du « vivant » : petite séquence (tourner la tête) analysée au pointage.
- Seuil de correspondance réglable ; résultat = score + « reconnu / non reconnu ».

### Lot 4 — Enregistrement chez l'admin (X)
- Administration > compte > « Enregistrer le visage et l'appareil » : consentement, capture guidée de 3 à 5 photos, envoi au serveur (empreinte calculée par le lot 3), enregistrement de l'appareil présent (lot 1).
- Fiche appareil : propriétaire, date, comptes qui l'ont utilisé ; révoquer un appareil ; supprimer l'empreinte faciale.

### Lot 5 — Page RH « Arrivées à valider » v2 (X)
- Afficher les 4 indices sur chaque carte ; tri : douteux en haut ; « confiance élevée » quand appareil + visage + lieu sont bons ; « Tout valider » limité aux confiances élevées.

### Lot 6 — Notifications (X)
- Table + API : liste, non lues, marquer lu (une / toutes).
- Icône cloche dans la barre latérale avec compteur ; panneau en superposition ; chaque notification renvoie vers son sujet.
- Déclencheurs : tâche attribuée ou modifiée ; justification déposée (RH) ou décidée (personne) ; arrivée à valider (RH) ; arrivée refusée (personne, avec motif) ; pointage depuis l'appareil d'un collègue (RH + propriétaire de l'appareil) ; mot de passe réinitialisé ; événement d'agenda ajouté par quelqu'un d'autre ; nouvel appareil à approuver (admin).
- Rafraîchissement via l'actualisation automatique existante (45 s).

### Lot 7 — Retrait de l'agent (C, en dernier)
- Une fois les lots 1 à 3 validés en conditions réelles : retirer l'appel à l'agent du web, désactiver `apps/agent` (code gardé dans l'historique Git), mettre à jour la doc.

## Ordre

Lot 0 (C) → en parallèle : C sur 1, 2, 3 ; X sur 6 (indépendant), puis 4 et 5 dès que les contrats du lot 0 sont poussés → Lot 7 → recette avec l'équipe.
