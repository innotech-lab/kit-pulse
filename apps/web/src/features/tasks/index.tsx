// Abigael. Modele : features/team/index.tsx.
import type { Feature } from '../../core/feature.ts';
import { Card, Todo } from '../../ui/components.tsx';
const TasksPage = () => <Card><h1>Mes taches</h1><Todo ticket="WEB-TASK-001">Taches du jour et progression.</Todo></Card>;
const feature: Feature = { path: 'tasks', label: 'Mes taches', order: 20, Component: TasksPage };
export default feature;
