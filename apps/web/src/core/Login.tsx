// Alain (logique), Francis (validation visuelle).
// Ecran de connexion : a gauche l'horloge de pointage du KiT Hub (heure, etat de la journee, frise reelle),
// a droite le formulaire. Les horaires et la tolerance viennent de la base.
import { useEffect, useState, type FormEvent } from 'react';
import { Button, Clock, Field, Icon, useSecondClock } from '../ui/components.tsx';
import { api } from './api.ts';
import { useSession } from './session.tsx';

interface ScheduleDay { weekday: number; startTime: string; endTime: string; graceMinutes: number }
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const hm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const span = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`);
const FALLBACK: ScheduleDay[] = [1, 2, 3, 4, 5].map((weekday) => ({ weekday, startTime: '08:00', endTime: '17:00', graceMinutes: 10 }));

/** Horaires reels (base de donnees) ; valeurs par defaut si l'API ne repond pas. */
function useSchedule(): ScheduleDay[] {
  const [days, setDays] = useState<ScheduleDay[] | null>(null);
  useEffect(() => { api<ScheduleDay[]>('GET', '/attendance/schedule').then(setDays).catch(() => setDays(null)); }, []);
  return days && days.length ? days : FALLBACK;
}

/** Ou en est la journee, en une phrase. */
function dayState(now: Date, today: ScheduleDay | undefined): { tone: 'calm' | 'go' | 'grace' | 'done'; text: string } {
  if (!today) return { tone: 'calm', text: 'Jour non travaillé' };
  const m = now.getHours() * 60 + now.getMinutes(), start = toMin(today.startTime), end = toMin(today.endTime), limit = start + today.graceMinutes;
  if (m < start) return { tone: 'calm', text: `La journée commence à ${today.startTime} · à l’heure jusqu’à ${hm(limit)}` };
  if (m <= limit) return { tone: 'grace', text: `Arrivée à l’heure jusqu’à ${hm(limit)} · encore ${span(limit - m)}` };
  if (m < end) return { tone: 'go', text: `Journée en cours · fin à ${today.endTime}, dans ${span(end - m)}` };
  return { tone: 'done', text: `Journée terminée depuis ${today.endTime}` };
}

const RIBBON_START = 6 * 60, RIBBON_END = 20 * 60;
const pos = (m: number) => `${Math.min(100, Math.max(0, ((m - RIBBON_START) / (RIBBON_END - RIBBON_START)) * 100))}%`;

export function Login() {
  const { login } = useSession();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const now = useSecondClock();
  const schedule = useSchedule();
  const today = schedule.find((d) => d.weekday === (now.getDay() || 7));
  const ref = today ?? schedule[0]!;
  const start = toMin(ref.startTime), end = toMin(ref.endTime), limit = start + ref.graceMinutes;
  const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const state = dayState(now, today);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError('');
    try { await login(String(f.get('email')), String(f.get('password'))); } catch (err) { setError((err as Error).message); setBusy(false); }
  }

  return (
    <main className="auth">
      <section className="auth-time" aria-label="Horloge du KiT Hub">
        <header className="auth-brand">
          <span className="auth-word">KIT-Pulse</span>
          <span className="auth-live"><span className="auth-live-dot" aria-hidden="true" />En service</span>
        </header>

        <div className="auth-clock">
          <p className="auth-date">{now.toLocaleDateString('fr', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <Clock now={now} className="auth-clock-face" />
          <p className={`auth-state is-${state.tone}`}>{state.text}</p>
        </div>

        <div className="auth-ribbon" aria-hidden="true">
          <div className="auth-track">
            <span className="auth-work" style={{ left: pos(start), width: `calc(${pos(end)} - ${pos(start)})` }} />
            <span className="auth-grace" style={{ left: pos(start), width: `calc(${pos(limit)} - ${pos(start)})` }} />
            {today && nowMin >= RIBBON_START && nowMin <= RIBBON_END && <span className="auth-now" style={{ left: pos(nowMin) }} />}
          </div>
          <div className="auth-scale">{[start, 12 * 60, end].map((m) => <span key={m} style={{ left: pos(m) }}>{hm(m)}</span>)}</div>
          <ul className="auth-legend">
            <li><span className="k-work" />Plage de travail {ref.startTime} – {ref.endTime}</li>
            <li><span className="k-grace" />Tolérance {ref.graceMinutes} min</li>
            <li><span className="k-now" />Maintenant</li>
          </ul>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-form">
          <img src="/kithub.png" alt="KiT Hub" className="auth-logo" />
          <div className="auth-title">
            <h1>Connexion</h1>
            <p>Pointage, tâches et présences de l’équipe KiT Hub</p>
          </div>
          <form onSubmit={submit}>
            <Field label="Adresse e-mail" name="email" type="email" autoComplete="username" placeholder="prenom.nom@kit-hub.com" required />
            <Field label="Mot de passe" name="password" type="password" autoComplete="current-password" required />
            {error && <p role="alert" className="error">{error}</p>}
            <Button type="submit" size="lg" disabled={busy} icon="login">{busy ? 'Connexion…' : 'Se connecter'}</Button>
          </form>
          <p className="auth-help"><Icon name="info" size={16} />Mot de passe oublié ? Demandez une réinitialisation à l’administration.</p>
        </div>
        <footer className="auth-foot">KiT Hub · Knowledge and Impact Trade</footer>
      </section>
    </main>
  );
}
