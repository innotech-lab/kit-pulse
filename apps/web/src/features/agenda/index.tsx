// Alain. Agenda (WEB-AGD-001) : semaine sur un ecran, clic sur un creneau = creation pre-remplie, edition en superposition.
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type { AgendaEvent, DirectoryEntry, EventKind } from '@kit-pulse/contracts';
import { api } from '../../core/api.ts';
import type { Feature } from '../../core/feature.ts';
import { useSession } from '../../core/session.tsx';
import { Button, Field, IconButton, Modal, Notice, Page, SelectField, useConfirm, useAutoRefresh } from '../../ui/components.tsx';

const START = 7 * 60, END = 18 * 60, SPAN = END - START;
const KINDS: Record<EventKind, string> = { MEETING: 'Réunion', FIELD: 'Terrain', FOCUS: 'Travail concentré', OTHER: 'Autre' };
const pad = (n: number) => String(n).padStart(2, '0');
const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monday = (d: Date) => { const n = new Date(d.getFullYear(), d.getMonth(), d.getDate()); n.setDate(n.getDate() - ((n.getDay() + 6) % 7)); return n; };
const shift = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const minOf = (d: Date) => d.getHours() * 60 + d.getMinutes();
const hm = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const local = (iso: string) => { const d = new Date(iso); return { date: dateKey(d), time: hm(minOf(d)) }; };

interface Form { title: string; kind: EventKind; date: string; start: string; end: string; location: string }
const fresh = (date: string, startMin: number): Form => ({ title: '', kind: 'MEETING', date, start: hm(startMin), end: hm(Math.min(END, startMin + 60)), location: '' });

function useNowMinute() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(t); }, []);
  return now;
}

function AgendaPage() {
  const { user } = useSession();
  const canSeeTeam = !!user && user.role !== 'MEMBER';
  /** L'administration ne pointe pas et n'a pas d'agenda personnel : vue equipe uniquement. */
  const teamOnly = user?.role === 'ADMIN';
  const now = useNowMinute();
  const [week, setWeek] = useState(() => monday(new Date()));
  const [person, setPerson] = useState('');
  const [directory, setDirectory] = useState<DirectoryEntry[]>([]);
  const [events, setEvents] = useState<AgendaEvent[] | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<AgendaEvent | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const { confirm, dialog } = useConfirm();

  const days = useMemo(() => Array.from({ length: 5 }, (_, i) => shift(week, i)), [week]);
  const from = dateKey(days[0]!), to = dateKey(days[4]!);
  const today = dateKey(now);
  const who = person ? directory.find((d) => String(d.id) === person)?.fullName : null;

  const load = useCallback(() => {
    setError('');
    return api<AgendaEvent[]>('GET', `/agenda${person ? '' : '/me'}?from=${from}&to=${to}${person ? `&userId=${person}` : ''}`)
      .then(setEvents).catch((e: Error) => { setEvents([]); setError(e.message); });
  }, [from, to, person]);
  useEffect(() => { setEvents(null); void load(); }, [load]);
  useAutoRefresh(load);
  useEffect(() => { if (canSeeTeam) api<DirectoryEntry[]>('GET', '/users/directory').then((d) => { setDirectory(d); if (teamOnly) setPerson((p) => p || String(d.find((x) => x.id !== user?.id)?.id ?? '')); }).catch(() => {}); }, [canSeeTeam, teamOnly, user?.id]);
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(''), 3000); return () => clearTimeout(t); }, [notice]);

  function openSlot(date: string, startMin: number) { setEditing(null); setForm(fresh(date, startMin)); }
  function openEvent(e: AgendaEvent) { const s = local(e.startsAt), en = local(e.endsAt); setEditing(e); setForm({ title: e.title, kind: e.kind, date: s.date, start: s.time, end: en.time, location: e.location ?? '' }); }
  const close = () => { setForm(null); setEditing(null); };

  async function save(ev: FormEvent) {
    ev.preventDefault(); if (!form) return;
    const starts = new Date(`${form.date}T${form.start}`), ends = new Date(`${form.date}T${form.end}`);
    if (!(ends > starts)) { setError('L’heure de fin doit suivre l’heure de début'); return; }
    setSaving(true); setError('');
    const body = { title: form.title, kind: form.kind, startsAt: starts.toISOString(), endsAt: ends.toISOString(), location: form.location.trim() || null, taskId: editing?.taskId ?? null, ...(!editing && person ? { userId: Number(person) } : {}) };
    try {
      await api(editing ? 'PATCH' : 'POST', editing ? `/agenda/${editing.id}` : '/agenda', { body });
      close(); setNotice(editing ? 'Événement modifié' : 'Événement ajouté'); await load();
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  }
  async function remove() {
    if (!editing) return;
    if (!(await confirm({ title: 'Supprimer cet événement ?', message: `« ${editing.title} » disparaîtra de l’agenda.`, confirmLabel: 'Supprimer', danger: true }))) return;
    setSaving(true);
    try { await api('DELETE', `/agenda/${editing.id}`); close(); setNotice('Événement supprimé'); await load(); }
    catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  }

  const hours = Array.from({ length: (END - START) / 60 }, (_, i) => START + i * 60);
  const nowMin = minOf(now);
  const range = `${days[0]!.toLocaleDateString('fr', { day: 'numeric', month: 'long' })} – ${days[4]!.toLocaleDateString('fr', { day: 'numeric', month: 'long', year: 'numeric' })}`;

  return <Page title="Agenda" meta={`${who ? `Agenda de ${who}` : 'Mon agenda'} · ${range}`}
    actions={<>
      <div className="week-nav">
        <IconButton icon="chevronLeft" label="Semaine précédente" onClick={() => setWeek(shift(week, -7))} />
        <Button variant="secondary" size="sm" onClick={() => setWeek(monday(new Date()))}>Aujourd’hui</Button>
        <IconButton icon="chevronRight" label="Semaine suivante" onClick={() => setWeek(shift(week, 7))} />
      </div>
      {canSeeTeam && <select className="compact-select" aria-label="Agenda de" value={person} onChange={(e) => setPerson(e.target.value)}>
        {!teamOnly && <option value="">Mon agenda</option>}{directory.filter((d) => d.id !== user?.id).map((d) => <option key={d.id} value={d.id}>{d.fullName}</option>)}
      </select>}
      <Button icon="plus" onClick={() => openSlot(dateKey(days.find((d) => dateKey(d) === today) ?? days[0]!), Math.max(START, Math.min(END - 60, Math.ceil(nowMin / 30) * 30)))}>Nouvel événement</Button>
    </>}>
    {error && !form && <Notice tone="danger">{error}</Notice>}
    {notice && <Notice tone="ok">{notice}</Notice>}

    <section className="card cal" aria-busy={events === null}>
      <div className="cal-head">
        <span />
        {days.map((d) => <div key={dateKey(d)} className={`cal-day${dateKey(d) === today ? ' is-today' : ''}`}>
          <span>{d.toLocaleDateString('fr', { weekday: 'short' }).replace('.', '')}</span><strong>{d.getDate()}</strong>
        </div>)}
      </div>
      <div className="cal-body">
        <div className="cal-hours">{hours.map((h) => <span key={h} style={{ top: `${((h - START) / SPAN) * 100}%` }}>{hm(h)}</span>)}</div>
        {days.map((d) => { const key = dateKey(d); const mine = (events ?? []).filter((e) => local(e.startsAt).date === key); return <div key={key} className={`cal-col${key === today ? ' is-today' : ''}`}>
          {Array.from({ length: SPAN / 30 }, (_, i) => START + i * 30).map((m) => <button key={m} type="button" className="cal-slot" aria-label={`Ajouter un événement le ${d.toLocaleDateString('fr', { weekday: 'long', day: 'numeric' })} à ${hm(m)}`} onClick={() => openSlot(key, m)}><span>{hm(m)}</span></button>)}
          {mine.map((e) => { const s = Math.max(START, minOf(new Date(e.startsAt))); const en = Math.min(END, local(e.endsAt).date === key ? minOf(new Date(e.endsAt)) : END); if (en <= s) return null; const short = en - s < 45; return <button key={e.id} type="button" className={`cal-event kind-${e.kind.toLowerCase()}${short ? ' is-short' : ''}`} style={{ top: `${((s - START) / SPAN) * 100}%`, height: `${((en - s) / SPAN) * 100}%` }} onClick={() => openEvent(e)}>
            <strong>{e.title}</strong><span className="mono">{hm(s)}–{hm(en)}{e.location ? ` · ${e.location}` : ''}</span>
          </button>; })}
          {key === today && nowMin >= START && nowMin <= END && <span className="cal-now" style={{ top: `${((nowMin - START) / SPAN) * 100}%` }} />}
        </div>; })}
      </div>
      <p className="cal-hint">{events === null ? 'Chargement de la semaine…' : events.length === 0 ? 'Aucun événement cette semaine · cliquez sur un créneau pour en ajouter un' : 'Cliquez sur un créneau libre pour ajouter un événement, sur un événement pour le modifier'}</p>
    </section>

    <Modal open={!!form} dismissible={false} onClose={close} title={editing ? 'Modifier l’événement' : 'Nouvel événement'}
      meta={form ? new Date(`${form.date}T12:00`).toLocaleDateString('fr', { weekday: 'long', day: 'numeric', month: 'long' }) + (who ? ` · agenda de ${who}` : '') : undefined}
      footer={<>
        {editing && <Button variant="ghost" icon="trash" disabled={saving} onClick={() => void remove()} className="push-left">Supprimer</Button>}
        <Button variant="secondary" onClick={close}>Annuler</Button>
        <Button type="submit" form="event-form" disabled={saving || !form?.title.trim()}>{saving ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Ajouter à l’agenda'}</Button>
      </>}>
      {form && <form id="event-form" onSubmit={(e) => void save(e)}>
        <Field label="Titre" required maxLength={160} placeholder="Ex. point d’équipe" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <div className="kind-pick" role="radiogroup" aria-label="Type">
          {(Object.keys(KINDS) as EventKind[]).map((k) => <label key={k} className={`kind-chip kind-${k.toLowerCase()}`}><input type="radio" name="kind" checked={form.kind === k} onChange={() => setForm({ ...form, kind: k })} />{KINDS[k]}</label>)}
        </div>
        <div className="form-row-3">
          <Field label="Jour" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Field label="Début" type="time" step={300} required value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
          <Field label="Fin" type="time" step={300} required value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
        </div>
        <Field label="Lieu" hint="Facultatif" maxLength={160} placeholder="Ex. salle 2, terrain Kinindo" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        {error && <Notice tone="danger">{error}</Notice>}
      </form>}
    </Modal>
    {dialog}
  </Page>;
}
const feature: Feature = { path: 'agenda', label: 'Agenda', order: 30, roles: ['ADMIN', 'HR', 'COORDINATOR', 'MEMBER'], Component: AgendaPage };
export default feature;
