import { useEffect, useState, type FormEvent } from 'react';
import type { Role, User } from '@kit-pulse/contracts';
import { api } from '../../core/api.ts';
import type { Feature } from '../../core/feature.ts';
import { Button, Card, Empty, Field, Loading, Modal, Notice, Page, SelectField, Tag, useConfirm } from '../../ui/components.tsx';

type Device = { id: number; label: string; fullName: string; keyId: string; kind: 'PERSONAL' | 'KIOSK'; status: 'PENDING' | 'APPROVED' | 'REVOKED' };
type Network = { id: number; ssid: string; label: string; active: boolean; macs: { id: number; kind: string; mac: string; note: string | null }[] };
type Holiday = { date: string; label: string };
const roles: Record<Role, string> = { ADMIN: 'Administration', HR: 'Ressources humaines', COORDINATOR: 'Coordination', MEMBER: 'Équipe' };
const initial = { badgeId: '', fullName: '', email: '', role: 'MEMBER' as Role, jobTitle: '', password: '' };
const suggestLocal = (name: string) => name.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/\s+/).map((part) => part.replace(/[^a-z0-9-]/g, '')).filter(Boolean).join('.');
function AdminPage() {
  const { confirm, dialog } = useConfirm();
  const [tab, setTab] = useState<'accounts' | 'devices' | 'networks' | 'holidays'>('accounts');
  const [year, setYear] = useState('2026');
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [holidayForm, setHolidayForm] = useState({ date: '', label: '' });
  const [showHoliday, setShowHoliday] = useState(false);
  const [domain, setDomain] = useState('');
  const [domainDraft, setDomainDraft] = useState('');
  const [showDomain, setShowDomain] = useState(false);
  const [externalEmail, setExternalEmail] = useState(false);
  const [emailEdited, setEmailEdited] = useState(false);
  const [users, setUsers] = useState<User[]>([]); const [devices, setDevices] = useState<Device[]>([]); const [networks, setNetworks] = useState<Network[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [form, setForm] = useState(initial); const [editing, setEditing] = useState<number | null>(null); const [showForm, setShowForm] = useState(false); const [saving, setSaving] = useState(false);
  const [deviceKinds, setDeviceKinds] = useState<Record<number, 'PERSONAL' | 'KIOSK'>>({});
  async function load(which = tab, selectedYear = year) { setLoading(true); setError(''); try { if (which === 'accounts') setUsers(await api<User[]>('GET', '/users')); else if (which === 'devices') setDevices(await api<Device[]>('GET', '/devices')); else if (which === 'networks') setNetworks(await api<Network[]>('GET', '/networks')); else setHolidays(await api<Holiday[]>('GET', `/attendance/holidays?from=${selectedYear}-01-01&to=${selectedYear}-12-31`)); } catch (e) { setError(e instanceof Error ? e.message : 'Chargement impossible'); } finally { setLoading(false); } }
  useEffect(() => { void load(tab, year); }, [tab, year]);
  useEffect(() => { api<{ domain: string }>('GET', '/users/email-domain').then(({ domain: value }) => setDomain(value)).catch((e: unknown) => setError(e instanceof Error ? e.message : 'Domaine indisponible')); }, []);
  async function saveDomain(e: FormEvent) {
    e.preventDefault(); setSaving(true); setError(''); setNotice('');
    try { const result = await api<{ domain: string }>('PUT', '/users/email-domain', { body: { domain: domainDraft } }); setDomain(result.domain); setShowDomain(false); setNotice('Domaine enregistré'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Enregistrement impossible'); } finally { setSaving(false); }
  }
  async function saveHoliday(e: FormEvent) {
    e.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      await api('POST', '/attendance/holidays', { body: holidayForm });
      setShowHoliday(false); setHolidayForm({ date: '', label: '' });
      setNotice('Jour férié enregistré');
      const savedYear = holidayForm.date.slice(0, 4);
      if (savedYear === '2026' || savedYear === '2027') { setYear(savedYear); await load('holidays', savedYear); }
      else await load('holidays');
    } catch (e) { setError(e instanceof Error ? e.message : 'Enregistrement impossible'); } finally { setSaving(false); }
  }
  function edit(u: User) { const matches = domain !== '' && u.email.toLowerCase().endsWith(`@${domain.toLowerCase()}`); setExternalEmail(!matches); setEmailEdited(true); setEditing(u.id); setForm({ badgeId: u.badgeId, fullName: u.fullName, email: matches ? u.email.slice(0, -(domain.length + 1)) : u.email, role: u.role, jobTitle: u.jobTitle ?? '', password: '' }); setShowForm(true); }
  async function save(e: FormEvent) { e.preventDefault(); setSaving(true); setError(''); setNotice(''); try { if (!domain && !externalEmail) throw new Error('Domaine indisponible'); const body = { badgeId: form.badgeId, email: externalEmail ? form.email : `${form.email}@${domain}`, fullName: form.fullName, role: form.role, jobTitle: form.jobTitle.trim() || null, ...(editing === null ? { password: form.password } : {}) }; await api(editing === null ? 'POST' : 'PATCH', editing === null ? '/users' : `/users/${editing}`, { body }); setShowForm(false); setForm(initial); setNotice(editing === null ? 'Compte créé' : 'Compte modifié'); await load('accounts'); } catch (e) { setError(e instanceof Error ? e.message : 'Enregistrement impossible'); } finally { setSaving(false); } }
  async function toggle(u: User) { if (u.isActive && !(await confirm({ title: 'D\u00e9sactiver le compte', message: `Le compte de ${u.fullName} sera d\u00e9sactiv\u00e9 et ses sessions ferm\u00e9es.`, confirmLabel: 'D\u00e9sactiver', danger: true }))) return; setSaving(true); setError(''); try { await api('POST', `/users/${u.id}/${u.isActive ? 'deactivate' : 'activate'}`); setNotice(u.isActive ? 'Compte désactivé' : 'Compte réactivé'); await load('accounts'); } catch (e) { setError(e instanceof Error ? e.message : 'Action impossible'); } finally { setSaving(false); } }
  async function deviceAction(d: Device, action: 'approve' | 'revoke') { if (action === 'revoke' && !(await confirm({ title: 'R\u00e9voquer le poste', message: `Le poste ${d.label} sera r\u00e9voqu\u00e9.`, confirmLabel: 'R\u00e9voquer', danger: true }))) return; setSaving(true); setError(''); try { await api('POST', `/devices/${d.id}/${action}`, action === 'approve' ? { body: { kind: deviceKinds[d.id] ?? d.kind } } : {}); setNotice(action === 'approve' ? 'Poste approuvé' : 'Poste révoqué'); await load('devices'); } catch (e) { setError(e instanceof Error ? e.message : 'Action impossible'); } finally { setSaving(false); } }
  return <Page title="Administration" meta="Comptes, postes et réseaux du KiT Hub" actions={tab === 'accounts' ? <><Button size="sm" variant="secondary" disabled={!domain} onClick={() => { setDomainDraft(domain); setError(''); setShowDomain(true); }}>Domaine : @{domain || '...'}</Button><Button icon="plus" onClick={() => { setEditing(null); setForm(initial); setExternalEmail(false); setEmailEdited(false); setError(''); setShowForm(true); }}>Créer un compte</Button></> : tab === 'holidays' ? <Button icon="plus" onClick={() => { setError(''); setHolidayForm({ date: '', label: '' }); setShowHoliday(true); }}>Ajouter un jour férié</Button> : undefined}>
    <div className="segmented" role="tablist" aria-label="Administration" style={{ justifySelf: 'start' }}>{([['accounts', 'Comptes'], ['devices', 'Postes'], ['networks', 'Réseaux'], ['holidays', 'Jours fériés']] as const).map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} aria-pressed={tab === id} onClick={() => { setTab(id); setNotice(''); setShowForm(false); }}>{label}</button>)}</div>
    {error && <Notice tone="danger">{error}</Notice>}{notice && <Notice tone="ok">{notice}</Notice>}
    <Modal open={tab === 'accounts' && showForm} title={editing === null ? 'Créer un compte' : 'Modifier le compte'} dismissible={false} size="lg" onClose={() => setShowForm(false)} footer={<><Button variant="secondary" onClick={() => setShowForm(false)}>Annuler</Button><Button type="submit" form="account-form" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button></>}>{error && <Notice tone="danger">{error}</Notice>}<form id="account-form" onSubmit={(e) => void save(e)} className="grid"><div className="grid grid-2"><Field label="ID KIT-HUB" required pattern="[A-Z0-9-]{3,20}" value={form.badgeId} onChange={(e) => setForm({ ...form, badgeId: e.target.value.toUpperCase() })} /><Field label="Nom complet" required maxLength={120} value={form.fullName} onChange={(e) => { const fullName = e.target.value; setForm((previous) => ({ ...previous, fullName, ...(editing === null && !emailEdited ? { email: suggestLocal(fullName) } : {}) })); }} />{externalEmail ? <div><Field label="Adresse e-mail" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /><Button variant="ghost" size="sm" onClick={() => { setForm({ ...form, email: form.email.split('@')[0] ?? '' }); setExternalEmail(false); }}>Utiliser @{domain}</Button></div> : <label className="field">Identifiant e-mail<div style={{ display: 'flex', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-ctl)', overflow: 'hidden' }}><input aria-label="Identifiant e-mail" required value={form.email} onChange={(e) => { setEmailEdited(true); setForm({ ...form, email: (e.target.value.split('@')[0] ?? '').trim() }); }} style={{ minWidth: 0, border: 0, borderRadius: 0, flex: 1 }} /><span style={{ display: 'flex', alignItems: 'center', padding: '0 var(--s-3)', color: 'var(--text-3)', background: 'var(--surface-2)', borderLeft: '1px solid var(--line-strong)' }}>@{domain || '...'}</span></div><small>Adresse créée : {form.email ? `${form.email}@${domain}` : `identifiant@${domain}`}</small></label>}<SelectField label="Rôle" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>{Object.entries(roles).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</SelectField><Field label="Fonction (facultatif)" maxLength={120} value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />{editing === null && <Field label="Mot de passe initial" type="password" required minLength={10} maxLength={128} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />}</div></form></Modal>
    <Modal open={showDomain} title="Domaine e-mail" size="sm" dismissible={false} onClose={() => setShowDomain(false)}>
      {error && <Notice tone="danger">{error}</Notice>}
      <form className="grid" onSubmit={(e) => void saveDomain(e)}><Field label="Domaine" required value={domainDraft} onChange={(e) => setDomainDraft(e.target.value)} /><div className="feature-actions"><Button type="submit" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button></div></form>
    </Modal>
    <Modal open={tab === 'holidays' && showHoliday} title="Ajouter un jour férié" dismissible={false} onClose={() => setShowHoliday(false)}>
      {error && <Notice tone="danger">{error}</Notice>}
      <form onSubmit={(e) => void saveHoliday(e)} className="grid">
        <Field label="Date" type="date" required value={holidayForm.date} onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })} />
        <Field label="Libellé" required maxLength={120} value={holidayForm.label} onChange={(e) => setHolidayForm({ ...holidayForm, label: e.target.value })} />
        <div className="feature-actions"><Button type="submit" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button></div>
      </form>
    </Modal>
    {tab === 'holidays' ? <Card title="Jours fériés" meta={`${holidays.length} jours`}>
      <div className="segmented" role="group" aria-label="Année" style={{ justifySelf: 'start' }}>{['2026', '2027'].map((y) => <button key={y} type="button" aria-pressed={year === y} onClick={() => setYear(y)}>{y}</button>)}</div>
      {loading ? <Loading /> : holidays.length === 0 ? <Empty title="Aucun jour férié pour cette année" /> : <div className="table-scroll"><ul className="holiday-grid">{holidays.map((h) => { const d = new Date(`${h.date}T12:00:00`); const est = h.label.toLocaleLowerCase('fr').includes('estimée'); return <li key={h.date}><span className="holiday-date"><strong>{d.getDate()}</strong><span>{d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</span></span><span className="holiday-text"><span>{h.label.replace(' (date estimée)', '').replace(', date estimée)', ')')}</span><small>{d.toLocaleDateString('fr-FR', { weekday: 'long' })}{d.getDay() === 0 || d.getDay() === 6 ? ' · week-end' : ''}</small></span>{est && <Tag tone="warn">Estimée</Tag>}</li>; })}</ul></div>}
    </Card> : <>
    <Card title={tab === 'accounts' ? 'Comptes' : tab === 'devices' ? 'Postes enregistrés' : 'Réseaux autorisés'} meta={tab === 'accounts' ? `${users.length} comptes` : tab === 'devices' ? `${devices.length} postes` : `${networks.length} réseaux`}>
      {loading ? <Loading /> : tab === 'accounts' ? users.length === 0 ? <Empty title="Aucun compte" /> : <div className="table-scroll"><table><thead><tr><th>Personne</th><th>ID KIT-HUB</th><th>Rôle</th><th>Statut</th><th>Actions</th></tr></thead><tbody>{users.map((u) => <tr key={u.id}><td><strong>{u.fullName}</strong><div className="muted">{u.email}</div></td><td className="mono">{u.badgeId}</td><td><Tag tone={u.role === 'ADMIN' ? 'accent' : 'neutral'}>{roles[u.role]}</Tag></td><td><Tag tone={u.isActive ? 'ok' : 'neutral'}>{u.isActive ? 'Actif' : 'Inactif'}</Tag></td><td><div className="feature-actions"><Button variant="secondary" size="sm" onClick={() => edit(u)}>Modifier</Button><Button variant={u.isActive ? 'ghost' : 'secondary'} size="sm" disabled={saving} onClick={() => void toggle(u)}>{u.isActive ? 'Désactiver' : 'Réactiver'}</Button></div></td></tr>)}</tbody></table></div> : tab === 'devices' ? devices.length === 0 ? <Empty title="Aucun poste enregistré" /> : <div className="table-scroll"><table><thead><tr><th>Poste</th><th>Personne</th><th>Statut</th><th>Type et actions</th></tr></thead><tbody>{devices.map((d) => <tr key={d.id}><td><strong>{d.label}</strong><div className="mono muted">{d.keyId}</div></td><td>{d.fullName}</td><td><Tag tone={d.status === 'APPROVED' ? 'ok' : d.status === 'PENDING' ? 'warn' : 'danger'}>{d.status === 'APPROVED' ? 'Approuvé' : d.status === 'PENDING' ? 'En attente' : 'Révoqué'}</Tag></td><td><div className="feature-actions"><SelectField label={`Type pour ${d.label}`} value={deviceKinds[d.id] ?? d.kind} onChange={(e) => setDeviceKinds({ ...deviceKinds, [d.id]: e.target.value as 'PERSONAL' | 'KIOSK' })}><option value="PERSONAL">Personnel</option><option value="KIOSK">Borne</option></SelectField><Button variant="secondary" size="sm" disabled={saving} onClick={() => void deviceAction(d, 'approve')}>Approuver</Button>{d.status !== 'REVOKED' && <Button variant="danger" size="sm" disabled={saving} onClick={() => void deviceAction(d, 'revoke')}>Révoquer</Button>}</div></td></tr>)}</tbody></table></div> : networks.length === 0 ? <Empty title="Aucun réseau configuré" /> : <ul className="feature-list">{networks.map((n) => <li key={n.id}><div className="feature-actions"><strong>{n.label}</strong><Tag tone={n.active ? 'ok' : 'neutral'}>{n.active ? 'Actif' : 'Inactif'}</Tag></div><p>SSID : <span className="mono">{n.ssid}</span></p>{n.macs.length ? n.macs.map((m) => <p key={m.id}>{m.kind === 'GATEWAY' ? 'Routeur' : 'Point d’accès'} · <span className="mono">{m.mac}</span>{m.note && ` · ${m.note}`}</p>) : <p className="muted">Aucune adresse MAC configurée</p>}</li>)}</ul>}
    </Card>
    </>}
    {dialog}
  </Page>;
}
const feature: Feature = { path: 'admin', label: 'Administration', order: 80, roles: ['ADMIN'], Component: AdminPage };
export default feature;
