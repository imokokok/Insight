import { createOptionsHandler } from '@/lib/api/handler';
import { createSnapshotHistoryRoute } from '@/lib/api/services/snapshotHistoryRoute';

export const OPTIONS = createOptionsHandler();
/** Fifteen-minute history retains its precise snapshot_ts and grain field. */
export const GET = createSnapshotHistoryRoute('price');
