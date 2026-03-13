/**
 * 移动端检测 Hook
 */

import { useState, useEffect, useCallback } from 'react';

export interface MobileDetectState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
  screenWidth: number;
  screenHeight: number;
  touchSupported: boolean;
}

// 断点定义
const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
};

export function useMobileDetect(): MobileDetectState {
  const [state, setState] = useState<MobileDetectState>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isPortrait: true,
    isLandscape: false,
    screenWidth: typeof window !== 'undefined' ? window.innerWidth : 1920,
    screenHeight: typeof window !== 'undefined' ? window.innerHeight : 1080,
    touchSupported: false,
  });

  const updateState = useCallback(() => {
    if (typeof window === 'undefined') return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const isMobile = width < BREAKPOINTS.mobile;
    const isTablet = width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet;
    const isDesktop = width >= BREAKPOINTS.tablet;
    const isPortrait = height > width;
    const isLandscape = width > height;
    const touchSupported = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    setState({
      isMobile,
      isTablet,
      isDesktop,
      isPortrait,
      isLandscape,
      screenWidth: width,
      screenHeight: height,
      touchSupported,
    });
  }, []);

  useEffect(() => {
    updateState();

    window.addEventListener('resize', updateState);
    window.addEventListener('orientationchange', updateState);

    return () => {
      window.removeEventListener('resize', updateState);
      window.removeEventListener('orientationchange', updateState);
    };
  }, [updateState]);

  return state;
}

// 使用媒体查询的 Hook
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);

    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

// 预设的媒体查询 Hooks
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${BREAKPOINTS.mobile - 1}px)`);
}

export function useIsTablet(): boolean {
  return useMediaQuery(
    `(min-width: ${BREAKPOINTS.mobile}px) and (max-width: ${BREAKPOINTS.tablet - 1}px)`
  );
}

export function useIsDesktop(): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.tablet}px)`);
}

export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  return isTouch;
}
