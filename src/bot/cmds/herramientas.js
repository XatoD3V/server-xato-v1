const crypto = require('crypto');
const { getJson, norm, fmtNum } = require('../util');
const CAT = 'Herramientas';

/* ---- conversion de unidades ---- */
const UNITS = {
  longitud: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254 },
  masa: { kg: 1, g: 0.001, mg: 1e-6, lb: 0.45359237, oz: 0.0283495231, t: 1000 },
  volumen: { l: 1, ml: 0.001, gal: 3.785411784, m3: 1000 },
};
const TEMP = ['c', 'f', 'k'];
function convertTemp(v, from, to) {
  const c = from === 'c' ? v : from === 'f' ? (v - 32) * 5 / 9 : v - 273.15;
  return to === 'c' ? c : to === 'f' ? c * 9 / 5 + 32 : c + 273.15;
}

module.exports = [
  {
    name: 'traducir', aliases: ['tr', 'translate'], cat: CAT, desc: 'Traductor (!traducir en hola mundo)',
    async run({ args, reply, prefix }) {
      const dst = (args[0] || '').toLowerCase();
      const text = args.slice(1).join(' ').trim();
      if (!/^[a-z]{2}$/.test(dst) || !text) return reply(`Uso: ${prefix}traducir en hola mundo\nCodigos: es, en, pt, fr, de, it, ja, ko, ru, zh...`);
      if (text.length > 500) return reply('Maximo 500 caracteres.');
      try {
        const j = await getJson(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=Autodetect|${dst}`);
        const out = j.responseData && j.responseData.translatedText;
        if (!out) throw new Error('sin resultado');
        await reply(`Traduccion (${dst}):\n${out}`);
      } catch { await reply('No pude traducir ahora. Intenta mas tarde.'); }
    },
  },
  {
    name: 'wiki', aliases: ['wikipedia'], cat: CAT, desc: 'Busca en Wikipedia (!wiki Machu Picchu)',
    async run({ args, reply, prefix }) {
      const q = args.join(' ').trim();
      if (!q) return reply(`Uso: ${prefix}wiki Machu Picchu`);
      const summary = (t) => getJson(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t.replace(/ /g, '_'))}`);
      try {
        let s;
        try { s = await summary(q); } catch {
          const f = await getJson(`https://es.wikipedia.org/w/rest.php/v1/search/title?q=${encodeURIComponent(q)}&limit=1`);
          if (!f.pages || !f.pages.length) throw new Error('sin resultados');
          s = await summary(f.pages[0].key);
        }
        const extract = (s.extract || 'Sin resumen disponible.').slice(0, 900);
        const link = s.content_urls && s.content_urls.desktop ? `\n\n${s.content_urls.desktop.page}` : '';
        await reply(`${s.title}\n\n${extract}${link}`);
      } catch { await reply('No encontre ese tema en Wikipedia.'); }
    },
  },
  {
    name: 'convertir', aliases: ['unidades'], cat: CAT, desc: 'Unidades (!convertir 10 km mi)',
    async run({ args, reply, prefix }) {
      const v = Number((args[0] || '').replace(',', '.'));
      const from = norm(args[1] || '').replace(/^a$/, '');
      const to = norm(args[args.length - 1] || '');
      if (!Number.isFinite(v) || args.length < 3) {
        return reply(
          `Uso: ${prefix}convertir 10 km mi\nLongitud: ${Object.keys(UNITS.longitud).join(', ')}\n` +
          `Masa: ${Object.keys(UNITS.masa).join(', ')}\nVolumen: ${Object.keys(UNITS.volumen).join(', ')}\nTemperatura: c, f, k`
        );
      }
      if (TEMP.includes(from) && TEMP.includes(to)) return reply(`${v} ${from.toUpperCase()} = ${fmtNum(Number(convertTemp(v, from, to).toFixed(4)))} ${to.toUpperCase()}`);
      const group = Object.values(UNITS).find((g) => g[from] && g[to]);
      if (!group) return reply('No puedo convertir esas unidades entre si.');
      await reply(`${v} ${from} = ${fmtNum(Number(((v * group[from]) / group[to]).toPrecision(10)))} ${to}`);
    },
  },
  {
    name: 'clave', aliases: ['password'], cat: CAT, desc: 'Contrasena segura (!clave 16)',
    async run({ args, reply }) {
      const len = Math.min(Math.max(parseInt(args[0], 10) || 16, 8), 64);
      const set = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?';
      let pass = '';
      for (const b of crypto.randomBytes(len)) pass += set[b % set.length];
      await reply(`Contrasena (${len} caracteres):\n${pass}\n\nGuardala en un lugar seguro.`);
    },
  },
];
