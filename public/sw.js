// Service worker mínimo: torna o I Can Do instalável. Não guarda nada em cache;
// todas as requisições seguem direto para a rede (os dados ficam sempre atualizados).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
