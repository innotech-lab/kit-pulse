// Stany. Cle privee du poste : creee une fois, ne quitte jamais la machine.
import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, sign, type KeyObject } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { attestationPayload, type Attestation } from '@kit-pulse/contracts';

export function loadKeys(dir: string) {
  const file = resolve(dir, 'device-key.pem');
  if (!existsSync(file)) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, generateKeyPairSync('ed25519').privateKey.export({ format: 'pem', type: 'pkcs8' }), { mode: 0o600 });
  }
  const privateKey: KeyObject = createPrivateKey(readFileSync(file));
  const publicKey = createPublicKey(privateKey).export({ format: 'der', type: 'spki' }).toString('base64');
  const keyId = createHash('sha256').update(publicKey).digest('hex').slice(0, 32);
  return { publicKey, keyId, sign: (a: Attestation) => sign(null, Buffer.from(attestationPayload(a)), privateKey).toString('base64') };
}
