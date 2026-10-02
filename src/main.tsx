import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const Root = import.meta.env.DEV ? StrictMode : ({ children }: any) => <>{children}</>;

createRoot(document.getElementById('root')!).render(
  <Root>
    <App />
  </Root>,
);
