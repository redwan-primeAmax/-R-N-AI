import { useLayoutEffect, useRef } from 'react';

/** Keep a fullscreen chat inside the *visible* viewport, including iOS keyboards.
 * Write CSS variables once per frame rather than rerendering the message tree.
 * At pinch zoom leave geometry alone so the browser can pan normally.
 */
export function useVisualViewport() {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const viewport = window.visualViewport;
    const htmlOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    let frame = 0;
    const update = () => {
      frame = 0;
      if (viewport && Math.abs(viewport.scale - 1) > 0.01) return;
      element.style.setProperty('--chat-viewport-height', `${viewport?.height ?? window.innerHeight}px`);
      element.style.setProperty('--chat-viewport-top', `${viewport?.offsetTop ?? 0}px`);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    viewport?.addEventListener('resize', schedule);
    viewport?.addEventListener('scroll', schedule);
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener('resize', schedule);
      viewport?.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
    };
  }, []);
  return ref;
}
