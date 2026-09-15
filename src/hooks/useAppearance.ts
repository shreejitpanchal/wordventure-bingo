import { useEffect } from 'react';
import type { Settings } from '../types';

/**
 * Applies the theme/font-size settings to the document root as
 * data-attributes, which theme.css's [data-theme]/[data-font-size]
 * selectors key off of. This is the one place that touches
 * document.documentElement -- every component styles itself purely from
 * the resulting CSS custom properties/root font-size, no per-component
 * theme-awareness needed (unlike a settings object threaded through props,
 * which would need every styled component to consume it explicitly).
 */
export function useAppearance(settings: Settings): void {
  useEffect(() => {
    const root = document.documentElement;
    // 'system' removes the attribute rather than setting it, so theme.css's
    // `prefers-color-scheme` media query (guarded by
    // `:not([data-theme='light'])`) keeps following the OS/browser setting.
    if (settings.theme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', settings.theme);
    }
  }, [settings.theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', settings.fontSize);
  }, [settings.fontSize]);
}
