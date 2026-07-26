import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useActiveSection } from './useActiveSection';

let observerCallback: IntersectionObserverCallback;

class FakeIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  takeRecords = vi.fn(() => []);
  root = null;
  rootMargin = '';
  thresholds = [];

  constructor(callback: IntersectionObserverCallback) {
    observerCallback = callback;
  }
}

describe('useActiveSection', () => {
  beforeEach(() => {
    document.body.innerHTML = '<section id="about"></section><section id="projects"></section>';
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  });

  it('selects the visible section closest to the reading line', () => {
    const { result } = renderHook(() => useActiveSection(['about', 'projects']));

    act(() => {
      observerCallback(
        [
          {
            isIntersecting: true,
            target: document.getElementById('projects')!,
            boundingClientRect: { top: 120 } as DOMRectReadOnly,
          } as unknown as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      );
    });

    expect(result.current).toBe('projects');
  });

  it('keeps the first section when observers are unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const { result } = renderHook(() => useActiveSection(['about', 'projects']));
    expect(result.current).toBe('about');
  });
});
