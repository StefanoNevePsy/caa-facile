import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

/**
 * Il service worker rende l'app installabile e utilizzabile offline su PC e
 * iPhone.
 *
 * Va registrato SOLO sul web:
 *  - su Electron gira da file://, dove la registrazione fallisce comunque;
 *  - dentro l'app Capacitor i file sono già in locale, e un service worker
 *    servirebbe la versione in cache anche dopo un aggiornamento dell'APK
 *    (l'origine http://localhost resta la stessa fra una versione e l'altra).
 */
const isNativeShell = Boolean((window as any).Capacitor?.isNativePlatform?.())

// In sviluppo `sw.js` non viene generato: registrarlo darebbe solo un 404.
if (
  import.meta.env.PROD &&
  'serviceWorker' in navigator &&
  /^https?:$/.test(location.protocol) &&
  !isNativeShell
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(new URL('sw.js', document.baseURI).href, { scope: './' })
      .catch((err) => console.warn('Service worker non registrato:', err))
  })
}
