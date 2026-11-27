// Alain (logique), Francis (validation visuelle).
import { useEffect, useState, type FormEvent } from 'react';
import { Button, DayLine, DayScale, Field } from '../ui/components.tsx';
import { useSession } from './session.tsx';

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 15_000); return () => clearInterval(t); }, []);
  return now;
}

export function Login() {
  const { login } = useSession();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const now = useClock();
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
            <span className="clock">{now.toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            <DayLine firstIn={null} lastOut={null} now label="Journée de travail" />
            <DayScale />
            <p>Journée de 08:00 à 17:00, tolérance de 10 minutes à l’arrivée</p>
          </div>
        </div>
      </div>
    </main>
  );
}
