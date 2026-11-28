import { useEffect, useState } from 'react';
import type { Notification, NotificationKind, NotificationList } from '@kit-pulse/contracts';
import { api } from '../core/api.ts';
import { Button, Empty, Icon, Loading, Modal, Notice, useAutoRefresh, type IconName } from './components.tsx';

const icons: Record<NotificationKind, IconName> = {
  TASK_ASSIGNED: 'tasks', TASK_UPDATED: 'tasks', JUSTIFICATION_SUBMITTED: 'review', JUSTIFICATION_DECIDED: 'review',
  ARRIVAL_TO_REVIEW: 'camera', ARRIVAL_REJECTED: 'camera', DEVICE_USED_BY_OTHER: 'monitor', PASSWORD_RESET: 'user',
  AGENDA_EVENT_ADDED: 'calendar', DEVICE_TO_APPROVE: 'monitor',
};
function relative(iso: string) {
  const elapsed = Math.max(0, Date.now() - new Date(iso).getTime());
  if (elapsed < 60_000) return "À l’instant";
  if (elapsed < 3_600_000) return `Il y a ${Math.floor(elapsed / 60_000)} min`;
  if (elapsed < 86_400_000) return `Il y a ${Math.floor(elapsed / 3_600_000)} h`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function Notifications() {
  const [data, setData] = useState<NotificationList | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function refresh() {
    try { setData(await api<NotificationList>('GET', '/notifications')); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Chargement impossible'); }
  }
  useEffect(() => { void refresh(); }, []);
  useAutoRefresh(refresh);
  async function openItem(item: Notification) {
    setBusy(true); setError('');
    try {
      if (!item.readAt) await api('POST', `/notifications/${item.id}/read`);
      await refresh();
      if (item.link && /^#[a-z][a-z0-9-]*$/i.test(item.link)) { setOpen(false); location.hash = item.link; }
    } catch (e) { setError(e instanceof Error ? e.message : 'Action impossible'); } finally { setBusy(false); }
  }
  async function readAll() {
    setBusy(true); setError('');
    try { await api('POST', '/notifications/read-all'); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Action impossible'); } finally { setBusy(false); }
  }
  return <>
    <button type="button" className="icon-btn" aria-label={`Notifications${data?.unread ? `, ${data.unread} non lues` : ''}`} title="Notifications" onClick={() => { setOpen(true); void refresh(); }} style={{ position: 'relative', flex: 'none', marginLeft: 0 }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
      {!!data?.unread && <span aria-hidden="true" style={{ position: 'absolute', top: 0, right: 0, minWidth: 16, height: 16, padding: '0 3px', borderRadius: 8, background: 'var(--accent)', color: 'var(--on-accent)', fontSize: 10, lineHeight: '16px', textAlign: 'center' }}>{data.unread > 99 ? '99+' : data.unread}</span>}
    </button>
    <Modal open={open} title="Notifications" meta={data ? `${data.unread} non lue${data.unread > 1 ? 's' : ''}` : undefined} onClose={() => setOpen(false)} dismissible size="md" footer={<Button variant="secondary" disabled={busy || !data?.unread} onClick={() => void readAll()}>Tout marquer comme lu</Button>}>
      {error && <Notice tone="danger">{error}</Notice>}
      {!data ? <Loading /> : data.items.length === 0 ? <Empty title="Aucune notification" /> : <ul className="feature-list" style={{ margin: 0 }}>
        {data.items.map((item) => <li key={item.id} style={{ padding: 0 }}><button type="button" disabled={busy} onClick={() => void openItem(item)} style={{ display: 'flex', width: '100%', gap: 'var(--s-3)', padding: 'var(--s-3)', textAlign: 'left', border: 0, borderRadius: 'var(--r-ctl)', background: item.readAt ? 'transparent' : 'var(--surface-2)', color: 'var(--text)', cursor: 'pointer', font: 'inherit' }}>
          <Icon name={icons[item.kind]} size={18} /><span style={{ flex: 1, minWidth: 0 }}><strong style={{ fontWeight: 600 }}>{item.title}</strong>{item.body && <span style={{ display: 'block', color: 'var(--text-2)', overflowWrap: 'anywhere' }}>{item.body}</span>}<small className="muted">{relative(item.createdAt)}</small></span>{!item.readAt && <span aria-label="Non lue" style={{ width: 8, height: 8, flex: 'none', borderRadius: '50%', background: 'var(--accent)', marginTop: 'var(--s-2)' }} />}
        </button></li>)}
      </ul>}
    </Modal>
  </>;
}
