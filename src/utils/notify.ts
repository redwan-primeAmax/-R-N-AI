/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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
