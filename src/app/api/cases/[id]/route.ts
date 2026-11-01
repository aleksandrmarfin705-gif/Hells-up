import { route, uuid } from '@/lib/api';
import { ApiError } from '@/lib/errors';
import { getCaseDetail } from '@/lib/catalog';

export const GET = route({}, async ({ params }) => {
  if (!uuid.safeParse(params.id).success) throw new ApiError(404, 'case_not_found', 'Кейс не найден');
  const detail = await getCaseDetail(params.id);
  if (!detail) throw new ApiError(404, 'case_not_found', 'Кейс не найден');
  return { case: detail };
});
