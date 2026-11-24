// Francis. Modele : features/team/index.tsx.
import type { Feature } from '../../core/feature.ts';
import { Card, Todo } from '../../ui/components.tsx';
const DashboardPage = () => <Card><h1>Tableau de bord</h1><Todo ticket="WEB-DASH-001">Vue equipe et vue individuelle.</Todo></Card>;
const feature: Feature = { path: 'dashboard', label: 'Tableau de bord', order: 60, roles: ['ADMIN', 'HR', 'COORDINATOR'], Component: DashboardPage };
export default feature;
