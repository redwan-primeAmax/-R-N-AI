/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
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
