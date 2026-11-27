import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Availability, AvailabilityStatus } from '@kit-pulse/contracts';
import { api, ApiError } from '../../core/api.ts';
import type { Feature } from '../../core/feature.ts';
import { useSession } from '../../core/session.tsx';
import { Avatar, Button, Card, Empty, Field, Loading, Notice, Page, SelectField, StatusIcon, useAutoRefresh } from '../../ui/components.tsx';
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
      if (active) { setRows(data); setDemo(data === MOCK); const me = data.find((r) => r.userId === user?.id); if (me) { setStatus(me.status); setNote(me.note ?? ''); } }
    }).catch((e: unknown) => { if (active) setError(apiErrorMessage(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useAutoRefresh(() => api<Availability[]>('GET', '/availability', { mock: MOCK }).then((data) => { if (data !== MOCK) setRows(data); }).catch(() => {}));

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

  const mine = rows.find((r) => r.userId === user?.id);
  const counts = AVAILABILITY_STATUSES.map((s) => ({ s, n: rows.filter((r) => r.status === s).length })).filter((c) => c.n > 0);
  return <Page title="Équipe" meta={loading ? "Lecture des disponibilités…" : counts.map((c) => `${c.n} ${LABELS[c.s].toLowerCase()}`).join(" · ")}>
    {demo && <Notice tone="warn">Données de démonstration : elles ne représentent pas les disponibilités réelles</Notice>}
    {error && <Notice tone="danger">Impossible de charger ou modifier les disponibilités : {error}</Notice>}
    <div className="split split-rev">
      <Card title="Disponibilités" meta={`${visible.length} personne${visible.length > 1 ? "s" : ""}`}>
        <div className="feature-filters">
          <Field label="Rechercher" placeholder="Nom" value={filter} onChange={(e) => setFilter(e.target.value)} />
          <SelectField label="Statut" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as AvailabilityStatus | "ALL")}><option value="ALL">Tous</option>{AVAILABILITY_STATUSES.map((s) => <option key={s} value={s}>{LABELS[s]}</option>)}</SelectField>
        </div>
        {loading ? <Loading /> : visible.length === 0 ? <Empty title="Personne ne correspond à ce filtre" /> :
          <ul className="team-grid">{visible.map((r) => <li key={r.userId} className={r.userId === user?.id ? "is-me" : undefined}>
            <Avatar name={r.fullName} />
            <div className="team-text"><strong>{r.fullName}{r.userId === user?.id && <span className="muted"> · moi</span>}</strong><StatusIcon status={r.status} />
              {r.note && <p>{r.note}</p>}{r.until && <small>Jusqu’à {new Date(r.until).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" })}</small>}</div>
          </li>)}</ul>}
      </Card>
      <Card title="Mon statut" meta={mine ? LABELS[mine.status] : undefined}>
        <form onSubmit={changeStatus} aria-label="Changer ma disponibilité">
          <fieldset className="choice"><legend className="sr-only">Statut</legend>
            {AVAILABILITY_STATUSES.map((s) => <label key={s} className="choice-item"><input type="radio" name="status" value={s} checked={status === s} onChange={() => setStatus(s)} /><StatusIcon status={s} /></label>)}
          </fieldset>
          <Field label="Note" hint="Facultatif, visible par l’équipe" placeholder="Ex. salle 2, retour 15:00" value={note} maxLength={140} onChange={(e) => setNote(e.target.value)} />
          <Button type="submit" disabled={saving}>{saving ? "Enregistrement…" : "Mettre à jour mon statut"}</Button>
          {notice && <Notice tone="ok">{notice}</Notice>}
        </form>
      </Card>
    </div>
  </Page>;
}
const feature: Feature = { path: 'equipe', label: 'Équipe', order: 40, Component: TeamPage };
export default feature;
