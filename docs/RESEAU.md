# Vérification du réseau (responsable : Stany)

## À savoir
`KIT-HUB_Starlink` et `Kit-Hub3` sont des **noms** (SSID). N'importe quel téléphone peut porter le même nom. Seule la **MAC** est vérifiée ; le nom sert de contrôle en plus.

🚨 BLOCKER : les MAC réelles n'ont pas été fournies. Tant que `.env` est vide, tout pointage réel est refusé (volontaire).

## Deux MAC différentes
| Nom | Ce que c'est | Combien |
|---|---|---|
| GATEWAY | MAC du **routeur** vue par le poste (passerelle) | En général une par réseau |
| BSSID | MAC de la radio Wi-Fi | Une par bande (2,4 / 5 / 6 GHz) et par répéteur |

Mode `gateway` (défaut) : MAC du routeur obligatoire, et le SSID doit correspondre s'il est lisible. Les répéteurs et bandes multiples fonctionnent sans les enregistrer. Un câble Ethernet sur le routeur est accepté.
Mode `strict` : MAC du routeur + SSID + BSSID. À n'activer qu'après relevé de **tous** les BSSID.

## Relever les MAC (NET-000)
1. Se connecter à KIT-HUB_Starlink, VPN coupé, lancer `npm run agent:scan`. Noter GATEWAY et BSSID.
2. Recommencer près de chaque point d'accès et sur chaque bande.
3. Faire pareil sur Kit-Hub3.
4. Comparer avec l'étiquette ou la page d'administration du routeur.
5. Remplir `KITHUB_NET1_*` et `KITHUB_NET2_*` dans le `.env` du serveur. **Jamais dans le dépôt.**
6. Mettre `AGENT_SIMULATE_NETWORK=false` et `ALLOW_SIMULATED_NETWORK=false`, redémarrer API et agent, tester.

Si les deux noms passent par le même routeur, la même GATEWAY va sur les deux lignes : c'est prévu.
SSID ou BSSID illisible : activer la localisation Windows. La MAC du routeur reste lisible sans cela.

## Déroulement d'un pointage
1. L'API donne un défi à usage unique (60 s), lié à la personne.
2. L'agent lit le routeur et signe défi + lecture avec la clé du poste.
3. L'API vérifie : défi, poste approuvé, personne autorisée sur ce poste, signature, MAC. Puis elle enregistre **son** heure.
4. Tout refus est journalisé.

## Limites, sans les cacher
| Limite | Réponse |
|---|---|
| Une personne administratrice de son PC peut copier la MAC du routeur ou modifier l'agent | Dissuasion, pas preuve absolue : poste approuvé, IP et MAC enregistrées, refus visibles par les RH |
| Le bureau à distance sur un PC resté à KIT-HUB passe | Contrôle humain, verrouillage des PC |
| Téléphone : un site web ne peut pas lire la MAC du routeur | Hors MVP : utiliser un PC borne à l'accueil. Application Android possible plus tard ; iOS très limité |
| Borne : connaître le mot de passe d'autrui suffit | Borne visible par l'accueil, mot de passe personnel |
| Routeur remplacé ou réinitialisé | L'admin ajoute la nouvelle MAC (NET-002) |
| VPN actif : routeur illisible | Couper le VPN pour pointer |
| Poste en panne | Correction manuelle RH, motif obligatoire et audité |
| Internet coupé : serveur distant injoignable | Pas de pointage hors ligne dans le MVP ; correction RH |
