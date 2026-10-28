const config = require('../config');
const commands = require('./commands');
const style = require('./style');
const { unwrap, num, sameUser, isAdminIn, cooldown } = require('./util');
const { levelFor } = require('./db');

const LINK_RE = /(https?:\/\/|www\.|chat\.whatsapp\.com\/)\S+/i;
const metaCache = new Map();
const noticeAt = new Map();

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

async function groupMeta(sock, jid) {
  const c = metaCache.get(jid);
  if (c && Date.now() - c.t < 30000) return c.meta;
  const meta = await sock.groupMetadata(jid);
  metaCache.set(jid, { t: Date.now(), meta });
  return meta;
}

async function handleMessage(sock, m, extra = {}) {
  const { serverId, store, getSock, botNumber } = extra;
  if (!m.message || !m.key.remoteJid || m.key.remoteJid === 'status@broadcast') return;

  const jid = m.key.remoteJid;
  const isGroup = jid.endsWith('@g.us');
  const fromMe = Boolean(m.key.fromMe);
  const meId = `${num(sock.user && sock.user.id)}@s.whatsapp.net`;
  const sender = fromMe ? meId : isGroup ? m.key.participant : jid;
  if (!sender) return;
  const senderIds = [sender, m.key.participantAlt, m.key.remoteJidAlt].filter(Boolean);
  const botIds = [sock.user && sock.user.id, sock.user && sock.user.lid];
  const isOwner = fromMe || config.owners.includes(num(sender));
  const text = getText(m.message).trim();
  const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: m });

  /* ---- reglas automaticas de grupo: antilink ---- */
  if (isGroup && !fromMe && text && store.group(jid).antilink && LINK_RE.test(text)) {
    const meta = await groupMeta(sock, jid).catch(() => null);
    if (meta && !isAdminIn(meta, senderIds) && isAdminIn(meta, botIds)) {
      await sock.sendMessage(jid, { delete: m.key }).catch(() => {});
      const g = store.group(jid);
      const k = num(sender);
      g.warns[k] = (g.warns[k] || 0) + 1;
      store.save();
      if (g.warns[k] >= 3) {
        g.warns[k] = 0;
        await sock.sendMessage(jid, { text: `🚫 @${k} fue expulsado por enviar enlaces (3/3 advertencias).`, mentions: [sender] });
        await sock.groupParticipantsUpdate(jid, [sender], 'remove').catch(() => {});
      } else {
        await sock.sendMessage(jid, { text: `⚠️ @${k}, los enlaces no estan permitidos.\n*Advertencia ${g.warns[k]}/3*`, mentions: [sender] });
      }
      return;
    }
  }

  /* ---- experiencia por actividad (usuarios registrados) ---- */
  const user = store.user(sender);
  if (user && text && !cooldown(`xp:${sender}`, 30000)) {
    user.xp += 5 + Math.floor(Math.random() * 6);
    user.level = levelFor(user.xp);
    store.save();
  }

  /* ---- comandos ---- */
  if (!text.startsWith(config.prefix)) return;
  const [raw, ...args] = text.slice(config.prefix.length).trim().split(/\s+/);
  const name = (raw || '').toLowerCase();
  const cmd = commands.find((c) => c.name === name || (c.aliases || []).includes(name));
  if (!cmd) return;

  if (store.bot(botNumber).mode === 'privado' && !isOwner) return;

  // Registro obligatorio
  if (!user && !cmd.noReg && !(cmd.owner && isOwner)) {
    if (Date.now() - (noticeAt.get(sender) || 0) > 20000) {
      noticeAt.set(sender, Date.now());
      await sock.sendMessage(jid, { text: style.notRegistered() }, { quoted: m });
    }
    return;
  }

  // Permisos
  let meta = null, isAdmin = false, isBotAdmin = false;
  if (cmd.group || cmd.admin || cmd.botAdmin) {
    if (!isGroup) return reply('👥 Este comando solo funciona en grupos.');
    meta = await groupMeta(sock, jid);
    isAdmin = isOwner || isAdminIn(meta, senderIds);
    isBotAdmin = isAdminIn(meta, botIds);
    if (cmd.admin && !isAdmin) return reply('🛡️ Solo los administradores del grupo pueden usar este comando.');
    if (cmd.botAdmin && !isBotAdmin) return reply('🤖 Necesito ser administrador del grupo para hacerlo.');
  }
  if (cmd.owner && !isOwner) return reply('👑 Solo el dueño del bot puede usar este comando.');

  const ctx = {
    sock, m, jid, args, text, commands, store, user, sender, senderIds, isGroup, isOwner,
    isAdmin, isBotAdmin, meta, serverId, botNumber, getSock: getSock || (() => sock),
    prefix: config.prefix, config, reply,
  };
  try {
    await cmd.run(ctx);
  } catch (e) {
    console.error(`[cmd ${name}]`, e.message);
    await reply('❌ Ocurrio un error al ejecutar el comando. Intenta de nuevo.').catch(() => {});
  }
}

module.exports = { handleMessage, sameUser };
