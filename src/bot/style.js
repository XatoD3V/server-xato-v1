// Textos decorados (negritas, cursivas y emojis) del menu, bienvenida y registro.
const config = require('../config');

const CAT = {
  General: '⚙️', Registro: '📝', Economia: '🪙', Juegos: '🎮', Diversion: '🎲', Grupos: '👥',
  Utilidades: '🛠️', Matematicas: '🧮', Finanzas: '💱', Mundo: '🌎', Informacion: '📰',
  Multimedia: '🎨', Descargas: '📥', Herramientas: '🧰', Estudio: '📚', Owner: '👑',
};
const ORDER = Object.keys(CAT);
const catEmoji = (c) => CAT[c] || '✨';

function categories(commands) {
  const found = [...new Set(commands.map((c) => c.cat || 'General'))];
  return [...ORDER.filter((c) => found.includes(c)), ...found.filter((c) => !ORDER.includes(c))];
}

const clean = (desc = '') => desc.replace(/\s*\(.*\)\s*$/, '').trim();

function uptime(s) {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

function menuHeader({ name, total, users }) {
  return (
    `╭━━━〔 🤖 *${config.botName.toUpperCase()}* 〕━━━⬣\n` +
    `┃ 👑 *Desarrollador:* ${config.developer}\n` +
    `┃ 🌐 *Plataforma:* ${config.brand}\n` +
    `┃ 👤 *Usuario:* ${name}\n` +
    `┃ 📊 *Comandos:* ${total}\n` +
    `┃ 👥 *Registrados:* ${users}\n` +
    `┃ ⚡ *Prefijo:* ${config.prefix}\n` +
    `┃ ⏱️ *Activo:* ${uptime(process.uptime())}\n` +
    `╰━━━━━━━━━━━━━━━━━━⬣\n` +
    `_Escribe_ *${config.prefix}comando* _para usarlo_`
  );
}

// Devuelve el menu dividido en bloques para que sea legible en WhatsApp.
function menuBlocks(commands, prefix) {
  const blocks = categories(commands).map((cat) => {
    const lines = commands.filter((c) => (c.cat || 'General') === cat)
      .map((c) => `│ ➤ *${prefix}${c.name}* _${clean(c.desc)}_`).join('\n');
    return `╭─「 ${catEmoji(cat)} *${cat.toUpperCase()}* 」\n${lines}\n╰──────────────⬣`;
  });
  const out = [];
  let cur = '';
  for (const b of blocks) {
    if ((cur + '\n\n' + b).length > 3200 && cur) { out.push(cur); cur = b; } else cur = cur ? `${cur}\n\n${b}` : b;
  }
  if (cur) out.push(cur);
  out[out.length - 1] += `\n\n👑 *Desarrollador:* ${config.developer}\n🌐 ${config.brand}`;
  return out;
}

function welcome({ id, subject, count, commands }) {
  const cats = categories(commands).map((c) => `${catEmoji(c)} ${c}`).join('  ·  ');
  return (
    `╭━━〔 👋 *BIENVENIDO/A* 〕━━⬣\n` +
    `┃ 🎉 Hola @${id.split('@')[0]}\n` +
    `┃ 🏠 *Grupo:* ${subject}\n` +
    `┃ 👥 *Miembros:* ${count}\n` +
    `┃ 🤖 *Bot:* ${config.botName}\n` +
    `┃ 👑 *Desarrollador:* ${config.developer}\n` +
    `╰━━━━━━━━━━━━━━━━⬣\n\n` +
    `📝 *Para usar el bot, registrate primero:*\n` +
    `   ${config.prefix}reg *nombre.edad*  _(ej: ${config.prefix}reg Juan.20)_\n\n` +
    `📋 *Menu:* ${config.prefix}menu\n\n` +
    `✨ *Categorias disponibles*\n${cats}\n\n` +
    `_Respeta las reglas y disfruta del grupo._`
  );
}

function goodbye({ id, subject }) {
  return (
    `╭━━〔 👋 *HASTA LUEGO* 〕━━⬣\n` +
    `┃ 😢 @${id.split('@')[0]} salio de *${subject}*\n` +
    `┃ 🤖 ${config.botName} · ${config.developer}\n` +
    `╰━━━━━━━━━━━━━━━━⬣`
  );
}

function regSuccess(u) {
  return (
    `╭━━〔 ✅ *REGISTRO EXITOSO* 〕━━⬣\n` +
    `┃ 👤 *Nombre:* ${u.name}\n` +
    `┃ 🎂 *Edad:* ${u.age} años\n` +
    `┃ 🆔 *ID:* ${u.serial}\n` +
    `┃ 📅 *Fecha:* ${new Date(u.regAt).toLocaleDateString('es-PE', { timeZone: 'America/Lima' })}\n` +
    `┃ 🎁 *Bono de bienvenida:* ${u.coins} monedas\n` +
    `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
    `🎉 *¡Bienvenido/a a ${config.botName}!*\n` +
    `Ya puedes usar todos los comandos.\n` +
    `📋 Escribe *${config.prefix}menu* para verlos.\n\n` +
    `👑 _Desarrollador: ${config.developer}_`
  );
}

function notRegistered() {
  return (
    `╭━━〔 🔒 *ACCESO RESTRINGIDO* 〕━━⬣\n` +
    `┃ 👋 Hola, soy *${config.botName}*\n` +
    `┃ 👑 *Desarrollador:* ${config.developer}\n` +
    `╰━━━━━━━━━━━━━━━━⬣\n\n` +
    `📝 *Primero debes registrarte:*\n` +
    `   ${config.prefix}reg *nombre.edad*\n` +
    `   _Ejemplo:_ ${config.prefix}reg Juan.20\n\n` +
    `_Despues podras usar todos los comandos._`
  );
}

module.exports = { menuHeader, menuBlocks, welcome, goodbye, regSuccess, notRegistered, catEmoji, categories, uptime };
