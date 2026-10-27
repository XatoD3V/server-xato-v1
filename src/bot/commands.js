// Para agregar un comando nuevo, anade un objeto a este arreglo:
// { name, aliases, desc, async run({ sock, m, jid, args, reply, prefix, commands, serverId }) {} }
const fs = require('fs');
const path = require('path');
const config = require('../config');

const IMG = path.join(config.assetsDir, 'menu.jpg');
const AUDIO = path.join(config.assetsDir, 'menu.mp3');

function formatUptime(s) {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), mi = Math.floor((s % 3600) / 60);
  return `${d}d ${h}h ${mi}m`;
}

const commands = [
  {
    name: 'menu',
    aliases: ['help', 'ayuda'],
    desc: 'Muestra este menu',
    async run({ sock, m, jid, commands: all, prefix }) {
      const lines = all.map((c) => `  ${prefix}${c.name.padEnd(10)} ${c.desc}`).join('\n');
      const caption =
        `${config.botName.toUpperCase()}\n` +
        `Bot de ${config.brand}\n` +
        `--------------------------------\n` +
        `COMANDOS\n${lines}\n` +
        `--------------------------------\n` +
        `Prefijo: ${prefix}`;

      if (fs.existsSync(IMG)) {
        await sock.sendMessage(jid, { image: fs.readFileSync(IMG), caption }, { quoted: m });
      } else {
        await sock.sendMessage(jid, { text: caption }, { quoted: m });
      }
      if (fs.existsSync(AUDIO)) {
        await sock.sendMessage(jid, { audio: fs.readFileSync(AUDIO), mimetype: 'audio/mpeg', ptt: false }, { quoted: m });
      }
    },
  },
  {
    name: 'ping',
    desc: 'Latencia del bot',
    async run({ m, reply }) {
      const ms = Math.max(0, Date.now() - Number(m.messageTimestamp) * 1000);
      await reply(`Pong. Latencia: ${ms} ms`);
    },
  },
  {
    name: 'info',
    desc: 'Informacion del bot',
    async run({ reply, serverId }) {
      const mem = (process.memoryUsage().rss / 1024 / 1024).toFixed(0);
      await reply(
        `${config.botName}\n` +
        `Plataforma: ${config.brand}\n` +
        `Servidor: ${String(serverId).padStart(2, '0')}\n` +
        `Activo: ${formatUptime(process.uptime())}\n` +
        `Memoria: ${mem} MB\n` +
        `Node: ${process.version}`
      );
    },
  },
  {
    name: 'hora',
    desc: 'Fecha y hora (Lima)',
    async run({ reply }) {
      const t = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima', dateStyle: 'full', timeStyle: 'medium' });
      await reply(t);
    },
  },
  {
    name: 'id',
    desc: 'Muestra el ID de este chat',
    async run({ jid, reply }) {
      await reply(jid);
    },
  },
];

module.exports = commands;
