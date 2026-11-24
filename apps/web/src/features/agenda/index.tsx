// Alain. Modele : features/team/index.tsx.
import type { Feature } from '../../core/feature.ts';
import { Card, Todo } from '../../ui/components.tsx';
const AgendaPage = () => <Card><h1>Agenda</h1><Todo ticket="WEB-AGD-001">Vue semaine, creation et modification.</Todo></Card>;
const feature: Feature = { path: 'agenda', label: 'Agenda', order: 30, Component: AgendaPage };
export default feature;
