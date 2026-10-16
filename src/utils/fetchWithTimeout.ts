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

export class FetchTimeoutError extends Error {
  constructor(public timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = 'FetchTimeoutError';
  }
}

export async function fetchWithTimeout(
  input: RequestInfo,
  init: RequestInit = {},
  timeoutMs: number = 45000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const callerSignal = init.signal;
  if (callerSignal) {
    if (callerSignal.aborted) {
      clearTimeout(timeoutId);
      throw new Error('Request aborted');
    }
    callerSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new FetchTimeoutError(timeoutMs);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
