'use client';

import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

/**
 * Reliable window dragging for the custom (overlay) titlebar.
 *
 * Tauri's built-in `data-tauri-drag-region` handler only reacts when the click
 * lands *exactly* on the element carrying the attribute, and on macOS it can
 * fail to engage while the window is focused (native title-bar dragging still
 * works when unfocused, which is why dragging "sometimes" worked).
 *
 * This global listener instead walks up from the click target: if the click is
 * inside any element marked `data-app-drag` and NOT on an interactive control,
 * it calls `startDragging()` (or toggles maximize on double-click) directly.
 *
 * We deliberately use a custom `data-app-drag` marker (NOT Tauri's built-in
 * `data-tauri-drag-region`) so Tauri's own mousedown handler does not ALSO call
 * `startDragging()` — two concurrent drag calls cancel each other out, which is
 * why dragging only worked while the window was unfocused (native title-bar
 * drag). `preventDefault()` stops the focused webview from starting a text
 * selection that would otherwise swallow the drag gesture.
 */
const INTERACTIVE_SELECTOR = [
  'button',
  'a',
  'input',
  'textarea',
  'select',
  'label',
  '[role="button"]',
  '[role="menuitem"]',
  '[role="combobox"]',
  '[role="tab"]',
  '[contenteditable="true"]',
  '.no-drag',
].join(',');

export function WindowDragHandler() {
  useEffect(() => {
    let busy = false;

    const onMouseDown = async (event: MouseEvent) => {
      // Only primary button.
      if (event.button !== 0) return;

      const target = event.target as HTMLElement | null;
      if (!target) return;

      // Must be inside a drag region…
      if (!target.closest('[data-app-drag]')) return;
      // …but never when starting on an interactive control.
      if (target.closest(INTERACTIVE_SELECTOR)) return;

      if (busy) return;
      busy = true;
      // Prevent the focused webview from starting a text selection, which
      // otherwise hijacks the gesture before the drag can engage.
      event.preventDefault();
      try {
        const appWindow = getCurrentWindow();
        if (event.detail === 2) {
          await appWindow.toggleMaximize();
        } else {
          await appWindow.startDragging();
        }
      } catch {
        // Not running under Tauri (e.g. plain browser dev) — ignore.
      } finally {
        busy = false;
      }
    };

    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, []);

  return null;
}
