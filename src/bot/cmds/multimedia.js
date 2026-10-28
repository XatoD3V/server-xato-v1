const { getBuffer, getMedia } = require('../util');
const config = require('../../config');
const CAT = 'Multimedia';

const TTS_LANGS = ['es', 'en', 'pt', 'fr', 'de', 'it', 'ja', 'ko', 'ru', 'ar', 'hi', 'tr', 'nl', 'pl'];

async function toSticker(buffer) {
  try {
    const { Sticker } = require('wa-sticker-formatter');
    return await new Sticker(buffer, { pack: config.botName, author: config.brand, type: 'full', quality: 70 }).toBuffer();
  } catch {
    const sharp = require('sharp'); // alternativa sin metadatos
    return sharp(buffer).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 75 }).toBuffer();
  }
}

module.exports = [
  {
    name: 'imagen', aliases: ['img', 'imagina'], cat: CAT, desc: 'Genera una imagen con IA (!imagen gato astronauta)',
    async run({ sock, m, jid, args, reply, prefix }) {
      const prompt = args.join(' ').trim();
      if (!prompt) return reply(`Uso: ${prefix}imagen un gato astronauta en neon`);
      if (prompt.length > 400) return reply('El texto es muy largo (maximo 400 caracteres).');
      await reply('Generando imagen, espera unos segundos...');
      try {
        const seed = Math.floor(Math.random() * 1e6);
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${seed}`;
        const { buffer, type } = await getBuffer(url, { timeout: 90000 });
        if (!type.startsWith('image/')) throw new Error('respuesta no valida');
        await sock.sendMessage(jid, { image: buffer, caption: `${prompt}\n\nGenerada por ${config.botName}` }, { quoted: m });
      } catch { await reply('No pude generar la imagen ahora. Intenta de nuevo en un momento.'); }
    },
  },
  {
    name: 'sticker', aliases: ['s', 'stiker'], cat: CAT, desc: 'Imagen a sticker (responde a una imagen)',
    async run({ sock, m, jid, reply, prefix }) {
      const buf = await getMedia(sock, m, ['imageMessage', 'videoMessage']);
      if (!buf) return reply(`Responde a una imagen (o video corto) con ${prefix}sticker, o envialo con ${prefix}sticker como pie de foto.`);
      try {
        await sock.sendMessage(jid, { sticker: await toSticker(buf) }, { quoted: m });
      } catch { await reply('No pude crear el sticker. Para videos se necesita ffmpeg instalado.'); }
    },
  },
  {
    name: 'toimg', aliases: ['aimagen'], cat: CAT, desc: 'Sticker a imagen (responde a un sticker)',
    async run({ sock, m, jid, reply, prefix }) {
      const buf = await getMedia(sock, m, ['stickerMessage']);
      if (!buf) return reply(`Responde a un sticker con ${prefix}toimg`);
      try {
        const png = await require('sharp')(buf).png().toBuffer();
        await sock.sendMessage(jid, { image: png, caption: 'Listo' }, { quoted: m });
      } catch { await reply('No pude convertir ese sticker.'); }
    },
  },
  {
    name: 'tts', aliases: ['audio', 'voz'], cat: CAT, desc: 'Texto a audio (!tts hola | !tts en hello)',
    async run({ sock, m, jid, args, reply, prefix }) {
      let lang = 'es';
      if (args.length > 1 && TTS_LANGS.includes(args[0].toLowerCase())) lang = args.shift().toLowerCase();
      const text = args.join(' ').trim();
      if (!text) return reply(`Uso: ${prefix}tts hola, como estas\nCon idioma: ${prefix}tts en good morning\nIdiomas: ${TTS_LANGS.join(', ')}`);
      if (text.length > 200) return reply('Maximo 200 caracteres por audio.');
      try {
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodeURIComponent(text)}`;
        const { buffer } = await getBuffer(url, { timeout: 20000 });
        await sock.sendMessage(jid, { audio: buffer, mimetype: 'audio/mpeg', ptt: false }, { quoted: m });
      } catch { await reply('No pude generar el audio ahora. Intenta mas tarde.'); }
    },
  },
  {
    name: 'qr', cat: CAT, desc: 'Genera un QR (!qr https://github.com)',
    async run({ sock, m, jid, args, reply, prefix }) {
      const text = args.join(' ').trim();
      if (!text) return reply(`Uso: ${prefix}qr https://github.com`);
      if (text.length > 500) return reply('Maximo 500 caracteres.');
      const png = await require('qrcode').toBuffer(text, { width: 512, margin: 2 });
      await sock.sendMessage(jid, { image: png, caption: 'Codigo QR' }, { quoted: m });
    },
  },
  ...[
    ['blanconegro', ['bn', 'grises'], 'Imagen en blanco y negro', (s) => s.grayscale()],
    ['blur', ['difuminar'], 'Difumina una imagen', (s) => s.blur(10)],
    ['invertir', ['negativo'], 'Invierte los colores', (s) => s.negate({ alpha: false })],
  ].map(([name, aliases, desc, fn]) => ({
    name, aliases, cat: CAT, desc: `${desc} (responde a una imagen)`,
    async run({ sock, m, jid, reply, prefix }) {
      const buf = await getMedia(sock, m, ['imageMessage']);
      if (!buf) return reply(`Responde a una imagen con ${prefix}${name}`);
      try {
        const out = await fn(require('sharp')(buf)).jpeg({ quality: 88 }).toBuffer();
        await sock.sendMessage(jid, { image: out, caption: 'Listo' }, { quoted: m });
      } catch { await reply('No pude editar esa imagen.'); }
    },
  })),
  {
    name: 'meme', cat: CAT, desc: 'Meme con texto (!meme arriba | abajo)',
    async run({ sock, m, jid, args, reply, prefix }) {
      const [top = '', bottom = ''] = args.join(' ').split('|').map((t) => t.trim().toUpperCase());
      if (!top && !bottom) return reply(`Responde a una imagen con ${prefix}meme texto arriba | texto abajo`);
      const buf = await getMedia(sock, m, ['imageMessage']);
      if (!buf) return reply('Responde a una imagen para crear el meme.');
      try {
        const sharp = require('sharp');
        const { width: w, height: h } = await sharp(buf).metadata();
        const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><style>.t{fill:#fff;stroke:#000;stroke-width:${Math.max(2, w / 110)}px;paint-order:stroke;font:900 ${Math.round(w / 10)}px Impact,Arial,sans-serif;text-anchor:middle}</style><text class="t" x="${w / 2}" y="${Math.round(w / 8)}">${esc(top)}</text><text class="t" x="${w / 2}" y="${h - Math.round(w / 25)}">${esc(bottom)}</text></svg>`;
        const out = await sharp(buf).composite([{ input: Buffer.from(svg) }]).jpeg({ quality: 90 }).toBuffer();
        await sock.sendMessage(jid, { image: out, caption: 'Meme listo' }, { quoted: m });
      } catch { await reply('No pude crear el meme.'); }
    },
  },
];
