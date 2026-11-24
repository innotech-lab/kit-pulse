# Déploiement (Daniel + Stany)

⚠️ CTO DECISION REQUIRED : hébergement.
- **Recommandé : petit VPS + HTTPS** : joignable depuis les deux Wi-Fi.
- Repli pour la démo : un PC de KIT-HUB. Les deux Wi-Fi étant peut-être séparés, il faut d'abord vérifier que chaque réseau peut joindre ce PC. Pas de données réelles sans HTTPS.

## Serveur
1. Node 24, `npm ci`, `npm run build`.
2. `.env` de production : `NODE_ENV=production`, les trois options de développement à `false` (sinon l'API refuse de démarrer), MAC réelles.
3. `npm run db:migrate` (le seed de démonstration est interdit en production).
4. Variables `ADMIN_*` dans la session, puis `npm run admin:create`.
5. `node apps/api/src/server.ts` sous un gestionnaire de service, derrière un proxy HTTPS.
6. Sauvegarde quotidienne de `data/` et un test de restauration.
7. Surveillance : `GET /api/health`.
À régler par Daniel avec le proxy : `trust proxy`, sinon l'IP enregistrée est celle du proxy.

## Poste KIT-HUB
Node 24 + dossier du projet + `npm ci`, `.env` avec `NODE_ENV=production`, `AGENT_SERVER_URL=https://...`, `AGENT_SIMULATE_NETWORK=false`. Lancer `npm run dev:agent` à l'ouverture de session (Planificateur de tâches), ouvrir `http://127.0.0.1:47820`. Un installateur unique est prévu après le MVP.
Session Windows partagée : un compte Windows par personne, ou poste déclaré comme borne.
