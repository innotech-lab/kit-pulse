# KIT-Pulse

<img src="docs/assets/kithub.png" alt="KiT Hub" width="260" />

Suivi des présences, des tâches, des agendas et de la disponibilité à KIT-HUB. Projet KITPULSE, 25-27 novembre 2026, Innotech Impact LTD.

## Démarrer (chaque poste)
Prérequis : Node 24 LTS (22.18 minimum), Windows pour le pointage réel.

```
npm ci
npm run setup        # crée .env, construit la base commune, vérifie son empreinte
npm run dev:api      # terminal 1 : http://127.0.0.1:4000
npm run dev:agent    # terminal 2 : http://127.0.0.1:47820
npm run dev:web      # terminal 3 : http://127.0.0.1:5173
```

`npm ci` exige un lockfile complet. **Daniel le génère une seule fois** (ticket SETUP-001) avant que les autres commencent :
`npm install` puis `npm run check`.
Erreur `UNABLE_TO_VERIFY_LEAF_SIGNATURE` : `$env:NODE_OPTIONS="--use-system-ca"` dans PowerShell, puis relancer. Ne jamais désactiver `strict-ssl`.

Comptes de développement : `admin@kitpulse.local`, `rh@`, `coordination@`, `<prenom>@kitpulse.local`. Mot de passe : `KitPulse-dev-2026`.

## Commandes
| Commande | Rôle |
|---|---|
| `npm run check` | Types, tests, build, empreinte de la base |
| `npm run db:reset` | Remet la base locale à l'identique pour tous |
| `npm run db:verify` | Prouve que la base est la même que celle de l'équipe |
| `npm run agent:scan` | Affiche la MAC du routeur courant (n'envoie rien) |
| `npm run owner:check -- Prenom` | Vérifie que la branche ne touche que sa zone |

## Lire dans cet ordre
1. `docs/cahiers-de-charge/<PRENOM>.md`
2. `docs/ANTI-CONFLITS.md`
3. `docs/BASE-DE-DONNEES.md`
4. `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/RESEAU.md`

Autres : `docs/CAHIER-DES-CHARGES.md`, `docs/PLANNING.md`, `docs/QA.md`, `docs/DEPLOIEMENT.md`, `docs/GUIDE-UTILISATEUR.md`.
