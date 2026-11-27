// Francis. Tableau de bord equipe (WEB-DASH-001) et vue d'une personne (WEB-DASH-002).
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AttendanceDay, PersonReport } from '@kit-pulse/contracts';
import { api, ApiError } from '../../core/api.ts';
import type { Feature } from '../../core/feature.ts';
import { useSession } from '../../core/session.tsx';
import { Avatar, Button, Card, IconButton, Modal, DayLine, Empty, Loading, Notice, Page, Stat, Tag, useAutoRefresh } from '../../ui/components.tsx';

type Period = 'day' | 'week' | 'month' | 'recap';
interface PresentNow { userId: number; fullName: string; present: boolean; firstIn: string | null; lastPunchAt: string | null }

const iso = (d: Date) => d.toLocaleDateString('en-CA');
/** La periode affichee est celle qui contient la date d'ancrage ; elle ne depasse jamais aujourd'hui. */
function range(p: Period, anchor: string) {
  const a = new Date(`${anchor}T12:00:00`), today = iso(new Date());
  const cap = (d: string) => (d > today ? today : d);
  if (p === 'day') return { from: anchor, to: anchor };
  if (p === 'week') { const mon = new Date(a); mon.setDate(a.getDate() - ((a.getDay() + 6) % 7)); const sun = new Date(mon); sun.setDate(mon.getDate() + 6); return { from: iso(mon), to: cap(iso(sun)) }; }
  return { from: iso(new Date(a.getFullYear(), a.getMonth(), 1)), to: cap(iso(new Date(a.getFullYear(), a.getMonth() + 1, 0))) };
}
const monthLabel = (d: string) => { const l = new Date(`${d}T12:00:00`).toLocaleDateString('fr', { month: 'long', year: 'numeric' }); return l.charAt(0).toUpperCase() + l.slice(1); };
const fmtMinutes = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`);
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

/** Recap : un bilan equipe par mois, puis la presence de chaque personne mois par mois. */
function MonthlyRecap({ count, onOpenMonth }: { count: number; onOpenMonth: (firstDay: string) => void }) {
  const [rows, setRows] = useState<{ month: string; reports: PersonReport[] }[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true; setRows(null); setError('');
    const t = new Date();
    const months = Array.from({ length: count }, (_, i) => iso(new Date(t.getFullYear(), t.getMonth() - i, 1)));
    Promise.all(months.map((m) => { const { from, to } = range('month', m); return api<PersonReport[]>('GET', `/reports/team?from=${from}&to=${to}`).then((reports) => ({ month: m, reports })); }))
      .then((res) => { if (live) setRows(res); }).catch((e: Error) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [count]);
  if (error) return <Notice tone="danger">Impossible de charger le récapitulatif : {error}</Notice>;
  if (!rows) return <Card><Loading /></Card>;
  const sum = (rs: PersonReport[], k: keyof PersonReport) => rs.reduce((n, x) => n + (x[k] as number), 0);
  const people = [...new Map(rows.flatMap((x) => x.reports).map((x) => [x.userId, x.fullName])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const chrono = [...rows].reverse();
  return <>
    <Card title="Bilan de l’équipe, mois par mois" meta="Cliquez sur un mois pour l’ouvrir en détail">
      <div className="table-scroll"><table>
        <thead><tr><th>Mois</th><th>Présence</th><th className="num-col">Journées</th><th className="num-col">Retards</th><th className="num-col">Absences</th><th className="num-col">Heures sup</th><th className="num-col">Tâches</th></tr></thead>
        <tbody>{rows.map(({ month, reports }) => {
          const exp = sum(reports, 'expectedDays'), pres = sum(reports, 'presentDays'), lateU = sum(reports, 'lateUnjustified'), late = lateU + sum(reports, 'lateJustified'), absU = sum(reports, 'absentUnjustified'), abs = absU + sum(reports, 'absentJustified'), pct = pctOf(pres, exp);
          return <tr key={month} className="row-link" tabIndex={0} onClick={() => onOpenMonth(month)} onKeyDown={(e) => { if (e.key === 'Enter') onOpenMonth(month); }}>
            <td style={{ textTransform: 'capitalize', fontWeight: 500 }}>{monthLabel(month)}</td>
            <td>{exp ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span className="progress"><span style={{ width: `${pct}%` }} /></span><span className="mono">{pct} %</span></span> : <span className="muted">Aucune journée</span>}</td>
            <td className="num-col">{pres}<span className="muted"> / {exp}</span></td>
            <td className="num-col">{late}{lateU > 0 && <span className="muted"> · {lateU} nj</span>}</td>
            <td className="num-col">{abs}{absU > 0 && <span className="muted"> · {absU} nj</span>}</td>
            <td className="num-col">{fmtMinutes(sum(reports, 'overtimeMinutes'))}</td>
            <td className="num-col">{sum(reports, 'tasksDone')}<span className="muted"> / {sum(reports, 'tasksPlanned')}</span></td>
          </tr>;
        })}</tbody>
      </table></div>
      <small>nj : non justifiés. Le mois en cours s’arrête à aujourd’hui.</small>
    </Card>
    <Card title="Présence de chaque personne, mois par mois" meta="Taux de présence et nombre de retards ou absences non justifiés">
      <div className="table-scroll"><table>
        <thead><tr><th>Personne</th>{chrono.map(({ month }) => <th key={month} className="num-col" style={{ textTransform: 'capitalize' }}>{new Date(`${month}T12:00:00`).toLocaleDateString('fr', { month: 'short', year: '2-digit' }).replace('.', '')}</th>)}</tr></thead>
        <tbody>{people.map(([id, name]) => <tr key={id}><td style={{ whiteSpace: 'nowrap' }}>{name}</td>{chrono.map(({ month, reports }) => {
          const x = reports.find((q) => q.userId === id);
          if (!x || !x.expectedDays) return <td key={month} className="num-col muted">–</td>;
          const pct = pctOf(x.presentDays, x.expectedDays), issues = x.lateUnjustified + x.absentUnjustified;
          return <td key={month} className="num-col"><span className={`recap-cell${pct >= 90 ? ' is-good' : pct < 60 ? ' is-low' : ''}`} title={`${x.presentDays} jours sur ${x.expectedDays} · ${x.lateUnjustified} retards et ${x.absentUnjustified} absences non justifiés`}>{pct} %</span>{issues > 0 && <small style={{ display: 'block' }}>{issues} nj</small>}</td>;
        })}</tr>)}</tbody>
      </table></div>
    </Card>
  </>;
}

function DashboardPage() {
  const { user } = useSession();
  const [period, setPeriod] = useState<Period>('day');
  const [day, setDay] = useState(() => iso(new Date()));
  const lastToday = useRef(iso(new Date()));
  const [updated, setUpdated] = useState<Date | null>(null);
  const [detail, setDetail] = useState<'present' | 'late' | 'absent' | null>(null);
  const [reports, setReports] = useState<PersonReport[] | null>(null);
  const [days, setDays] = useState<AttendanceDay[] | null>(null);
  const [now, setNow] = useState<PresentNow[] | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [recapMonths, setRecapMonths] = useState(6);
  const canSeeDays = user?.role === 'ADMIN' || user?.role === 'HR';
  const [tick, setTick] = useState(0);
  const shownKey = useRef('');
  useAutoRefresh(() => setTick((t) => t + 1), undefined, false);

  useEffect(() => {
    let live = true;
    const { from, to } = range(period, day);
    const key = `${period}|${day}|${canSeeDays}`;
    if (shownKey.current !== key) { shownKey.current = key; setReports(null); setDays(null); }
    setError('');
    const refresh = () => {
      api<PersonReport[]>('GET', `/reports/team?from=${from}&to=${to}`).then((r) => { if (live) { setReports(r); setUpdated(new Date()); } }).catch((e: Error) => { if (live) setError(e.message); });
      if (canSeeDays) api<AttendanceDay[]>('GET', `/attendance?from=${from}&to=${to}`).then((d) => { if (live) setDays(d); }).catch((e: Error) => { if (live) setError(e.message); });
      else setDays([]);
    };
    refresh();
    const timer = window.setInterval(() => { if (period === 'day' && day === iso(new Date())) refresh(); }, 60_000);
    return () => { live = false; window.clearInterval(timer); };
  }, [period, day, canSeeDays, tick]);
  useEffect(() => {
    let live = true;
    const refresh = () => {
      const today = iso(new Date());
      if (today !== lastToday.current) { const previous = lastToday.current; lastToday.current = today; setDay((value) => value === previous ? today : value); }
      api<PresentNow[]>('GET', '/presence/today').then((value) => { if (live) { setNow(value); setUpdated(new Date()); } }).catch((e: Error) => { if (live) setError(e.message); });
    };
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    if (canSeeDays) api<{ status: string }[]>('GET', '/justifications').then((j) => setPending(j.filter((x) => x.status === 'PENDING').length)).catch((e: unknown) => { if (!(e instanceof ApiError)) setPending(null); });
    return () => { live = false; window.clearInterval(timer); };
  }, [canSeeDays, tick]);

  const team = reports?.filter((r) => r.expectedDays > 0) ?? [];
  const totals = team.reduce((t, r) => ({ exp: t.exp + r.expectedDays, pres: t.pres + r.presentDays, lateU: t.lateU + r.lateUnjustified, late: t.late + r.lateJustified + r.lateUnjustified, absU: t.absU + r.absentUnjustified }), { exp: 0, pres: 0, lateU: 0, late: 0, absU: 0 });
  const presentNow = now?.filter((p) => p.present) ?? [];
  const person = reports?.find((r) => r.userId === selected) ?? null;
  const { from, to } = range(period, day);
  const names = new Map(reports?.map((r) => [r.userId, r.fullName]) ?? []);
  const detailDays = (days ?? []).filter((d) => detail === 'late' ? d.status === 'LATE' : d.status === 'ABSENT' && !d.justified).sort((a, b) => b.workDate.localeCompare(a.workDate));
  const todayIso = iso(new Date());
  const move = (offset: number) => {
    const d = new Date(`${day}T12:00:00`);
    if (period === 'month') { d.setDate(1); d.setMonth(d.getMonth() + offset); } else d.setDate(d.getDate() + offset * (period === 'week' ? 7 : 1));
    const next = iso(d); setDay(next > todayIso ? todayIso : next);
  };
  const atPresent = to >= todayIso;
  const unit = period === 'day' ? 'Jour' : period === 'week' ? 'Semaine' : 'Mois';
  const fem = period === 'week' ? 'e' : '';
  const periodLabel = period === 'day' ? new Date(`${day}T12:00:00`).toLocaleDateString('fr', { weekday: 'long', day: 'numeric', month: 'long' })
    : period === 'week' ? `Semaine du ${short(from)} au ${short(to)}` : period === 'month' ? `${monthLabel(from)} · du ${short(from)} au ${short(to)}` : `Les ${recapMonths} derniers mois`;

  return (
    <Page title="Tableau de bord" meta={<><span>{periodLabel}</span>{period !== 'recap' && updated && <> · <small>Mis à jour à {hhmm(updated.toISOString())}</small></>}</>}
      actions={<><div className="segmented" role="group" aria-label="Période">
        <button type="button" aria-pressed={period === 'day'} onClick={() => setPeriod('day')}>Jour</button>
        <button type="button" aria-pressed={period === 'week'} onClick={() => setPeriod('week')}>Semaine</button>
        <button type="button" aria-pressed={period === 'month'} onClick={() => setPeriod('month')}>Mois</button>
        <button type="button" aria-pressed={period === 'recap'} onClick={() => setPeriod('recap')}>Récap</button>
      </div>{period === 'recap'
        ? <div className="segmented" role="group" aria-label="Nombre de mois">{[6, 12].map((n) => <button key={n} type="button" aria-pressed={recapMonths === n} onClick={() => setRecapMonths(n)}>{n} mois</button>)}</div>
        : <div className="week-nav"><IconButton icon="chevronLeft" label={`${unit} précédent${fem}`} onClick={() => move(-1)} /><Button size="sm" variant="secondary" disabled={atPresent && (period !== 'day' || day === todayIso)} onClick={() => setDay(todayIso)}>{period === 'day' ? 'Aujourd’hui' : period === 'week' ? 'Cette semaine' : 'Ce mois-ci'}</Button><IconButton icon="chevronRight" label={`${unit} suivant${fem}`} disabled={atPresent} onClick={() => move(1)} /></div>}</>}>
      {error && <Notice tone="danger">Impossible de charger le bilan : {error}</Notice>}

      {period === 'recap' ? <MonthlyRecap count={recapMonths} onOpenMonth={(m) => { setDay(m); setPeriod('month'); }} /> : <>
      <div className="stats">
        <Stat label="Présents maintenant" value={now ? <>{presentNow.length}<span className="muted" style={{ fontSize: 16 }}> / {now.length}</span></> : '–'} note="d’après le dernier pointage" accent onClick={() => setDetail('present')} />
        <Stat label="Taux de présence" value={reports ? `${pctOf(totals.pres, totals.exp)} %` : '–'} note={`${totals.pres} journées sur ${totals.exp} attendues`} />
        <Stat label="Retards" value={reports ? totals.late : '–'} note={`${totals.lateU} sans justification`} onClick={canSeeDays ? () => setDetail('late') : undefined} />
        <Stat label="Absences non justifiées" value={reports ? totals.absU : '–'} note={pending !== null ? `${pending} justification${pending > 1 ? 's' : ''} à traiter` : 'sur la période'} onClick={canSeeDays ? () => setDetail('absent') : undefined} />
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
      <Modal open={detail !== null} size="lg" dismissible onClose={() => setDetail(null)} title={detail === 'present' ? 'Présents maintenant' : detail === 'late' ? 'Retards' : 'Absences non justifiées'} meta={detail === 'present' ? 'D’après le dernier pointage' : `Du ${short(from)} au ${short(to)}`}>
        {detail === 'present' ? !now ? <Loading /> : now.length === 0 ? <Empty title="Aucun compte actif" /> : <>
          {presentNow.length === 0 && <Empty title="Aucune personne présente actuellement" />}
          <ul className="people">{[...now].sort((a, b) => Number(b.present) - Number(a.present) || a.fullName.localeCompare(b.fullName)).map((p) => <li key={p.userId} className={p.present ? undefined : 'muted'}><Avatar name={p.fullName} /><div><strong>{p.fullName}</strong><small>{p.present ? (p.firstIn ? `Arrivé à ${hhmm(p.firstIn)}` : 'Présent') : p.lastPunchAt ? `Parti à ${hhmm(p.lastPunchAt)}` : 'Absent actuellement'}</small></div></li>)}</ul>
        </> : !days || !reports ? <Loading /> : detailDays.length === 0 ? <Empty title={detail === 'late' ? 'Aucun retard sur cette période' : 'Aucune absence non justifiée sur cette période'} /> : <ul className="feature-list">{detailDays.map((d) => <li key={`${d.userId}-${d.workDate}`}><div className="feature-actions"><Avatar name={names.get(d.userId) ?? `Compte ${d.userId}`} /><strong>{names.get(d.userId) ?? `Compte ${d.userId}`}</strong><span>{short(d.workDate)}</span>{detail === 'late' ? <><span>{d.minutesLate} min</span><Tag tone={d.justified ? 'ok' : 'warn'}>{d.justified ? 'Justifié' : 'Non justifié'}</Tag></> : d.justificationStatus === 'PENDING' && <Tag tone="accent">Justification en attente</Tag>}</div></li>)}</ul>}
      </Modal>

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
      </>}
    </Page>
  );
}
const feature: Feature = { path: 'dashboard', label: 'Tableau de bord', order: 60, roles: ['ADMIN', 'HR', 'COORDINATOR'], Component: DashboardPage };
export default feature;
