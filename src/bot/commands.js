// Para agregar un comando nuevo, anade un objeto a un archivo de src/bot/cmds/ (o aqui):
// { name, aliases, cat, desc, [noReg, group, admin, botAdmin, owner], async run(ctx) {} }
// ctx: sock, m, jid, args, text, user, store, sender, isGroup, isOwner, isAdmin, meta, reply, prefix, commands
const fs = require('fs');
const path = require('path');
const config = require('../config');
const style = require('./style');
const { pick } = require('./util');

const IMG = path.join(config.assetsDir, 'menu.jpg');
const AUDIO = path.join(config.assetsDir, 'menu.mp3');

const FRASES = [
  'La constancia vence al talento cuando el talento no es constante.',
  'Lo que hoy cuesta, manana se agradece.',
  'Quien siembra paciencia cosecha resultados.',
  'No esperes el momento perfecto: crealo.',
  'Un paso pequeno cada dia supera un salto que nunca se da.',
  'El orden en lo pequeno construye lo grande.',
];
const BOLA = [
  'Si, sin duda.', 'Todo apunta a que si.', 'Es probable.', 'Pregunta de nuevo mas tarde.',
  'No lo tengo claro.', 'Mejor no contar con ello.', 'Mi respuesta es no.', 'Muy dudoso.',
];

const commands = [
  {
    name: 'menu', aliases: ['help', 'ayuda'], cat: 'General', desc: 'Muestra este menu',
    async run({ sock, m, jid, commands: all, prefix, user, store }) {
      const header = style.menuHeader({ name: user ? user.name : 'Invitado', total: all.length, users: store.users().length });
      const blocks = style.menuBlocks(all, prefix);

      if (fs.existsSync(IMG)) await sock.sendMessage(jid, { image: fs.readFileSync(IMG), caption: header }, { quoted: m });
      else await sock.sendMessage(jid, { text: header }, { quoted: m });
      for (const b of blocks) await sock.sendMessage(jid, { text: b });
      if (fs.existsSync(AUDIO)) {
        await sock.sendMessage(jid, { audio: fs.readFileSync(AUDIO), mimetype: 'audio/mpeg', ptt: false }, { quoted: m });
      }
    },
  },
  {
    name: 'ping', cat: 'General', desc: 'Latencia del bot',
    async run({ m, reply }) {
      const ms = Math.max(0, Date.now() - Number(m.messageTimestamp) * 1000);
      await reply(`🏓 *Pong!*\n⚡ Latencia: *${ms} ms*`);
    },
  },
  {
    name: 'info', cat: 'General', desc: 'Informacion del bot',
    async run({ reply, serverId }) {
      const mem = (process.memoryUsage().rss / 1024 / 1024).toFixed(0);
      await reply(
        `╭━━〔 🤖 *${config.botName.toUpperCase()}* 〕━━⬣\n` +
        `┃ 👑 *Desarrollador:* ${config.developer}\n` +
        `┃ 🌐 *Plataforma:* ${config.brand}\n` +
        `┃ 🖥️ *Servidor:* ${String(serverId).padStart(2, '0')}\n` +
        `┃ ⏱️ *Activo:* ${style.uptime(process.uptime())}\n` +
        `┃ 💾 *Memoria:* ${mem} MB\n` +
        `┃ 🟢 *Node:* ${process.version}\n` +
        `╰━━━━━━━━━━━━━━━━⬣`
      );
    },
  },
  {
    name: 'servidor', aliases: ['server'], cat: 'General', desc: 'Servidor que te atiende',
    async run({ reply, serverId }) {
      await reply(`🖥️ Tu sesion corre en el *Servidor ${String(serverId).padStart(2, '0')}* de ${config.brand}.\n📦 Cupos por servidor: *${config.maxPerServer}*`);
    },
  },
  {
    name: 'id', cat: 'General', desc: 'ID de este chat',
    async run({ jid, reply }) { await reply(`🆔 ${jid}`); },
  },
  {
    name: 'calc', aliases: ['calcular'], cat: 'Utilidades', desc: 'Calculadora (!calc 2*(3+4))',
    async run({ args, reply, prefix }) {
      const expr = args.join(' ').replace(/,/g, '.').replace(/\^/g, '**');
      if (!expr) return reply(`Uso: ${prefix}calc 2*(3+4)`);
      if (expr.length > 100 || !/^[\d+\-*/%().\s]+$/.test(expr)) return reply('Expresion no valida. Solo numeros y + - * / % ( ) ^');
      try {
        const r = Function(`"use strict"; return (${expr})`)();
        if (!Number.isFinite(r)) throw new Error('inf');
        await reply(`🧮 ${args.join(' ')} = *${Math.round(r * 1e8) / 1e8}*`);
      } catch { await reply('No pude resolver esa operacion.'); }
    },
  },
  {
    name: 'say', aliases: ['decir'], cat: 'Utilidades', desc: 'El bot repite tu texto',
    async run({ args, reply, prefix }) {
      if (!args.length) return reply(`Uso: ${prefix}say hola`);
      await reply(args.join(' ').slice(0, 1000));
    },
  },
  {
    name: 'dado', cat: 'Diversion', desc: 'Lanza un dado (!dado 20)',
    async run({ args, reply }) {
      const n = Math.min(Math.max(parseInt(args[0], 10) || 6, 2), 1000);
      await reply(`🎲 Dado de ${n} caras: *${1 + Math.floor(Math.random() * n)}*`);
    },
  },
  {
    name: 'moneda', cat: 'Diversion', desc: 'Cara o sello',
    async run({ reply }) { await reply(`🪙 *${pick(['Cara', 'Sello'])}*`); },
  },
  {
    name: 'elegir', cat: 'Diversion', desc: 'Elige entre opciones (!elegir a, b, c)',
    async run({ args, reply, prefix }) {
      const opts = args.join(' ').split(/[,|]/).map((s) => s.trim()).filter(Boolean);
      if (opts.length < 2) return reply(`Uso: ${prefix}elegir pizza, tacos, sushi`);
      await reply(`🤔 Elijo: *${pick(opts)}*`);
    },
  },
  {
    name: 'bola', aliases: ['8ball'], cat: 'Diversion', desc: 'Bola 8 (!bola pregunta)',
    async run({ args, reply, prefix }) {
      if (!args.length) return reply(`Uso: ${prefix}bola voy a aprobar?`);
      await reply(`🎱 ${pick(BOLA)}`);
    },
  },
  {
    name: 'frase', cat: 'Diversion', desc: 'Frase motivacional',
    async run({ reply }) { await reply(`💬 _${pick(FRASES)}_`); },
  },
];

module.exports = [
  ...commands,
  ...require('./cmds/registro'),
  ...require('./cmds/economia'),
  ...require('./cmds/juegos'),
  ...require('./cmds/grupos'),
  ...require('./cmds/math'),
  ...require('./cmds/finanzas'),
  ...require('./cmds/mundo'),
  ...require('./cmds/info'),
  ...require('./cmds/multimedia'),
  ...require('./cmds/descargas'),
  ...require('./cmds/herramientas'),
  ...require('./cmds/estudio'),
  ...require('./cmds/owner'),
];
