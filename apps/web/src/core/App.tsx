// GELE : Alain.
import { useEffect, useState, type FormEvent } from 'react';
import type { User } from '@kit-pulse/contracts';
import { Button, Field, Notice } from '../ui/components.tsx';
import { api } from './api.ts';
import { Layout } from '../ui/Layout.tsx';
import { Login } from './Login.tsx';
import { FEATURES } from './feature.ts';
import { SessionProvider, useSession } from './session.tsx';
function ChangePassword() {
  const { setUser, logout } = useSession();
  const [current, setCurrent] = useState(''), [next, setNext] = useState(''), [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const strength = next.length < 10 ? 'Trop court' : next.length >= 14 && /[A-Z]/.test(next) && /[0-9]/.test(next) && /[^a-zA-Z0-9]/.test(next) ? 'Fort' : 'Correct';
  async function submit(e: FormEvent) {
    e.preventDefault(); setError('');
    if (next !== confirmation) { setError('Les mots de passe ne correspondent pas.'); return; }
    setBusy(true);
    try { setUser(await api<User>('POST', '/auth/change-password', { body: { current, next } })); }
    catch (e) { setError(e instanceof Error ? e.message : 'Enregistrement impossible'); } finally { setBusy(false); }
  }
  return <main className="center"><div className="login"><div className="login-form"><img src="/kithub.png" alt="KiT Hub" /><div><h1>Choisir un nouveau mot de passe</h1><p className="muted">Modifiez votre mot de passe temporaire pour accéder à votre compte</p></div><form onSubmit={(e) => void submit(e)}><Field label="Mot de passe temporaire" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} /><Field label="Nouveau mot de passe" type="password" autoComplete="new-password" minLength={10} maxLength={128} required value={next} onChange={(e) => setNext(e.target.value)} hint={`Force : ${strength}`} /><Field label="Confirmer le nouveau mot de passe" type="password" autoComplete="new-password" required value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />{error && <Notice tone="danger">{error}</Notice>}<Button type="submit" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer mon mot de passe'}</Button><Button variant="ghost" onClick={() => void logout()}>Se déconnecter</Button></form></div><div className="login-side"><div><h2>Votre compte KiT Hub</h2><p>Choisissez un mot de passe personnel de dix caractères minimum</p></div></div></div></main>;
}
function useHash() {
  const [hash, setHash] = useState(location.hash.slice(1));
  useEffect(() => { const on = () => setHash(location.hash.slice(1)); addEventListener('hashchange', on); return () => removeEventListener('hashchange', on); }, []);
  return hash;
}
function Shell() {
  const { user, ready, logout } = useSession();
  const path = useHash();
  if (!ready) return <p className="center">Chargement...</p>;
  if (!user) return <Login />;
  if (user.mustChangePassword) return <ChangePassword />;
  // Masquer un menu n'est PAS une securite : l'API verifie chaque role.
  const visible = FEATURES.filter((f) => !f.roles || f.roles.includes(user.role));
  const current = visible.find((f) => f.path === path) ?? visible[0];
  if (!current) return <p className="center">Aucune page disponible.</p>;
  return <Layout user={user} items={visible} active={current.path} onLogout={logout}><current.Component /></Layout>;
}
export const App = () => <SessionProvider><Shell /></SessionProvider>;
