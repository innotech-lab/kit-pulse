# Architecture

```
Navigateur -> Agent local 127.0.0.1:47820 -> API -> SQLite
              (lit la MAC du routeur, signe)
```

| Brique | Choix | Raison |
|---|---|---|
| Web | React + Vite + CSS | Connu, peu de dépendances |
| API | Node + TypeScript + Express + Zod | Node exécute TypeScript directement : pas de build côté API |
| Base | SQLite (`node:sqlite`, intégré à Node) | Rien à installer, base identique partout, suffisant pour environ 50 personnes et un seul serveur |
| Agent | Node, sans dépendance native | Un navigateur ne peut pas lire la MAC d'un routeur |
| Auth | Session en cookie httpOnly + SameSite=Strict | Révocable immédiatement, contrairement à un JWT |

PostgreSQL sera utile si plusieurs serveurs API ou plusieurs sites écrivent en même temps. Pas avant.

## Découverte automatique
- API : `apps/api/src/modules/<nom>/index.ts` est monté sur `/api/<nom>`.
- Web : `apps/web/src/features/<nom>/index.tsx` apparaît dans le menu.
Personne ne modifie un fichier central pour ajouter une route ou une page.

## Règles
- Les droits viennent de `packages/contracts/src/routes.ts`. `createModule` les applique.
- Un module n'importe jamais l'intérieur d'un autre : seulement son `public.ts`.
- Une écriture sensible appelle `audit(...)`. SQL toujours paramétré (`?`).
- Le web utilise `api()` et peut donner un `mock` : il sert uniquement en développement tant que l'API répond 501.
