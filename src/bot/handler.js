const config = require('../config');
const commands = require('./commands');

function unwrap(message) {
  if (!message) return null;
  return (
    (message.ephemeralMessage && message.ephemeralMessage.message) ||
    (message.viewOnceMessage && message.viewOnceMessage.message) ||
    message
  );
}

function getText(message) {
  const c = unwrap(message);
  if (!c) return '';
  return (
    c.conversation ||
    (c.extendedTextMessage && c.extendedTextMessage.text) ||
    (c.imageMessage && c.imageMessage.caption) ||
    (c.videoMessage && c.videoMessage.caption) ||
    ''
  );
}

async function handleMessage(sock, m, extra = {}) {
  if (!m.message || m.key.remoteJid === 'status@broadcast') return;

  const text = getText(m.message).trim();
  if (!text.startsWith(config.prefix)) return;

  const [raw, ...args] = text.slice(config.prefix.length).trim().split(/\s+/);
  const name = (raw || '').toLowerCase();
  const cmd = commands.find((c) => c.name === name || (c.aliases || []).includes(name));
  if (!cmd) return;

  const jid = m.key.remoteJid;
  await cmd.run({
    sock, m, jid, args, commands,
    prefix: config.prefix,
    serverId: extra.serverId,
    reply: (t) => sock.sendMessage(jid, { text: t }, { quoted: m }),
  });
}

module.exports = { handleMessage };
