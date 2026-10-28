const config = require('../../config');
const style = require('../style');
const { num } = require('../util');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = [
  {
    name: 'owner', aliases: ['creador', 'dev'], cat: 'General', desc: 'Desarrollador del bot',
    async run({ reply }) {
      await reply(
        `╭━━〔 👑 *DESARROLLADOR* 〕━━⬣\n┃ 💻 *${config.developer}*\n┃ 🤖 *Bot:* ${config.botName}\n┃ 🌐 *Plataforma:* ${config.brand}\n╰━━━━━━━━━━━━━━━━⬣`
      );
    },
  },
  {
    name: 'reglas', cat: 'General', desc: 'Reglas de uso del bot',
    async run({ reply, prefix }) {
      await reply(
        `📜 *REGLAS DE ${config.botName.toUpperCase()}*\n\n` +
        `1️⃣ Registrate con *${prefix}reg nombre.edad*\n2️⃣ No hagas spam de comandos\n3️⃣ Respeta a los demas usuarios\n` +
        `4️⃣ No uses el bot para acosar ni estafar\n5️⃣ Los admins pueden advertir o expulsar\n\n_${config.developer}_`
      );
    },
  },
  {
    name: 'estado', aliases: ['status'], cat: 'General', desc: 'Estado del servidor',
    async run({ reply, store, serverId, botNumber }) {
      const mem = (process.memoryUsage().rss / 1024 / 1024).toFixed(0);
      await reply(
        `╭━━〔 📡 *ESTADO* 〕━━⬣\n┃ 🖥️ *Servidor:* ${String(serverId).padStart(2, '0')}\n┃ 🟢 *En linea:* ${style.uptime(process.uptime())}\n` +
        `┃ 👥 *Registrados:* ${store.users().length}\n┃ 🏘️ *Grupos:* ${Object.keys(store.data.groups).length}\n┃ 🔓 *Modo:* ${store.bot(botNumber).mode}\n┃ 💾 *Memoria:* ${mem} MB\n╰━━━━━━━━━━━━━━⬣`
      );
    },
  },
  {
    name: 'modo', cat: 'Owner', owner: true, desc: 'Modo publico o privado (!modo privado)',
    async run({ args, store, botNumber, reply, prefix }) {
      const v = (args[0] || '').toLowerCase();
      if (!['publico', 'privado'].includes(v)) return reply(`Modo actual: *${store.bot(botNumber).mode}*\nUso: ${prefix}modo publico | privado`);
      store.bot(botNumber).mode = v; store.save();
      await reply(`🔐 Modo *${v}* activado. ${v === 'privado' ? 'Solo el dueño puede usar comandos.' : 'Todos los registrados pueden usar comandos.'}`);
    },
  },
  {
    name: 'broadcast', aliases: ['bc'], cat: 'Owner', owner: true, desc: 'Mensaje a todos los registrados',
    async run({ args, store, sock, reply, prefix, sender }) {
      const t = args.join(' ').trim();
      if (!t) return reply(`Uso: ${prefix}broadcast texto`);
      const list = store.users().filter((u) => num(u.id) !== num(sender)).slice(0, 200);
      await reply(`📣 Enviando a ${list.length} usuario(s)...`);
      let ok = 0;
      for (const u of list) {
        try { await sock.sendMessage(u.id, { text: `📣 *COMUNICADO*\n\n${t}\n\n_${config.botName} · ${config.developer}_` }); ok++; } catch { /* ignorar */ }
        await sleep(1500);
      }
      await reply(`✅ Enviado a ${ok} de ${list.length}.`);
    },
  },
];
