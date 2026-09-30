/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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
      callbackRef.current(...args);
      lastArgsRef.current = null;
    }, delay);
  }, [delay]) as any;

  debouncedFn.flush = useCallback(() => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    if (lastArgsRef.current) { callbackRef.current(...lastArgsRef.current); lastArgsRef.current = null; }
  }, []);

  debouncedFn.cancel = useCallback(() => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    lastArgsRef.current = null;
  }, []);

  return debouncedFn;
}
