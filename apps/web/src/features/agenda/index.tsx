import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { AgendaEvent, DirectoryEntry, EventKind } from '@kit-pulse/contracts';
import { api } from '../../core/api.ts';
import type { Feature } from '../../core/feature.ts';
import { useSession } from '../../core/session.tsx';
import { Button, Card, Empty, Field, IconButton, Loading, Notice, Page, SelectField, Tag, type Tone } from '../../ui/components.tsx';

const kinds: Record<EventKind, string> = { MEETING: 'Réunion', FIELD: 'Terrain', FOCUS: 'Concentration', OTHER: 'Autre' };
const tones: Record<EventKind, Tone> = { MEETING: 'accent', FIELD: 'warn', FOCUS: 'ok', OTHER: 'neutral' };
const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const monday = (d: Date) => { const n = new Date(d.getFullYear(), d.getMonth(), d.getDate()); n.setDate(n.getDate() - (n.getDay() + 6) % 7); return n; };
const shift = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const localInput = (iso: string) => { const d = new Date(iso); return `${dateKey(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const blank = (day: Date) => ({ title: '', kind: 'MEETING' as EventKind, startsAt: `${dateKey(day)}T08:00`, endsAt: `${dateKey(day)}T09:00`, location: '', taskId: null as number | null });

function AgendaPage() {
  const { user } = useSession();
  const canSeeTeam = user && user.role !== 'MEMBER';
  const [week, setWeek] = useState(() => monday(new Date()));
  const [person, setPerson] = useState('');
  const [directory, setDirectory] = useState<DirectoryEntry[]>([]);
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(() => blank(new Date()));
  const [saving, setSaving] = useState(false);
  const days = useMemo(() => Array.from({ length: 5 }, (_, i) => shift(week, i)), [week]);
  const from = dateKey(days[0]!), to = dateKey(days[4]!);
  const load = async () => { setLoading(true); setError(''); try { setEvents(await api<AgendaEvent[]>('GET', `/agenda${person ? '' : '/me'}?from=${from}&to=${to}${person ? `&userId=${person}` : ''}`)); } catch (e) { setError(e instanceof Error ? e.message : 'Chargement impossible'); } finally { setLoading(false); } };
  useEffect(() => { let active = true; setLoading(true); setError(''); api<AgendaEvent[]>('GET', `/agenda${person ? '' : '/me'}?from=${from}&to=${to}${person ? `&userId=${person}` : ''}`).then((data) => { if (active) setEvents(data); }).catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : 'Chargement impossible'); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [from, to, person]);
  useEffect(() => { if (canSeeTeam) api<DirectoryEntry[]>('GET', '/users/directory').then(setDirectory).catch((e: unknown) => setError(e instanceof Error ? e.message : 'Annuaire indisponible')); }, [canSeeTeam]);
  function edit(e: AgendaEvent) { setEditing(e.id); setForm({ title: e.title, kind: e.kind, startsAt: localInput(e.startsAt), endsAt: localInput(e.endsAt), location: e.location ?? '', taskId: e.taskId }); setShowForm(true); }
  async function save(e: FormEvent) { e.preventDefault(); setSaving(true); setError(''); setNotice(''); try {
    const starts = new Date(form.startsAt), ends = new Date(form.endsAt);
    if (!Number.isFinite(starts.getTime()) || !Number.isFinite(ends.getTime()) || ends <= starts) throw new Error('La fin doit suivre le début');
    const body = { ...form, startsAt: starts.toISOString(), endsAt: ends.toISOString(), location: form.location.trim() || null, ...(editing === null && person ? { userId: Number(person) } : {}) };
    await api(editing === null ? 'POST' : 'PATCH', editing === null ? '/agenda' : `/agenda/${editing}`, { body }); setShowForm(false); setNotice(editing === null ? 'Événement créé' : 'Événement modifié'); await load();
  } catch (err) { setError(err instanceof Error ? err.message : 'Enregistrement impossible'); } finally { setSaving(false); } }
  async function remove() { if (editing === null || !window.confirm('Supprimer cet événement ?')) return; setSaving(true); try { await api('DELETE', `/agenda/${editing}`); setShowForm(false); setNotice('Événement supprimé'); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Suppression impossible'); } finally { setSaving(false); } }
  return <Page title="Agenda" meta="Votre semaine, de 07:00 à 18:00" actions={<Button icon="plus" onClick={() => { setEditing(null); setForm(blank(days[0]!)); setShowForm(true); }}>Nouvel événement</Button>}>
    {error && <Notice tone="danger">{error}</Notice>}{notice && <Notice>{notice}</Notice>}
    <Card title="Semaine" meta={`${days[0]!.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} – ${days[4]!.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`}>
      <div className="feature-filters"><div className="feature-actions"><IconButton icon="chevronLeft" label="Semaine précédente" onClick={() => setWeek(shift(week, -7))} /><Button variant="secondary" size="sm" onClick={() => setWeek(monday(new Date()))}>Cette semaine</Button><IconButton icon="chevronRight" label="Semaine suivante" onClick={() => setWeek(shift(week, 7))} /></div>{canSeeTeam && <SelectField label="Agenda de" value={person} onChange={(e) => setPerson(e.target.value)}><option value="">Moi</option>{directory.filter((p) => p.id !== user?.id).map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}</SelectField>}</div>
      {loading ? <Loading /> : <><div className="table-scroll" style={{ overflowX: 'auto' }}><div style={{ minWidth: 720, display: 'grid', gridTemplateColumns: '56px repeat(5, minmax(120px, 1fr))', gap: 'var(--s-1)' }}><div />{days.map((d) => <div key={dateKey(d)} style={{ padding: 'var(--s-2)', fontWeight: 600 }}>{d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</div>)}<div style={{ position: 'relative', height: 528 }}>{Array.from({ length: 12 }, (_, i) => <span key={i} className="mono muted" style={{ position: 'absolute', top: i * 48, fontSize: 'var(--t-xs)' }}>{String(i + 7).padStart(2, '0')}:00</span>)}</div>{days.map((d) => <div key={dateKey(d)} style={{ height: 528, position: 'relative', borderLeft: '1px solid var(--line)', background: 'var(--surface-2)' }}>{Array.from({ length: 11 }, (_, i) => <div key={i} style={{ position: 'absolute', top: i * 48, left: 0, right: 0, borderTop: '1px solid var(--line)' }} />)}{events.filter((e) => dateKey(new Date(e.startsAt)) === dateKey(d)).map((e) => { const start = new Date(e.startsAt), end = new Date(e.endsAt); const m = start.getHours() * 60 + start.getMinutes(); const finish = dateKey(end) === dateKey(start) ? end.getHours() * 60 + end.getMinutes() : 1080; const top = Math.max(0, (m - 420) * .8), bottom = Math.min(528, (finish - 420) * .8); return bottom > top && <button key={e.id} type="button" onClick={() => edit(e)} title={`${e.title} · ${localInput(e.startsAt).slice(11)}–${localInput(e.endsAt).slice(11)}`} style={{ position: 'absolute', top, left: 'var(--s-1)', right: 'var(--s-1)', height: Math.max(24, bottom - top), overflow: 'hidden', textAlign: 'left', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-ctl)', background: 'var(--surface)', color: 'var(--text)', padding: 'var(--s-1)', cursor: 'pointer' }}><Tag tone={tones[e.kind]}>{kinds[e.kind]}</Tag><div>{e.title}</div><small className="mono">{localInput(e.startsAt).slice(11)}–{localInput(e.endsAt).slice(11)}</small></button>; })}</div>)}</div></div>{events.length === 0 && <Empty title="Aucun événement cette semaine">Ajoutez un rendez-vous pour organiser votre journée</Empty>}</>}
    </Card>
    {showForm && <Card title={editing === null ? 'Nouvel événement' : 'Modifier l’événement'}><form onSubmit={(e) => void save(e)} className="grid"><Field label="Titre" required maxLength={160} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /><SelectField label="Type" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as EventKind })}>{Object.entries(kinds).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</SelectField><div className="grid grid-2"><Field label="Début" type="datetime-local" required value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /><Field label="Fin" type="datetime-local" required value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} /></div><Field label="Lieu (facultatif)" maxLength={160} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /><div className="feature-actions"><Button type="submit" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button><Button variant="secondary" onClick={() => setShowForm(false)}>Annuler</Button>{editing !== null && <Button variant="danger" disabled={saving} onClick={() => void remove()}>Supprimer</Button>}</div></form></Card>}
  </Page>;
}
const feature: Feature = { path: 'agenda', label: 'Agenda', order: 30, Component: AgendaPage };
export default feature;
