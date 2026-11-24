// Abigael. Modele : features/team/index.tsx.
import type { Feature } from '../../core/feature.ts';
import { Card, Todo } from '../../ui/components.tsx';
const ReviewsPage = () => <Card><h1>Justifications a traiter</h1><Todo ticket="WEB-JUS-001">Accepter ou refuser.</Todo></Card>;
const feature: Feature = { path: 'reviews', label: 'Justifications a traiter', order: 70, roles: ['ADMIN', 'HR'], Component: ReviewsPage };
export default feature;
