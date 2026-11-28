// Francis. Composants communs. Un besoin nouveau = demande a Francis, pas de copie locale.
import { createPortal } from 'react-dom';
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import type { AvailabilityStatus } from '@kit-pulse/contracts';

/* ---------- Icones (trace lucide, 1.5 de trait, une seule taille par contexte) ---------- */
const PATHS = {
  clock: 'M12 6v6l4 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  tasks: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2',
  team: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  attendance: 'M3 3v18h18M7 16l4-4 4 4 5-6',
  dashboard: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
  review: 'M9 12l2 2 4-4M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20',
  admin: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  login: 'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3',
  plus: 'M12 5v14M5 12h14',
  check: 'M20 6L9 17l-5-5',
  x: 'M18 6L6 18M6 6l12 12',
  alert: 'M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0',
  info: 'M12 16v-4M12 8h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  wifi: 'M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01',
  edit: 'M12 20h9M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z',
  trash: 'M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6',
  chevronLeft: 'M15 18l-6-6 6-6',
  chevronRight: 'M9 18l6-6-6-6',
  monitor: 'M2 3h20v14H2zM8 21h8M12 17v4',
  camera: 'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  refresh: 'M21 12a9 9 0 1 1-2.64-6.36L21 8M21 3v5h-5',
  key: 'M15.5 7.5l2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4M21 2l-9.6 9.6M10 15.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0',
  userX: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M17 8l5 5M22 8l-5 5',
  userCheck: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M16 11l2 2 4-4',
} as const;
export type IconName = keyof typeof PATHS;
export function Icon({ name, size = 18, label }: { name: IconName; size?: number; label?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}><path d={PATHS[name]} /></svg>;
}

/* ---------- Boutons ---------- */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg'; icon?: IconName };
export function Button({ variant = 'primary', size = 'md', icon, className, children, ...p }: ButtonProps) {
  const cls = ['btn', variant !== 'primary' && `btn-${variant}`, size !== 'md' && `btn-${size}`, className].filter(Boolean).join(' ');
  return <button type="button" {...p} className={cls}>{icon && <Icon name={icon} size={size === 'lg' ? 20 : 16} />}{children}</button>;
}
export const IconButton = ({ icon, label, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string }) =>
  <button type="button" {...p} className="icon-btn" aria-label={label} title={label}><Icon name={icon} size={18} /></button>;

/* ---------- Surfaces ---------- */
export function Card({ children, title, meta, className }: { children: ReactNode; title?: ReactNode; meta?: ReactNode; className?: string }) {
  return <section className={`card ${className ?? ''}`}>
    {(title || meta) && <div className="card-head">{title && <h2>{title}</h2>}{meta && <small>{meta}</small>}</div>}
    {children}
  </section>;
}
/** Page : en-tete (titre + contexte + actions) puis contenu. */
export function Page({ title, meta, actions, children }: { title: string; meta?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return <div className="page">
    <header className="page-head"><div><h1>{title}</h1>{meta && <p className="meta">{meta}</p>}</div><div className="actions"><RefreshButton />{actions}</div></header>
    {children}
  </div>;
}
export const Stat = ({ label, value, note, accent, onClick }: { label: string; value: ReactNode; note?: ReactNode; accent?: boolean; onClick?: () => void }) => {
  const content = <><span className="stat-label">{label}{onClick && <Icon name="chevronRight" size={16} />}</span><span className="stat-value">{value}</span>{note && <span className="stat-note">{note}</span>}</>;
  const className = `stat${accent ? ' is-accent' : ''}${onClick ? ' is-clickable' : ''}`;
  return onClick ? <button type="button" className={className} onClick={onClick}>{content}</button> : <div className={className}>{content}</div>;
};

/* ---------- Champs ---------- */
export const Field = ({ label, hint, ...p }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) =>
  <label className="field">{label}<input {...p} />{hint && <small>{hint}</small>}</label>;
export const SelectField = ({ label, children, ...p }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) =>
  <label className="field">{label}<select {...p}>{children}</select></label>;
export const TextArea = ({ label, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) =>
  <label className="field">{label}<textarea {...p} /></label>;

/* ---------- Etats ---------- */
export type Tone = 'neutral' | 'ok' | 'warn' | 'danger' | 'accent';
export const Tag = ({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) =>
  <span className={`tag${tone === 'neutral' ? '' : ` tag-${tone}`}`}>{children}</span>;
export function Notice({ tone = 'neutral', children }: { tone?: 'neutral' | 'warn' | 'danger' | 'ok'; children: ReactNode }) {
  const cls = tone === 'danger' ? 'error' : tone === 'warn' ? 'mock' : tone === 'ok' ? 'toast' : 'notice';
  if (tone === 'ok') return createPortal(<p role="status" className="toast"><Icon name="check" size={16} />{children}</p>, document.body);
  return <p role={tone === 'danger' ? 'alert' : 'status'} className={cls}>{children}</p>;
}
export const Empty = ({ title, children }: { title: string; children?: ReactNode }) =>
  <div className="empty"><strong>{title}</strong>{children && <span>{children}</span>}</div>;
export const Loading = ({ label = 'Chargement' }: { label?: string }) =>
  <div role="status" aria-label={label} style={{ display: 'grid', gap: 10, padding: '8px 0' }}><div className="skeleton" style={{ width: '60%' }} /><div className="skeleton" style={{ width: '85%' }} /><div className="skeleton" style={{ width: '40%' }} /></div>;
/** Ancien marqueur "a developper" : rendu discret, jamais un cadre pointille en demo. */
export const Todo = ({ children }: { ticket?: string; children?: ReactNode }) => <p className="notice">{children ?? 'Bientot disponible'}</p>;

export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
export const Avatar = ({ name }: { name: string }) => <span className="avatar" aria-hidden="true">{initials(name)}</span>;

/* ---------- Signature : la frise de la journee ---------- */
const DAY_START = 7 * 60, DAY_END = 18 * 60;
const pct = (min: number) => `${Math.min(100, Math.max(0, ((min - DAY_START) / (DAY_END - DAY_START)) * 100))}%`;
export const minutesOf = (iso: string) => { const d = new Date(iso); return d.getHours() * 60 + d.getMinutes(); };
/** Mini-frise 07:00-18:00 : plage de travail, presence pointee, repere "maintenant". */
export function DayLine({ firstIn, lastOut, late, now, early = 0, after = 0, work = [8 * 60, 17 * 60], label }: { firstIn: string | null; lastOut: string | null; late?: boolean; now?: boolean; early?: number; after?: number; work?: [number, number]; label?: string }) {
  const start = firstIn ? minutesOf(firstIn) : null;
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const end = lastOut ? minutesOf(lastOut) : start !== null && now ? nowMin : null;
  return <div className="dayline" role="img" aria-label={label ?? (start === null ? 'Aucun pointage' : `Pointage de ${firstIn ? new Date(firstIn).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' }) : ''}${lastOut ? ` a ${new Date(lastOut).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })}` : ''}`)}>
    <span className="dayline-work" style={{ left: pct(work[0]), right: `calc(100% - ${pct(work[1])})` }} />
    {start !== null && end !== null && <span className={`dayline-span${late ? ' is-late' : ''}${!lastOut ? ' is-open' : ''}`} style={{ left: pct(start), width: `calc(${pct(end)} - ${pct(start)})`, minWidth: 4 }} />}
    {start !== null && end !== null && early > 0 && start < work[0] && <span className="dayline-extra" style={{ left: pct(start), width: `calc(${pct(Math.min(end, work[0]))} - ${pct(start)})` }} />}
    {start !== null && end !== null && after > 0 && end > work[1] && <span className="dayline-extra" style={{ left: pct(Math.max(start, work[1])), width: `calc(${pct(end)} - ${pct(Math.max(start, work[1]))})` }} />}
    {now && nowMin >= DAY_START && nowMin <= DAY_END && <span className="dayline-now" style={{ left: pct(nowMin) }} />}
  </div>;
}

/* ---------- Disponibilite : forme + texte, jamais la couleur seule ---------- */
const STATUS: Record<AvailabilityStatus, { label: string; color: string; shape: string }> = {
  FREE: { label: 'Libre', color: 'var(--ok)', shape: 'M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2Z' },
  BUSY: { label: 'Occupé', color: 'var(--danger)', shape: 'M3 3h10v10H3Z' },
  MEETING: { label: 'En réunion', color: 'var(--accent)', shape: 'M8 1.5l6.5 6.5L8 14.5 1.5 8Z' },
  FIELD: { label: 'Sur le terrain', color: 'var(--warn)', shape: 'M8 2l6.5 12h-13Z' },
  OFFLINE: { label: 'Hors ligne', color: 'var(--n-400)', shape: 'M2 6.5h12v3H2Z' },
};
export const availabilityLabel = (s: AvailabilityStatus) => STATUS[s].label;
export function StatusIcon({ status }: { status: AvailabilityStatus }) {
  const s = STATUS[status];
  return <span className="status"><svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"><path d={s.shape} fill={s.color} /></svg>{s.label}</span>;
}

/** Graduations sous une frise : heures placees exactement. */
export const DayScale = ({ hours = [8, 10, 12, 14, 17] }: { hours?: number[] }) =>
  <div className="dayscale" aria-hidden="true">{hours.map((h) => <span key={h} style={{ left: pct(h * 60) }}>{String(h).padStart(2, '0')}:00</span>)}</div>;

/* ---------- Superposition ----------
   dismissible (defaut true) : clic a cote ou Echap ferment (consultation).
   dismissible={false} : saisie en cours, fermeture uniquement par la croix ou apres l'action. */
export function Modal({ open, title, meta, onClose, dismissible = true, size = 'md', children, footer }: {
  open: boolean; title: ReactNode; meta?: ReactNode; onClose: () => void; dismissible?: boolean; size?: 'sm' | 'md' | 'lg'; children: ReactNode; footer?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // onClose est souvent une fonction recreee a chaque rendu : on la garde dans une ref pour que
  // l'effet ne se relance qu'a l'ouverture (sinon chaque frappe remettrait le curseur sur le premier champ).
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>('input:not([type=hidden]), select, textarea, button:not(.modal-x)');
    (first ?? ref.current)?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && dismissible) closeRef.current(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; prev?.focus?.(); };
  }, [open, dismissible]);
  if (!open) return null;
  return createPortal(<div className="modal-backdrop" onMouseDown={(e) => { if (dismissible && e.target === e.currentTarget) onClose(); }}>
    <div ref={ref} className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} tabIndex={-1}>
      <header className="modal-head"><div><h2>{title}</h2>{meta && <small>{meta}</small>}</div><button type="button" className="icon-btn modal-x" aria-label="Fermer" title="Fermer" onClick={onClose}><Icon name="x" size={18} /></button></header>
      <div className="modal-body">{children}</div>
      {footer && <footer className="modal-foot">{footer}</footer>}
    </div>
  </div>, document.body);
}

/** Remplace window.confirm : const { confirm, dialog } = useConfirm(); if (!(await confirm({...}))) return; puis rendre {dialog}. */
export function useConfirm() {
  const [state, setState] = useState<{ title: string; message?: ReactNode; confirmLabel: string; danger?: boolean; resolve: (v: boolean) => void } | null>(null);
  const confirm = (o: { title: string; message?: ReactNode; confirmLabel?: string; danger?: boolean }) =>
    new Promise<boolean>((resolve) => setState({ confirmLabel: 'Confirmer', ...o, resolve }));
  const close = (v: boolean) => { state?.resolve(v); setState(null); };
  const dialog = <Modal open={!!state} size="sm" title={state?.title ?? ''} onClose={() => close(false)}
    footer={<><Button variant="secondary" onClick={() => close(false)}>Annuler</Button><Button variant={state?.danger ? 'danger' : 'primary'} onClick={() => close(true)}>{state?.confirmLabel}</Button></>}>
    {state?.message && <p className="muted">{state.message}</p>}
  </Modal>;
  return { confirm, dialog };
}

/* ---------- Actualisation automatique ----------
   Rappelle `refresh` toutes les `ms` et au retour sur l'onglet, sans jamais deranger :
   rien si l'onglet est cache, si une superposition est ouverte ou si l'on tape dans un champ. */
export const AUTO_REFRESH_MS = 45_000;
/** Tout ce que les pages ouvertes savent recharger : le bouton Actualiser les relance d'un coup. */
const refreshers = new Set<{ current: () => unknown }>();
export async function refreshAll() { await Promise.allSettled([...refreshers].map((r) => Promise.resolve(r.current()))); }
/** auto = false : seulement via le bouton Actualiser (page qui gere deja son propre rythme). */
export function useAutoRefresh(refresh: () => unknown, ms = AUTO_REFRESH_MS, auto = true) {
  const ref = useRef(refresh);
  ref.current = refresh;
  useEffect(() => { refreshers.add(ref); return () => { refreshers.delete(ref); }; }, []);
  useEffect(() => {
    if (!auto) return;
    const busy = () => {
      if (document.visibilityState !== 'visible') return true;
      if (document.querySelector('.modal')) return true;
      const el = document.activeElement as HTMLElement | null;
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
    };
    let last = Date.now();
    const run = () => { if (busy()) return; last = Date.now(); void ref.current(); };
    const timer = window.setInterval(run, ms);
    const onShow = () => { if (document.visibilityState === 'visible' && Date.now() - last > 5_000) run(); };
    document.addEventListener('visibilitychange', onShow);
    window.addEventListener('focus', onShow);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', onShow); window.removeEventListener('focus', onShow); };
  }, [ms, auto]);
}

/** Bouton Actualiser de l'en-tete : recharge immediatement les donnees de la page. */
export function RefreshButton() {
  const [busy, setBusy] = useState(false);
  const [at, setAt] = useState<string | null>(null);
  async function go() { setBusy(true); try { await refreshAll(); setAt(new Date().toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })); } finally { setBusy(false); } }
  return <button type="button" className={`btn btn-secondary refresh-btn${busy ? ' is-busy' : ''}`} onClick={() => void go()} disabled={busy} title={at ? `Actualisé à ${at}` : 'Actualiser les données'}><Icon name="refresh" size={16} />{busy ? 'Actualisation…' : 'Actualiser'}</button>;
}

/** Horloge HH:MM avec les secondes plus discretes : la seconde qui avance montre que le systeme est vivant.
    Pas d'annonce aux lecteurs d'ecran a chaque seconde (aria-hidden sur les secondes). */
export function Clock({ now, className }: { now: Date; className?: string }) {
  const p = (n: number) => String(n).padStart(2, '0');
  return <time className={`clock-face ${className ?? ''}`} dateTime={now.toISOString()} aria-label={`Il est ${p(now.getHours())} heures ${p(now.getMinutes())}`}>
    {p(now.getHours())}:{p(now.getMinutes())}<span className="clock-sec" aria-hidden="true">:{p(now.getSeconds())}</span>
  </time>;
}
/** Date courante, mise a jour a chaque seconde pile. */
export function useSecondClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer = 0;
    const tick = () => { setNow(new Date()); timer = window.setTimeout(tick, 1000 - (Date.now() % 1000)); };
    timer = window.setTimeout(tick, 1000 - (Date.now() % 1000));
    return () => window.clearTimeout(timer);
  }, []);
  return now;
}
