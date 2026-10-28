const { getText, getQuotedText, cooldown, fmtTime } = require('../util');
const reminders = require('../reminders');
const config = require('../../config');
const CAT = 'Estudio';

const SYSTEM = `Eres ${config.botName}, asistente de WhatsApp creado por ${config.developer}. Responde siempre en español, de forma clara y breve (maximo 150 palabras).`;

async function ai(prompt, system = SYSTEM) {
  const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai&system=${encodeURIComponent(system)}`;
  const headers = config.aiKey ? { Authorization: `Bearer ${config.aiKey}` } : {};
  const out = (await getText(url, { timeout: 60000, headers })).trim();
  if (!out) throw new Error('vacio');
  return out.slice(0, 3000);
}

function guard(sender, reply) {
  const wait = cooldown(`ai:${sender}`, 15000);
  if (wait) { reply(`⏳ Espera ${wait}s antes de usar la IA de nuevo.`); return false; }
  return true;
}

module.exports = [
  {
    name: 'ia', aliases: ['ai', 'chatgpt', 'pregunta'], cat: CAT, desc: 'Asistente de IA (!ia pregunta)',
    async run({ args, sender, reply, prefix }) {
      const q = args.join(' ').trim();
      if (!q) return reply(`Uso: ${prefix}ia explica que es la inflacion`);
      if (q.length > 800) return reply('La pregunta es muy larga (maximo 800 caracteres).');
      if (!guard(sender, reply)) return;
      try { await reply(`🤖 ${await ai(q)}`); } catch { await reply('❌ La IA no responde ahora. Intenta en un momento.'); }
    },
  },
  {
    name: 'resumir', aliases: ['resumen'], cat: CAT, desc: 'Resume un texto (responde a un mensaje)',
    async run({ m, args, sender, reply, prefix }) {
      const t = (args.join(' ') || getQuotedText(m)).trim();
      if (t.length < 40) return reply(`Responde a un mensaje largo con *${prefix}resumir* o escribe el texto a continuacion.`);
      if (!guard(sender, reply)) return;
      try { await reply(`📝 *Resumen*\n\n${await ai(`Resume en pocas lineas, con puntos clave:\n\n${t.slice(0, 4000)}`)}`); } catch { await reply('❌ No pude resumir ahora.'); }
    },
  },
  {
    name: 'corregir', aliases: ['ortografia'], cat: CAT, desc: 'Corrige ortografia (responde a un texto)',
    async run({ m, args, sender, reply, prefix }) {
      const t = (args.join(' ') || getQuotedText(m)).trim();
      if (!t) return reply(`Escribe el texto: *${prefix}corregir ola komo estas* (o responde a un mensaje).`);
      if (!guard(sender, reply)) return;
      try {
        const out = await ai(`Corrige ortografia y puntuacion de este texto. Devuelve solo el texto corregido:\n\n${t.slice(0, 2000)}`, 'Eres un corrector ortografico en español. Responde unicamente con el texto corregido.');
        await reply(`✍️ *Texto corregido*\n\n${out}`);
      } catch { await reply('❌ No pude corregir ahora.'); }
    },
  },
  {
    name: 'recordatorio', aliases: ['recordar', 'remind'], cat: CAT, desc: 'Recordatorio (!recordatorio 30m tomar agua)',
    async run({ args, jid, sender, store, botNumber, getSock, reply, prefix }) {
      const t = (args[0] || '').match(/^(\d+)(s|m|h|d)$/i);
      const text = args.slice(1).join(' ').trim();
      if (!t || !text) return reply(`Uso: ${prefix}recordatorio 30m tomar agua\nUnidades: s, m, h, d (maximo 7d)`);
      const ms = Number(t[1]) * { s: 1000, m: 60000, h: 3600000, d: 86400000 }[t[2].toLowerCase()];
      if (ms < 10000) return reply('El minimo es 10 segundos.');
      try {
        reminders.add(getSock, store, { jid, user: sender, bot: botNumber, text, at: Date.now() + ms });
        await reply(`⏰ Listo, te recordare en *${fmtTime(ms)}*:\n_${text}_`);
      } catch { await reply('❌ El maximo es 7 dias.'); }
    },
  },
  {
    name: 'alarma', cat: CAT, desc: 'Alarma a una hora de Lima (!alarma 07:30 texto)',
    async run({ args, jid, sender, store, botNumber, getSock, reply, prefix }) {
      const t = (args[0] || '').match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
      const text = args.slice(1).join(' ').trim() || 'Es la hora de tu alarma';
      if (!t) return reply(`Uso: ${prefix}alarma 07:30 levantarse\n_Hora de Lima (UTC-5)_`);
      const now = new Date();
      let at = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), Number(t[1]) + 5, Number(t[2]));
      if (at <= Date.now() + 5000) at += 86400000;
      reminders.add(getSock, store, { jid, user: sender, bot: botNumber, text: `🔔 ${text}`, at });
      await reply(`🔔 Alarma programada para las *${t[1].padStart(2, '0')}:${t[2]}* (Lima), en *${fmtTime(at - Date.now())}*.`);
    },
  },
];
