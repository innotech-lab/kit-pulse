// Francis.
import type { ReactNode } from 'react';
import type { User } from '@kit-pulse/contracts';
interface Props { user: User; items: { path: string; label: string }[]; active: string; onLogout: () => Promise<void>; children: ReactNode }
export function Layout({ user, items, active, onLogout, children }: Props) {
  return (
    <div className="layout">
      <nav aria-label="Menu principal">
        <img src="/kithub.png" alt="KiT Hub" width="180" />
        <strong>{user.fullName}</strong>
        <small>{user.badgeId}</small>
        {items.map((i) => <a key={i.path} href={`#${i.path}`} aria-current={i.path === active ? 'page' : undefined}>{i.label}</a>)}
        <button className="btn" onClick={() => { void onLogout(); }}>Se deconnecter</button>
      </nav>
      <main>{children}</main>
    </div>
  );
}
