import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Availability, Task, TaskPriority, TaskStatus } from '@kit-pulse/contracts';
import { api, ApiError } from '../../core/api.ts';
import type { Feature } from '../../core/feature.ts';
import { useSession } from '../../core/session.tsx';
import { Button, Card, Field } from '../../ui/components.tsx';
import { canAssignTasks, canSubmitAssignment, isVisibleTask, statusForProgress } from './model.ts';
import { apiErrorMessage, isDevelopmentNotImplemented } from '../team/feedback.ts';

const today = () => new Date().toLocaleDateString('en-CA');
const MOCK_USERS: Availability[] = [
  { userId: 4, fullName: 'Demo — Aline Exemple', status: 'FREE', note: null, until: null },
  { userId: 5, fullName: 'Demo — Benoît Exemple', status: 'MEETING', note: null, until: null },
  { userId: 6, fullName: 'Demo — Chantal Exemple', status: 'FIELD', note: null, until: null },
];
const statusLabel: Record<TaskStatus, string> = { TODO: 'À faire', DOING: 'En cours', BLOCKED: 'Bloquée', DONE: 'Terminée', CANCELLED: 'Annulée' };
const priorityLabel: Record<TaskPriority, string> = { LOW: 'Basse', NORMAL: 'Normale', HIGH: 'Haute', URGENT: 'Urgente' };

function TasksPage() {
  const { user } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [people, setPeople] = useState<Availability[]>([]);
  const [peopleDemo, setPeopleDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [demo, setDemo] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [workDate, setWorkDate] = useState(today());
  const [priority, setPriority] = useState<TaskPriority>('NORMAL');
  const [assigneeId, setAssigneeId] = useState(user?.id ?? 0);
  const [saving, setSaving] = useState(false);
  const [progressDrafts, setProgressDrafts] = useState<Record<number, number>>({});
  const [savingProgressId, setSavingProgressId] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const canAssign = user ? canAssignTasks(user.role) : false;

  useEffect(() => {
    let active = true;
    const from = `${new Date().getFullYear()}-01-01`;
    const to = `${new Date().getFullYear()}-12-31`;
    setLoading(true);
    api<Task[]>('GET', `/tasks/me?from=${from}&to=${to}`).then((data) => { if (active) setTasks(data); })
      .catch((e: unknown) => { if (active) setError(apiErrorMessage(e)); }).finally(() => { if (active) setLoading(false); });
    api<Availability[]>('GET', '/availability', { mock: MOCK_USERS }).then((data) => { if (active) { setPeople(data); if (data === MOCK_USERS) { setPeopleDemo(true); setDemo(true); } } }).catch(() => { /* attribution indisponible ; la liste de mes tâches reste utilisable */ });
    return () => { active = false; };
  }, []);

  const listed = useMemo(() => tasks.filter((t) => isVisibleTask(t, today())), [tasks]);
  const mockTasks: Task[] = [
    { id: -1, title: 'Exemple : préparer le compte rendu', description: 'Tâche fictive de démonstration.', assigneeId: user?.id ?? -1, createdBy: user?.id ?? -1, priority: 'NORMAL', status: 'DOING', progress: 35, workDate: today(), dueDate: null },
  ];

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    const assignedTo = canAssign ? assigneeId : user?.id;
    if (!assignedTo) { setError('Impossible d’identifier la personne à qui attribuer cette tâche.'); setSaving(false); return; }
    if (peopleDemo && user && !canSubmitAssignment(user.id, assignedTo, peopleDemo)) { setError('Les personnes et statuts affichés sont fictifs ; choisissez « Moi » pour éviter toute attribution réelle à un compte de démonstration.'); setSaving(false); return; }
    const payload = { title, description: description.trim() || null, assigneeId: assignedTo, priority, workDate, dueDate: null };
    try {
      const created = await api<Task>('POST', '/tasks', { body: payload });
      setTasks((old) => [created, ...old]); setNotice('Tâche créée.'); setTitle(''); setDescription('');
    } catch (e) {
      if (e instanceof ApiError && isDevelopmentNotImplemented(e.status, import.meta.env.DEV)) {
        const created: Task = { id: -Date.now(), ...payload, createdBy: user?.id ?? -1, status: 'TODO', progress: 0 };
        setTasks((old) => [created, ...old]); setDemo(true); setNotice('Tâche ajoutée en démonstration locale ; elle n’a pas été enregistrée sur le serveur.'); setTitle(''); setDescription('');
      } else setError(apiErrorMessage(e));
    } finally { setSaving(false); }
  }

  async function updateProgress(task: Task, progress: number) {
    setSavingProgressId(task.id); setError(''); setNotice('');
    const status = statusForProgress(progress);
    try {
      await api('POST', `/tasks/${task.id}/progress`, { body: { progress, status, note: null } });
      setTasks((old) => old.map((t) => t.id === task.id ? { ...t, progress, status } : t));
      setProgressDrafts((old) => { const next = { ...old }; delete next[task.id]; return next; });
    } catch (e) {
      if (e instanceof ApiError && isDevelopmentNotImplemented(e.status, import.meta.env.DEV)) {
        setTasks((old) => old.map((t) => t.id === task.id ? { ...t, progress, status } : t)); setDemo(true);
        setProgressDrafts((old) => { const next = { ...old }; delete next[task.id]; return next; });
        setNotice('Progression modifiée en démonstration locale ; elle n’a pas été enregistrée sur le serveur.');
      } else setError(apiErrorMessage(e));
    } finally { setSavingProgressId(null); }
  }

  return <Card>
    <h1>Mes tâches</h1>
    {demo && <p role="status" className="mock">Données et actions de démonstration — les changements locaux ne sont pas enregistrés sur le serveur.</p>}
    {error && <p role="alert" className="error">{error}</p>}{notice && <p role="status">{notice}</p>}
    <h2>Créer une tâche</h2>
    <form onSubmit={createTask}>
      <Field label="Titre" required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} />
      <label className="field">Description<textarea maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
      <div className="feature-filters">
        <label className="field">Date de travail<input type="date" required value={workDate} onChange={(e) => setWorkDate(e.target.value)} /></label>
        <label className="field">Priorité<select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>{(['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const).map((p) => <option key={p} value={p}>{priorityLabel[p]}</option>)}</select></label>
        {canAssign && <label className="field">Attribuer à<select value={assigneeId} onChange={(e) => setAssigneeId(Number(e.target.value))}><option value={user?.id}>Moi</option>{people.filter((p) => p.userId !== user?.id).map((p) => <option key={p.userId} value={p.userId}>{p.fullName} — {p.status === 'FREE' ? 'Libre' : p.status === 'BUSY' ? 'Occupé' : p.status === 'MEETING' ? 'En réunion' : p.status === 'FIELD' ? 'Sur le terrain' : 'Hors ligne'}{peopleDemo ? ' (démo)' : ''}</option>)}</select>{peopleDemo && <small>Choix fictifs : une attribution à une autre personne est désactivée en attendant l’annuaire réel.</small>}</label>}
      </div>
      <Button type="submit" disabled={saving || !title.trim()}>{saving ? 'Création…' : 'Créer la tâche'}</Button>
    </form>
    <h2>Tâches du jour et en retard</h2>
    {loading ? <p role="status">Chargement des tâches…</p> : error ? <p>La liste n’a pas pu être chargée.</p> : listed.length === 0 ? <p>Aucune tâche pour aujourd’hui ni en retard.</p> : <ul className="feature-list">{listed.map((t) => <li key={t.id}>
      <h3 style={{ overflowWrap: 'anywhere' }}>{t.title}</h3>{t.description && <p style={{ overflowWrap: 'anywhere' }}>{t.description}</p>}
      <p>{statusLabel[t.status]} · Priorité {priorityLabel[t.priority]} · Date {t.workDate}{t.workDate < today() && t.status !== 'DONE' && t.status !== 'CANCELLED' ? ' · En retard' : ''}</p>
      <label className="field">Progression : {progressDrafts[t.id] ?? t.progress}%<input type="range" min="0" max="100" step="5" value={progressDrafts[t.id] ?? t.progress} disabled={t.status === 'CANCELLED' || savingProgressId === t.id} onChange={(e) => setProgressDrafts((old) => ({ ...old, [t.id]: Number(e.target.value) }))} aria-label={`Progression de ${t.title}`} /></label>
      {progressDrafts[t.id] !== undefined && <Button type="button" disabled={savingProgressId !== null} onClick={() => void updateProgress(t, progressDrafts[t.id])}>{savingProgressId === t.id ? 'Enregistrement…' : 'Enregistrer la progression'}</Button>}
    </li>)}</ul>}
    {import.meta.env.DEV && <details><summary>Données fictives de démonstration</summary><p>Les exemples ci-dessous ne sont pas des tâches réelles.</p><ul>{mockTasks.map((t) => <li key={t.id}>{t.title}</li>)}</ul></details>}
  </Card>;
}
const feature: Feature = { path: 'tasks', label: 'Mes tâches', order: 20, Component: TasksPage };
export default feature;
