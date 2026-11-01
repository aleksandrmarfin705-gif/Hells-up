import { route } from '@/lib/api';
import { listCases } from '@/lib/catalog';

export const GET = route({}, async () => ({ cases: await listCases() }));
