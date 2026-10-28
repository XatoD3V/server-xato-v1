const { getTargets, isAdminIn, num, pick, norm } = require('../util');
const CAT = 'Grupos';
const at = (ids) => ids.map((i) => `@${num(i)}`).join(' ');

const toggle = (key, label) => async ({ args, store, jid, reply, prefix, name }) => {
  const g = store.group(jid);
  const v = norm(args[0] || '');
  if (!['on', 'off', 'si', 'no'].includes(v)) return reply(`${label}: *${g[key] ? 'activada ✅' : 'desactivada ❌'}*\nUsa *${prefix}${name} on* o *${prefix}${name} off*`);
  g[key] = v === 'on' || v === 'si';
  store.save();
  await reply(`${label}: *${g[key] ? 'activada ✅' : 'desactivada ❌'}*`);
};

module.exports = [
  {
    name: 'grupo', aliases: ['infogrupo'], cat: CAT, group: true, desc: 'Informacion del grupo',
    async run({ meta, store, jid, reply }) {
      const g = store.group(jid);
      const admins = meta.participants.filter((p) => p.admin).length;
      await reply(
        `╭━━〔 👥 *GRUPO* 〕━━⬣\n┃ 🏠 *${meta.subject}*\n┃ 👤 *Miembros:* ${meta.participants.length}\n┃ 🛡️ *Admins:* ${admins}\n` +
        `┃ 📅 *Creado:* ${new Date(meta.creation * 1000).toLocaleDateString('es-PE')}\n┃ 🔗 *Antilink:* ${g.antilink ? 'on' : 'off'}\n` +
        `┃ 👋 *Bienvenida:* ${g.welcome ? 'on' : 'off'}\n╰━━━━━━━━━━━━━⬣` + (meta.desc ? `\n\n📝 ${meta.desc}` : '')
      );
    },
  },
  {
    name: 'tagall', aliases: ['todos'], cat: CAT, admin: true, desc: 'Menciona a todos (admins)',
    async run({ sock, m, jid, args, meta }) {
      const ids = meta.participants.map((p) => p.id);
      await sock.sendMessage(jid, { text: `📢 *${args.join(' ') || 'Atencion a todos'}*\n\n${at(ids)}`, mentions: ids }, { quoted: m });
    },
  },
  {
    name: 'kick', aliases: ['expulsar'], cat: CAT, admin: true, botAdmin: true, desc: 'Expulsa (!kick @user)',
    async run({ sock, m, jid, args, meta, reply, prefix, botNumber }) {
      const ids = getTargets(m, args).filter((i) => num(i) !== botNumber && !isAdminIn(meta, [i]));
      if (!ids.length) return reply(`Uso: ${prefix}kick @usuario\n_No se puede expulsar a administradores._`);
      await sock.groupParticipantsUpdate(jid, ids, 'remove');
      await sock.sendMessage(jid, { text: `🚪 Expulsado: ${at(ids)}`, mentions: ids });
    },
  },
  {
    name: 'add', aliases: ['agregar'], cat: CAT, admin: true, botAdmin: true, desc: 'Agrega un numero (!add 51999999999)',
    async run({ sock, jid, args, reply, prefix }) {
      const nums = args.map((a) => a.replace(/\D/g, '')).filter((d) => d.length >= 8 && d.length <= 15);
      if (!nums.length) return reply(`Uso: ${prefix}add 51999999999`);
      const res = await sock.groupParticipantsUpdate(jid, nums.map((n) => `${n}@s.whatsapp.net`), 'add');
      const lines = res.map((r) => `${String(r.status) === '200' ? '✅' : '⚠️'} ${num(r.jid || '')} (${r.status})`).join('\n');
      await reply(`➕ *Resultado*\n${lines}\n_403 = el usuario solo permite que lo inviten con enlace._`);
    },
  },
  {
    name: 'promote', aliases: ['daradmin'], cat: CAT, admin: true, botAdmin: true, desc: 'Da admin (!promote @user)',
    async run({ sock, m, jid, args, reply, prefix }) {
      const ids = getTargets(m, args);
      if (!ids.length) return reply(`Uso: ${prefix}promote @usuario`);
      await sock.groupParticipantsUpdate(jid, ids, 'promote');
      await sock.sendMessage(jid, { text: `👑 Ahora son admin: ${at(ids)}`, mentions: ids });
    },
  },
  {
    name: 'demote', aliases: ['quitaradmin'], cat: CAT, admin: true, botAdmin: true, desc: 'Quita admin (!demote @user)',
    async run({ sock, m, jid, args, reply, prefix }) {
      const ids = getTargets(m, args);
      if (!ids.length) return reply(`Uso: ${prefix}demote @usuario`);
      await sock.groupParticipantsUpdate(jid, ids, 'demote');
      await sock.sendMessage(jid, { text: `⬇️ Ya no son admin: ${at(ids)}`, mentions: ids });
    },
  },
  { name: 'antilink', cat: CAT, admin: true, desc: 'Borra enlaces (!antilink on|off)', async run(ctx) { await toggle('antilink', '🔗 Antilink')({ ...ctx, name: 'antilink' }); } },
  { name: 'bienvenida', cat: CAT, admin: true, desc: 'Mensaje de bienvenida (on|off)', async run(ctx) { await toggle('welcome', '👋 Bienvenida')({ ...ctx, name: 'bienvenida' }); } },
  { name: 'despedida', cat: CAT, admin: true, desc: 'Mensaje de despedida (on|off)', async run(ctx) { await toggle('bye', '😢 Despedida')({ ...ctx, name: 'despedida' }); } },
  {
    name: 'silenciar', aliases: ['cerrar'], cat: CAT, admin: true, botAdmin: true, desc: 'Solo admins pueden escribir',
    async run({ sock, jid, reply }) { await sock.groupSettingUpdate(jid, 'announcement'); await reply('🔇 Grupo cerrado: solo los administradores pueden escribir.'); },
  },
  {
    name: 'abrir', cat: CAT, admin: true, botAdmin: true, desc: 'Todos pueden escribir',
    async run({ sock, jid, reply }) { await sock.groupSettingUpdate(jid, 'not_announcement'); await reply('🔊 Grupo abierto: todos pueden escribir.'); },
  },
  {
    name: 'advertir', aliases: ['warn'], cat: CAT, admin: true, desc: 'Advierte (!advertir @user motivo)',
    async run({ sock, m, jid, args, meta, store, reply, prefix, isBotAdmin }) {
      const id = getTargets(m, args)[0];
      if (!id) return reply(`Uso: ${prefix}advertir @usuario motivo`);
      if (isAdminIn(meta, [id])) return reply('No puedo advertir a un administrador.');
      const g = store.group(jid);
      const k = num(id);
      g.warns[k] = (g.warns[k] || 0) + 1;
      const n = g.warns[k];
      store.save();
      if (n >= 3 && isBotAdmin) {
        g.warns[k] = 0; store.save();
        await sock.sendMessage(jid, { text: `🚫 @${k} llego a *3/3* advertencias y fue expulsado.`, mentions: [id] });
        return sock.groupParticipantsUpdate(jid, [id], 'remove');
      }
      await sock.sendMessage(jid, { text: `⚠️ @${k} recibio una advertencia: *${n}/3*`, mentions: [id] });
    },
  },
  {
    name: 'perdonar', cat: CAT, admin: true, desc: 'Borra advertencias (!perdonar @user)',
    async run({ m, args, jid, store, reply, sock, prefix }) {
      const id = getTargets(m, args)[0];
      if (!id) return reply(`Uso: ${prefix}perdonar @usuario`);
      store.group(jid).warns[num(id)] = 0; store.save();
      await sock.sendMessage(jid, { text: `✅ Advertencias de @${num(id)} reiniciadas.`, mentions: [id] });
    },
  },
  {
    name: 'sorteo', cat: CAT, group: true, desc: 'Elige un ganador (!sorteo premio)',
    async run({ sock, m, jid, args, meta, botNumber }) {
      const pool = meta.participants.map((p) => p.id).filter((i) => num(i) !== botNumber);
      const w = pick(pool);
      await sock.sendMessage(jid, { text: `🎉 *SORTEO*\n🎁 Premio: *${args.join(' ') || 'sorpresa'}*\n\n🏆 Ganador/a: @${num(w)}`, mentions: [w] }, { quoted: m });
    },
  },
  {
    name: 'link', aliases: ['enlace'], cat: CAT, botAdmin: true, group: true, desc: 'Enlace de invitacion',
    async run({ sock, jid, reply }) { await reply(`🔗 https://chat.whatsapp.com/${await sock.groupInviteCode(jid)}`); },
  },
];
