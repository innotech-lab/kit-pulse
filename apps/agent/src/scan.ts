// A lancer SUR PLACE, connecte a chaque Wi-Fi KIT-HUB, pour relever les MAC. N'envoie rien.
import { probe } from './probe.ts';
const p = await probe(false);
console.log(`Interface             : ${p.interfaceAlias ?? 'aucune'}`);
console.log(`SSID                  : ${p.ssid ?? 'illisible (Ethernet, ou localisation Windows desactivee)'}`);
console.log(`GATEWAY (MAC routeur) : ${p.gatewayMac ?? 'illisible (VPN actif ?)'}`);
console.log(`BSSID (radio Wi-Fi)   : ${p.bssid ?? 'illisible'}`);
console.log('\nA reporter dans .env SEULEMENT si le SSID est KIT-HUB_Starlink ou Kit-Hub3.');
