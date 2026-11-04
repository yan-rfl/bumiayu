'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('Toko BumiAyu PWA Service Worker terdaftar:', reg.scope);
          })
          .catch((err) => {
            console.error('Gagal mendaftarkan Service Worker:', err);
          });
      });
    }
  }, []);

  return null;
}
