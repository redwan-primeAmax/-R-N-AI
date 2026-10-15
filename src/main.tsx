import '@fontsource/hind-siliguri/bengali-400.css';
import '@fontsource/hind-siliguri/bengali-600.css';
import '@fontsource/roboto/latin-400.css';
import '@fontsource/roboto/latin-700.css';
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
