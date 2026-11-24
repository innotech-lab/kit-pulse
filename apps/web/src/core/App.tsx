// GELE : Alain.
import { useEffect, useState } from 'react';
import { Layout } from '../ui/Layout.tsx';
import { Login } from './Login.tsx';
import { FEATURES } from './feature.ts';
import { SessionProvider, useSession } from './session.tsx';
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
  // Masquer un menu n'est PAS une securite : l'API verifie chaque role.
  const visible = FEATURES.filter((f) => !f.roles || f.roles.includes(user.role));
  const current = visible.find((f) => f.path === path) ?? visible[0];
  if (!current) return <p className="center">Aucune page disponible.</p>;
  return <Layout user={user} items={visible} active={current.path} onLogout={logout}><current.Component /></Layout>;
}
export const App = () => <SessionProvider><Shell /></SessionProvider>;
