import { useEffect, useState, type FormEvent } from 'react';
import type { AttendanceDay, Justification, JustificationKind } from '@kit-pulse/contracts';
import { api, ApiError } from '../../core/api.ts';
import type { Feature } from '../../core/feature.ts';
import { useSession } from '../../core/session.tsx';
import { Button, Card, DayLine, Empty, Field, Loading, Modal, Notice, Page, SelectField, Stat, Tag, TextArea } from '../../ui/components.tsx';
import { attendanceStatusLabel } from './model.ts';
import { apiErrorMessage, isDevelopmentNotImplemented } from '../team/feedback.ts';

const justificationStatus: Record<Justification['status'], string> = { PENDING: 'En attente', ACCEPTED: 'Acceptée', REJECTED: 'Refusée' };

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
  const [showForm, setShowForm] = useState(false);
  const from = `${new Date().getFullYear()}-01-01`;
  const to = `${new Date().getFullYear()}-12-31`;
  const mockDays: AttendanceDay[] = [
    { userId: user?.id ?? -1, workDate: '2026-11-24', status: 'LATE', minutesLate: 11, firstIn: '2026-11-24T08:11:00.000Z', lastOut: '2026-11-24T17:00:00.000Z', missingOut: false, justificationStatus: 'ACCEPTED', justified: true, minutesEarly: 0, minutesAfter: 0 },
    { userId: user?.id ?? -1, workDate: '2026-11-25', status: 'PENDING', minutesLate: 0, firstIn: null, lastOut: null, missingOut: false, justificationStatus: null, justified: false, minutesEarly: 0, minutesAfter: 0 },
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
      setJustifications((old) => [created, ...old]); setNotice('Justification envoyée aux RH'); setReason(''); setShowForm(false);
    } catch (e) {
      if (e instanceof ApiError && isDevelopmentNotImplemented(e.status, import.meta.env.DEV)) {
        setJustifications((old) => [{ id: -Date.now(), userId: user?.id ?? -1, workDate, kind, reason, status: 'PENDING', reviewNote: null }, ...old]);
        setDemo(true); setNotice('Justification ajoutée en démonstration locale ; elle n’a pas été transmise au serveur.'); setReason('');
      } else setError(apiErrorMessage(e));
    } finally { setSaving(false); }
  }

  const todayIso = new Date().toLocaleDateString("en-CA");
  const worked = days.filter((d) => d.status !== "OFF" && d.status !== "HOLIDAY" && d.workDate <= todayIso);
  const recent = [...worked].reverse();
  const toJustify = worked.filter((d) => (d.status === "LATE" || d.status === "ABSENT") && !d.justificationStatus);
  const hhmm = (v: string) => new Date(v).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" });
  const dayLabel = (v: string) => new Date(`${v}T12:00:00`).toLocaleDateString("fr", { weekday: "short", day: "numeric", month: "short" });
  function prefill(d: AttendanceDay) { setKind(d.status === "LATE" ? "LATE" : "ABSENCE"); setWorkDate(d.workDate); setShowForm(true); }
  const tone = (d: AttendanceDay) => d.status === "PRESENT" ? "ok" : d.status === "LATE" ? (d.justified ? "neutral" : "warn") : d.status === "ABSENT" ? (d.justified ? "neutral" : "danger") : "neutral";
  return <Page title="Mes présences" meta={`${new Date().getFullYear()} · depuis mon arrivée`} actions={<Button icon="plus" onClick={() => setShowForm(true)}>Justifier un retard ou une absence</Button>}>
    {demo && <Notice tone="warn">Données de démonstration : elles ne correspondent pas à votre présence réelle</Notice>}
    {error && <Notice tone="danger">Impossible de charger ou transmettre les informations : {error}</Notice>}
    {notice && <Notice tone="ok">{notice}</Notice>}
    <div className="stats">
      <Stat label="Jours pointés" value={worked.filter((d) => d.status === "PRESENT" || d.status === "LATE").length} note={`sur ${worked.filter((d) => d.status !== "PENDING").length} jours travaillés`} accent />
      <Stat label="Retards" value={worked.filter((d) => d.status === "LATE").length} note={`${worked.filter((d) => d.status === "LATE" && d.justified).length} justifiés`} />
      <Stat label="Absences" value={worked.filter((d) => d.status === "ABSENT").length} note={`${worked.filter((d) => d.status === "ABSENT" && d.justified).length} justifiées`} />
      <Stat label="À justifier" value={toJustify.length} note={toJustify.length ? "bouton Justifier sur la journée" : "rien en attente de votre part"} />
    </div>
    <div className="split">
      <Card title="Mes journées" meta="08:00 – 17:00">
        {loading ? <Loading /> : recent.length === 0 ? <Empty title="Aucune journée à afficher" /> :
          <div className="table-scroll"><table>
            <thead><tr><th>Jour</th><th style={{ width: "36%" }}>Journée</th><th>Horaires</th><th>Statut</th><th /></tr></thead>
            <tbody>{recent.map((d) => <tr key={`${d.userId}-${d.workDate}`}>
              <td style={{ whiteSpace: "nowrap" }}>{dayLabel(d.workDate)}</td>
              <td><DayLine early={d.minutesEarly} after={d.minutesAfter} firstIn={d.firstIn} lastOut={d.lastOut} late={d.status === "LATE"} now={d.status === "PENDING"} /></td>
              <td className="mono" style={{ whiteSpace: "nowrap" }}>{d.firstIn ? hhmm(d.firstIn) : "--:--"} – {d.lastOut ? hhmm(d.lastOut) : d.missingOut ? "sortie oubliée" : "--:--"}</td>
              <td><Tag tone={tone(d)}>{attendanceStatusLabel(d)}{d.status === "LATE" ? ` · ${d.minutesLate} min` : ""}</Tag>{d.justificationStatus && !d.justified && <small style={{ display: "block", marginTop: 4 }}>{justificationStatus[d.justificationStatus]}</small>}</td>
              <td className="num-col">{(d.status === "LATE" || d.status === "ABSENT") && !d.justificationStatus && <Button size="sm" variant="secondary" onClick={() => prefill(d)}>Justifier</Button>}</td>
            </tr>)}</tbody>
          </table></div>}
      </Card>
      <div className="grid">
        <Modal open={showForm} dismissible={false} onClose={() => setShowForm(false)} title="Justifier un retard ou une absence" meta="Votre demande part aux RH, qui l’acceptent ou la refusent" footer={<><Button variant="secondary" onClick={() => setShowForm(false)}>Annuler</Button><Button type="submit" form="justify-form" disabled={saving || !reason.trim()}>{saving ? "Envoi…" : "Envoyer aux RH"}</Button></>}>
          <form id="justify-form" onSubmit={submit}>
            <div className="feature-filters">
              <SelectField label="Type" value={kind} onChange={(e) => setKind(e.target.value as JustificationKind)}><option value="LATE">Retard</option><option value="ABSENCE">Absence</option></SelectField>
              <Field label="Date" type="date" required value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
            </div>
            <TextArea id="justify-reason" label="Motif" required maxLength={1000} placeholder="Ex. rendez-vous médical, transport en panne" value={reason} onChange={(e) => setReason(e.target.value)} />
            {error && <Notice tone="danger">{error}</Notice>}
          </form>
        </Modal>
        <Card title="Mes justifications" meta={`${justifications.length}`}>
          {loading ? <Loading /> : justifications.length === 0 ? <Empty title="Aucune justification déposée" /> :
            <ul className="feature-list">{justifications.map((j) => <li key={j.id}>
              <div className="task-head"><strong>{dayLabel(j.workDate)} · {j.kind === "LATE" ? "Retard" : "Absence"}</strong><Tag tone={j.status === "ACCEPTED" ? "ok" : j.status === "REJECTED" ? "danger" : "accent"}>{justificationStatus[j.status]}</Tag></div>
              <p style={{ overflowWrap: "anywhere" }}>{j.reason}</p>
              {j.reviewNote && <small style={{ overflowWrap: "anywhere" }}>Réponse des RH : {j.reviewNote}</small>}
            </li>)}</ul>}
        </Card>
      </div>
    </div>
  </Page>;
}
const feature: Feature = { path: 'attendance', label: 'Présences', order: 50, Component: AttendancePage };
export default feature;
