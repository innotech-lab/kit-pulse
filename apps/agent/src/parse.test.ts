import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNetsh } from './parse.ts';
// Adresses fictives (02:...).
const FR = `
Il existe 1 interface sur le systeme :

    Nom                   : Wi-Fi
    Description            : Carte Wi-Fi
    Adresse physique       : 02:00:00:00:00:50
    Etat                  : connecte
    SSID                  : Kit-Hub3
       Point d'acces d'identificateur SSID (Service Set Identifier)                 : 02:00:00:00:00:1a
    Profil                : Kit-Hub3
`;
const EN = `
    Name                   : Wi-Fi 2
    Physical address       : 02:00:00:00:00:51
    State                  : disconnected

    Name                   : Wi-Fi
    Physical address       : 02:00:00:00:00:50
    SSID                   : KIT-HUB_Starlink
    AP BSSID               : 02:00:00:00:00:1b
`;
test('Windows en francais', () => assert.deepEqual(parseNetsh(FR, 'Wi-Fi'), { ssid: 'Kit-Hub3', bssid: '02:00:00:00:00:1a' }));
test('Windows en anglais, plusieurs cartes', () => assert.deepEqual(parseNetsh(EN, 'Wi-Fi'), { ssid: 'KIT-HUB_Starlink', bssid: '02:00:00:00:00:1b' }));
test('la MAC du PC nest jamais prise pour celle du routeur', () => assert.deepEqual(parseNetsh(EN, 'Wi-Fi 3'), { ssid: null, bssid: null }));
