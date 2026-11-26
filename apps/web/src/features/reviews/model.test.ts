import test from 'node:test';
import assert from 'node:assert/strict';
import type { Justification } from '@kit-pulse/contracts';
import { pendingReviews, requiresRefusalConfirmation, REVIEW_ROLES } from './model.ts';

const item = (id: number, status: Justification['status']): Justification => ({ id, userId: 1, workDate: '2026-11-26', kind: 'LATE', reason: 'Motif '.repeat(100), status, reviewNote: null });
test('file de traitement : vide, demandes en attente seulement, 50 lignes et longs motifs', () => {
  assert.deepEqual(pendingReviews([]), []);
  const rows = Array.from({ length: 50 }, (_, i) => item(i + 1, i % 2 ? 'PENDING' : 'ACCEPTED'));
  assert.equal(pendingReviews(rows).length, 25);
  assert.ok(pendingReviews(rows).every((r) => r.status === 'PENDING' && r.reason.length > 500));
});
test('la file de traitement est réservée à ADMIN et HR', () => {
  assert.deepEqual(REVIEW_ROLES, ['ADMIN', 'HR']);
});
test('un refus demande une confirmation, une acceptation non', () => {
  assert.equal(requiresRefusalConfirmation('REJECTED'), true);
  assert.equal(requiresRefusalConfirmation('ACCEPTED'), false);
});
