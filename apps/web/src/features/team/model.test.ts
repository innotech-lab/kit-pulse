import test from 'node:test';
import assert from 'node:assert/strict';
import type { Availability } from '@kit-pulse/contracts';
import { AVAILABILITY_STATUSES, filterAvailability } from './model.ts';
import { apiErrorMessage, isDevelopmentNotImplemented } from './feedback.ts';

const rows: Availability[] = Array.from({ length: 50 }, (_, i) => ({ userId: i + 1, fullName: `Personne ${i + 1} ${'nom très long '.repeat(i === 49 ? 20 : 1)}`, status: i % 2 ? 'FREE' : 'MEETING', note: null, until: null }));
test('filtre équipe : liste vide, filtre insensible à la casse et 50 personnes', () => {
  assert.deepEqual(filterAvailability([], '', 'ALL'), []);
  assert.equal(filterAvailability(rows, ' PERSONNE 50 ', 'ALL').length, 1);
  assert.equal(filterAvailability(rows, '', 'FREE').length, 25);
  assert.equal(filterAvailability(rows, 'nom très long '.repeat(10), 'ALL').length, 1);
});
test('tous les statuts du contrat sont disponibles au filtre', () => {
  assert.deepEqual(AVAILABILITY_STATUSES, ['FREE', 'BUSY', 'MEETING', 'FIELD', 'OFFLINE']);
  for (const status of AVAILABILITY_STATUSES) {
    const row: Availability = { userId: 1, fullName: 'A', status, note: null, until: null };
    assert.deepEqual(filterAvailability([row], '', status), [row]);
  }
});
test('la démo ne remplace que le 501 en développement et les erreurs gardent leur message', () => {
  assert.equal(isDevelopmentNotImplemented(501, true), true);
  assert.equal(isDevelopmentNotImplemented(501, false), false);
  assert.equal(isDevelopmentNotImplemented(500, true), false);
  assert.equal(apiErrorMessage(new Error('Serveur indisponible')), 'Serveur indisponible');
  assert.equal(apiErrorMessage(null), 'Une erreur inattendue est survenue.');
});
