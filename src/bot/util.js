// Utilidades compartidas por los comandos.
function unwrap(message) {
  if (!message) return null;
  return (
    (message.ephemeralMessage && message.ephemeralMessage.message) ||
    (message.viewOnceMessage && message.viewOnceMessage.message) ||
    message
  );
}

async function fetchWithTimeout(url, { timeout = 15000, headers = {} } = {}) {
  const r = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (XatoDs)', ...headers },
    signal: AbortSignal.timeout(timeout),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r;
}
const getJson = async (url, opts) => (await fetchWithTimeout(url, opts)).json();
const getBuffer = async (url, opts) => {
  const r = await fetchWithTimeout(url, opts);
  return { buffer: Buffer.from(await r.arrayBuffer()), type: r.headers.get('content-type') || '' };
};

// Descarga el medio del propio mensaje o del mensaje al que se responde.
// kinds: ['imageMessage', 'stickerMessage', ...]
async function getMedia(sock, m, kinds) {
  const { downloadMediaMessage } = await require('./baileys').load();
  const pino = require('pino');
  const content = unwrap(m.message);
  if (!content) return null;

  let holder = null;
  for (const k of kinds) {
    if (content[k]) { holder = { key: m.key, message: { [k]: content[k] } }; break; }
  }
  if (!holder) {
    const ctxHolder = content.extendedTextMessage || content.imageMessage || content.videoMessage || {};
    const ctx = ctxHolder.contextInfo;
    const quoted = ctx && unwrap(ctx.quotedMessage);
    if (quoted) {
      for (const k of kinds) {
        if (quoted[k]) {
          holder = {
            key: { remoteJid: m.key.remoteJid, id: ctx.stanzaId, participant: ctx.participant },
            message: { [k]: quoted[k] },
          };
          break;
        }
      }
    }
  }
  if (!holder) return null;
  return downloadMediaMessage(holder, 'buffer', {}, {
    logger: pino({ level: 'silent' }),
    reuploadRequest: sock.updateMediaMessage,
  });
}

const norm = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const fmtNum = (n) => String(Math.round(n * 1e8) / 1e8);

// Foto de perfil de WhatsApp (prueba cada ID); devuelve null si es privada o no tiene.
async function getProfilePicture(sock, ids) {
  for (const id of [].concat(ids).filter(Boolean)) {
    try {
      const url = await sock.profilePictureUrl(id, 'image');
      if (url) return (await getBuffer(url, { timeout: 15000 })).buffer;
    } catch { /* privada, sin foto o ID no valido */ }
  }
  return null;
}

const getText = async (url, opts) => (await fetchWithTimeout(url, opts)).text();

// ---- identidad y permisos ----
const num = (jid = '') => String(jid).split('@')[0].split(':')[0];
const sameUser = (a, b) => Boolean(a && b && num(a) === num(b));

function getContext(m) {
  const c = unwrap(m.message) || {};
  const h = c.extendedTextMessage || c.imageMessage || c.videoMessage || c.documentMessage || c.audioMessage || c.stickerMessage || {};
  return h.contextInfo || {};
}

function getQuotedText(m) {
  const q = unwrap(getContext(m).quotedMessage);
  if (!q) return '';
  return q.conversation || (q.extendedTextMessage && q.extendedTextMessage.text) || (q.imageMessage && q.imageMessage.caption) || '';
}

// Usuarios objetivo: menciones, mensaje respondido o numeros escritos.
function getTargets(m, args = []) {
  const ctx = getContext(m);
  const map = new Map();
  for (const j of ctx.mentionedJid || []) map.set(num(j), j);
  if (!map.size && ctx.participant) map.set(num(ctx.participant), ctx.participant);
  for (const a of args) {
    const d = a.replace(/\D/g, '');
    if (d.length >= 8 && d.length <= 15 && !map.has(d)) map.set(d, d + '@s.whatsapp.net');
  }
  return [...map.values()];
}

function isAdminIn(meta, ids) {
  return Boolean(meta) && meta.participants.some((p) =>
    p.admin && ids.filter(Boolean).some((id) => [p.id, p.lid, p.phoneNumber].some((x) => x && sameUser(x, id))));
}

const cds = new Map();
function cooldown(key, ms) {
  const now = Date.now();
  const t = cds.get(key) || 0;
  if (now < t) return Math.ceil((t - now) / 1000);
  cds.set(key, now + ms);
  return 0;
}
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const fmtTime = (ms) => {
  const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return [h && `${h}h`, m && `${m}m`, !h && `${sec}s`].filter(Boolean).join(' ');
};

module.exports = {
  unwrap, getJson, getText, getBuffer, getMedia, getProfilePicture, norm, fmtNum,
  num, sameUser, getContext, getQuotedText, getTargets, isAdminIn, cooldown, pick, rand, fmtTime,
};
