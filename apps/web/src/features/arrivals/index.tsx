// PRES-006 : arrivees avec photo a valider par les RH. La photo est gardee 7 jours.
import { useCallback, useEffect, useState } from 'react';
import type { ArrivalReview } from '@kit-pulse/contracts';
import { api } from '../../core/api.ts';
import type { Feature } from '../../core/feature.ts';
import { useSession } from '../../core/session.tsx';
import { Avatar, Button, Card, Empty, Loading, Modal, Notice, Page, Tag, TextArea, useAutoRefresh, useConfirm } from '../../ui/components.tsx';

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' });
const day = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('fr', { weekday: 'long', day: 'numeric', month: 'long' });

function ArrivalsPage() {
  const { user } = useSession();
  const [items, setItems] = useState<ArrivalReview[] | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState<number | 'all' | null>(null);
  const [refusing, setRefusing] = useState<ArrivalReview | null>(null);
  const [note, setNote] = useState('');
  const [zoom, setZoom] = useState<ArrivalReview | null>(null);
  const { confirm, dialog } = useConfirm();

  const load = useCallback(() => api<ArrivalReview[]>('GET', '/presence/reviews').then(setItems).catch((e: Error) => setError(e.message)), []);
  useEffect(() => { void load(); }, [load]);
  useAutoRefresh(load);

  const pending = (items ?? []).filter((i) => i.reviewStatus === 'PENDING');
  const mine = (i: ArrivalReview) => i.userId === user?.id;
  const decided = (items ?? []).filter((i) => i.reviewStatus !== 'PENDING');

  async function decide(item: ArrivalReview, status: 'APPROVED' | 'REJECTED', reason: string | null = null) {
    setBusy(item.punchId); setError(''); setNotice('');
    try {
      await api('POST', `/presence/reviews/${item.punchId}`, { body: { status, note: reason } });
      setNotice(status === 'APPROVED' ? `Arrivée de ${item.fullName} validée` : `Arrivée de ${item.fullName} refusée`);
      setRefusing(null); setNote(''); await load();
    } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  }
  async function approveAll() {
    const list = pending.filter((i) => !mine(i));
    if (!list.length) return;
    if (!(await confirm({ title: `Valider ${list.length} arrivée${list.length > 1 ? 's' : ''} ?`, message: 'Vérifiez les photos avant : chaque validation est enregistrée à votre nom.', confirmLabel: 'Tout valider' }))) return;
    setBusy('all'); setError(''); setNotice('');
    let ok = 0;
    for (const i of list) { try { await api('POST', `/presence/reviews/${i.punchId}`, { body: { status: 'APPROVED', note: null } }); ok++; } catch { /* deja traitee ailleurs : ignoree */ } }
    setNotice(`${ok} arrivée${ok > 1 ? 's' : ''} validée${ok > 1 ? 's' : ''}`); setBusy(null); await load();
  }

  return <Page title="Arrivées à valider" meta={items ? (pending.length ? `${pending.length} en attente · la journée compte déjà, à l’heure exacte du pointage` : 'Tout est validé') : 'Lecture…'}
    actions={pending.filter((i) => !mine(i)).length > 1 ? <Button icon="check" disabled={busy !== null} onClick={() => void approveAll()}>Tout valider</Button> : undefined}>
    {error && <Notice tone="danger">{error}</Notice>}
    {notice && <Notice tone="ok">{notice}</Notice>}

    {!items ? <Card><Loading /></Card> : pending.length === 0 ? <Card><Empty title="Aucune arrivée en attente">Les nouvelles arrivées apparaîtront ici avec leur photo</Empty></Card> :
      <ul className="arrival-grid">{pending.map((i) => <li key={i.punchId} className="card arrival">
        <button type="button" className="arrival-photo" onClick={() => setZoom(i)} aria-label={`Agrandir la photo de ${i.fullName}`} disabled={!i.hasPhoto}>
          {i.hasPhoto ? <img src={`/api/presence/reviews/${i.punchId}/photo`} alt={`Photo de l’arrivée de ${i.fullName}`} loading="lazy" /> : <span>Photo supprimée</span>}
        </button>
        <div className="arrival-who"><Avatar name={i.fullName} /><div><strong>{i.fullName}</strong><small className="mono">{i.badgeId}</small></div></div>
        <p className="arrival-when"><span className="mono">{hhmm(i.at)}</span> · {day(i.workDate)}{i.deviceLabel ? ` · ${i.deviceLabel}` : ''}</p>
        {mine(i) ? <p className="muted">Votre propre arrivée : une autre personne doit la valider</p> :
          <div className="feature-actions">
            <Button icon="check" disabled={busy !== null} onClick={() => void decide(i, 'APPROVED')}>{busy === i.punchId ? 'Enregistrement…' : 'Valider'}</Button>
            <Button variant="danger" icon="x" disabled={busy !== null} onClick={() => { setRefusing(i); setNote(''); }}>Refuser</Button>
          </div>}
      </li>)}</ul>}

    {decided.length > 0 && <Card title="Décisions des 7 derniers jours" meta={`${decided.length}`}>
      <div className="table-scroll"><table>
        <thead><tr><th>Personne</th><th>Arrivée</th><th>Décision</th><th>Par</th></tr></thead>
        <tbody>{decided.map((i) => <tr key={i.punchId}>
          <td>{i.fullName}</td>
          <td><span className="mono">{hhmm(i.at)}</span> · {day(i.workDate)}</td>
          <td><Tag tone={i.reviewStatus === 'APPROVED' ? 'ok' : 'danger'}>{i.reviewStatus === 'APPROVED' ? 'Validée' : 'Refusée'}</Tag>{i.reviewNote && <small style={{ display: 'block', marginTop: 4 }}>{i.reviewNote}</small>}</td>
          <td className="muted">{i.reviewedBy ?? '–'}</td>
        </tr>)}</tbody>
      </table></div>
    </Card>}
    <small>Les photos sont supprimées automatiquement 7 jours après le pointage. Une arrivée refusée est annulée : la journée redevient absente si la personne ne repointe pas, et elle voit le motif.</small>

    <Modal open={!!refusing} dismissible={false} onClose={() => setRefusing(null)} title="Refuser cette arrivée"
      meta={refusing ? `${refusing.fullName} · ${hhmm(refusing.at)}, ${day(refusing.workDate)}` : undefined}
      footer={<><Button variant="secondary" onClick={() => setRefusing(null)}>Annuler</Button><Button variant="danger" icon="x" disabled={!note.trim() || busy !== null} onClick={() => refusing && void decide(refusing, 'REJECTED', note.trim())}>Refuser l’arrivée</Button></>}>
      <p className="muted">Le pointage sera annulé. La personne verra le motif et pourra déposer une justification.</p>
      <TextArea label="Motif (obligatoire)" maxLength={300} placeholder="Ex. la personne sur la photo n’est pas le titulaire du compte" value={note} onChange={(e) => setNote(e.target.value)} />
    </Modal>
    <Modal open={!!zoom} size="lg" onClose={() => setZoom(null)} title={zoom?.fullName ?? ''} meta={zoom ? `${hhmm(zoom.at)} · ${day(zoom.workDate)}` : undefined}>
      {zoom && <img className="arrival-zoom" src={`/api/presence/reviews/${zoom.punchId}/photo`} alt={`Photo de l’arrivée de ${zoom.fullName}`} />}
    </Modal>
    {dialog}
  </Page>;
}

const feature: Feature = { path: 'arrivees', label: 'Arrivées à valider', order: 66, roles: ['ADMIN', 'HR'], Component: ArrivalsPage };
export default feature;
