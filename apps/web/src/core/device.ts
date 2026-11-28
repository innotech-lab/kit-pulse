// V2-L1 : identite de l'appareil cote navigateur, independante du compte connecte.
// - Cle ECDSA P-256 creee une fois, NON EXTRACTIBLE (le code de la page ne peut pas la lire), gardee dans IndexedDB.
// - Empreinte de secours (hash) : sert seulement a dire « ressemble a l'appareil de… » quand la cle est absente.
// - Detection (approximative) de la navigation privee.
import { api } from './api.ts';

const DB = 'kit-pulse-device', STORE = 'keys', ID = 'device';

function idb<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(STORE);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction(STORE, mode);
      const req = run(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => open.result.close();
    };
  });
}
const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));

interface Stored { pair: CryptoKeyPair; publicKey: string }

/** Cle de l'appareil : creee au premier appel, puis toujours la meme dans ce navigateur. */
async function deviceKey(): Promise<Stored | null> {
  if (!globalThis.crypto?.subtle || !globalThis.indexedDB) return null;
  try {
    const found = await idb<Stored | undefined>('readonly', (s) => s.get(ID));
    if (found?.pair?.privateKey) return found;
    const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
    const publicKey = b64(await crypto.subtle.exportKey('spki', pair.publicKey));
    const stored = { pair, publicKey };
    await idb('readwrite', (s) => s.put(stored, ID));
    return stored;
  } catch { return null; }
}

async function sha256Hex(text: string): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Empreinte de secours : caracteristiques stables de la machine (pas du navigateur seul). */
export async function deviceFingerprint(): Promise<string | null> {
  try {
    let gpu = '';
    try {
      const gl = document.createElement('canvas').getContext('webgl') as WebGLRenderingContext | null;
      const ext = gl?.getExtension('WEBGL_debug_renderer_info');
      gpu = gl && ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    } catch { /* WebGL indisponible */ }
    const nav = navigator as Navigator & { deviceMemory?: number };
    const parts = [screen.width, screen.height, screen.colorDepth, window.devicePixelRatio, nav.hardwareConcurrency, nav.deviceMemory ?? '',
      Intl.DateTimeFormat().resolvedOptions().timeZone, navigator.platform, gpu, navigator.maxTouchPoints];
    return (await sha256Hex(parts.join('|'))).slice(0, 32);
  } catch { return null; }
}

/** Navigation privee probable (heuristique : quota de stockage tres reduit). null = indetermine. */
export async function probablyPrivate(): Promise<boolean | null> {
  try {
    const est = await navigator.storage?.estimate?.();
    if (!est?.quota) return null;
    return est.quota < 200 * 1024 * 1024;
  } catch { return null; }
}

export interface DeviceProof { keyId: string | null; signature: string | null; fingerprint: string | null; privateMode: boolean | null; status: string | null; mine: boolean | null }

/** Enregistre (si besoin) l'appareil au nom du compte connecte et signe le defi du serveur. */
export async function proveDevice(nonce: string, label: string): Promise<DeviceProof> {
  const [key, fingerprint, privateMode] = await Promise.all([deviceKey(), deviceFingerprint(), probablyPrivate()]);
  if (!key) return { keyId: null, signature: null, fingerprint, privateMode, status: null, mine: null };
  const reg = await api<{ keyId: string; status: string; mine: boolean }>('POST', '/devices/web/register', { body: { publicKey: key.publicKey, label, fingerprint } });
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key.pair.privateKey, new TextEncoder().encode(nonce));
  return { keyId: reg.keyId, signature: b64(sig), fingerprint, privateMode, status: reg.status, mine: reg.mine };
}

/** Nom propose pour un nouvel appareil : « PC Windows », « Téléphone Android »… */
export function defaultDeviceLabel(owner: string): string {
  const ua = navigator.userAgent;
  const kind = /Android/i.test(ua) ? 'Téléphone Android' : /iPhone/i.test(ua) ? 'iPhone' : /iPad/i.test(ua) ? 'iPad' : /Mac/i.test(ua) ? 'Mac' : /Windows/i.test(ua) ? 'PC Windows' : 'Appareil';
  return `${kind} de ${owner}`;
}
