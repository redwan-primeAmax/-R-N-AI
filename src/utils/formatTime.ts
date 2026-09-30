/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return '';
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (minutes < 1) return 'এইমাত্র';
  if (minutes < 60) return `${minutes}মি আগে`;
  if (hours < 24) return `${hours}ঘ আগে`;
  if (days === 1) return 'গতকাল';
  if (days < 7) return `${days}দিন আগে`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
