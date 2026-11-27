import { useEffect, useState } from 'react';
import type { Justification } from '@kit-pulse/contracts';
import { api, ApiError } from '../../core/api.ts';
import type { Feature } from '../../core/feature.ts';
import { Avatar, Button, Card, Empty, Loading, Notice, Page, Tag } from '../../ui/components.tsx';
import { pendingReviews, requiresRefusalConfirmation, REVIEW_ROLES } from './model.ts';
import { apiErrorMessage, isDevelopmentNotImplemented } from '../team/feedback.ts';

const MOCK: Justification[] = [
  { id: -1, userId: 901, workDate: '2026-11-24', kind: 'LATE', reason: 'Motif fictif destiné à présenter la file de traitement.', status: 'PENDING', reviewNote: null },
];

function ReviewsPage() {
  const [items, setItems] = useState<Justification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [demo, setDemo] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const [names, setNames] = useState<Record<number, string>>({});
  useEffect(() => { api<{ id: number; fullName: string }[]>('GET', '/users/directory').then((d) => setNames(Object.fromEntries(d.map((u) => [u.id, u.fullName])))).catch(() => {}); }, []);

  useEffect(() => {
    let active = true;
    api<Justification[]>('GET', '/justifications', { mock: MOCK }).then((data) => { if (active) { setItems(data); setDemo(data === MOCK); } })
      .catch((e: unknown) => { if (active) setError(apiErrorMessage(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function review(item: Justification, status: 'ACCEPTED' | 'REJECTED') {
    if (requiresRefusalConfirmation(status) && !window.confirm('Confirmer le refus de cette justification ?')) return;
    setBusyId(item.id); setError(''); setNotice('');
    try {
      await api('POST', `/justifications/${item.id}/review`, { body: { status, note: null } });
      setItems((old) => old.map((j) => j.id === item.id ? { ...j, status } : j));
      setNotice('Décision enregistrée.');
    } catch (e) {
      if (e instanceof ApiError && isDevelopmentNotImplemented(e.status, import.meta.env.DEV)) {
        setItems((old) => old.map((j) => j.id === item.id ? { ...j, status } : j)); setDemo(true);
        setNotice('Décision simulée en démonstration locale ; elle n’a pas été enregistrée ni auditée par le serveur.');
      } else setError(apiErrorMessage(e));
    } finally { setBusyId(null); }
  }

  const pending = pendingReviews(items);
  const done = items.filter((j) => j.status !== "PENDING");
  const day = (v: string) => new Date(`${v}T12:00:00`).toLocaleDateString("fr", { weekday: "long", day: "numeric", month: "long" });
  const who = (id: number) => names[id] ?? `Compte ${id}`;
  return <Page title="Justifications à traiter" meta={loading ? "Lecture…" : pending.length ? `${pending.length} en attente de décision` : "Tout est traité"}>
    {demo && <Notice tone="warn">Données fictives de démonstration : ne les traitez pas comme des demandes réelles</Notice>}
    {error && <Notice tone="danger">Impossible de charger ou traiter les justifications : {error}</Notice>}
    {notice && <Notice tone="ok">{notice}</Notice>}
    {loading ? <Card><Loading /></Card> : pending.length === 0 ? <Card><Empty title="Aucune justification en attente">Les nouvelles demandes apparaîtront ici</Empty></Card> :
      <ul className="review-list">{pending.map((item) => <li key={item.id} className="card review">
        <div className="review-who"><Avatar name={who(item.userId)} /><div><strong>{who(item.userId)}</strong><small>{item.kind === "LATE" ? "Retard" : "Absence"} · {day(item.workDate)}</small></div><Tag tone={item.kind === "LATE" ? "warn" : "danger"}>{item.kind === "LATE" ? "Retard" : "Absence"}</Tag></div>
        <blockquote className="review-reason">{item.reason}</blockquote>
        <div className="feature-actions">
          <Button icon="check" disabled={busyId !== null} onClick={() => void review(item, "ACCEPTED")}>{busyId === item.id ? "Enregistrement…" : "Accepter"}</Button>
          <Button variant="danger" icon="x" disabled={busyId !== null} onClick={() => void review(item, "REJECTED")}>Refuser</Button>
        </div>
      </li>)}</ul>}
    {done.length > 0 && <Card title="Déjà traitées" meta={`${done.length}`}>
      <div className="table-scroll"><table><thead><tr><th>Personne</th><th>Jour</th><th>Type</th><th>Décision</th></tr></thead>
        <tbody>{done.map((j) => <tr key={j.id}><td>{who(j.userId)}</td><td>{day(j.workDate)}</td><td>{j.kind === "LATE" ? "Retard" : "Absence"}</td><td><Tag tone={j.status === "ACCEPTED" ? "ok" : "danger"}>{j.status === "ACCEPTED" ? "Acceptée" : "Refusée"}</Tag></td></tr>)}</tbody></table></div>
    </Card>}
    <small>Réservé aux rôles ADMIN et RH. Chaque décision est enregistrée et tracée par le serveur ; on ne traite jamais sa propre justification.</small>
  </Page>;
}
const feature: Feature = { path: 'reviews', label: 'Justifications à traiter', order: 70, roles: REVIEW_ROLES, Component: ReviewsPage };
export default feature;
