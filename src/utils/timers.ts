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

export class TimerRegistry {
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  set(key: string, fn: () => void, delay: number): void {
    this.clear(key);
    this.timers.set(key, setTimeout(() => {
      this.timers.delete(key);
      fn();
    }, delay));
  }

  clear(key: string): void {
    const t = this.timers.get(key);
    if (t) {
      clearTimeout(t);
      this.timers.delete(key);
    }
  }

  clearAll(): void {
    this.timers.forEach(t => clearTimeout(t));
    this.timers.clear();
  }

  has(key: string): boolean {
    return this.timers.has(key);
  }
}
