// Service worker minimo: habilita "instalar/adicionar a tela inicial" sem cache (sempre online).
self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function(e){ /* passthrough para a rede */ });
