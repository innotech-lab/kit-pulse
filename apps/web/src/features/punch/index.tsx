// Alain. Pointage (WEB-PUNCH-001/002) : une seule action proposee, la suivante ; frise de la journee ; semaine en cours.
import { useCallback, useEffect, useState } from 'react';
import type { Attestation, AttendanceDay, Punch, PunchType } from '@kit-pulse/contracts';
import { api, ApiError } from '../../core/api.ts';
import type { Feature } from '../../core/feature.ts';
import { Clock, Button, Card, DayLine, DayScale, Empty, Loading, Notice, Page, Tag, minutesOf, useAutoRefresh } from '../../ui/components.tsx';

type Step = 'agent' | 'device' | 'network' | 'saved';
const STEPS: { key: Step; label: string }[] = [
  { key: 'agent', label: 'Agent du poste' }, { key: 'device', label: 'Poste approuvé' }, { key: 'network', label: 'Routeur KiT Hub' }, { key: 'saved', label: 'Enregistré' },
];

async function punch(type: PunchType, onStep: (s: Step) => void): Promise<Punch> {
  onStep('agent');
  const status = await api<{ publicKey: string }>('GET', '/__agent/status').catch(() => { throw new ApiError(0, 'AGENT_OFF', "L'agent KIT-Pulse ne répond pas sur ce poste. Démarrez-le puis réessayez."); });
  onStep('device');
  const device = await api<{ status: string }>('POST', '/devices/enroll', { body: { publicKey: status.publicKey, label: 'Poste de travail' } });
  if (device.status !== 'APPROVED') throw new ApiError(0, 'DEVICE_PENDING', "Poste enregistré. Un administrateur doit maintenant l'approuver.");
  onStep('network');
  const { nonce } = await api<{ nonce: string }>('POST', '/presence/challenge', { body: { type } });
  const proof = await api<{ attestation: Attestation; signature: string }>('POST', '/__agent/attest', { body: { nonce } });
  const p = await api<Punch>('POST', '/presence/punch', { body: proof });
  onStep('saved');
  return p;
}

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' });
const dayName = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('fr', { weekday: 'long', day: 'numeric' });
function weekBounds() {
  const d = new Date(); const wd = d.getDay() || 7;
  const mon = new Date(d); mon.setDate(d.getDate() - wd + 1);
  const fri = new Date(mon); fri.setDate(mon.getDate() + 4);
  const f = (x: Date) => x.toLocaleDateString('en-CA');
  return { from: f(mon), to: f(fri) };
}
const DAY_TAG: Record<AttendanceDay['status'], { tone: 'ok' | 'warn' | 'danger' | 'neutral' | 'accent'; label: string }> = {
  PRESENT: { tone: 'ok', label: 'Présent' }, LATE: { tone: 'warn', label: 'En retard' }, ABSENT: { tone: 'danger', label: 'Absent' },
  HOLIDAY: { tone: 'neutral', label: 'Férié' }, OFF: { tone: 'neutral', label: 'Non travaillé' }, PENDING: { tone: 'neutral', label: 'À venir' },
};

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { let t = 0; const tick = () => { setNow(new Date()); t = window.setTimeout(tick, 1000 - (Date.now() % 1000)); }; t = window.setTimeout(tick, 1000 - (Date.now() % 1000)); return () => window.clearTimeout(t); }, []);
  return now;
}

function PunchPage() {
  const now = useNow();
  const [today, setToday] = useState<{ workDate: string; punches: Punch[]; next: PunchType } | null>(null);
  const [week, setWeek] = useState<AttendanceDay[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<Step | null>(null);
  const [done, setDone] = useState<Punch | null>(null);

  const load = useCallback(() => {
    const { from, to } = weekBounds();
    api<{ workDate: string; punches: Punch[]; next: PunchType }>('GET', '/presence/me/today').then(setToday).catch((e: Error) => setError(e.message));
    api<AttendanceDay[]>('GET', `/attendance/me?from=${from}&to=${to}`).then(setWeek).catch(() => setWeek([]));
  }, []);
  useEffect(load, [load]);
  useAutoRefresh(load);

  async function go(type: PunchType) {
    setBusy(true); setError(''); setDone(null);
    try { setDone(await punch(type, setStep)); load(); } catch (e) { setError((e as Error).message); setStep(null); } finally { setBusy(false); }
  }

  const ins = today?.punches.filter((p) => p.type === 'IN') ?? [];
  const outs = today?.punches.filter((p) => p.type === 'OUT') ?? [];
  const firstIn = ins[0]?.at ?? null;
  const lastOut = today?.next === 'IN' && outs.length ? outs[outs.length - 1]!.at : null;
  const late = firstIn ? minutesOf(firstIn) > 8 * 60 + 10 : false;
  const next = today?.next ?? 'IN';
  const stepIndex = step ? STEPS.findIndex((s) => s.key === step) : -1;

  return (
    <Page title="Pointage" meta={now.toLocaleDateString('fr', { weekday: 'long', day: 'numeric', month: 'long' })}>
      <section className="card punch-hero">
        <div className="punch-top">
          <div>
            <div className="punch-clock num"><Clock now={now} /></div>
            <p className="muted">
              {!today ? 'Lecture de vos pointages…'
                : !firstIn ? 'Pas encore pointé aujourd’hui'
                : next === 'OUT' ? `Arrivé à ${hhmm(firstIn)}${late ? ` · ${minutesOf(firstIn) - 8 * 60} min de retard` : ' · à l’heure'}`
                : `Journée terminée à ${hhmm(lastOut ?? firstIn)}`}
            </p>
          </div>
          <div className="punch-action">
            <Button size="lg" icon={next === 'IN' ? 'login' : 'logout'} disabled={busy || !today} onClick={() => { void go(next); }}>
              {busy ? 'Vérification…' : next === 'IN' ? 'Pointer mon arrivée' : 'Pointer mon départ'}
            </Button>
            <small>La preuve vient du routeur KiT Hub, pas du nom du Wi-Fi</small>
          </div>
        </div>
        <div className="punch-ribbon">
          <DayLine firstIn={firstIn} lastOut={lastOut} late={late} now label="Ma journée" />
          <DayScale />
        </div>
        {(busy || done || step) && <ol className="punch-steps" aria-label="Étapes du pointage">
          {STEPS.map((s, i) => <li key={s.key} className={i < stepIndex || (done && i <= stepIndex) ? 'is-done' : i === stepIndex ? 'is-current' : ''}>{s.label}</li>)}
        </ol>}
        {done && <Notice tone="ok">{done.type === 'IN' ? 'Arrivée' : 'Départ'} enregistré à {hhmm(done.at)}{done.simulated ? ' · réseau simulé (développement)' : ''}</Notice>}
        {error && <Notice tone="danger">{error}</Notice>}
      </section>

      <div className="split">
        <Card title="Cette semaine" meta={week ? `${week.filter((d) => d.status === 'PRESENT' || d.status === 'LATE').length} jours pointés` : undefined}>
          {!week ? <Loading /> : week.length === 0 ? <Empty title="Aucune journée cette semaine" /> :
            <div className="week">{week.map((d) => <div key={d.workDate} className="week-row">
              <span className="week-day">{dayName(d.workDate)}</span>
              <DayLine early={d.minutesEarly} after={d.minutesAfter} firstIn={d.firstIn} lastOut={d.lastOut} late={d.status === 'LATE'} now={d.status === 'PENDING'} />
              <span className="week-times mono">{d.firstIn ? hhmm(d.firstIn) : '--:--'} – {d.lastOut ? hhmm(d.lastOut) : d.missingOut ? 'oubli' : '--:--'}</span>
              <Tag tone={DAY_TAG[d.status].tone}>{DAY_TAG[d.status].label}{d.status === 'LATE' ? ` ${d.minutesLate} min` : ''}</Tag>
            </div>)}</div>}
        </Card>
        <Card title="Pointages du jour" meta={today ? `${today.punches.length}` : undefined}>
          {!today ? <Loading /> : today.punches.length === 0 ? <Empty title="Aucun pointage aujourd’hui">Votre arrivée apparaîtra ici</Empty> :
            <ul className="feature-list">{today.punches.map((p) => <li key={p.id} className="punch-item">
              <span className="mono">{hhmm(p.at)}</span><span>{p.type === 'IN' ? 'Arrivée' : 'Départ'}</span>
              {p.source === 'MANUAL' ? <Tag tone="accent">Correction RH</Tag> : p.simulated ? <Tag>Simulé</Tag> : <Tag tone="ok">Routeur vérifié</Tag>}
            </li>)}</ul>}
        </Card>
      </div>
    </Page>
  );
}
const feature: Feature = { path: 'pointage', label: 'Pointage', order: 10, roles: ['HR', 'COORDINATOR', 'MEMBER'], Component: PunchPage };
export default feature;
