// Carga Baileys con import() dinamico: funciona con la v7 (solo ESM) y con la v6 (CommonJS).
let cached = null;

function load() {
  if (!cached) {
    cached = import('@whiskeysockets/baileys').then((mod) => {
      const get = (n) => (mod[n] !== undefined ? mod[n] : mod.default && mod.default[n]);
      const makeWASocket = [mod.makeWASocket, typeof mod.default === 'function' && mod.default,
        mod.default && mod.default.default, mod.default && mod.default.makeWASocket].find((f) => typeof f === 'function');
      if (!makeWASocket) throw new Error('No se pudo cargar Baileys (makeWASocket no encontrado)');
      return {
        makeWASocket,
        useMultiFileAuthState: get('useMultiFileAuthState'),
        makeCacheableSignalKeyStore: get('makeCacheableSignalKeyStore'),
        fetchLatestBaileysVersion: get('fetchLatestBaileysVersion'),
        DisconnectReason: get('DisconnectReason'),
        Browsers: get('Browsers'),
        downloadMediaMessage: get('downloadMediaMessage'),
        proto: get('proto'),
      };
    });
  }
  return cached;
}

module.exports = { load };
