/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function focusEditor(activeBlockId: string | null) {
  const applyFocus = () => {
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
        if (document.activeElement !== el) {
          el.focus();
        }
      }
    }
  };

  // If already focused on something in the editor, don't use timeout to avoid race conditions
  if (document.activeElement instanceof HTMLElement && 
      (document.activeElement.hasAttribute('contenteditable') || 
       document.activeElement.getAttribute('data-block-id'))) {
    applyFocus();
  } else {
    // Small timeout only if entirely outside to ensure DOM stability
    setTimeout(applyFocus, 10);
  }
}
