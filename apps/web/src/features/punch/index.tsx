// Alain. Pointage fonctionnel de bout en bout ; design et historique du jour a finir (WEB-PUNCH-001/002).
import { useState } from 'react';
import type { Attestation, Punch, PunchType } from '@kit-pulse/contracts';
import { api, ApiError } from '../../core/api.ts';
import type { Feature } from '../../core/feature.ts';
import { Button, Card, Todo } from '../../ui/components.tsx';

async function punch(type: PunchType): Promise<Punch> {
  const status = await api<{ publicKey: string }>('GET', '/__agent/status').catch(() => { throw new ApiError(0, 'AGENT_OFF', "L'agent KIT-Pulse ne repond pas sur ce poste. Le demarrer puis reessayer."); });
  const device = await api<{ status: string }>('POST', '/devices/enroll', { body: { publicKey: status.publicKey, label: 'Poste de travail' } });
  if (device.status !== 'APPROVED') throw new ApiError(0, 'DEVICE_PENDING', "Poste enregistre. Il doit maintenant etre approuve par l'admin.");
  const { nonce } = await api<{ nonce: string }>('POST', '/presence/challenge', { body: { type } });
  const proof = await api<{ attestation: Attestation; signature: string }>('POST', '/__agent/attest', { body: { nonce } });
  return api<Punch>('POST', '/presence/punch', { body: proof });
}
function PunchPage() {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  async function go(type: PunchType) {
    setBusy(true); setMsg('Verification du routeur...');
    try {
      const p = await punch(type);
      setMsg(`${type === 'IN' ? 'Entree' : 'Sortie'} enregistree a ${new Date(p.at).toLocaleTimeString('fr')}${p.simulated ? ' (RESEAU SIMULE)' : ''}.`);
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <Card>
      <h1>Pointage</h1>
      <Button disabled={busy} onClick={() => { void go('IN'); }}>Pointer mon entree</Button>{' '}
      <Button disabled={busy} onClick={() => { void go('OUT'); }}>Pointer ma sortie</Button>
      <p role="status">{msg}</p>
      <Todo ticket="WEB-PUNCH-002">Pointages du jour.</Todo>
    </Card>
  );
}
const feature: Feature = { path: 'pointage', label: 'Pointage', order: 10, Component: PunchPage };
export default feature;
