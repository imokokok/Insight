'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Database,
  Clock,
  RefreshCw,
  Filter,
  X,
  ChevronRight,
  Timer,
  User,
  Wallet,
  FileText,
  Link2,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

import {
  type DataRequest,
  type DataRequestStats,
  type DataRequestType,
  type DataRequestStatus,
  type DataRequestFilter,
  DATA_REQUEST_TYPE_STYLES,
  DATA_REQUEST_STATUS_STYLES,
} from '@/lib/oracles/uma/dataRequestTypes';

const MOCK_DATA_REQUESTS: DataRequest[] = [
  {
    id: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef12',
    type: 'price',
    status: 'pending',
    timestamp: Date.now() - 3600000,
    requester: '0x1234567890abcdef1234567890abcdef12345678',
    proposer: '0xabcdef1234567890abcdef1234567890abcdef12',
    ancillaryData: 'BTC/USD',
    proposedValue: '43250.50',
    expirationTime: Date.now() + 7200000,
    bondAmount: 1000,
    chain: 'Ethereum',
  },
  {
    id: '0x2b3c4d5e6f7890abcdef1234567890abcdef1234',
    type: 'state',
    status: 'validated',
    timestamp: Date.now() - 7200000,
    requester: '0x2345678901abcdef2345678901abcdef23456789',
    proposer: '0xbcdef1234567890bcdef1234567890bcdef1234',
    ancillaryData: 'Governance Proposal #42',
    proposedValue: 'PASSED',
    expirationTime: Date.now() + 3600000,
    bondAmount: 5000,
    chain: 'Arbitrum',
  },
  {
    id: '0x3c4d5e6f7890abcdef1234567890abcdef123456',
    type: 'custom',
    status: 'disputed',
    timestamp: Date.now() - 10800000,
    requester: '0x3456789012abcdef3456789012abcdef34567890',
    proposer: '0xcdef1234567890cdef1234567890cdef12345678',
    ancillaryData: 'Sports Event Result',
    proposedValue: 'Team A Wins',
    expirationTime: Date.now() + 1800000,
    bondAmount: 2500,
    chain: 'Optimism',
  },
  {
    id: '0x4d5e6f7890abcdef1234567890abcdef12345678',
    type: 'price',
    status: 'finalized',
    timestamp: Date.now() - 86400000,
    requester: '0x4567890123abcdef4567890123abcdef45678901',
    proposer: '0xdef1234567890def1234567890def12345678901',
    ancillaryData: 'ETH/USD',
    proposedValue: '2285.75',
    expirationTime: Date.now() - 43200000,
    bondAmount: 2000,
    chain: 'Ethereum',
  },
  {
    id: '0x5e6f7890abcdef1234567890abcdef1234567890',
    type: 'state',
    status: 'pending',
    timestamp: Date.now() - 1800000,
    requester: '0x5678901234abcdef5678901234abcdef56789012',
    proposer: '0xef1234567890ef1234567890ef1234567890ef12',
    ancillaryData: 'Insurance Claim #789',
    proposedValue: 'VALID',
    expirationTime: Date.now() + 9000000,
    bondAmount: 7500,
    chain: 'Polygon',
  },
  {
    id: '0x6f7890abcdef1234567890abcdef1234567890ab',
    type: 'price',
    status: 'validated',
    timestamp: Date.now() - 5400000,
    requester: '0x6789012345abcdef6789012345abcdef67890123',
    proposer: '0xf1234567890f1234567890f1234567890f123456',
    ancillaryData: 'SOL/USD',
    proposedValue: '98.42',
    expirationTime: Date.now() + 5400000,
    bondAmount: 1500,
    chain: 'Ethereum',
  },
  {
    id: '0x7890abcdef1234567890abcdef1234567890abcd',
    type: 'custom',
    status: 'finalized',
    timestamp: Date.now() - 172800000,
    requester: '0x7890123456abcdef7890123456abcdef78901234',
    proposer: '0x1234567890123456789012345678901234567890',
    ancillaryData: 'Weather Data NYC',
    proposedValue: 'Sunny, 72F',
    expirationTime: Date.now() - 86400000,
    bondAmount: 3000,
    chain: 'Arbitrum',
  },
  {
    id: '0x890abcdef1234567890abcdef1234567890abcde',
    type: 'price',
    status: 'disputed',
    timestamp: Date.now() - 14400000,
    requester: '0x8901234567abcdef8901234567abcdef89012345',
    proposer: '0x2345678901234567890123456789012345678901',
    ancillaryData: 'LINK/USD',
    proposedValue: '14.25',
    expirationTime: Date.now() + 3600000,
    bondAmount: 4000,
    chain: 'Optimism',
  },
];

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatTimeRemaining(expirationTime: number, t: ReturnType<typeof useTranslations>): string {
  const seconds = Math.floor((expirationTime - Date.now()) / 1000);
  if (seconds <= 0) return t('uma.dataRequest.expired');
  if (seconds < 60) return t('uma.common.timeRemaining.seconds', { count: seconds });
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('uma.common.timeRemaining.minutes', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('uma.common.timeRemaining.hoursMinutes', { hours, minutes: minutes % 60 });
  const days = Math.floor(hours / 24);
  return t('uma.common.timeRemaining.daysHours', { days, hours: hours % 24 });
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

interface DataRequestBrowserProps {
  className?: string;
}

export function DataRequestBrowser({ className }: DataRequestBrowserProps) {
  const t = useTranslations();
  const [requests, setRequests] = useState<DataRequest[]>(MOCK_DATA_REQUESTS);
  const [filter, setFilter] = useState<DataRequestFilter>({ type: 'all', status: 'all' });
  const [selectedRequest, setSelectedRequest] = useState<DataRequest | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const stats = useMemo<DataRequestStats>(() => {
    return {
      total: requests.length,
      pending: requests.filter((r) => r.status === 'pending').length,
      validated: requests.filter((r) => r.status === 'validated').length,
      disputed: requests.filter((r) => r.status === 'disputed').length,
      finalized: requests.filter((r) => r.status === 'finalized').length,
    };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      if (filter.type !== 'all' && request.type !== filter.type) return false;
      if (filter.status !== 'all' && request.status !== filter.status) return false;
      return true;
    });
  }, [requests, filter]);

  const refreshData = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLastUpdated(new Date());
      setIsRefreshing(false);
    }, 1000);
  }, []);

  useEffect(() => {
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, [refreshData]);

  const handleTypeFilter = (type: DataRequestType | 'all') => {
    setFilter((prev) => ({ ...prev, type }));
  };

  const handleStatusFilter = (status: DataRequestStatus | 'all') => {
    setFilter((prev) => ({ ...prev, status }));
  };

  const openDetailModal = (request: DataRequest) => {
    setSelectedRequest(request);
  };

  const closeDetailModal = () => {
    setSelectedRequest(null);
  };

  return (
    <div className={className}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900">
              {t('uma.dataRequest.title')}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              {t('uma.dataRequest.lastUpdated')}: {lastUpdated.toLocaleTimeString()}
            </span>
            <button
              onClick={refreshData}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {t('uma.dataRequest.refresh')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{t('uma.dataRequest.total')}</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-3">
            <p className="text-xs text-amber-600 uppercase tracking-wider">{t('uma.crossChain.pending')}</p>
            <p className="text-2xl font-semibold text-amber-700">{stats.pending}</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3">
            <p className="text-xs text-emerald-600 uppercase tracking-wider">{t('uma.dataRequest.validated')}</p>
            <p className="text-2xl font-semibold text-emerald-700">{stats.validated}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-xs text-red-600 uppercase tracking-wider">{t('uma.disputes.rejected')}</p>
            <p className="text-2xl font-semibold text-red-700">{stats.disputed}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-600 uppercase tracking-wider">{t('uma.dataRequest.finalized')}</p>
            <p className="text-2xl font-semibold text-blue-700">{stats.finalized}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">{t('uma.dataRequest.type')}:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['all', 'price', 'state', 'custom'] as const).map((type) => (
              <button
                key={type}
                onClick={() => handleTypeFilter(type)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  filter.type === type
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {type === 'all' ? t('uma.common.all') : t(`uma.dataRequest.types.${type}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="min-w-[800px] sm:min-w-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('uma.disputes.id')}
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('uma.dataRequest.type')}
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('uma.disputes.status')}
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('uma.dataRequest.proposedValue')}
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('uma.dataRequest.bond')}
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('uma.disputeResolution.timestamp')}
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('uma.dataRequest.chain')}
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('uma.crossChain.action')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRequests.map((request) => {
                  const typeStyle = DATA_REQUEST_TYPE_STYLES[request.type];
                  const statusStyle = DATA_REQUEST_STATUS_STYLES[request.status];

                  return (
                    <tr
                      key={request.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => openDetailModal(request)}
                    >
                      <td className="py-3 px-4">
                        <span className="text-sm font-mono text-gray-600">
                          {request.id.slice(0, 10)}...
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${typeStyle.bgColor} ${typeStyle.color} ${typeStyle.borderColor} border`}
                        >
                          {request.type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs ${statusStyle.color}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${statusStyle.dotColor}`} />
                          {request.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-900 font-medium">
                          {request.proposedValue}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">
                          ${request.bondAmount.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(request.timestamp)}
                          </span>
                          <span className="text-xs text-gray-400">
                            {t('uma.dataRequest.expires')}: {formatTimeRemaining(request.expirationTime, t)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">{request.chain}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <ChevronRight className="w-4 h-4 text-gray-400 inline-block" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {filteredRequests.length === 0 && (
          <div className="text-center py-12">
            <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {t('uma.dataRequest.noResults')}
            </p>
          </div>
        )}
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={closeDetailModal}
            />

            <div className="relative bg-white rounded-lg max-w-2xl w-full p-6 transform transition-all max-h-[90vh] overflow-y-auto shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {t('uma.dataRequest.detailTitle')}
                </h2>
                <button
                  onClick={closeDetailModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                      {t('uma.dataRequest.requestId')}
                    </p>
                    <p className="text-sm font-mono text-gray-900 break-all">
                      {selectedRequest.id}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('uma.dataRequest.type')}</p>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${DATA_REQUEST_TYPE_STYLES[selectedRequest.type].bgColor} ${DATA_REQUEST_TYPE_STYLES[selectedRequest.type].color} ${DATA_REQUEST_TYPE_STYLES[selectedRequest.type].borderColor} border`}
                    >
                      {selectedRequest.type}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('uma.disputes.status')}</p>
                    <span
                      className={`inline-flex items-center gap-1.5 text-sm ${DATA_REQUEST_STATUS_STYLES[selectedRequest.status].color}`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${DATA_REQUEST_STATUS_STYLES[selectedRequest.status].dotColor}`}
                      />
                      {selectedRequest.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('uma.dataRequest.chain')}</p>
                    <p className="text-sm text-gray-900">{selectedRequest.chain}</p>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <h4 className="text-sm font-medium text-gray-700">{t('uma.dataRequest.requestData')}</h4>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t('uma.dataRequest.ancillaryData')}</p>
                      <p className="text-sm text-gray-900">
                        {selectedRequest.ancillaryData || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t('uma.dataRequest.proposedValue')}</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {selectedRequest.proposedValue}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Wallet className="w-4 h-4 text-gray-400" />
                    <h4 className="text-sm font-medium text-gray-700">{t('uma.dataRequest.participants')}</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">{t('uma.dataRequest.requester')}</p>
                        <p className="text-sm font-mono text-gray-900">
                          {truncateAddress(selectedRequest.requester)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">{t('uma.dataRequest.proposer')}</p>
                        <p className="text-sm font-mono text-gray-900">
                          {truncateAddress(selectedRequest.proposer)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Timer className="w-4 h-4 text-gray-400" />
                    <h4 className="text-sm font-medium text-gray-700">{t('uma.dataRequest.timing')}</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t('uma.dataRequest.created')}</p>
                      <p className="text-sm text-gray-900">
                        {new Date(selectedRequest.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t('uma.dataRequest.expiration')}</p>
                      <p className="text-sm text-gray-900">
                        {new Date(selectedRequest.expirationTime).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Link2 className="w-4 h-4 text-gray-400" />
                    <h4 className="text-sm font-medium text-gray-700">{t('uma.dataRequest.bond')}</h4>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-2xl font-bold text-blue-700">
                      ${selectedRequest.bondAmount.toLocaleString()}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">{t('uma.dataRequest.stakedBondAmount')}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={closeDetailModal}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  {t('uma.dataRequest.close')}
                </button>
                <button className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors">
                  {t('uma.dataRequest.viewOnExplorer')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
