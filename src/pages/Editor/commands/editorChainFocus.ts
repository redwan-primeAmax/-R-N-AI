/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function focusEditor(activeBlockId: string | null) {
  setTimeout(() => {
    let idToFocus = activeBlockId;
    if (!idToFocus) {
      const activeEls = document.querySelectorAll('[contenteditable="true"]');
      if (activeEls.length > 0) {
        idToFocus = activeEls[activeEls.length - 1].getAttribute('id');
      }
    }
    if (idToFocus) {
      const el = document.getElementById(idToFocus);
      if (el) {
        el.focus();
        try {
          const range = document.createRange();
          range.selectNodeContents(el);
          range.collapse(false);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        } catch (err) {}
      }
    }
  }, 50);
}
