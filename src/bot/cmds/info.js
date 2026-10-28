const { getJson, getText, getBuffer, num } = require('../util');
const CAT = 'Informacion';

const decode = (s) => s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
const big = (url) => (url || '').replace(/\d+x\d+bb/, '600x600bb');
const itunes = async (term, extra) => (await getJson(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&limit=1&country=PE&lang=es_es&${extra}`)).results[0];
const fail = (reply) => reply('❌ No pude obtener esa informacion ahora. Intenta mas tarde.');

module.exports = [
  {
    name: 'noticias', aliases: ['news'], cat: CAT, desc: 'Titulares de Peru',
    async run({ reply }) {
      try {
        const xml = await getText('https://news.google.com/rss?hl=es-419&gl=PE&ceid=PE:es-419');
        const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 7)
          .map((x) => decode((x[1].match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '')).filter(Boolean);
        if (!items.length) throw new Error('vacio');
        await reply(`📰 *NOTICIAS DEL PERU*\n\n${items.map((t, i) => `*${i + 1}.* ${t}`).join('\n\n')}\n\n_Fuente: Google Noticias_`);
      } catch { await fail(reply); }
    },
  },
  {
    name: 'sismo', aliases: ['temblor'], cat: CAT, desc: 'Ultimos sismos en Peru',
    async run({ reply }) {
      try {
        const j = await getJson('https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&limit=5&orderby=time&minmagnitude=2.5&minlatitude=-19&maxlatitude=1&minlongitude=-82&maxlongitude=-68');
        if (!j.features.length) return reply('No hay sismos recientes registrados en la region.');
        const rows = j.features.map((f) => {
          const p = f.properties;
          const when = new Date(p.time).toLocaleString('es-PE', { timeZone: 'America/Lima', dateStyle: 'short', timeStyle: 'short', hour12: false });
          return `🌋 *M ${p.mag}* · ${p.place}\n    🕒 ${when}`;
        }).join('\n\n');
        await reply(`⚠️ *ULTIMOS SISMOS (Peru y alrededores)*\n\n${rows}\n\n_Fuente: USGS. Reporte oficial local: IGP (ultimosismo.igp.gob.pe)_`);
      } catch { await fail(reply); }
    },
  },
  {
    name: 'feriados', cat: CAT, desc: 'Proximos feriados de Peru',
    async run({ reply }) {
      try {
        const j = await getJson('https://date.nager.at/api/v3/NextPublicHolidays/PE');
        const rows = j.slice(0, 6).map((h) => {
          const [y, mo, d] = h.date.split('-');
          return `📅 *${d}/${mo}/${y}* · ${h.localName}`;
        }).join('\n');
        await reply(`🇵🇪 *PROXIMOS FERIADOS*\n\n${rows}`);
      } catch { await fail(reply); }
    },
  },
  {
    name: 'pais', aliases: ['country'], cat: CAT, desc: 'Datos de un pais (!pais Japon)',
    async run({ sock, m, jid, args, reply, prefix }) {
      const q = args.join(' ').trim();
      if (!q) return reply(`Uso: ${prefix}pais Japon`);
      try {
        const j = await getJson(`https://restcountries.com/v3.1/translation/${encodeURIComponent(q)}?fields=name,capital,population,region,subregion,languages,currencies,area,flags,translations`);
        const c = j[0];
        const cur = Object.values(c.currencies || {}).map((x) => `${x.name} (${x.symbol})`).join(', ');
        const caption =
          `🌍 *${(c.translations.spa && c.translations.spa.common) || c.name.common}*\n\n` +
          `🏛️ *Capital:* ${(c.capital || ['-'])[0]}\n🗺️ *Region:* ${c.region} · ${c.subregion || '-'}\n` +
          `👥 *Poblacion:* ${c.population.toLocaleString('es-PE')}\n📐 *Area:* ${Math.round(c.area).toLocaleString('es-PE')} km²\n` +
          `🗣️ *Idiomas:* ${Object.values(c.languages || {}).join(', ')}\n💰 *Moneda:* ${cur}`;
        try {
          const { buffer } = await getBuffer(c.flags.png);
          await sock.sendMessage(jid, { image: buffer, caption }, { quoted: m });
        } catch { await reply(caption); }
      } catch { await reply('❌ No encontre ese pais. Prueba con el nombre en español.'); }
    },
  },
  {
    name: 'ip', cat: CAT, desc: 'Consulta una IP (!ip 8.8.8.8)',
    async run({ args, reply, prefix }) {
      const ip = args[0] || '';
      if (!/^[\d.]{7,15}$|^[0-9a-f:]{3,39}$/i.test(ip)) return reply(`Uso: ${prefix}ip 8.8.8.8`);
      try {
        const j = await getJson(`https://ipwho.is/${encodeURIComponent(ip)}`);
        if (!j.success) throw new Error('ip');
        await reply(
          `🌐 *IP ${j.ip}*\n\n🏳️ *Pais:* ${j.country}\n📍 *Region:* ${j.region}, ${j.city}\n` +
          `🏢 *Proveedor:* ${(j.connection && j.connection.isp) || '-'}\n🕒 *Zona horaria:* ${(j.timezone && j.timezone.id) || '-'}`
        );
      } catch { await reply('❌ No pude consultar esa IP.'); }
    },
  },
  {
    name: 'pelicula', aliases: ['movie'], cat: CAT, desc: 'Busca una pelicula (!pelicula Titanic)',
    async run({ sock, m, jid, args, reply, prefix }) {
      const q = args.join(' ').trim();
      if (!q) return reply(`Uso: ${prefix}pelicula Titanic`);
      try {
        const r = await itunes(q, 'media=movie&entity=movie');
        if (!r) return reply('No encontre esa pelicula.');
        const caption =
          `🎬 *${r.trackName}*\n\n🎭 *Genero:* ${r.primaryGenreName}\n🎥 *Director:* ${r.artistName}\n📅 *Estreno:* ${(r.releaseDate || '').slice(0, 10)}\n\n📝 ${(r.longDescription || r.shortDescription || '').slice(0, 500)}\n\n_Fuente: iTunes_`;
        const { buffer } = await getBuffer(big(r.artworkUrl100));
        await sock.sendMessage(jid, { image: buffer, caption }, { quoted: m });
      } catch { await fail(reply); }
    },
  },
  {
    name: 'serie', aliases: ['tv'], cat: CAT, desc: 'Busca una serie (!serie Dark)',
    async run({ sock, m, jid, args, reply, prefix }) {
      const q = args.join(' ').trim();
      if (!q) return reply(`Uso: ${prefix}serie Dark`);
      try {
        const r = await itunes(q, 'media=tvShow&entity=tvSeason');
        if (!r) return reply('No encontre esa serie.');
        const caption =
          `📺 *${r.collectionName}*\n\n🎭 *Genero:* ${r.primaryGenreName}\n🏷️ *Cadena:* ${r.artistName}\n📅 *Estreno:* ${(r.releaseDate || '').slice(0, 10)}\n\n📝 ${(r.longDescription || '').slice(0, 500)}\n\n_Fuente: iTunes_`;
        const { buffer } = await getBuffer(big(r.artworkUrl100));
        await sock.sendMessage(jid, { image: buffer, caption }, { quoted: m });
      } catch { await fail(reply); }
    },
  },
  {
    name: 'musica', aliases: ['spotify', 'cancion'], cat: CAT, desc: 'Busca una cancion + avance de 30s',
    async run({ sock, m, jid, args, reply, prefix }) {
      const q = args.join(' ').trim();
      if (!q) return reply(`Uso: ${prefix}musica Bad Bunny Monaco`);
      try {
        const r = await itunes(q, 'media=music&entity=song');
        if (!r) return reply('No encontre esa cancion.');
        const caption = `🎵 *${r.trackName}*\n\n🎤 *Artista:* ${r.artistName}\n💿 *Album:* ${r.collectionName}\n🎼 *Genero:* ${r.primaryGenreName}\n📅 *Lanzamiento:* ${(r.releaseDate || '').slice(0, 10)}\n\n_Avance de 30 segundos (iTunes)_`;
        const art = await getBuffer(big(r.artworkUrl100));
        await sock.sendMessage(jid, { image: art.buffer, caption }, { quoted: m });
        if (r.previewUrl) {
          const a = await getBuffer(r.previewUrl);
          await sock.sendMessage(jid, { audio: a.buffer, mimetype: 'audio/mp4', ptt: false }, { quoted: m });
        }
      } catch { await fail(reply); }
    },
  },
  {
    name: 'letra', aliases: ['lyrics'], cat: CAT, desc: 'Fragmento de letra (!letra artista - cancion)',
    async run({ args, reply, prefix }) {
      const [artist, ...rest] = args.join(' ').split(' - ');
      const title = rest.join(' - ').trim();
      if (!artist.trim() || !title) return reply(`Uso: ${prefix}letra artista - cancion`);
      try {
        const j = await getJson(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist.trim())}/${encodeURIComponent(title)}`);
        const lines = (j.lyrics || '').split('\n').map((l) => l.trim()).filter(Boolean).slice(1, 7).join('\n');
        if (!lines) throw new Error('vacio');
        await reply(`🎤 *${title}* — ${artist.trim()}\n\n${lines}\n...\n\n_Fragmento corto por derechos de autor. Busca la letra completa en un sitio oficial._`);
      } catch { await reply('❌ No encontre la letra. Revisa el formato: artista - cancion'); }
    },
  },
  {
    name: 'inflacion', aliases: ['ipc'], cat: CAT, desc: 'Inflacion de Peru (BCRP)',
    async run({ reply }) {
      try {
        const now = new Date(Date.now() - 5 * 3600 * 1000);
        const start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        const url = `https://estadisticas.bcrp.gob.pe/estadisticas/series/api/PN01273PM/json/${start.getFullYear()}-${start.getMonth() + 1}/${now.getFullYear()}-${now.getMonth() + 1}`;
        const j = await getJson(url);
        const rows = j.periods.filter((p) => p.values[0] && p.values[0] !== 'n.d.').slice(-6)
          .map((p) => `📈 *${p.name}:* ${Number(p.values[0]).toFixed(2)}%`).join('\n');
        if (!rows) throw new Error('vacio');
        await reply(`📊 *INFLACION*\n_${j.config.series[0].name}_\n\n${rows}\n\n_Fuente: BCRP (series estadisticas)_`);
      } catch {
        try {
          const j = await getJson('https://api.worldbank.org/v2/country/PE/indicator/FP.CPI.TOTL.ZG?format=json&per_page=5');
          const rows = j[1].filter((x) => x.value !== null).map((x) => `📈 *${x.date}:* ${x.value.toFixed(2)}%`).join('\n');
          await reply(`📊 *INFLACION ANUAL PERU*\n\n${rows}\n\n_Fuente: Banco Mundial_`);
        } catch { await fail(reply); }
      }
    },
  },
  {
    name: 'pbi', aliases: ['gdp'], cat: CAT, desc: 'Crecimiento del PBI (!pbi | !pbi mx)',
    async run({ args, reply }) {
      const code = /^[a-z]{2,3}$/i.test(args[0] || '') ? args[0].toUpperCase() : 'PE';
      try {
        const j = await getJson(`https://api.worldbank.org/v2/country/${code}/indicator/NY.GDP.MKTP.KD.ZG?format=json&per_page=6`);
        const rows = j[1].filter((x) => x.value !== null).map((x) => `📊 *${x.date}:* ${x.value.toFixed(2)}%`).join('\n');
        if (!rows) throw new Error('vacio');
        await reply(`💹 *CRECIMIENTO DEL PBI REAL* (${j[1][0].country.value})\n_Variacion anual_\n\n${rows}\n\n_Fuente: Banco Mundial. Para datos trimestrales usa INEI/BCRP._`);
      } catch { await reply('❌ No pude obtener el PBI. Usa un codigo de pais valido (pe, mx, co, cl, ar...).'); }
    },
  },
];
