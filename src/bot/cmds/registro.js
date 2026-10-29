const fs = require('fs');
const path = require('path');
const config = require('../../config');
const style = require('../style');
const { levelFor, xpForLevel } = require('../db');

const REG_IMG = path.join(config.assetsDir, 'registro.jpg');

module.exports = [
  {
    name: 'reg', aliases: ['registrar', 'registro'], cat: 'Registro', noReg: true, desc: 'Registrate (!reg nombre.edad)',
    async run({ sock, m, jid, text, args, sender, user: already, store, reply, prefix }) {
      if (already) return reply(`✅ Ya estas registrado.\nUsa *${prefix}perfil* para ver tus datos o *${prefix}unreg* para borrar tu registro.`);

      const input = args.join(' ');
      const dot = input.lastIndexOf('.');
      const name = dot > 0 ? input.slice(0, dot).trim() : '';
      const age = dot > 0 ? parseInt(input.slice(dot + 1), 10) : NaN;
      if (!name || !Number.isFinite(age)) {
        return reply(`📝 *Formato de registro*\n\n${prefix}reg *nombre.edad*\n_Ejemplo:_ ${prefix}reg Juan.20`);
      }
      if (!/^[\p{L} ]{2,20}$/u.test(name)) return reply('❌ El nombre debe tener entre 2 y 20 letras (sin numeros ni simbolos).');
      if (age < 10 || age > 90) return reply('❌ La edad debe estar entre 10 y 90 años.');

      const u = store.createUser(sender, { name, age });
      const caption = style.regSuccess(u);
      if (fs.existsSync(REG_IMG)) await sock.sendMessage(jid, { image: fs.readFileSync(REG_IMG), caption }, { quoted: m });
      else await reply(caption);
    },
  },
  {
    name: 'unreg', aliases: ['borrarregistro'], cat: 'Registro', desc: 'Borra tu registro',
    async run({ user, store, reply }) {
      store.deleteUser(user.id);
      await reply('🗑️ Tu registro fue eliminado. Puedes volver a registrarte con *!reg nombre.edad*.');
    },
  },
  {
    name: 'perfil', aliases: ['profile', 'yo'], cat: 'Registro', desc: 'Tu perfil y nivel',
    async run({ user: u, reply }) {
      const lvl = levelFor(u.xp);
      const next = xpForLevel(lvl + 1);
      const items = Object.keys(u.items || {}).join(', ') || 'ninguno';
      await reply(
        `╭━━〔 👤 *PERFIL* 〕━━⬣\n` +
        `┃ 📛 *Nombre:* ${u.name}\n` +
        `┃ 🎂 *Edad:* ${u.age}\n` +
        `┃ 🆔 *ID:* ${u.serial}\n` +
        `┃ 🏅 *Nivel:* ${lvl}\n` +
        `┃ ✨ *XP:* ${u.xp} / ${next}\n` +
        `┃ 🪙 *Monedas:* ${u.coins}\n` +
        `┃ 🎒 *Objetos:* ${items}\n` +
        `┃ 📅 *Registro:* ${new Date(u.regAt).toLocaleDateString('es-PE', { timeZone: 'America/Lima' })}\n` +
        `╰━━━━━━━━━━━━━━⬣\n_Escribe en el chat para ganar XP._`
      );
    },
  },
];
