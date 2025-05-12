import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import { LanguageProvider } from './contexts/LanguageContext';
import './index.css';

// Register Service Worker
const registerServiceWorker = () => {
  if (import.meta.env.DEV) {
    console.log('Service Worker registration skipped in development mode.');
    return;
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('Service Worker registered with scope:', registration.scope);

        // Force update on new service worker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              console.log('Service Worker state changed to:', newWorker.state);
              if (newWorker.state === 'installed') {
                console.log('New Service Worker installed, activating...');
                newWorker.postMessage({ action: 'skipWaiting' });
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  } else {
    console.log('Service Workers are not supported in this browser.');
  }
};

// Render the app
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </HelmetProvider>
  </StrictMode>
);

// Register service worker after app mounts
registerServiceWorker();