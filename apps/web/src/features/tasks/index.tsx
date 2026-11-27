import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Availability, Task, TaskPriority, TaskStatus } from '@kit-pulse/contracts';
import { api, ApiError } from '../../core/api.ts';
import type { Feature } from '../../core/feature.ts';
import { useSession } from '../../core/session.tsx';
import { Button, Card, Empty, Field, Loading, Modal, Notice, Page, SelectField, Tag, TextArea, availabilityLabel, useAutoRefresh } from '../../ui/components.tsx';
import { canAssignTasks, canSubmitAssignment, isVisibleTask, statusForProgress } from './model.ts';
import { apiErrorMessage, isDevelopmentNotImplemented } from '../team/feedback.ts';

const today = () => new Date().toLocaleDateString('en-CA');
const MOCK_USERS: Availability[] = [
  { userId: 4, fullName: 'Demo — Aline Exemple', status: 'FREE', note: null, until: null },
  { userId: 5, fullName: 'Demo — Benoît Exemple', status: 'MEETING', note: null, until: null },
  { userId: 6, fullName: 'Demo — Chantal Exemple', status: 'FIELD', note: null, until: null },
];
const statusLabel: Record<TaskStatus, string> = { TODO: 'À faire', DOING: 'En cours', BLOCKED: 'Bloquée', DONE: 'Terminée', CANCELLED: 'Annulée' };
const PRIO_RANK: Record<TaskPriority, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
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
  const [showCreate, setShowCreate] = useState(false);
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

  useAutoRefresh(() => {
    const y = new Date().getFullYear();
    api<Task[]>('GET', `/tasks/me?from=${y}-01-01&to=${y}-12-31`).then(setTasks).catch(() => {});
    api<Availability[]>('GET', '/availability', { mock: MOCK_USERS }).then((data) => { if (data !== MOCK_USERS) setPeople(data); }).catch(() => {});
  });

  const listed = useMemo(() => tasks.filter((t) => isVisibleTask(t, today())), [tasks]);

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    const assignedTo = canAssign ? assigneeId : user?.id;
    if (!assignedTo) { setError('Impossible d’identifier la personne à qui attribuer cette tâche.'); setSaving(false); return; }
    if (peopleDemo && user && !canSubmitAssignment(user.id, assignedTo, peopleDemo)) { setError('Les personnes et statuts affichés sont fictifs ; choisissez « Moi » pour éviter toute attribution réelle à un compte de démonstration.'); setSaving(false); return; }
    const payload = { title, description: description.trim() || null, assigneeId: assignedTo, priority, workDate, dueDate: null };
    try {
      const created = await api<Task>('POST', '/tasks', { body: payload });
      setTasks((old) => [created, ...old]); setNotice('Tâche ajoutée'); setTitle(''); setDescription(''); setShowCreate(false);
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

  const done = listed.filter((t) => t.status === "DONE").length;
  const overdue = listed.filter((t) => t.workDate < today() && t.status !== "DONE" && t.status !== "CANCELLED").length;
  const ordered = [...listed].sort((a, b) => Number(a.status === "DONE") - Number(b.status === "DONE") || PRIO_RANK[a.priority] - PRIO_RANK[b.priority]);
  return <Page title="Mes tâches" meta={new Date().toLocaleDateString("fr", { weekday: "long", day: "numeric", month: "long" })} actions={<Button icon="plus" onClick={() => setShowCreate(true)}>Nouvelle tâche</Button>}>
    {demo && <Notice tone="warn">Données et actions de démonstration : les changements locaux ne sont pas enregistrés sur le serveur</Notice>}
    {error && <Notice tone="danger">{error}</Notice>}{notice && <Notice tone="ok">{notice}</Notice>}
    <section className="card day-goal">
      <div><span className="stat-label">Ma journée</span><div className="stat-value">{done}<span className="muted" style={{ fontSize: 18 }}> / {listed.length} terminées</span></div></div>
      <div className="day-goal-bar" role="progressbar" aria-valuemin={0} aria-valuemax={listed.length} aria-valuenow={done} aria-label="Tâches terminées aujourd’hui"><span style={{ width: `${listed.length ? (done / listed.length) * 100 : 0}%` }} /></div>
      <small>{listed.length === 0 ? "Rien de prévu pour l’instant" : done === listed.length ? "Tout est terminé pour aujourd’hui" : `Encore ${listed.length - done} à terminer${overdue ? `, dont ${overdue} en retard` : ""}`}</small>
    </section>
    <Card title="Aujourd’hui et en retard" meta={`${listed.length} tâche${listed.length > 1 ? "s" : ""}`}>
        {loading ? <Loading /> : error && !tasks.length ? <Empty title="La liste n’a pas pu être chargée" /> : ordered.length === 0 ? <Empty title="Aucune tâche pour aujourd’hui">Ajoutez-en une avec « Nouvelle tâche »</Empty> :
          <ul className="task-list">{ordered.map((t) => { const value = progressDrafts[t.id] ?? t.progress; const late = t.workDate < today() && t.status !== "DONE" && t.status !== "CANCELLED"; return <li key={t.id} className={t.status === "DONE" ? "is-done" : undefined}>
            <div className="task-head">
              <h3>{t.title}</h3>
              <div className="task-tags">{(t.priority === "HIGH" || t.priority === "URGENT") && <Tag tone={t.priority === "URGENT" ? "danger" : "warn"}>{priorityLabel[t.priority]}</Tag>}{late && <Tag tone="danger">En retard · {t.workDate.slice(8)}/{t.workDate.slice(5, 7)}</Tag>}<Tag tone={t.status === "DONE" ? "ok" : t.status === "DOING" ? "accent" : t.status === "BLOCKED" ? "warn" : "neutral"}>{statusLabel[t.status]}</Tag></div>
            </div>
            {t.description && <p className="task-desc">{t.description}</p>}
            <div className="task-progress">
              <input type="range" min="0" max="100" step="5" value={value} disabled={t.status === "CANCELLED" || savingProgressId === t.id} onChange={(e) => setProgressDrafts((old) => ({ ...old, [t.id]: Number(e.target.value) }))} aria-label={`Progression de ${t.title}`} style={{ ["--p" as string]: `${value}%` }} />
              <span className="mono">{value} %</span>
              {progressDrafts[t.id] !== undefined && <Button size="sm" disabled={savingProgressId !== null} onClick={() => void updateProgress(t, progressDrafts[t.id]!)}>{savingProgressId === t.id ? "Enregistrement…" : value === 100 ? "Marquer terminée" : "Enregistrer"}</Button>}
            </div>
          </li>; })}</ul>}
      </Card>
      <Modal open={showCreate} dismissible={false} onClose={() => setShowCreate(false)} title="Nouvelle tâche" footer={<><Button variant="secondary" onClick={() => setShowCreate(false)}>Annuler</Button><Button type="submit" form="task-form" icon="plus" disabled={saving || !title.trim()}>{saving ? "Création…" : canAssign && assigneeId !== user?.id ? "Attribuer la tâche" : "Ajouter à ma journée"}</Button></>}>
        <form id="task-form" onSubmit={createTask}>
          <Field label="Titre" required maxLength={160} placeholder="Ex. relire le rapport mensuel" value={title} onChange={(e) => setTitle(e.target.value)} />
          <TextArea label="Description" maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="feature-filters">
            <Field label="Date" type="date" required value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
            <SelectField label="Priorité" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>{(["LOW", "NORMAL", "HIGH", "URGENT"] as const).map((p) => <option key={p} value={p}>{priorityLabel[p]}</option>)}</SelectField>
          </div>
          {canAssign && <label className="field">Pour<select value={assigneeId} onChange={(e) => setAssigneeId(Number(e.target.value))}><option value={user?.id}>Moi</option>{people.filter((p) => p.userId !== user?.id).map((p) => <option key={p.userId} value={p.userId}>{p.fullName} · {availabilityLabel(p.status)}{peopleDemo ? " (démo)" : ""}</option>)}</select><small>{peopleDemo ? "Choix fictifs : l’attribution à une autre personne est désactivée en attendant l’annuaire réel" : "La disponibilité actuelle s’affiche à côté de chaque nom"}</small></label>}
          {error && <Notice tone="danger">{error}</Notice>}
        </form>
      </Modal>
  </Page>;
}
const feature: Feature = { path: 'tasks', label: 'Mes tâches', order: 20, roles: ['HR', 'COORDINATOR', 'MEMBER'], Component: TasksPage };
export default feature;
