'use client';

import { useReducer, useCallback, useMemo } from 'react';
import { SearchGroup, KeyboardNavigationState, SearchAction } from './types';

const initialState: KeyboardNavigationState = {
  activeGroupIndex: 0,
  activeItemIndex: -1,
};

function navigationReducer(
  state: KeyboardNavigationState,
  action: SearchAction,
  groups: SearchGroup[]
): KeyboardNavigationState {
  const totalGroups = groups.length;
  if (totalGroups === 0) return initialState;

  switch (action.type) {
    case 'MOVE_DOWN': {
      const currentGroup = groups[state.activeGroupIndex];
      if (!currentGroup) return state;

      const nextItemIndex = state.activeItemIndex + 1;

      // Move to next item in current group
      if (nextItemIndex < currentGroup.results.length) {
        return {
          ...state,
          activeItemIndex: nextItemIndex,
        };
      }

      // Move to first item of next group
      const nextGroupIndex = state.activeGroupIndex + 1;
      if (nextGroupIndex < totalGroups) {
        return {
          activeGroupIndex: nextGroupIndex,
          activeItemIndex: 0,
        };
      }

      // Stay at last position
      return state;
    }

    case 'MOVE_UP': {
      const prevItemIndex = state.activeItemIndex - 1;

      // Move to previous item in current group
      if (prevItemIndex >= 0) {
        return {
          ...state,
          activeItemIndex: prevItemIndex,
        };
      }

      // Move to last item of previous group
      const prevGroupIndex = state.activeGroupIndex - 1;
      if (prevGroupIndex >= 0) {
        const prevGroup = groups[prevGroupIndex];
        return {
          activeGroupIndex: prevGroupIndex,
          activeItemIndex: prevGroup.results.length - 1,
        };
      }

      // Stay at first position
      return state;
    }

    case 'MOVE_NEXT_GROUP': {
      const nextGroupIndex = state.activeGroupIndex + 1;
      if (nextGroupIndex < totalGroups) {
        return {
          activeGroupIndex: nextGroupIndex,
          activeItemIndex: groups[nextGroupIndex].results.length > 0 ? 0 : -1,
        };
      }
      return state;
    }

    case 'MOVE_PREV_GROUP': {
      const prevGroupIndex = state.activeGroupIndex - 1;
      if (prevGroupIndex >= 0) {
        return {
          activeGroupIndex: prevGroupIndex,
          activeItemIndex: groups[prevGroupIndex].results.length > 0 ? 0 : -1,
        };
      }
      return state;
    }

    case 'RESET':
      return {
        activeGroupIndex: 0,
        activeItemIndex: groups.length > 0 && groups[0].results.length > 0 ? 0 : -1,
      };

    case 'SET_POSITION':
      return {
        activeGroupIndex: Math.max(0, Math.min(action.groupIndex, totalGroups - 1)),
        activeItemIndex: Math.max(
          -1,
          Math.min(action.itemIndex, groups[action.groupIndex]?.results.length - 1 || 0)
        ),
      };

    default:
      return state;
  }
}

export interface UseSearchKeyboardNavigationReturn {
  activeGroupIndex: number;
  activeItemIndex: number;
  activeResult: { group: SearchGroup; item: SearchGroup['results'][0] } | null;
  moveDown: () => void;
  moveUp: () => void;
  moveNextGroup: () => void;
  movePrevGroup: () => void;
  reset: () => void;
  setPosition: (groupIndex: number, itemIndex: number) => void;
  getItemRef: (groupIndex: number, itemIndex: number) => string;
}

export function useSearchKeyboardNavigation(
  groups: SearchGroup[]
): UseSearchKeyboardNavigationReturn {
  // Create a wrapper reducer that includes groups
  const reducer = useCallback(
    (state: KeyboardNavigationState, action: SearchAction) =>
      navigationReducer(state, action, groups),
    [groups]
  );

  const [state, dispatch] = useReducer(reducer, initialState);

  // Reset when groups change
  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const moveDown = useCallback(() => {
    dispatch({ type: 'MOVE_DOWN' });
  }, []);

  const moveUp = useCallback(() => {
    dispatch({ type: 'MOVE_UP' });
  }, []);

  const moveNextGroup = useCallback(() => {
    dispatch({ type: 'MOVE_NEXT_GROUP' });
  }, []);

  const movePrevGroup = useCallback(() => {
    dispatch({ type: 'MOVE_PREV_GROUP' });
  }, []);

  const setPosition = useCallback((groupIndex: number, itemIndex: number) => {
    dispatch({ type: 'SET_POSITION', groupIndex, itemIndex });
  }, []);

  // Get active result
  const activeResult = useMemo(() => {
    const group = groups[state.activeGroupIndex];
    if (!group || state.activeItemIndex < 0) return null;

    const item = group.results[state.activeItemIndex];
    if (!item) return null;

    return { group, item };
  }, [groups, state.activeGroupIndex, state.activeItemIndex]);

  // Generate unique ref key for an item
  const getItemRef = useCallback(
    (groupIndex: number, itemIndex: number) => `search-item-${groupIndex}-${itemIndex}`,
    []
  );

  return {
    activeGroupIndex: state.activeGroupIndex,
    activeItemIndex: state.activeItemIndex,
    activeResult,
    moveDown,
    moveUp,
    moveNextGroup,
    movePrevGroup,
    reset,
    setPosition,
    getItemRef,
  };
}

export default useSearchKeyboardNavigation;
