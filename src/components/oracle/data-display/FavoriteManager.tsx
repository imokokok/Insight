'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

import {
  Heart,
  Star,
  FolderPlus,
  Trash2,
  GripVertical,
  ChevronDown,
  X,
  Check,
  Edit3,
} from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useFavorites, useToggleFavorite } from '@/hooks/useFavorites';
import { useUser } from '@/stores/authStore';
import { useTranslations } from '@/i18n';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('FavoriteManager');

interface FavoriteGroup {
  id: string;
  name: string;
  items: FavoriteItem[];
}

interface FavoriteItem {
  id: string;
  type: 'dapi' | 'airnode' | 'chain';
  itemId: string;
  itemName: string;
  addedAt: Date;
  groupId?: string;
}

const STORAGE_KEY = 'api3_favorite_groups';

interface FavoriteManagerProps {
  type: 'dapi' | 'airnode' | 'chain';
  itemId: string;
  itemName: string;
  onFavoriteChange?: (isFavorited: boolean) => void;
  showGroups?: boolean;
  compact?: boolean;
}

export function FavoriteManager({
  type,
  itemId,
  itemName,
  onFavoriteChange,
  showGroups = true,
  compact = false,
}: FavoriteManagerProps) {
  const t = useTranslations();
  const user = useUser();
  const [showMenu, setShowMenu] = useState(false);
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [groups, setGroups] = useState<FavoriteGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [localFavorites, setLocalFavorites] = useState<FavoriteItem[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  const { toggleFavorite, isToggling } = useToggleFavorite();
  const { favorites } = useFavorites();

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setGroups(JSON.parse(stored));
      } catch (error) {
        logger.error(
          'Failed to parse groups',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }

    const favKey = `api3_favorites_${type}`;
    const storedFav = localStorage.getItem(favKey);
    if (storedFav) {
      try {
        setLocalFavorites(
          JSON.parse(storedFav).map((f: FavoriteItem) => ({
            ...f,
            addedAt: new Date(f.addedAt),
          }))
        );
      } catch (error) {
        logger.error(
          'Failed to parse favorites',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
  }, [type]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
        setShowGroupManager(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isFavorited = localFavorites.some((f) => f.itemId === itemId && f.type === type);
  const currentFavorite = localFavorites.find((f) => f.itemId === itemId && f.type === type);

  const handleToggleFavorite = useCallback(async () => {
    if (!user) {
      const newFavorites = isFavorited
        ? localFavorites.filter((f) => !(f.itemId === itemId && f.type === type))
        : [
            ...localFavorites,
            {
              id: Date.now().toString(),
              type,
              itemId,
              itemName,
              addedAt: new Date(),
              groupId: selectedGroupId || undefined,
            },
          ];

      setLocalFavorites(newFavorites);
      localStorage.setItem(`api3_favorites_${type}`, JSON.stringify(newFavorites));
      onFavoriteChange?.(!isFavorited);
      return;
    }

    try {
      await toggleFavorite(itemName, 'oracle_config', {
        selectedOracles: [itemId],
      });
      onFavoriteChange?.(!isFavorited);
    } catch (error) {
      logger.error(
        'Failed to toggle favorite',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }, [
    user,
    isFavorited,
    localFavorites,
    type,
    itemId,
    itemName,
    selectedGroupId,
    toggleFavorite,
    onFavoriteChange,
  ]);

  const createGroup = useCallback(() => {
    if (!newGroupName.trim()) return;

    const newGroup: FavoriteGroup = {
      id: Date.now().toString(),
      name: newGroupName.trim(),
      items: [],
    };

    const updated = [...groups, newGroup];
    setGroups(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setNewGroupName('');
  }, [newGroupName, groups]);

  const deleteGroup = useCallback(
    (groupId: string) => {
      const updated = groups.filter((g) => g.id !== groupId);
      setGroups(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      if (selectedGroupId === groupId) {
        setSelectedGroupId(null);
      }
    },
    [groups, selectedGroupId]
  );

  const renameGroup = useCallback(
    (groupId: string, newName: string) => {
      const updated = groups.map((g) => (g.id === groupId ? { ...g, name: newName } : g));
      setGroups(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setEditingGroupId(null);
      setEditingName('');
    },
    [groups]
  );

  const moveToGroup = useCallback(
    (groupId: string | null) => {
      if (!currentFavorite) return;

      const updated = localFavorites.map((f) =>
        f.id === currentFavorite.id ? { ...f, groupId: groupId || undefined } : f
      );

      setLocalFavorites(updated);
      localStorage.setItem(`api3_favorites_${type}`, JSON.stringify(updated));
      setSelectedGroupId(groupId);
      setShowMenu(false);
    },
    [currentFavorite, localFavorites, type]
  );

  if (compact) {
    return (
      <button
        onClick={handleToggleFavorite}
        disabled={isToggling}
        className={`p-1.5 rounded-lg transition-colors ${
          isFavorited
            ? 'text-red-500 hover:text-red-600 bg-red-50'
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
        }`}
        aria-label={isFavorited ? t('api3.favorites.remove') : t('api3.favorites.add')}
      >
        <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
      </button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <div className="flex gap-2">
        <Button
          variant={isFavorited ? 'primary' : 'secondary'}
          size="sm"
          onClick={handleToggleFavorite}
          disabled={isToggling}
          className="gap-1.5"
        >
          <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
          {isFavorited
            ? t('api3.favorites.favorited') || 'Favorited'
            : t('api3.favorites.addToFavorites') || 'Favorite'}
        </Button>

        {showGroups && isFavorited && (
          <Button variant="secondary" size="sm" onClick={() => setShowMenu(!showMenu)}>
            <FolderPlus className="w-4 h-4" />
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
        )}
      </div>

      {showMenu && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg border border-gray-200 shadow-lg z-50">
          <div className="p-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">
              {t('api3.favorites.addToGroup') || 'Add to Group'}
            </h3>
          </div>

          <div className="p-2">
            <button
              onClick={() => moveToGroup(null)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                !currentFavorite?.groupId
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Star className="w-4 h-4" />
              {t('api3.favorites.ungrouped') || 'Ungrouped'}
              {!currentFavorite?.groupId && <Check className="w-4 h-4 ml-auto" />}
            </button>

            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => moveToGroup(group.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                  currentFavorite?.groupId === group.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FolderPlus className="w-4 h-4" />
                {group.name}
                {currentFavorite?.groupId === group.id && <Check className="w-4 h-4 ml-auto" />}
              </button>
            ))}
          </div>

          <div className="p-2 border-t border-gray-100">
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => setShowGroupManager(true)}
            >
              <Edit3 className="w-4 h-4 mr-1.5" />
              {t('api3.favorites.manageGroups') || 'Manage Groups'}
            </Button>
          </div>
        </div>
      )}

      {showGroupManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {t('api3.favorites.groupManager') || 'Group Manager'}
              </h3>
              <button
                onClick={() => setShowGroupManager(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
              <div className="flex gap-2">
                <Input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder={t('api3.favorites.newGroupName') || 'New group name...'}
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && createGroup()}
                />
                <Button size="sm" onClick={createGroup} disabled={!newGroupName.trim()}>
                  {t('common.add') || 'Add'}
                </Button>
              </div>

              {groups.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500">
                  {t('api3.favorites.noGroups') || 'No groups created yet'}
                </div>
              ) : (
                <div className="space-y-2">
                  {groups.map((group) => (
                    <div
                      key={group.id}
                      className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg"
                    >
                      <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                      {editingGroupId === group.id ? (
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              renameGroup(group.id, editingName);
                            } else if (e.key === 'Escape') {
                              setEditingGroupId(null);
                            }
                          }}
                        />
                      ) : (
                        <span className="flex-1 text-sm font-medium text-gray-700">
                          {group.name}
                        </span>
                      )}
                      <button
                        onClick={() => {
                          setEditingGroupId(group.id);
                          setEditingName(group.name);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteGroup(group.id)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-lg">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setShowGroupManager(false)}
              >
                {t('common.close') || 'Close'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
