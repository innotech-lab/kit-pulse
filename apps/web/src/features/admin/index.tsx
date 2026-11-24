// Francis. Modele : features/team/index.tsx.
import type { Feature } from '../../core/feature.ts';
import { Card, Todo } from '../../ui/components.tsx';
const AdminPage = () => <Card><h1>Administration</h1><Todo ticket="WEB-ADM-001">Comptes, IDs, postes, reseaux.</Todo></Card>;
const feature: Feature = { path: 'admin', label: 'Administration', order: 80, roles: ['ADMIN'], Component: AdminPage };
export default feature;
