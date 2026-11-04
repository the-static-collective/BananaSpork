import {StrictMode, useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { PartnerDesk } from './domain/porchlight/PartnerDesk.tsx';
import { FirstCircleFeature } from './domain/first-circle/FirstCircleFeature.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('BananaGram root element is missing.');
}

// The Porchlight view has in-page anchors (#porchlight-partner-leads, etc.).
// A dedicated public Vercel build may choose it as its default landing screen.
function wantsPorchlight(): boolean {
  const hash = window.location.hash;
  return hash.startsWith('#porchlight') ||
    (import.meta.env.VITE_PORCHLIGHT_LANDING === 'true' && hash !== '#garden');
}

function wantsFirstCircle(): boolean {
  const hash = window.location.hash;
  return hash === '#first-circle' || hash.startsWith('#first-circle/');
}

function RootView() {
  const [showPorchlight, setShowPorchlight] = useState(wantsPorchlight);
  const [showFirstCircle, setShowFirstCircle] = useState(wantsFirstCircle);

  useEffect(() => {
    const updateView = () => {
      setShowPorchlight(wantsPorchlight());
      setShowFirstCircle(wantsFirstCircle());
    };
    window.addEventListener('hashchange', updateView);
    return () => window.removeEventListener('hashchange', updateView);
  }, []);

  if (showFirstCircle) return <FirstCircleFeature />;
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
