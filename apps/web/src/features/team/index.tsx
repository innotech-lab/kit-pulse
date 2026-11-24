// Abigael. EXEMPLE de page avec donnees de demonstration : elles disparaissent quand l'API repond.
import { useEffect, useState } from 'react';
import type { Availability } from '@kit-pulse/contracts';
import { api } from '../../core/api.ts';
import type { Feature } from '../../core/feature.ts';
import { Card, StatusIcon, Todo } from '../../ui/components.tsx';
const MOCK: Availability[] = [
  { userId: 1, fullName: 'Personne demo 1', status: 'FREE', note: null, until: null },
  { userId: 2, fullName: 'Personne demo 2', status: 'MEETING', note: 'Salle demo', until: null },
  { userId: 3, fullName: 'Personne demo 3', status: 'FIELD', note: null, until: null },
];
function TeamPage() {
  const [rows, setRows] = useState<Availability[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { api<Availability[]>('GET', '/availability', { mock: MOCK }).then(setRows).catch((e: Error) => setError(e.message)); }, []);
  return (
    <Card>
      <h1>Equipe</h1>
      {error && <p role="alert" className="error">{error}</p>}
      <ul>{rows.map((r) => <li key={r.userId}>{r.fullName} <StatusIcon status={r.status} /> {r.note}</li>)}</ul>
      <Todo ticket="WEB-TEAM-001">Filtre et changement de mon statut.</Todo>
    </Card>
  );
}
const feature: Feature = { path: 'equipe', label: 'Equipe', order: 40, Component: TeamPage };
export default feature;
