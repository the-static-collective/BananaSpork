import {StrictMode, useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { PartnerDesk } from './domain/porchlight/PartnerDesk.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('BananaGram root element is missing.');
}

function RootView() {
  const [showPorchlight, setShowPorchlight] = useState(
    () => window.location.hash === '#porchlight'
  );
  useEffect(() => {
    const updateView = () => setShowPorchlight(window.location.hash === '#porchlight');
    window.addEventListener('hashchange', updateView);
    return () => window.removeEventListener('hashchange', updateView);
  }, []);
  return showPorchlight ? <PartnerDesk /> : <App />;
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <RootView />
    </ErrorBoundary>
  </StrictMode>
);

rootElement.dataset.appMounted = 'true';
