// PRES-006 : arrivees avec photo a valider par les RH. La photo est gardee 7 jours.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ArrivalReview, ArrivalSignals } from '@kit-pulse/contracts';
import { api } from '../../core/api.ts';
import type { Feature } from '../../core/feature.ts';
import { useSession } from '../../core/session.tsx';
import { Avatar, Button, Card, Empty, Loading, Modal, Notice, Page, Tag, TextArea, useAutoRefresh, useConfirm, type Tone } from '../../ui/components.tsx';

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' });
const day = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('fr', { weekday: 'long', day: 'numeric', month: 'long' });
type SignalState = { signals: ArrivalSignals } | { error: true };
const isAgent = (s: ArrivalSignals) => s.device.verdict === null && s.face.verdict === null && s.geo.verdict === null && s.privateMode === null;
function rows(s: ArrivalSignals): { label: string; text: string; tone: Tone }[] {
  const device: Record<NonNullable<ArrivalSignals['device']['verdict']>, { text: string; tone: Tone }> = {
    OWN: { text: `Son appareil${s.device.label ? ` (${s.device.label})` : ''}`, tone: 'ok' },
    OTHER: { text: `Appareil de ${s.device.otherUserName ?? 'quelqu’un d’autre'}`, tone: 'danger' },
    LIKE_OTHER: { text: `Ressemble à l’appareil de ${s.device.otherUserName ?? 'quelqu’un d’autre'}`, tone: 'warn' },
    UNKNOWN: { text: 'Appareil jamais vu', tone: 'warn' },
  };
  const face: Record<NonNullable<ArrivalSignals['face']['verdict']>, { text: string; tone: Tone }> = {
    MATCH: { text: `Reconnu${s.face.score !== null ? ` (${Math.round(s.face.score * 100)} %)` : ''}`, tone: 'ok' },
    NO_MATCH: { text: 'Non reconnu', tone: 'danger' }, NO_FACE: { text: 'Aucun visage détecté', tone: 'warn' },
    NO_TEMPLATE: { text: 'Visage non enregistré', tone: 'neutral' }, LIVENESS_FAIL: { text: 'Test du vivant échoué', tone: 'danger' }, UNAVAILABLE: { text: 'Non disponible', tone: 'neutral' },
  };
  const distance = s.geo.distanceM === null ? null : s.geo.distanceM < 1000 ? `${Math.round(s.geo.distanceM)} m` : `${(s.geo.distanceM / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km`;
  const geo: Record<NonNullable<ArrivalSignals['geo']['verdict']>, { text: string; tone: Tone }> = {
    INSIDE: { text: `Dans le KiT Hub${distance ? ` (à ${distance})` : ''}`, tone: 'ok' },
    OUTSIDE: { text: distance ? `À ${distance} du KiT Hub` : 'Hors du KiT Hub', tone: 'danger' },
    DENIED: { text: 'Position refusée', tone: 'warn' }, UNAVAILABLE: { text: 'Position indisponible', tone: 'warn' }, NOT_CONFIGURED: { text: 'Lieu non configuré', tone: 'neutral' },
  };
  return [
    { label: 'Appareil', ...(s.device.verdict ? device[s.device.verdict] : { text: 'Non disponible', tone: 'neutral' as Tone }) },
    { label: 'Visage', ...(s.face.verdict ? face[s.face.verdict] : { text: 'Non disponible', tone: 'neutral' as Tone }) },
    { label: 'Lieu', ...(s.geo.verdict ? geo[s.geo.verdict] : { text: 'Non disponible', tone: 'neutral' as Tone }) },
  ];
}
function priority(state: SignalState | undefined) {
  if (!state || 'error' in state) return 1;
  const { signals } = state;
  if (rows(signals).some((r) => r.tone === 'danger')) return 0;
  if (signals.privateMode || rows(signals).some((r) => r.tone === 'warn')) return 1;
  return signals.highConfidence ? 3 : 2;
}

function ArrivalsPage() {
  const { user } = useSession();
  const [items, setItems] = useState<ArrivalReview[] | null>(null);
  const [signals, setSignals] = useState<Record<number, SignalState>>({});
  const [loadingSignals, setLoadingSignals] = useState(false);
  const loadSequence = useRef(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState<number | 'all' | null>(null);
  const [refusing, setRefusing] = useState<ArrivalReview | null>(null);
  const [note, setNote] = useState('');
  const [zoom, setZoom] = useState<ArrivalReview | null>(null);
  const { confirm, dialog } = useConfirm();

  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setLoadingSignals(true);
    try {
      const list = await api<ArrivalReview[]>('GET', '/presence/reviews');
      const pendingItems = list.filter((i) => i.reviewStatus === 'PENDING');
      const results = await Promise.all(pendingItems.map(async (item): Promise<[number, SignalState]> => {
        try { return [item.punchId, { signals: await api<ArrivalSignals>('GET', `/presence/reviews/${item.punchId}/signals`) }]; }
        catch { return [item.punchId, { error: true }]; }
      }));
      if (sequence === loadSequence.current) { setItems(list); setSignals(Object.fromEntries(results)); setError(''); }
    } catch (e) { if (sequence === loadSequence.current) { setSignals({}); setError(e instanceof Error ? e.message : 'Chargement impossible'); } }
    finally { if (sequence === loadSequence.current) setLoadingSignals(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useAutoRefresh(load);

  const pending = (items ?? []).filter((i) => i.reviewStatus === 'PENDING');
  const mine = (i: ArrivalReview) => i.userId === user?.id;
  const highConfidence = pending.filter((i) => !mine(i) && signals[i.punchId] && 'signals' in signals[i.punchId]! && (signals[i.punchId] as { signals: ArrivalSignals }).signals.highConfidence);
  const ordered = [...pending].sort((a, b) => priority(signals[a.punchId]) - priority(signals[b.punchId]));
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
    const list = highConfidence;
    if (!list.length) return;
    if (!(await confirm({ title: `Valider ${list.length} arrivée${list.length > 1 ? 's' : ''} en confiance élevée ?`, message: 'Vérifiez les photos avant : chaque validation est enregistrée à votre nom.', confirmLabel: 'Valider' }))) return;
    setBusy('all'); setError(''); setNotice('');
    let ok = 0;
    for (const i of list) { try { const current = await api<ArrivalSignals>('GET', `/presence/reviews/${i.punchId}/signals`); if (!current.highConfidence) continue; await api('POST', `/presence/reviews/${i.punchId}`, { body: { status: 'APPROVED', note: null } }); ok++; } catch { /* Une arrivée modifiée ou indisponible reste à vérifier. */ } }
    setNotice(`${ok} arrivée${ok > 1 ? 's' : ''} validée${ok > 1 ? 's' : ''}${ok < list.length ? ` · ${list.length - ok} à vérifier` : ''}`); setBusy(null); await load();
  }

  return <Page title="Arrivées à valider" meta={items ? (pending.length ? `${pending.length} en attente · la journée compte déjà, à l’heure exacte du pointage` : 'Tout est validé') : 'Lecture…'}
    actions={highConfidence.length > 0 ? <Button icon="check" disabled={busy !== null || loadingSignals} onClick={() => void approveAll()}>Valider les {highConfidence.length} en confiance élevée</Button> : undefined}>
    {error && <Notice tone="danger">{error}</Notice>}
    {notice && <Notice tone="ok">{notice}</Notice>}

    {!items ? <Card><Loading /></Card> : pending.length === 0 ? <Card><Empty title="Aucune arrivée en attente">Les nouvelles arrivées apparaîtront ici avec leur photo</Empty></Card> :
      <ul className="arrival-grid">{ordered.map((i) => <li key={i.punchId} className="card arrival">
        <button type="button" className="arrival-photo" onClick={() => setZoom(i)} aria-label={`Agrandir la photo de ${i.fullName}`} disabled={!i.hasPhoto}>
          {i.hasPhoto ? <img src={`/api/presence/reviews/${i.punchId}/photo`} alt={`Photo de l’arrivée de ${i.fullName}`} loading="lazy" /> : <span>Photo supprimée</span>}
        </button>
        <div className="arrival-signals" aria-label={`Indices de ${i.fullName}`}>
          {!signals[i.punchId] ? <p className="muted">Chargement des indices…</p> : 'error' in signals[i.punchId]! ? <Notice tone="danger">Indices indisponibles. Actualisez avant de décider.</Notice> : (() => { const s = (signals[i.punchId] as { signals: ArrivalSignals }).signals; return isAgent(s) ? <p className="muted">Pointage par l’agent</p> : <>{s.highConfidence && <Tag tone="ok">Confiance élevée</Tag>}{rows(s).map((r) => <div className="arrival-signal" key={r.label}><span>{r.label}</span><Tag tone={r.tone}>{r.text}</Tag></div>)}{s.privateMode && <Tag tone="warn">Navigation privée</Tag>}</>; })()}
        </div>
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
