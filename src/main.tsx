import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Polyfill for HTML5 Drag and Drop on mobile/touch devices
import { polyfill } from 'mobile-drag-drop';
import 'mobile-drag-drop/default.css';

polyfill({
  dragStartConditionOverride: (event: any) => {
    const target = event.target as HTMLElement;
    return !!(target && target.closest('.drag-handle'));
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
