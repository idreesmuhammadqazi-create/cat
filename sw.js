'use strict';

// marmalade's offline shell
const VERSION = 'marmalade-v4';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './cat.js',
  './manifest.webmanifest',
  './icons/favicon.svg',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function staleWhileRevalidate(request, fallbackKey) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(fallbackKey || request);

  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(fallbackKey || request, response.clone());
      return response;
    })
    .catch(() => null);

  return (
    cached ||
    (await network) ||
    new Response('offline', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } })
  );
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(staleWhileRevalidate(request, './index.html'));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});