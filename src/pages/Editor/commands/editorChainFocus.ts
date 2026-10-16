/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
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
