// Abigael. Modele : features/team/index.tsx.
import type { Feature } from '../../core/feature.ts';
import { Card, Todo } from '../../ui/components.tsx';
const AttendancePage = () => <Card><h1>Presences</h1><Todo ticket="WEB-ATT-001">Mes journees et mes justifications.</Todo></Card>;
const feature: Feature = { path: 'attendance', label: 'Presences', order: 50, Component: AttendancePage };
export default feature;
