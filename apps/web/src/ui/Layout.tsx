// Francis. Coquille : menu groupe (mon travail / equipe), compte en bas.
import type { ReactNode } from 'react';
import type { User } from '@kit-pulse/contracts';
import { Avatar, Icon, IconButton, type IconName } from './components.tsx';
import { Notifications } from './Notifications.tsx';

interface Props { user: User; items: { path: string; label: string }[]; active: string; onLogout: () => Promise<void>; children: ReactNode }
const ICONS: Record<string, IconName> = { pointage: 'clock', tasks: 'tasks', agenda: 'calendar', attendance: 'attendance', equipe: 'team', dashboard: 'dashboard', reviews: 'review', arrivees: 'camera', admin: 'admin' };
const MINE = new Set(['pointage', 'tasks', 'agenda', 'attendance']);
const ROLE: Record<User['role'], string> = { ADMIN: 'Admin', HR: 'RH', COORDINATOR: 'Coordination', MEMBER: 'Membre' };

export function Layout({ user, items, active, onLogout, children }: Props) {
  const groups = [
    { label: 'Mon travail', items: items.filter((i) => MINE.has(i.path) && !(user.role === 'ADMIN' && i.path === 'agenda')) },
    { label: 'Équipe', items: items.filter((i) => !MINE.has(i.path) || (user.role === 'ADMIN' && i.path === 'agenda')) },
  ].filter((g) => g.items.length);
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand"><img src="/kithub.png" alt="KiT Hub" /><span className="brand-name">Pulse</span></div>
        <nav aria-label="Menu principal">
          {groups.map((g) => <div key={g.label}>
            <div className="nav-label">{g.label}</div>
            <div className="nav-group">
              {g.items.map((i) => <a key={i.path} className="nav-link" href={`#${i.path}`} aria-current={i.path === active ? 'page' : undefined}>
                <Icon name={ICONS[i.path] ?? 'dashboard'} size={18} />{i.label}
              </a>)}
            </div>
          </div>)}
        </nav>
        <div className="me">
          <Avatar name={user.fullName} />
          <div className="me-text"><strong>{user.fullName}</strong><span>{user.badgeId} · {ROLE[user.role]}</span></div>
          <Notifications />
          <IconButton icon="logout" label="Se déconnecter" onClick={() => { void onLogout(); }} />
        </div>
      </aside>
      <main>{children}</main>
    </div>
  );
}
