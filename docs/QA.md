# Plan de tests

Automatiques : `npm test` (base, MAC, signature, rejeu, droits de toutes les routes, agent). Chaque module remplace ses `test.todo`.

## Recette vendredi (Stany, Abigael, Dancile)
| Test | Attendu |
|---|---|
| Pointer sur KIT-HUB_Starlink puis Kit-Hub3 | Accepté |
| Pointer en partage 4G, même nom que Kit-Hub3 | Refusé, journalisé |
| Pointer avec VPN | Refusé, message clair |
| Poste non approuvé ou révoqué | Refusé |
| Poste personnel d'une autre personne | Refusé |
| Rejouer une requête | Refusé |
| Changer l'heure du PC | Sans effet |
| Deux clics rapides | Un seul pointage |
| MEMBER appelle une route ADMIN | 403 |
| Compte désactivé, session ouverte | 401 |
| 08:10 / 08:11 | Présent / retard |
| Texte `<script>` dans une tâche | Affiché comme texte |
| Injection `' OR 1=1` dans un champ | Aucun effet |
| Écran 360 px, clavier seul | Utilisable |

Bug bloquant = pointage faux, fuite de données, perte de données, page blanche.
