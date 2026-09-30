/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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
