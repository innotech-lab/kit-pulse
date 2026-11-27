// Francis. Tableau de bord equipe (WEB-DASH-001) et vue d'une personne (WEB-DASH-002).
import { useEffect, useMemo, useState } from 'react';
import type { AttendanceDay, PersonReport } from '@kit-pulse/contracts';
import { api, ApiError } from '../../core/api.ts';
import type { Feature } from '../../core/feature.ts';
import { useSession } from '../../core/session.tsx';
import { Avatar, Button, Card, Modal, DayLine, Empty, Loading, Notice, Page, Stat, Tag } from '../../ui/components.tsx';

type Period = 'week' | 'month';
interface PresentNow { userId: number; fullName: string; present: boolean; firstIn: string | null; lastPunchAt: string | null }

const iso = (d: Date) => d.toLocaleDateString('en-CA');
function range(p: Period) {
  const t = new Date();
  if (p === 'week') { const wd = t.getDay() || 7; const mon = new Date(t); mon.setDate(t.getDate() - wd + 1); return { from: iso(mon), to: iso(t) }; }
  return { from: iso(new Date(t.getFullYear(), t.getMonth(), 1)), to: iso(t) };
}
const short = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('fr', { weekday: 'short', day: 'numeric' }).replace('.', '');
const hhmm = (s: string) => new Date(s).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' });
const pctOf = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const overtime = (minutes: number) => minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;

/* Moment : presence de l'equipe jour par jour. Une barre empilee par jour, l'accent porte "a l'heure". */
const SERIES = [
  { key: 'onTime', label: 'À l’heure', color: 'var(--accent)' },
  { key: 'lateOk', label: 'Retard justifié', color: 'var(--accent-2)' },
  { key: 'late', label: 'Retard non justifié', color: 'var(--warn)' },
  { key: 'absentOk', label: 'Absence justifiée', color: 'var(--n-400)' },
  { key: 'absent', label: 'Absence non justifiée', color: 'var(--danger-2)' },
] as const;
type Bucket = Record<(typeof SERIES)[number]['key'], number> & { date: string; expected: number };

function TeamChart({ days }: { days: AttendanceDay[] }) {
  const buckets = useMemo(() => {
    const map = new Map<string, Bucket>();
    for (const d of days) {
      if (!['PRESENT', 'LATE', 'ABSENT'].includes(d.status)) continue;
      const b = map.get(d.workDate) ?? { date: d.workDate, expected: 0, onTime: 0, lateOk: 0, late: 0, absentOk: 0, absent: 0 };
      b.expected++;
      if (d.status === 'PRESENT') b.onTime++;
      else if (d.status === 'LATE') d.justified ? b.lateOk++ : b.late++;
      else d.justified ? b.absentOk++ : b.absent++;
      map.set(d.workDate, b);
    }
    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [days]);
  if (!buckets.length) return <Empty title="Aucune journée travaillée sur la période" />;
  const max = Math.max(...buckets.map((b) => b.expected));
  return <div className="chart">
    <div className="chart-plot" style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))` }}>
      {[0, 0.5, 1].map((g) => <span key={g} className="chart-grid" style={{ bottom: `calc(28px + (100% - 28px) * ${g})` }}><span className="mono">{Math.round(max * g)}</span></span>)}
      {buckets.map((b) => <div key={b.date} className="chart-col" title={`${short(b.date)} : ${b.onTime + b.lateOk + b.late} présents sur ${b.expected}`}>
        <div className="chart-bar" style={{ height: `${(b.expected / max) * 100}%` }}>
          {SERIES.map((s) => b[s.key] > 0 && <span key={s.key} style={{ flexGrow: b[s.key], background: s.color }} />)}
        </div>
        <span className="chart-x mono">{short(b.date)}</span>
      </div>)}
    </div>
    <ul className="legend">{SERIES.map((s) => <li key={s.key}><span style={{ background: s.color }} />{s.label}</li>)}</ul>
  </div>;
}

function PersonPanel({ person, days, onClose }: { person: PersonReport; days: AttendanceDay[]; onClose: () => void }) {
  const mine = days.filter((d) => d.userId === person.userId && d.status !== 'OFF');
  return <Modal open size="lg" onClose={onClose} title={<span style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Avatar name={person.fullName} />{person.fullName}</span>} meta={`${person.presentDays} jours pointés sur ${person.expectedDays} attendus`}>
    <div className="stats">
      <Stat label="Présence" value={`${pctOf(person.presentDays, person.expectedDays)} %`} accent />
      <Stat label="Retards" value={person.lateJustified + person.lateUnjustified} note={`${person.lateUnjustified} non justifiés`} />
      <Stat label="Absences" value={person.absentJustified + person.absentUnjustified} note={`${person.absentUnjustified} non justifiées`} />
      <Stat label="Heures sup" value={overtime(person.overtimeMinutes)} />
      <Stat label="Tâches terminées" value={`${person.tasksDone} / ${person.tasksPlanned}`} note={`progression moyenne ${person.averageProgress} %`} />
    </div>
    {mine.length === 0 ? <Empty title="Pas de journée détaillée disponible" /> :
      <div className="week">{mine.map((d) => <div key={d.workDate} className="week-row">
        <span className="week-day">{short(d.workDate)}</span>
        <DayLine early={d.minutesEarly} after={d.minutesAfter} firstIn={d.firstIn} lastOut={d.lastOut} late={d.status === 'LATE'} now={d.status === 'PENDING'} />
        <span className="week-times mono">{d.firstIn ? hhmm(d.firstIn) : '--:--'} – {d.lastOut ? hhmm(d.lastOut) : d.missingOut ? 'oubli' : '--:--'}</span>
        <Tag tone={d.status === 'PRESENT' ? 'ok' : d.status === 'LATE' ? 'warn' : d.status === 'ABSENT' ? (d.justified ? 'neutral' : 'danger') : 'neutral'}>
          {d.status === 'PRESENT' ? 'À l’heure' : d.status === 'LATE' ? `Retard ${d.minutesLate} min${d.justified ? ' · justifié' : ''}` : d.status === 'ABSENT' ? (d.justified ? 'Absence justifiée' : 'Absent') : 'À venir'}
        </Tag>
      </div>)}</div>}
  </Modal>;
}

function DashboardPage() {
  const { user } = useSession();
  const [period, setPeriod] = useState<Period>('week');
  const [reports, setReports] = useState<PersonReport[] | null>(null);
  const [days, setDays] = useState<AttendanceDay[] | null>(null);
  const [now, setNow] = useState<PresentNow[] | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const canSeeDays = user?.role === 'ADMIN' || user?.role === 'HR';

  useEffect(() => {
    let live = true;
    const { from, to } = range(period);
    setReports(null); setDays(null); setError('');
    api<PersonReport[]>('GET', `/reports/team?from=${from}&to=${to}`).then((r) => live && setReports(r)).catch((e: Error) => live && setError(e.message));
    if (canSeeDays) api<AttendanceDay[]>('GET', `/attendance?from=${from}&to=${to}`).then((d) => live && setDays(d)).catch(() => live && setDays([]));
    else setDays([]);
    return () => { live = false; };
  }, [period, canSeeDays]);
  useEffect(() => {
    api<PresentNow[]>('GET', '/presence/today').then(setNow).catch(() => setNow([]));
    if (canSeeDays) api<{ status: string }[]>('GET', '/justifications').then((j) => setPending(j.filter((x) => x.status === 'PENDING').length)).catch((e: unknown) => { if (!(e instanceof ApiError)) setPending(null); });
  }, [canSeeDays]);

  const team = reports?.filter((r) => r.expectedDays > 0) ?? [];
  const totals = team.reduce((t, r) => ({ exp: t.exp + r.expectedDays, pres: t.pres + r.presentDays, lateU: t.lateU + r.lateUnjustified, late: t.late + r.lateJustified + r.lateUnjustified, absU: t.absU + r.absentUnjustified }), { exp: 0, pres: 0, lateU: 0, late: 0, absU: 0 });
  const presentNow = now?.filter((p) => p.present) ?? [];
  const person = reports?.find((r) => r.userId === selected) ?? null;
  const { from, to } = range(period);

  return (
    <Page title="Tableau de bord" meta={`${period === 'week' ? 'Semaine en cours' : new Date().toLocaleDateString('fr', { month: 'long', year: 'numeric' })} · du ${short(from)} au ${short(to)}`}
      actions={<div className="segmented" role="group" aria-label="Période">
        <button type="button" aria-pressed={period === 'week'} onClick={() => setPeriod('week')}>Semaine</button>
        <button type="button" aria-pressed={period === 'month'} onClick={() => setPeriod('month')}>Mois</button>
      </div>}>
      {error && <Notice tone="danger">Impossible de charger le bilan : {error}</Notice>}

      <div className="stats">
        <Stat label="Présents maintenant" value={now ? <>{presentNow.length}<span className="muted" style={{ fontSize: 16 }}> / {now.length}</span></> : '–'} note="d’après le dernier pointage" accent />
        <Stat label="Taux de présence" value={reports ? `${pctOf(totals.pres, totals.exp)} %` : '–'} note={`${totals.pres} journées sur ${totals.exp} attendues`} />
        <Stat label="Retards" value={reports ? totals.late : '–'} note={`${totals.lateU} sans justification`} />
        <Stat label="Absences non justifiées" value={reports ? totals.absU : '–'} note={pending !== null ? `${pending} justification${pending > 1 ? 's' : ''} à traiter` : 'sur la période'} />
      </div>

      <div className="split">
        <Card title="Présence de l’équipe, jour par jour" meta={canSeeDays ? `${team.length} personnes` : undefined}>
          {!canSeeDays ? <Empty title="Détail réservé à l’administration et aux RH">Le bilan par personne reste disponible ci-dessous</Empty>
            : !days ? <Loading /> : <TeamChart days={days} />}
        </Card>
        <Card title="Présents maintenant" meta={now ? `${presentNow.length} sur ${now.length}` : undefined}>
          {!now ? <Loading /> : now.length === 0 ? <Empty title="Aucun compte actif" /> :
            <ul className="people">{[...now].sort((a, b) => Number(b.present) - Number(a.present) || a.fullName.localeCompare(b.fullName)).map((p) => <li key={p.userId}>
              <Avatar name={p.fullName} />
              <div><strong>{p.fullName}</strong><small>{p.present ? `Arrivé à ${hhmm(p.firstIn!)}` : p.lastPunchAt ? `Parti à ${hhmm(p.lastPunchAt)}` : 'Pas encore pointé'}</small></div>
              <span className={`presence-dot${p.present ? ' is-on' : ''}`} aria-label={p.present ? 'Présent' : 'Absent'} />
            </li>)}</ul>}
        </Card>
      </div>

      {person && days && <PersonPanel person={person} days={days} onClose={() => setSelected(null)} />}

      <Card title="Bilan par personne" meta="Cliquez sur une personne pour ouvrir sa fiche">
        {!reports ? <Loading /> : reports.length === 0 ? <Empty title="Aucune personne active" /> :
          <div className="table-scroll"><table>
            <thead><tr><th>Personne</th><th className="num-col">Présence</th><th className="num-col">Retards</th><th className="num-col">Absences</th><th className="num-col">Heures sup</th><th className="num-col">Tâches</th><th>Progression</th></tr></thead>
            <tbody>{reports.map((r) => <tr key={r.userId} className={`row-link${selected === r.userId ? ' is-selected' : ''}`} tabIndex={0} onClick={() => setSelected(r.userId)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(r.userId); } }} aria-selected={selected === r.userId}>
              <td><span style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Avatar name={r.fullName} />{r.fullName}</span></td>
              <td className="num-col">{r.expectedDays ? <>{r.presentDays}<span className="muted"> / {r.expectedDays}</span></> : <span className="muted">–</span>}</td>
              <td className="num-col">{r.lateJustified + r.lateUnjustified}{r.lateUnjustified > 0 && <span className="muted"> · {r.lateUnjustified} nj</span>}</td>
              <td className="num-col">{r.absentJustified + r.absentUnjustified}{r.absentUnjustified > 0 && <span className="muted"> · {r.absentUnjustified} nj</span>}</td>
              <td className={`num-col${r.overtimeMinutes === 0 ? ' muted' : ''}`}>{overtime(r.overtimeMinutes)}</td>
              <td className="num-col">{r.tasksDone}<span className="muted"> / {r.tasksPlanned}</span></td>
              <td><span className="progress"><span style={{ width: `${r.averageProgress}%` }} /></span><span className="mono muted" style={{ marginLeft: 8 }}>{r.averageProgress} %</span></td>
            </tr>)}</tbody>
          </table></div>}
        <small>nj : non justifiés. Les jours fériés et non travaillés ne comptent pas.</small>
      </Card>
    </Page>
  );
}
const feature: Feature = { path: 'dashboard', label: 'Tableau de bord', order: 60, roles: ['ADMIN', 'HR', 'COORDINATOR'], Component: DashboardPage };
export default feature;
