// GELE : Alain. Chaque dossier features/<nom>/index.tsx exporte un Feature par defaut.
import type { ComponentType } from 'react';
import type { Role } from '@kit-pulse/contracts';
export interface Feature { path: string; label: string; order: number; roles?: Role[]; Component: ComponentType }
// Decouverte automatique : aucun fichier de routes partage a modifier.
const found = import.meta.glob<{ default: Feature }>('../features/*/index.tsx', { eager: true });
export const FEATURES: Feature[] = Object.values(found).map((m) => m.default).sort((a, b) => a.order - b.order);
