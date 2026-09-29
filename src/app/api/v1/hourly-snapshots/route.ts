import { createOptionsHandler } from '@/lib/api/handler';
import { createSnapshotHistoryRoute } from '@/lib/api/services/snapshotHistoryRoute';

export const OPTIONS = createOptionsHandler();
export const GET = createSnapshotHistoryRoute('hourly');
