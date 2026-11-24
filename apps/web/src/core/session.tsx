// GELE : Alain.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@kit-pulse/contracts';
import { api } from './api.ts';
interface Session { user: User | null; ready: boolean; login: (email: string, password: string) => Promise<void>; logout: () => Promise<void> }
const Ctx = createContext<Session | null>(null);
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { api<User>('GET', '/auth/me').then(setUser).catch(() => setUser(null)).finally(() => setReady(true)); }, []);
  const login = async (email: string, password: string) => setUser(await api<User>('POST', '/auth/login', { body: { email, password } }));
  const logout = async () => { await api('POST', '/auth/logout'); setUser(null); };
  return <Ctx value={{ user, ready, login, logout }}>{children}</Ctx>;
}
export function useSession(): Session {
  const s = useContext(Ctx);
  if (!s) throw new Error('SessionProvider manquant');
  return s;
}
