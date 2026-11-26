import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Availability, AvailabilityStatus } from '@kit-pulse/contracts';
import { api, ApiError } from '../../core/api.ts';
import type { Feature } from '../../core/feature.ts';
import { useSession } from '../../core/session.tsx';
import { Button, Card, Field, StatusIcon } from '../../ui/components.tsx';
import { AVAILABILITY_STATUSES, filterAvailability } from './model.ts';
import { apiErrorMessage, isDevelopmentNotImplemented } from './feedback.ts';

const MOCK: Availability[] = [
  { userId: 1, fullName: 'Demo — Aline Exemple', status: 'FREE', note: null, until: null },
  { userId: 2, fullName: 'Demo — Benoît Exemple', status: 'MEETING', note: 'Réunion de démonstration', until: null },
  { userId: 3, fullName: 'Demo — Chantal Exemple', status: 'FIELD', note: 'Terrain de démonstration', until: null },
];
const LABELS: Record<AvailabilityStatus, string> = { FREE: 'Libre', BUSY: 'Occupé', MEETING: 'En réunion', FIELD: 'Sur le terrain', OFFLINE: 'Hors ligne' };

function TeamPage() {
  const { user } = useSession();
  const [rows, setRows] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<AvailabilityStatus | 'ALL'>('ALL');
  const [status, setStatus] = useState<AvailabilityStatus>('FREE');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api<Availability[]>('GET', '/availability', { mock: MOCK }).then((data) => {
      if (active) { setRows(data); setDemo(data === MOCK); }
    }).catch((e: unknown) => { if (active) setError(apiErrorMessage(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const visible = useMemo(() => filterAvailability(rows, filter, statusFilter), [rows, filter, statusFilter]);

  async function changeStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      await api('PUT', '/availability/me', { body: { status, note: note.trim() || null, until: null } });
      setRows((old) => old.map((r) => r.userId === user?.id ? { ...r, status, note: note.trim() || null } : r));
      setNotice(demo ? 'Statut modifié dans cette démonstration locale.' : 'Votre statut a été modifié.');
    } catch (e) {
      if (e instanceof ApiError && isDevelopmentNotImplemented(e.status, import.meta.env.DEV)) {
        setRows((old) => old.some((r) => r.userId === user?.id) ? old.map((r) => r.userId === user?.id ? { ...r, status, note: note.trim() || null } : r) : [...old, { userId: user?.id ?? 0, fullName: `${user?.fullName ?? 'Moi'} (démo)`, status, note: note.trim() || null, until: null }]);
        setDemo(true); setNotice('Démonstration locale : le serveur ne prend pas encore en charge le changement de statut.');
      } else setError(apiErrorMessage(e));
    } finally { setSaving(false); }
  }

  return <Card>
    <h1>Équipe et disponibilités</h1>
    {demo && <p className="mock" role="status">Données de démonstration — elles ne représentent pas les disponibilités réelles.</p>}
    {error && <p role="alert" className="error">Impossible de charger ou modifier les disponibilités : {error}</p>}
    <form onSubmit={changeStatus} aria-label="Changer ma disponibilité">
      <label className="field">Mon statut<select value={status} onChange={(e) => setStatus(e.target.value as AvailabilityStatus)}>{AVAILABILITY_STATUSES.map((s) => <option key={s} value={s}>{LABELS[s]}</option>)}</select></label>
      <Field label="Note (facultative)" value={note} maxLength={140} onChange={(e) => setNote(e.target.value)} />
      <Button type="submit" disabled={saving}>{saving ? 'Enregistrement…' : 'Mettre à jour mon statut'}</Button>
      {notice && <p role="status">{notice}</p>}
    </form>
    <h2>Disponibilités de l’équipe</h2>
    <div className="feature-filters">
      <Field label="Filtrer par nom" value={filter} onChange={(e) => setFilter(e.target.value)} />
      <label className="field">Statut<select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as AvailabilityStatus | 'ALL')}><option value="ALL">Tous les statuts</option>{AVAILABILITY_STATUSES.map((s) => <option key={s} value={s}>{LABELS[s]}</option>)}</select></label>
    </div>
    {loading ? <p role="status">Chargement des disponibilités…</p> : visible.length === 0 ? <p>Aucune personne ne correspond à ce filtre.</p> : <ul className="feature-list">{visible.map((r) => <li key={r.userId}><strong style={{ overflowWrap: 'anywhere' }}>{r.fullName}</strong> <StatusIcon status={r.status} />{r.note && <p style={{ overflowWrap: 'anywhere' }}>{r.note}</p>}{r.until && <small>Jusqu’au {new Date(r.until).toLocaleString()}</small>}</li>)}</ul>}
  </Card>;
}
const feature: Feature = { path: 'equipe', label: 'Équipe', order: 40, Component: TeamPage };
export default feature;
