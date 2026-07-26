import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useLanguage } from './useLanguage';

describe('useLanguage', () => {
  it('defaults to English and persists a language change', () => {
    const { result } = renderHook(() => useLanguage());

    expect(result.current.language).toBe('en');
    expect(document.documentElement.lang).toBe('en');

    act(() => result.current.setLanguage('zh'));

    expect(result.current.language).toBe('zh');
    expect(localStorage.getItem('portfolio-language')).toBe('zh');
    expect(document.documentElement.lang).toBe('zh-CN');
  });

  it('restores a valid saved language and ignores malformed values', () => {
    localStorage.setItem('portfolio-language', 'zh');
    const saved = renderHook(() => useLanguage());
    expect(saved.result.current.language).toBe('zh');
    saved.unmount();

    localStorage.setItem('portfolio-language', 'fr');
    const malformed = renderHook(() => useLanguage());
    expect(malformed.result.current.language).toBe('en');
  });
});
