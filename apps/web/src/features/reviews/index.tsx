import { useEffect, useState } from 'react';
import type { Justification } from '@kit-pulse/contracts';
import { api, ApiError } from '../../core/api.ts';
import type { Feature } from '../../core/feature.ts';
import { Button, Card } from '../../ui/components.tsx';
import { pendingReviews, requiresRefusalConfirmation, REVIEW_ROLES } from './model.ts';
import { apiErrorMessage, isDevelopmentNotImplemented } from '../team/feedback.ts';

const MOCK: Justification[] = [
  { id: -1, userId: 901, workDate: '2026-11-24', kind: 'LATE', reason: 'Motif fictif destiné à présenter la file de traitement.', status: 'PENDING', reviewNote: null },
];

function ReviewsPage() {
  const [items, setItems] = useState<Justification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [demo, setDemo] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    api<Justification[]>('GET', '/justifications', { mock: MOCK }).then((data) => { if (active) { setItems(data); setDemo(data === MOCK); } })
      .catch((e: unknown) => { if (active) setError(apiErrorMessage(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function review(item: Justification, status: 'ACCEPTED' | 'REJECTED') {
    if (requiresRefusalConfirmation(status) && !window.confirm('Confirmer le refus de cette justification ?')) return;
    setBusyId(item.id); setError(''); setNotice('');
    try {
      await api('POST', `/justifications/${item.id}/review`, { body: { status, note: null } });
      setItems((old) => old.map((j) => j.id === item.id ? { ...j, status } : j));
      setNotice('Décision enregistrée.');
    } catch (e) {
      if (e instanceof ApiError && isDevelopmentNotImplemented(e.status, import.meta.env.DEV)) {
        setItems((old) => old.map((j) => j.id === item.id ? { ...j, status } : j)); setDemo(true);
        setNotice('Décision simulée en démonstration locale ; elle n’a pas été enregistrée ni auditée par le serveur.');
      } else setError(apiErrorMessage(e));
    } finally { setBusyId(null); }
  }

  const pending = pendingReviews(items);
  return <Card>
    <h1>Justifications à traiter</h1>
    <p>Réservé aux rôles ADMIN et HR. Chaque décision réelle doit être enregistrée par le serveur.</p>
    {demo && <p role="status" className="mock">Données fictives de démonstration — ne traitez pas ces éléments comme des demandes réelles.</p>}
    {error && <p role="alert" className="error">Impossible de charger ou traiter les justifications : {error}</p>}{notice && <p role="status">{notice}</p>}
    {loading ? <p role="status">Chargement des justifications…</p> : pending.length === 0 ? <p>Aucune justification en attente.</p> : <ul className="feature-list">{pending.map((item) => <li key={item.id}>
      <h2>{item.kind === 'LATE' ? 'Retard' : 'Absence'} du {item.workDate}</h2>
      <p>Personne : compte #{item.userId}</p><p style={{ overflowWrap: 'anywhere' }}>{item.reason}</p>
      <div className="feature-actions"><Button type="button" disabled={busyId !== null} onClick={() => void review(item, 'ACCEPTED')}>{busyId === item.id ? 'Enregistrement…' : 'Accepter'}</Button><Button type="button" disabled={busyId !== null} onClick={() => void review(item, 'REJECTED')}>Refuser</Button></div>
    </li>)}</ul>}
  </Card>;
}
const feature: Feature = { path: 'reviews', label: 'Justifications à traiter', order: 70, roles: REVIEW_ROLES, Component: ReviewsPage };
export default feature;
