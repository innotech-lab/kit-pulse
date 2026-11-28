// Alain. Pointage (WEB-PUNCH-001/002) : une seule action proposee, la suivante ; frise de la journee ; semaine en cours.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Attestation, AttendanceDay, Punch, PunchType } from '@kit-pulse/contracts';
import { api } from '../../core/api.ts';
import { defaultDeviceLabel, proveDevice } from '../../core/device.ts';
import { useSession } from '../../core/session.tsx';
import type { Feature } from '../../core/feature.ts';
import { Clock, Button, Card, DayLine, DayScale, Empty, Loading, Notice, Page, Tag, minutesOf, useAutoRefresh } from '../../ui/components.tsx';

type Step = 'device' | 'geo' | 'send' | 'saved';
const STEPS: { key: Step; label: string }[] = [
  { key: 'device', label: 'Appareil reconnu' }, { key: 'geo', label: 'Position' }, { key: 'send', label: 'Envoi' }, { key: 'saved', label: 'Enregistré' },
];

/** Position du navigateur ; jamais bloquante : refus ou panne = signale a la RH. */
function locate(): Promise<{ geo: { lat: number; lng: number; accuracy: number } | null; geoError: 'DENIED' | 'UNAVAILABLE' | null }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve({ geo: null, geoError: 'UNAVAILABLE' }); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ geo: { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }, geoError: null }),
      (err) => resolve({ geo: null, geoError: err.code === err.PERMISSION_DENIED ? 'DENIED' : 'UNAVAILABLE' }),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
    );
  });
}

/** Pointage sans agent : appareil (cle du navigateur), position, photo ; la RH valide l'arrivee. */
async function punch(type: PunchType, onStep: (s: Step) => void, photo: string | null, owner: string, frames: string[] = []): Promise<Punch> {
  onStep('device');
  const { nonce } = await api<{ nonce: string }>('POST', '/presence/challenge', { body: { type } });
  const proof = await proveDevice(nonce, defaultDeviceLabel(owner)).catch(() => ({ keyId: null, signature: null, fingerprint: null, privateMode: null }));
  onStep('geo');
  const where = await locate();
  onStep('send');
  const p = await api<Punch>('POST', '/presence/web-punch', { body: {
    type, nonce, deviceKeyId: proof.keyId, deviceSignature: proof.signature, fingerprint: proof.fingerprint, privateMode: proof.privateMode,
    geo: where.geo, geoError: where.geoError, photo: type === 'IN' ? photo : null, livenessFrames: type === 'IN' ? frames : [],
  } });
  onStep('saved');
  return p;
}

type CamState = 'off' | 'asking' | 'ready' | 'denied' | 'missing';
/** Webcam pour la photo d'arrivee. Rien n'est enregistre tant que l'on ne pointe pas. */
function useCamera(active: boolean) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CamState>('off');
  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) { setState('missing'); return; }
    setState('asking');
    try {
      const st = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false });
      stream.current = st;
      if (video.current) { video.current.srcObject = st; await video.current.play().catch(() => {}); }
      setState('ready');
    } catch (e) {
      const name = (e as DOMException).name;
      setState(name === 'NotFoundError' || name === 'OverconstrainedError' ? 'missing' : 'denied');
    }
  }, []);
  useEffect(() => {
    if (!active) return;
    void start();
    return () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; setState('off'); };
  }, [active, start]);
  /** Image JPEG de 480 px de large, compressee (environ 30 a 60 Ko). */
  const capture = (w = 480, quality = 0.72) => {
    const v = video.current;
    if (!v || state !== 'ready' || !v.videoWidth) return null;
    const h = Math.round((v.videoHeight / v.videoWidth) * w);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d')!.drawImage(v, 0, 0, w, h);
    return c.toDataURL('image/jpeg', quality);
  };
  return { video, state, capture, retry: start };
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
  const { user } = useSession();
  const now = useNow();
  const [today, setToday] = useState<{ workDate: string; punches: Punch[]; next: PunchType } | null>(null);
  const [week, setWeek] = useState<AttendanceDay[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);
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
    const photo = type === 'IN' ? cam.capture() : null;
    if (type === 'IN' && !photo) { setError('La photo n’a pas pu être prise. Autorisez la webcam, puis réessayez.'); setBusy(false); return; }
    // Controle du vivant : quelques images pendant que la personne tourne la tete.
    const frames: string[] = [];
    if (type === 'IN') {
      setLive(true);
      for (let i = 0; i < 4; i++) { await new Promise((res) => setTimeout(res, 500)); const f = cam.capture(320, 0.6); if (f) frames.push(f); }
      setLive(false);
    }
    try { setDone(await punch(type, setStep, photo, user?.fullName ?? 'moi', frames)); load(); } catch (e) { setError((e as Error).message); setStep(null); } finally { setBusy(false); }
  }

  const valid = today?.punches.filter((p) => p.reviewStatus !== 'REJECTED') ?? [];
  const ins = valid.filter((p) => p.type === 'IN');
  const outs = valid.filter((p) => p.type === 'OUT');
  const firstIn = ins[0]?.at ?? null;
  const lastOut = today?.next === 'IN' && outs.length ? outs[outs.length - 1]!.at : null;
  const late = firstIn ? minutesOf(firstIn) > 8 * 60 + 10 : false;
  const next = today?.next ?? 'IN';
  const cam = useCamera(!!today && next === 'IN');
  const camBlocked = next === 'IN' && cam.state !== 'ready';
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
            {next === 'IN' && today && <div className={`punch-cam is-${cam.state}`}>
              <video ref={cam.video} muted playsInline aria-label="Aperçu de la webcam" />
              {live && <span className="punch-cam-live">Tournez légèrement la tête à gauche, puis à droite</span>}
              {cam.state !== 'ready' && <span className="punch-cam-msg">{cam.state === 'asking' || cam.state === 'off' ? 'Ouverture de la webcam…' : cam.state === 'missing' ? 'Aucune webcam détectée' : 'Webcam bloquée'}</span>}
            </div>}
            <Button size="lg" icon={next === 'IN' ? 'login' : 'logout'} disabled={busy || !today || camBlocked} onClick={() => { void go(next); }}>
              {busy ? 'Vérification…' : next === 'IN' ? 'Pointer mon arrivée' : 'Pointer mon départ'}
            </Button>
            <small>{next === 'IN' ? 'Photo prise au pointage, vue par les RH, supprimée après 7 jours' : 'Appareil et position vérifiés au départ'}</small>
          </div>
        </div>
        <div className="punch-ribbon">
          <DayLine firstIn={firstIn} lastOut={lastOut} late={late} now label="Ma journée" />
          <DayScale />
        </div>
        {(busy || done || step) && <ol className="punch-steps" aria-label="Étapes du pointage">
          {STEPS.map((s, i) => <li key={s.key} className={i < stepIndex || (done && i <= stepIndex) ? 'is-done' : i === stepIndex ? 'is-current' : ''}>{s.label}</li>)}
        </ol>}
        {next === 'IN' && (cam.state === 'denied' || cam.state === 'missing') && <Notice tone="warn">
          {cam.state === 'denied'
            ? <>La webcam est bloquée pour ce site. Cliquez sur l’icône de caméra (ou le cadenas) à gauche de l’adresse, choisissez « Autoriser », puis <button type="button" className="link-btn" onClick={() => void cam.retry()}>réessayez</button>.</>
            : <>Aucune webcam n’est détectée. Branchez-en une ou vérifiez qu’aucune autre application ne l’utilise, puis <button type="button" className="link-btn" onClick={() => void cam.retry()}>réessayez</button>.</>}
        </Notice>}
        {done && <Notice tone="ok">{done.type === 'IN' ? 'Arrivée' : 'Départ'} enregistré à {hhmm(done.at)}{done.type === 'IN' ? ' · en attente de validation par les RH' : ''}</Notice>}
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
              {p.reviewStatus === 'REJECTED' ? <Tag tone="danger">Refusée par les RH</Tag> : p.reviewStatus === 'PENDING' ? <Tag tone="warn">À valider par les RH</Tag>
                : p.source === 'MANUAL' ? <Tag tone="accent">Correction RH</Tag> : p.simulated ? <Tag>Simulé</Tag> : <Tag tone="ok">Routeur vérifié</Tag>}
              {p.reviewStatus === 'REJECTED' && p.reviewNote && <small style={{ gridColumn: '1 / -1' }}>Motif : {p.reviewNote}</small>}
            </li>)}</ul>}
        </Card>
      </div>
    </Page>
  );
}
const feature: Feature = { path: 'pointage', label: 'Pointage', order: 10, roles: ['HR', 'COORDINATOR', 'MEMBER'], Component: PunchPage };
export default feature;
