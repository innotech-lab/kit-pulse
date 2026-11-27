// Alain (logique), Francis (validation visuelle).
import { useEffect, useState, type FormEvent } from 'react';
import { Button, Clock, DayLine, DayScale, Field, useSecondClock } from '../ui/components.tsx';
import { api } from './api.ts';
import { useSession } from './session.tsx';

const useClock = useSecondClock;
interface ScheduleDay { weekday: number; startTime: string; endTime: string; graceMinutes: number }
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const FALLBACK: ScheduleDay = { weekday: 1, startTime: '08:00', endTime: '17:00', graceMinutes: 10 };
/** Horaire reel (base de donnees) du jour, ou du premier jour travaille ; valeur par defaut si l'API ne repond pas. */
function useSchedule(weekday: number): ScheduleDay {
  const [days, setDays] = useState<ScheduleDay[]>([]);
  useEffect(() => { api<ScheduleDay[]>('GET', '/attendance/schedule').then(setDays).catch(() => {}); }, []);
  return days.find((d) => d.weekday === weekday) ?? days[0] ?? FALLBACK;
}

export function Login() {
  const { login } = useSession();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const now = useClock();
  const sched = useSchedule(now.getDay() || 7);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError('');
    try { await login(String(f.get('email')), String(f.get('password'))); } catch (err) { setError((err as Error).message); setBusy(false); }
  }
  return (
    <main className="center">
      <div className="login">
        <div className="login-form">
          <img src="/kithub.png" alt="KiT Hub" />
          <div style={{ display: 'grid', gap: 8 }}>
            <h1>Connexion à KIT-Pulse</h1>
            <p className="muted">Pointage, tâches et présences de l’équipe KiT Hub</p>
          </div>
          <form onSubmit={submit}>
            <Field label="Email" name="email" type="email" autoComplete="username" placeholder="prenom@kitpulse.local" required />
            <Field label="Mot de passe" name="password" type="password" autoComplete="current-password" required />
            {error && <p role="alert" className="error">{error}</p>}
            <Button type="submit" disabled={busy} icon="login">{busy ? 'Connexion…' : 'Se connecter'}</Button>
          </form>
        </div>
        <div className="login-side" aria-hidden="true">
          <div style={{ display: 'grid', gap: 8 }}>
            <span className="mono" style={{ color: 'var(--n-400)' }}>{now.toLocaleDateString('fr', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            <Clock now={now} className="clock" />
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            <DayLine firstIn={null} lastOut={null} now label="Journée de travail" work={[toMin(sched.startTime), toMin(sched.endTime)]} />
            <DayScale />
            <p>Journée de {sched.startTime} à {sched.endTime}, tolérance de {sched.graceMinutes} minute{sched.graceMinutes > 1 ? 's' : ''} à l’arrivée</p>
          </div>
        </div>
      </div>
    </main>
  );
}
