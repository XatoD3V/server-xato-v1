const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { getJson, getBuffer, cooldown } = require('../util');
const CAT = 'Descargas';
const MAX_MB = 60;
let running = 0;
let hasBin = { t: 0, ok: false };

function ytdlpAvailable() {
  if (Date.now() - hasBin.t < 60000) return hasBin.ok;
  hasBin = { t: Date.now(), ok: spawnSync('yt-dlp', ['--version'], { timeout: 8000 }).status === 0 };
  return hasBin.ok;
}

function runYtdlp(args, timeout = 240000) {
  return new Promise((resolve, reject) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'xato-'));
    const p = spawn('yt-dlp', [
      '--no-playlist', '--no-warnings', '--max-filesize', `${MAX_MB}M`,
      '-o', path.join(dir, '%(title).70B.%(ext)s'), ...args,
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    const timer = setTimeout(() => p.kill('SIGKILL'), timeout);
    p.on('error', (e) => { clearTimeout(timer); fs.rmSync(dir, { recursive: true, force: true }); reject(e); });
    p.on('close', (code) => {
      clearTimeout(timer);
      const file = fs.readdirSync(dir).map((f) => path.join(dir, f))[0];
      if (code !== 0 || !file) { fs.rmSync(dir, { recursive: true, force: true }); return reject(new Error(err.slice(-200) || 'sin archivo')); }
      resolve({ file, dir, title: path.parse(file).name });
    });
  });
}

const isUrl = (s) => /^https?:\/\/\S+$/i.test(s || '');
const target = (args) => (isUrl(args[0]) ? args[0] : `ytsearch1:${args.join(' ')}`);

async function download(ctx, { kind, label, needUrl }) {
  const { sock, m, jid, args, reply, prefix, sender } = ctx;
  if (!args.length || (needUrl && !isUrl(args[0]))) return reply(`Uso: ${prefix}${ctx.cmdName} ${needUrl ? 'https://enlace' : 'enlace o nombre'}`);
  if (!ytdlpAvailable()) return reply('⚠️ El dueño del bot debe instalar *yt-dlp* y *ffmpeg* para usar descargas. Mira el README.');
  const wait = cooldown(`dl:${sender}`, 20000);
  if (wait) return reply(`⏳ Espera ${wait}s para otra descarga.`);
  if (running >= 2) return reply('🚦 Hay muchas descargas en curso. Intenta en un momento.');

  running++;
  await reply(`📥 Descargando ${label}, un momento...`);
  let res;
  try {
    const a = kind === 'mp3'
      ? ['-x', '--audio-format', 'mp3', '--audio-quality', '5', '--', target(args)]
      : ['-f', `b[ext=mp4][filesize<${MAX_MB}M]/b[ext=mp4]/b`, '--merge-output-format', 'mp4', '--', target(args)];
    res = await runYtdlp(a);
    const buf = fs.readFileSync(res.file);
    if (kind === 'mp3') await sock.sendMessage(jid, { audio: buf, mimetype: 'audio/mpeg', fileName: `${res.title}.mp3` }, { quoted: m });
    else await sock.sendMessage(jid, { video: buf, mimetype: 'video/mp4', caption: `🎬 *${res.title}*\n_${ctx.config.botName} · ${ctx.config.developer}_` }, { quoted: m });
  } catch (e) {
    await reply('❌ No pude descargar eso. Revisa el enlace o intenta con otro (limite 60 MB).');
  } finally {
    running--;
    if (res) fs.rmSync(res.dir, { recursive: true, force: true });
  }
}

const mk = (name, aliases, desc, opts) => ({
  name, aliases, cat: CAT, desc,
  async run(ctx) { await download({ ...ctx, cmdName: name }, opts); },
});

module.exports = [
  mk('ytmp3', ['mp3'], 'YouTube a audio (!ytmp3 enlace|nombre)', { kind: 'mp3', label: 'audio' }),
  mk('play', ['musicayt'], 'Busca y envia audio (!play nombre)', { kind: 'mp3', label: 'audio' }),
  mk('ytmp4', ['mp4', 'video'], 'YouTube a video (!ytmp4 enlace|nombre)', { kind: 'mp4', label: 'video' }),
  mk('instagram', ['ig', 'insta'], 'Descarga de Instagram (!instagram enlace)', { kind: 'mp4', label: 'contenido', needUrl: true }),
  mk('facebook', ['fb'], 'Descarga de Facebook (!facebook enlace)', { kind: 'mp4', label: 'video', needUrl: true }),
  mk('dl', ['descargar'], 'Descarga de X, Reddit y mas (!dl enlace)', { kind: 'mp4', label: 'video', needUrl: true }),
  {
    name: 'tiktok', aliases: ['tt'], cat: CAT, desc: 'TikTok sin marca de agua (!tiktok enlace)',
    async run(ctx) {
      const { sock, m, jid, args, reply, prefix, sender } = ctx;
      if (!/tiktok\.com/i.test(args[0] || '')) return reply(`Uso: ${prefix}tiktok https://vm.tiktok.com/xxxx`);
      const wait = cooldown(`dl:${sender}`, 20000);
      if (wait) return reply(`⏳ Espera ${wait}s para otra descarga.`);
      await reply('📥 Descargando TikTok...');
      try {
        const j = await getJson(`https://www.tikwm.com/api/?url=${encodeURIComponent(args[0])}&hd=1`, { timeout: 25000 });
        if (j.code !== 0 || !j.data) throw new Error('tikwm');
        const u = j.data.hdplay || j.data.play;
        const { buffer } = await getBuffer(u.startsWith('/') ? `https://www.tikwm.com${u}` : u, { timeout: 60000 });
        if (buffer.length > MAX_MB * 1024 * 1024) return reply('❌ El video supera el limite de 60 MB.');
        const author = (j.data.author && j.data.author.nickname) || '-';
        await sock.sendMessage(jid, { video: buffer, mimetype: 'video/mp4', caption: `🎵 *${(j.data.title || 'TikTok').slice(0, 150)}*\n👤 ${author}\n_${ctx.config.botName} · ${ctx.config.developer}_` }, { quoted: m });
      } catch {
        await download({ ...ctx, cmdName: 'tiktok' }, { kind: 'mp4', label: 'TikTok', needUrl: true });
      }
    },
  },
];
