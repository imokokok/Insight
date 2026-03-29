export type DataRequestType = 'price' | 'state' | 'custom';
export type DataRequestStatus = 'pending' | 'validated' | 'disputed' | 'finalized';

export interface DataRequest {
  id: string;
  type: DataRequestType;
  status: DataRequestStatus;
  timestamp: number;
  requester: string;
  proposer: string;
  ancillaryData?: string;
  proposedValue: string;
  expirationTime: number;
  bondAmount: number;
  chain: string;
}

export interface DataRequestStats {
  total: number;
  pending: number;
  validated: number;
  disputed: number;
  finalized: number;
}

export interface DataRequestFilter {
  type: DataRequestType | 'all';
  status: DataRequestStatus | 'all';
}

export const DATA_REQUEST_TYPE_LABELS: Record<DataRequestType, string> = {
  price: 'uma.dataRequest.types.price',
  state: 'uma.dataRequest.types.state',
  custom: 'uma.dataRequest.types.custom',
};

export const DATA_REQUEST_STATUS_LABELS: Record<DataRequestStatus, string> = {
  pending: 'uma.dataRequest.status.pending',
  validated: 'uma.dataRequest.status.validated',
  disputed: 'uma.dataRequest.status.disputed',
  finalized: 'uma.dataRequest.status.finalized',
};

export const DATA_REQUEST_TYPE_STYLES: Record<
  DataRequestType,
  { color: string; bgColor: string; borderColor: string }
> = {
  price: {
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  state: {
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  custom: {
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
};

export const DATA_REQUEST_STATUS_STYLES: Record<
  DataRequestStatus,
  { color: string; dotColor: string }
> = {
  pending: {
    color: 'text-amber-600',
    dotColor: 'bg-amber-500',
  },
  validated: {
    color: 'text-emerald-600',
    dotColor: 'bg-emerald-500',
  },
  disputed: {
    color: 'text-red-600',
    dotColor: 'bg-red-500',
  },
  finalized: {
    color: 'text-blue-600',
    dotColor: 'bg-blue-500',
  },
};
