/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL — NO LICENSE IS GRANTED.
 * This work is the exclusive property of Redwan. Copying, reproducing,
 * reusing, modifying, distributing, publishing, selling, sublicensing,
 * reverse-engineering, rebranding, removing this notice, or claiming
 * this work, in whole or in part, as anyone else's own is strictly
 * prohibited without Redwan's prior written permission.
 */

export type NotifyType = 'info' | 'success' | 'error' | 'warning';

export interface NotifyOptions {
  duration?: number;
  action?: { label: string; onClick: () => void };
}

export function notify(
  message: string,
  type: NotifyType = 'info',
  options: NotifyOptions = {}
): void {
  window.dispatchEvent(
    new CustomEvent('app-notification', {
      detail: { message, type, ...options }
    })
  );
}

export function notifyStorageWarning(message: string, severity: 'warning' | 'error' = 'warning') {
  window.dispatchEvent(
    new CustomEvent('storage-warning', { detail: { message, severity } })
  );
}
