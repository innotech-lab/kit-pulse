import { useEffect, useState, type FormEvent } from 'react';
import type { AttendanceDay, Justification, JustificationKind } from '@kit-pulse/contracts';
import { api, ApiError } from '../../core/api.ts';
import type { Feature } from '../../core/feature.ts';
import { useSession } from '../../core/session.tsx';
import { Button, Card } from '../../ui/components.tsx';
import { attendanceStatusLabel } from './model.ts';
import { apiErrorMessage, isDevelopmentNotImplemented } from '../team/feedback.ts';

const justificationStatus: Record<Justification['status'], string> = { PENDING: 'En attente de décision', ACCEPTED: 'Acceptée', REJECTED: 'Refusée' };

function AttendancePage() {
  const { user } = useSession();
  const [days, setDays] = useState<AttendanceDay[]>([]);
  const [justifications, setJustifications] = useState<Justification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [demo, setDemo] = useState(false);
  const [kind, setKind] = useState<JustificationKind>('LATE');
  const [workDate, setWorkDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const from = `${new Date().getFullYear()}-01-01`;
  const to = `${new Date().getFullYear()}-12-31`;
  const mockDays: AttendanceDay[] = [
    { userId: user?.id ?? -1, workDate: '2026-11-24', status: 'LATE', minutesLate: 11, firstIn: '2026-11-24T08:11:00.000Z', lastOut: '2026-11-24T17:00:00.000Z', missingOut: false, justificationStatus: 'ACCEPTED', justified: true },
    { userId: user?.id ?? -1, workDate: '2026-11-25', status: 'PENDING', minutesLate: 0, firstIn: null, lastOut: null, missingOut: false, justificationStatus: null, justified: false },
  ];
  const mockJustifications: Justification[] = [{ id: -1, userId: user?.id ?? -1, workDate: '2026-11-24', kind: 'LATE', reason: 'Motif fictif de démonstration.', status: 'ACCEPTED', reviewNote: null }];

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    const loadDays = api<AttendanceDay[]>('GET', `/attendance/me?from=${from}&to=${to}`, { mock: mockDays });
    const loadJustifications = api<Justification[]>('GET', '/justifications/me', { mock: mockJustifications });
    Promise.all([loadDays, loadJustifications]).then(([attendance, reasons]) => {
      if (active) { setDays(attendance); setJustifications(reasons); if (attendance === mockDays || reasons === mockJustifications) setDemo(true); }
    }).catch((e: unknown) => { if (active) setError(apiErrorMessage(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      const created = await api<Justification>('POST', '/justifications', { body: { workDate, kind, reason } });
      setJustifications((old) => [created, ...old]); setNotice('Justification déposée.'); setReason('');
    } catch (e) {
      if (e instanceof ApiError && isDevelopmentNotImplemented(e.status, import.meta.env.DEV)) {
        setJustifications((old) => [{ id: -Date.now(), userId: user?.id ?? -1, workDate, kind, reason, status: 'PENDING', reviewNote: null }, ...old]);
        setDemo(true); setNotice('Justification ajoutée en démonstration locale ; elle n’a pas été transmise au serveur.'); setReason('');
      } else setError(apiErrorMessage(e));
    } finally { setSaving(false); }
  }

  return <Card>
    <h1>Mes présences</h1>
    {demo && <p role="status" className="mock">Données de démonstration — elles ne correspondent pas à votre présence réelle. Les dépôts locaux ne sont pas transmis au serveur.</p>}
    {error && <p role="alert" className="error">Impossible de charger ou transmettre les informations : {error}</p>}{notice && <p role="status">{notice}</p>}
    <h2>Mes journées</h2>
    {loading ? <p role="status">Chargement des journées…</p> : days.length === 0 ? <p>Aucune journée à afficher pour la période.</p> : <div className="table-scroll" style={{ maxWidth: '100%', overflowX: 'auto' }}><table><thead><tr><th>Date</th><th>Statut</th><th>Retard</th><th>Pointages</th><th>Justification</th></tr></thead><tbody>{days.map((d) => <tr key={`${d.userId}-${d.workDate}`}><td>{d.workDate}</td><td>{attendanceStatusLabel(d)}</td><td>{d.minutesLate ? `${d.minutesLate} min` : '—'}</td><td>{d.firstIn ? new Date(d.firstIn).toLocaleTimeString() : '—'} / {d.lastOut ? new Date(d.lastOut).toLocaleTimeString() : d.missingOut ? 'Sortie oubliée' : '—'}</td><td>{d.justificationStatus ? justificationStatus[d.justificationStatus] : 'Aucune'}</td></tr>)}</tbody></table></div>}
    <h2>Déposer une justification</h2>
    <form onSubmit={submit}>
      <div className="feature-filters">
        <label className="field">Type<select value={kind} onChange={(e) => setKind(e.target.value as JustificationKind)}><option value="LATE">Retard</option><option value="ABSENCE">Absence</option></select></label>
        <label className="field">Date concernée<input type="date" required value={workDate} onChange={(e) => setWorkDate(e.target.value)} /></label>
      </div>
      <label className="field">Motif<textarea required maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
      <Button type="submit" disabled={saving || !reason.trim()}>{saving ? 'Envoi…' : 'Déposer la justification'}</Button>
    </form>
    <h2>Mes justifications</h2>
    {loading ? <p>Chargement des justifications…</p> : justifications.length === 0 ? <p>Aucune justification déposée.</p> : <ul className="feature-list">{justifications.map((j) => <li key={j.id}><strong>{j.workDate} · {j.kind === 'LATE' ? 'Retard' : 'Absence'}</strong><p style={{ overflowWrap: 'anywhere' }}>{j.reason}</p><p>{justificationStatus[j.status]}</p>{j.reviewNote && <p style={{ overflowWrap: 'anywhere' }}>Note de traitement : {j.reviewNote}</p>}</li>)}</ul>}
  </Card>;
}
const feature: Feature = { path: 'attendance', label: 'Présences', order: 50, Component: AttendancePage };
export default feature;
