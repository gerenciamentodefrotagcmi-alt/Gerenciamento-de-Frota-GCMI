// Service worker: aplicativo online. Habilita "instalar / adicionar à tela inicial"
// e SEMPRE busca os arquivos do próprio site da rede (no-store), para que cada
// publicação nova apareça na hora, sem precisar limpar o cache do navegador.
self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function(e){
  var req = e.request;
  if (req.method !== 'GET') return; // POST etc. seguem normal
  try {
    if (new URL(req.url).origin === self.location.origin) {
      e.respondWith(
        fetch(req, { cache: 'no-store' }).catch(function(){ return fetch(req); })
      );
    }
  } catch (err) { /* passthrough para a rede */ }
});
