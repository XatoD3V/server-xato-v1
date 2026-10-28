// Bienvenida y despedida de grupos.
const fs = require('fs');
const path = require('path');
const config = require('../config');
const style = require('./style');
const commands = require('./commands');
const { num, getBuffer } = require('./util');

const IMG = path.join(config.assetsDir, 'menu.jpg');

// Foto de perfil del integrante; si es privada o no tiene, devuelve la imagen del menu.
async function profileImage(sock, id) {
  try {
    const url = await sock.profilePictureUrl(id, 'image');
    if (url) return (await getBuffer(url, { timeout: 15000 })).buffer;
  } catch { /* privada o sin foto */ }
  return fs.existsSync(IMG) ? fs.readFileSync(IMG) : null;
}

async function onParticipants(sock, ev, store) {
  const g = store.group(ev.id);
  if (!['add', 'remove'].includes(ev.action)) return;
  if (ev.action === 'add' && !g.welcome) return;
  if (ev.action === 'remove' && !g.bye) return;

  const meta = await sock.groupMetadata(ev.id).catch(() => null);
  const subject = meta ? meta.subject : 'el grupo';
  const count = meta ? meta.participants.length : '-';
  const botNum = num(sock.user && sock.user.id);

  for (const p of ev.participants) {
    const id = typeof p === 'string' ? p : p.id;
    if (!id || num(id) === botNum) continue;

    const caption = ev.action === 'add'
      ? style.welcome({ id, subject, count, commands })
      : style.goodbye({ id, subject });
    const img = await profileImage(sock, id);
    if (img) await sock.sendMessage(ev.id, { image: img, caption, mentions: [id] });
    else await sock.sendMessage(ev.id, { text: caption, mentions: [id] });
  }
}

module.exports = { onParticipants };
