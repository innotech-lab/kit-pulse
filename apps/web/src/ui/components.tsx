// Francis. Composants communs. Un besoin nouveau = demande a Francis, pas de copie locale.
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import type { AvailabilityStatus } from '@kit-pulse/contracts';
export const Button = (p: ButtonHTMLAttributes<HTMLButtonElement>) => <button {...p} className={`btn ${p.className ?? ''}`} />;
export const Card = ({ children }: { children: ReactNode }) => <section className="card">{children}</section>;
export const Field = ({ label, ...p }: InputHTMLAttributes<HTMLInputElement> & { label: string }) => <label className="field">{label}<input {...p} /></label>;
export const Todo = ({ ticket, children }: { ticket: string; children?: ReactNode }) => <p className="mock">{ticket} : a developper. {children}</p>;

// Forme + texte + couleur : lisible aussi sans distinguer les couleurs.
const STATUS: Record<AvailabilityStatus, { label: string; color: string; shape: string }> = {
  FREE: { label: 'Libre', color: 'var(--ok)', shape: 'M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Z' },
  BUSY: { label: 'Occupation en cours', color: 'var(--danger)', shape: 'M1 1h14v14H1Z' },
  MEETING: { label: 'En reunion', color: 'var(--info)', shape: 'M8 0l8 8-8 8-8-8Z' },
  FIELD: { label: 'Sur terrain', color: 'var(--warn)', shape: 'M8 1l7 14H1Z' },
  OFFLINE: { label: 'Hors ligne', color: 'var(--muted)', shape: 'M1 6h14v4H1Z' },
};
export function StatusIcon({ status }: { status: AvailabilityStatus }) {
  const s = STATUS[status];
  return <span className="status"><svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d={s.shape} fill={s.color} /></svg>{s.label}</span>;
}
