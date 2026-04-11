import { renderHook, act } from '@testing-library/react';

import { useChartZoom, useBrushZoom } from '../ui/useChartZoom';

describe('useChartZoom', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useChartZoom());

    expect(result.current.scale).toBe(1);
    expect(result.current.translateX).toBe(0);
    expect(result.current.translateY).toBe(0);
    expect(result.current.isZooming).toBe(false);
    expect(result.current.isPanning).toBe(false);
  });

  it('should initialize with custom values', () => {
    const { result } = renderHook(() =>
      useChartZoom({
        initialScale: 2,
        initialTranslateX: 100,
        initialTranslateY: 50,
      })
    );

    expect(result.current.scale).toBe(2);
    expect(result.current.translateX).toBe(100);
    expect(result.current.translateY).toBe(50);
  });

  it('should zoom in', () => {
    const { result } = renderHook(() => useChartZoom());

    act(() => {
      result.current.zoomIn();
    });

    expect(result.current.scale).toBeGreaterThan(1);
  });

  it('should zoom out', () => {
    const { result } = renderHook(() => useChartZoom());

    act(() => {
      result.current.zoomOut();
    });

    expect(result.current.scale).toBeLessThan(1);
  });

  it('should zoom to specific scale', () => {
    const { result } = renderHook(() => useChartZoom());

    act(() => {
      result.current.zoomTo(3);
    });

    expect(result.current.scale).toBe(3);
  });

  it('should clamp scale to min and max', () => {
    const { result } = renderHook(() =>
      useChartZoom({
        config: { minScale: 0.5, maxScale: 5 },
      })
    );

    act(() => {
      result.current.zoomTo(10);
    });

    expect(result.current.scale).toBe(5);

    act(() => {
      result.current.zoomTo(0.1);
    });

    expect(result.current.scale).toBe(0.5);
  });

  it('should reset zoom', () => {
    const { result } = renderHook(() =>
      useChartZoom({
        initialScale: 1,
        initialTranslateX: 0,
        initialTranslateY: 0,
      })
    );

    act(() => {
      result.current.zoomIn();
      result.current.pan(100, 50);
    });

    expect(result.current.scale).not.toBe(1);

    act(() => {
      result.current.resetZoom();
    });

    expect(result.current.scale).toBe(1);
    expect(result.current.translateX).toBe(0);
    expect(result.current.translateY).toBe(0);
  });

  it('should pan', () => {
    const { result } = renderHook(() => useChartZoom());

    act(() => {
      result.current.pan(50, 30);
    });

    expect(result.current.translateX).toBe(50);
    expect(result.current.translateY).toBe(30);
  });

  it('should pan to specific position', () => {
    const { result } = renderHook(() => useChartZoom());

    act(() => {
      result.current.panTo(100, 200);
    });

    expect(result.current.translateX).toBe(100);
    expect(result.current.translateY).toBe(200);
  });

  it('should not pan when disabled', () => {
    const { result } = renderHook(() =>
      useChartZoom({
        config: { enablePan: false },
      })
    );

    act(() => {
      result.current.pan(50, 30);
    });

    expect(result.current.translateX).toBe(0);
    expect(result.current.translateY).toBe(0);
  });

  it('should track history for undo/redo', () => {
    const { result } = renderHook(() => useChartZoom());

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);

    act(() => {
      result.current.zoomIn();
    });

    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);

    act(() => {
      result.current.undo();
    });

    expect(result.current.scale).toBe(1);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.redo();
    });

    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('should clear history', () => {
    const { result } = renderHook(() => useChartZoom());

    act(() => {
      result.current.zoomIn();
      result.current.zoomIn();
    });

    expect(result.current.history.length).toBeGreaterThan(1);

    act(() => {
      result.current.clearHistory();
    });

    expect(result.current.history.length).toBe(1);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('should call onZoomChange callback', () => {
    const onZoomChange = jest.fn();
    const { result } = renderHook(() => useChartZoom({ onZoomChange }));

    act(() => {
      result.current.zoomIn();
    });

    expect(onZoomChange).toHaveBeenCalled();
    expect(onZoomChange).toHaveBeenCalledWith(
      expect.objectContaining({
        scale: expect.any(Number),
        translateX: expect.any(Number),
        translateY: expect.any(Number),
      })
    );
  });

  it('should call onPanChange callback', () => {
    const onPanChange = jest.fn();
    const { result } = renderHook(() => useChartZoom({ onPanChange }));

    act(() => {
      result.current.pan(50, 30);
    });

    expect(onPanChange).toHaveBeenCalled();
  });

  it('should generate correct transform style', () => {
    const { result } = renderHook(() =>
      useChartZoom({
        initialScale: 2,
        initialTranslateX: 100,
        initialTranslateY: 50,
      })
    );

    expect(result.current.transformStyle.transform).toBe('translate(100px, 50px) scale(2)');
    expect(result.current.transformStyle.transformOrigin).toBe('center center');
  });

  it('should handle wheel event for zoom', () => {
    const { result } = renderHook(() => useChartZoom());

    const mockEvent = {
      deltaY: -100,
      clientX: 200,
      clientY: 150,
      currentTarget: {
        getBoundingClientRect: () => ({ left: 0, top: 0 }),
      },
      preventDefault: jest.fn(),
    } as unknown as React.WheelEvent;

    act(() => {
      result.current.handleWheel(mockEvent);
    });

    expect(result.current.scale).toBeGreaterThan(1);
    expect(result.current.isZooming).toBe(true);
  });

  it('should not handle wheel when disabled', () => {
    const { result } = renderHook(() =>
      useChartZoom({
        config: { enableWheel: false },
      })
    );

    const mockEvent = {
      deltaY: -100,
      clientX: 200,
      clientY: 150,
      currentTarget: {
        getBoundingClientRect: () => ({ left: 0, top: 0 }),
      },
      preventDefault: jest.fn(),
    } as unknown as React.WheelEvent;

    act(() => {
      result.current.handleWheel(mockEvent);
    });

    expect(result.current.scale).toBe(1);
  });

  it('should handle mouse down for panning', () => {
    const { result } = renderHook(() => useChartZoom());

    const mockEvent = {
      clientX: 100,
      clientY: 100,
    } as React.MouseEvent;

    act(() => {
      result.current.handleMouseDown(mockEvent);
    });

    expect(result.current.isPanning).toBe(true);
  });

  it('should handle double click for zoom', () => {
    const { result } = renderHook(() =>
      useChartZoom({
        config: { enableDoubleClick: true },
      })
    );

    const mockEvent = {
      clientX: 100,
      clientY: 100,
      currentTarget: {
        getBoundingClientRect: () => ({ left: 0, top: 0 }),
      },
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.handleDoubleClick(mockEvent);
    });

    expect(result.current.scale).toBeGreaterThan(1);
  });
});

describe('useBrushZoom', () => {
  it('should initialize with default range', () => {
    const { result } = renderHook(() => useBrushZoom({ dataLength: 100 }));

    expect(result.current.startIndex).toBeGreaterThanOrEqual(0);
    expect(result.current.endIndex).toBe(99);
    expect(result.current.totalDataCount).toBe(100);
  });

  it('should calculate visible data count', () => {
    const { result } = renderHook(() => useBrushZoom({ dataLength: 100, defaultRange: 0.5 }));

    expect(result.current.visibleDataCount).toBe(
      result.current.endIndex - result.current.startIndex + 1
    );
  });

  it('should zoom in', () => {
    const { result } = renderHook(() => useBrushZoom({ dataLength: 100 }));

    const initialVisibleCount = result.current.visibleDataCount;

    act(() => {
      result.current.zoomIn();
    });

    expect(result.current.visibleDataCount).toBeLessThan(initialVisibleCount);
  });

  it('should zoom out', () => {
    const { result } = renderHook(() => useBrushZoom({ dataLength: 100, defaultRange: 0.1 }));

    const initialVisibleCount = result.current.visibleDataCount;

    act(() => {
      result.current.zoomOut();
    });

    expect(result.current.visibleDataCount).toBeGreaterThan(initialVisibleCount);
  });

  it('should pan left', () => {
    const { result } = renderHook(() => useBrushZoom({ dataLength: 100, defaultRange: 0.3 }));

    const initialStartIndex = result.current.startIndex;

    act(() => {
      result.current.panLeft();
    });

    expect(result.current.startIndex).toBeLessThan(initialStartIndex);
  });

  it('should pan right', () => {
    const { result } = renderHook(() => useBrushZoom({ dataLength: 100, defaultRange: 0.3 }));

    const initialStartIndex = result.current.startIndex;

    act(() => {
      result.current.panRight();
    });

    expect(result.current.startIndex).toBeGreaterThan(initialStartIndex);
  });

  it('should reset to default range', () => {
    const { result } = renderHook(() => useBrushZoom({ dataLength: 100, defaultRange: 0.3 }));

    act(() => {
      result.current.zoomIn();
      result.current.zoomIn();
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.endIndex).toBe(99);
  });

  it('should set range', () => {
    const { result } = renderHook(() => useBrushZoom({ dataLength: 100 }));

    act(() => {
      result.current.setRange(20, 50);
    });

    expect(result.current.startIndex).toBe(20);
    expect(result.current.endIndex).toBe(50);
  });

  it('should clamp range to valid values', () => {
    const { result } = renderHook(() => useBrushZoom({ dataLength: 100 }));

    act(() => {
      result.current.setRange(-10, 150);
    });

    expect(result.current.startIndex).toBeGreaterThanOrEqual(0);
    expect(result.current.endIndex).toBeLessThan(100);
  });

  it('should respect minVisiblePoints', () => {
    const { result } = renderHook(() => useBrushZoom({ dataLength: 100, minVisiblePoints: 20 }));

    act(() => {
      result.current.zoomIn();
      result.current.zoomIn();
      result.current.zoomIn();
    });

    expect(result.current.visibleDataCount).toBeGreaterThanOrEqual(20);
  });

  it('should handle brush change', () => {
    const { result } = renderHook(() => useBrushZoom({ dataLength: 100 }));

    act(() => {
      result.current.handleBrushChange({ startIndex: 10, endIndex: 40 });
    });

    expect(result.current.startIndex).toBe(10);
    expect(result.current.endIndex).toBe(40);
  });

  it('should call onRangeChange callback', () => {
    const onRangeChange = jest.fn();
    const { result } = renderHook(() => useBrushZoom({ dataLength: 100, onRangeChange }));

    act(() => {
      result.current.setRange(20, 50);
    });

    expect(onRangeChange).toHaveBeenCalledWith(20, 50);
  });
});
