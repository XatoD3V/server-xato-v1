const { getTargets, num, cooldown, rand, pick, fmtTime } = require('../util');
const { levelFor } = require('../db');
const CAT = 'Economia';

const ITEMS = {
  pico: { price: 600, desc: 'Trabajas con x1.5 de paga' },
  laptop: { price: 1500, desc: 'Trabajas con x2 de paga' },
  suerte: { price: 1000, desc: 'Mas probabilidad al apostar (55%)' },
};
const JOBS = ['programaste una pagina web', 'repartiste pedidos en bicicleta', 'diste clases particulares', 'arreglaste computadoras', 'vendiste postres en la universidad', 'editaste videos para un cliente'];

module.exports = [
  {
    name: 'saldo', aliases: ['bal', 'monedas'], cat: CAT, desc: 'Tus monedas',
    async run({ user, reply }) { await reply(`🪙 Tienes *${user.coins}* monedas.`); },
  },
  {
    name: 'diario', aliases: ['daily'], cat: CAT, desc: 'Recompensa diaria con racha',
    async run({ user, store, reply }) {
      const left = user.lastDaily + 24 * 3600 * 1000 - Date.now();
      if (left > 0) return reply(`⏳ Ya reclamaste tu recompensa. Vuelve en *${fmtTime(left)}*.`);
      user.streak = Date.now() - user.lastDaily < 48 * 3600 * 1000 ? user.streak + 1 : 1;
      const reward = 200 + Math.min(user.streak, 7) * 50;
      user.coins += reward;
      user.lastDaily = Date.now();
      store.save();
      await reply(`🎁 *Recompensa diaria*\n+${reward} monedas\n🔥 Racha: *${user.streak}* dia(s)\n🪙 Total: *${user.coins}*`);
    },
  },
  {
    name: 'trabajar', aliases: ['work'], cat: CAT, desc: 'Gana monedas (cada 1 hora)',
    async run({ user, store, reply }) {
      const left = user.lastWork + 3600 * 1000 - Date.now();
      if (left > 0) return reply(`⏳ Estas cansado. Vuelve a trabajar en *${fmtTime(left)}*.`);
      const mult = user.items.laptop ? 2 : user.items.pico ? 1.5 : 1;
      const pay = Math.round(rand(60, 160) * mult);
      user.coins += pay;
      user.lastWork = Date.now();
      store.save();
      await reply(`💼 ${pick(JOBS)} y ganaste *${pay}* monedas.\n🪙 Total: *${user.coins}*`);
    },
  },
  {
    name: 'apostar', aliases: ['bet'], cat: CAT, desc: 'Apuesta monedas (!apostar 100)',
    async run({ user, args, store, reply, prefix, sender }) {
      const amount = /^(todo|all)$/i.test(args[0] || '') ? user.coins : parseInt(args[0], 10);
      if (!Number.isFinite(amount) || amount < 10) return reply(`Uso: ${prefix}apostar 100  (minimo 10)`);
      if (amount > user.coins) return reply('❌ No tienes suficientes monedas.');
      const wait = cooldown(`bet:${sender}`, 10000);
      if (wait) return reply(`⏳ Espera ${wait}s para apostar de nuevo.`);
      const win = Math.random() < (user.items.suerte ? 0.55 : 0.45);
      user.coins += win ? amount : -amount;
      store.save();
      await reply(win ? `🎰 *¡Ganaste!* +${amount} monedas\n🪙 Total: *${user.coins}*` : `🎰 *Perdiste* -${amount} monedas\n🪙 Total: *${user.coins}*`);
    },
  },
  {
    name: 'tienda', aliases: ['shop'], cat: CAT, desc: 'Objetos a la venta',
    async run({ reply, prefix }) {
      const lines = Object.entries(ITEMS).map(([k, v]) => `│ 🛒 *${k}* · ${v.price} monedas\n│    _${v.desc}_`).join('\n');
      await reply(`╭─「 🏪 *TIENDA* 」\n${lines}\n╰──────────────⬣\nCompra con *${prefix}comprar pico*`);
    },
  },
  {
    name: 'comprar', aliases: ['buy'], cat: CAT, desc: 'Compra un objeto (!comprar pico)',
    async run({ user, args, store, reply, prefix }) {
      const key = (args[0] || '').toLowerCase();
      const item = ITEMS[key];
      if (!item) return reply(`Objeto no valido. Mira la tienda con *${prefix}tienda*`);
      if (user.items[key]) return reply('Ya tienes ese objeto.');
      if (user.coins < item.price) return reply(`❌ Te faltan ${item.price - user.coins} monedas.`);
      user.coins -= item.price;
      user.items[key] = true;
      store.save();
      await reply(`✅ Compraste *${key}*.\n🪙 Te quedan *${user.coins}* monedas.`);
    },
  },
  {
    name: 'transferir', aliases: ['dar', 'pay'], cat: CAT, desc: 'Envia monedas (!transferir @user 100)',
    async run({ m, user, args, store, reply, prefix, sock, jid }) {
      const amount = parseInt(args.find((a) => /^\d{1,7}$/.test(a)), 10);
      const target = getTargets(m, args.filter((a) => a.replace(/\D/g, '').length >= 8))[0];
      if (!target || !Number.isFinite(amount) || amount < 1) return reply(`Uso: ${prefix}transferir @usuario 100`);
      const dest = store.findByNum(num(target));
      if (!dest) return reply('❌ Ese usuario no esta registrado.');
      if (dest.id === user.id) return reply('❌ No puedes enviarte monedas a ti mismo.');
      if (amount > user.coins) return reply('❌ No tienes suficientes monedas.');
      user.coins -= amount;
      dest.coins += amount;
      store.save();
      await sock.sendMessage(jid, { text: `💸 Enviaste *${amount}* monedas a @${num(dest.id)}`, mentions: [dest.id] }, { quoted: m });
    },
  },
  {
    name: 'top', aliases: ['ranking'], cat: CAT, desc: 'Ranking (!top | !top nivel)',
    async run({ args, store, reply }) {
      const byLevel = /niv|lev|xp/i.test(args[0] || '');
      const list = store.users().sort((a, b) => (byLevel ? b.xp - a.xp : b.coins - a.coins)).slice(0, 10);
      if (!list.length) return reply('Aun no hay usuarios registrados.');
      const medals = ['🥇', '🥈', '🥉'];
      const rows = list.map((u, i) => `${medals[i] || `*${i + 1}.*`} ${u.name} · ${byLevel ? `Nivel ${levelFor(u.xp)} (${u.xp} XP)` : `${u.coins} 🪙`}`).join('\n');
      await reply(`🏆 *TOP ${byLevel ? 'NIVELES' : 'MONEDAS'}*\n\n${rows}`);
    },
  },
];
