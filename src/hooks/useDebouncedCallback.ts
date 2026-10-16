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

import { useRef, useCallback, useEffect } from 'react';

export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): ((...args: Parameters<T>) => void) & { flush: () => void; cancel: () => void } {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  const lastArgsRef = useRef<Parameters<T> | null>(null);

  useEffect(() => { callbackRef.current = callback; }, [callback]);
  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const debouncedFn = useCallback((...args: Parameters<T>) => {
    lastArgsRef.current = args;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      lastArgsRef.current = null;
      callbackRef.current(...args);
    }, delay);
  }, [delay]) as any;

  debouncedFn.flush = useCallback(() => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    if (lastArgsRef.current) { const args = lastArgsRef.current; lastArgsRef.current = null; callbackRef.current(...args); }
  }, []);

  debouncedFn.cancel = useCallback(() => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    lastArgsRef.current = null;
  }, []);

  return debouncedFn;
}
