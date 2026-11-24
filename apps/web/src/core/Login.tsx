// Alain (logique), Francis (validation visuelle).
import { useState, type FormEvent } from 'react';
import { Button, Card, Field } from '../ui/components.tsx';
import { useSession } from './session.tsx';
export function Login() {
  const { login } = useSession();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError('');
    try { await login(String(f.get('email')), String(f.get('password'))); } catch (err) { setError((err as Error).message); setBusy(false); }
  }
  return (
    <main className="center">
      <Card>
        <img src="/kithub.png" alt="KiT Hub" width="220" />
        <h1>KIT-Pulse</h1>
        <form onSubmit={submit}>
          <Field label="Email" name="email" type="email" autoComplete="username" required />
          <Field label="Mot de passe" name="password" type="password" autoComplete="current-password" required />
          {error && <p role="alert" className="error">{error}</p>}
          <Button type="submit" disabled={busy}>{busy ? 'Connexion...' : 'Se connecter'}</Button>
        </form>
      </Card>
    </main>
  );
}
