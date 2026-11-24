# Une seule base pour toute l'équipe

SQLite, un fichier local par poste (`data/kit-pulse.db`, non versionné), reconstruit **à l'identique** depuis `db/migrations` + `db/seed`.

- `npm run db:reset` : mêmes tables, mêmes lignes, mêmes IDs, mêmes hash pour tous.
- `npm run db:verify` : compare à `db/fingerprint.json`. Différent = on s'arrête et on prévient Daniel.
- Les tests utilisent une base neuve en mémoire : ils n'abîment jamais la base locale.
- Les MAC réelles ne sont ni dans le schéma ni dans le seed : elles viennent de `.env`.

## Modifier le schéma
1. Demander à Daniel (ticket, table, colonne, raison).
2. Nouvelle migration uniquement, jamais d'édition d'un fichier existant (le moteur refuse).
3. Plages de numéros : Daniel 01xx, Stany 02xx, Dancile 03xx, Beoline 04xx, Alain 05xx. Exemple : `0301_attendance_motif.sql`.
4. Daniel fusionne, lance `npm run db:fingerprint`, annonce « db:reset ».
Un changement de fichier de seed suit la même règle : proposé par sa personne responsable, empreinte régénérée par Daniel.

## Tables
users, sessions, networks, network_macs, devices, punch_challenges, punches, punch_rejections, work_schedule, holidays, justifications, tasks, task_updates, availability, events, audit_log. Détail : `db/migrations/0001_init.sql`.

Dates-heures en UTC (`...Z`). `work_date` = jour local. Retards et absences sont **calculés** à la lecture : rien à recalculer la nuit.
