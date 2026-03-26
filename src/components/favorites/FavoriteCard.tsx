'use client';

import { useState, useCallback } from 'react';

import { useRouter } from 'next/navigation';

import { mapConfigTypeFromDB, type FavoriteConfig, useRemoveFavorite } from '@/hooks';
import { useTranslations } from '@/i18n';
import type { UserFavorite } from '@/lib/supabase/queries';

interface FavoriteCardProps {
  favorite: UserFavorite;
  onApply?: (config: FavoriteConfig) => void;
  onEdit?: (favorite: UserFavorite) => void;
  onDelete?: (favoriteId: string) => void;
}

export function FavoriteCard({ favorite, onApply, onEdit, onDelete }: FavoriteCardProps) {
  const router = useRouter();
  const t = useTranslations();
  const { removeFavorite, isRemoving } = useRemoveFavorite();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const configType = mapConfigTypeFromDB(favorite.config_type);
  const config = favorite.config_data as FavoriteConfig;

  const handleApply = () => {
    if (onApply) {
      onApply(config);
    } else {
      switch (configType) {
        case 'oracle_config':
          router.push(
            `/cross-oracle?oracles=${config.selectedOracles?.join(',')}&symbol=${config.symbol}`
          );
          break;
        case 'symbol':
          router.push(`/price-query?symbol=${config.symbol}`);
          break;
        case 'chain_config':
          router.push(`/cross-chain?chain=${config.chain}`);
          break;
      }
    }
  };

  const handleDelete = async () => {
    const success = await removeFavorite(favorite.id!, configType);
    if (success) {
      onDelete?.(favorite.id!);
    }
  };

  const getConfigPreview = useCallback(() => {
    switch (configType) {
      case 'oracle_config':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{t('favorites.card.symbol')}</span>
              <span className="text-sm font-medium text-gray-900">{config.symbol}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {config.selectedOracles?.slice(0, 3).map((oracle) => (
                <span key={oracle} className="px-2 py-0.5 text-xs bg-primary-50 text-primary-700 ">
                  {oracle}
                </span>
              ))}
              {(config.selectedOracles?.length || 0) > 3 && (
                <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 ">
                  +{(config.selectedOracles?.length || 0) - 3}
                </span>
              )}
            </div>
          </div>
        );
      case 'symbol':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{t('favorites.card.symbol')}</span>
              <span className="text-sm font-medium text-gray-900">{config.symbol}</span>
            </div>
            {config.chains && config.chains.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {config.chains.slice(0, 3).map((chain) => (
                  <span key={chain} className="px-2 py-0.5 text-xs bg-success-50 text-success-700 ">
                    {chain}
                  </span>
                ))}
                {config.chains.length > 3 && (
                  <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 ">
                    +{config.chains.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      case 'chain_config':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{t('favorites.card.chain')}</span>
              <span className="text-sm font-medium text-gray-900">{config.chain}</span>
            </div>
            {config.symbols && config.symbols.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {config.symbols.slice(0, 3).map((symbol) => (
                  <span key={symbol} className="px-2 py-0.5 text-xs bg-purple-50 text-purple-700 ">
                    {symbol}
                  </span>
                ))}
                {config.symbols.length > 3 && (
                  <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 ">
                    +{config.symbols.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        );
    }
  }, [configType, config, t]);

  const getTypeIcon = useCallback(() => {
    switch (configType) {
      case 'oracle_config':
        return (
          <div className="w-10 h-10  bg-primary-100 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-primary-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
        );
      case 'symbol':
        return (
          <div className="w-10 h-10  bg-success-100 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-success-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        );
      case 'chain_config':
        return (
          <div className="w-10 h-10  bg-purple-100 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
          </div>
        );
    }
  }, [configType]);

  const getTypeLabel = useCallback(() => {
    switch (configType) {
      case 'oracle_config':
        return t('favorites.card.type.oracleConfig');
      case 'symbol':
        return t('favorites.card.type.symbol');
      case 'chain_config':
        return t('favorites.card.type.chainConfig');
    }
  }, [configType, t]);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  return (
    <div className="bg-white border border-gray-200  p-4 hover: transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          {getTypeIcon()}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 truncate">{favorite.name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{getTypeLabel()}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit?.(favorite)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100  transition-colors"
            title={t('actions.edit')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isRemoving}
            className="p-1.5 text-gray-400 hover:text-danger-600 hover:bg-danger-50  transition-colors disabled:opacity-50"
            title={t('actions.delete')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="mb-4">{getConfigPreview()}</div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-400">{formatDate(favorite.created_at || '')}</span>
        <button
          onClick={handleApply}
          className="px-3 py-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700  transition-colors"
        >
          {t('actions.apply')}
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white  p-6 max-w-sm w-full mx-4 ">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t('favorites.card.deleteConfirm.title')}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {t('favorites.card.deleteConfirm.message').replace('{name}', favorite.name)}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200  transition-colors"
              >
                {t('actions.cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={isRemoving}
                className="px-4 py-2 text-sm font-medium text-white bg-danger-600 hover:bg-danger-700  transition-colors disabled:opacity-50"
              >
                {isRemoving ? t('actions.deleting') : t('actions.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
