/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function syncBlockContent(editor: any, activeEl: HTMLElement | null) {
  if (!activeEl) return;
  const activeId = activeEl.getAttribute('data-block-id') || activeEl.getAttribute('id');
  if (activeId && editor.setBlocks) {
    const html = activeEl.innerHTML;
    editor.setBlocks((prev: any) => prev.map((b: any) => b.id === activeId ? { ...b, content: html } : b));
  }
}
