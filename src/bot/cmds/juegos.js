const { getTargets, num, pick, rand, norm } = require('../util');

const WORDS = ['computadora', 'universidad', 'economia', 'inflacion', 'servidor', 'whatsapp', 'programacion', 'teclado', 'mercado', 'empresa', 'turismo', 'maquina', 'internet', 'pantalla', 'estudiante', 'montana', 'guitarra', 'elefante', 'chocolate', 'aventura', 'galaxia', 'biblioteca', 'camiseta', 'dinosaurio'];
const TRIVIA = [
  { q: 'Capital de Peru', o: ['Lima', 'Cusco', 'Arequipa'], a: 0 },
  { q: 'Cual es el planeta mas grande del sistema solar', o: ['Saturno', 'Jupiter', 'Neptuno'], a: 1 },
  { q: 'Cuantos continentes hay', o: ['5', '6', '7'], a: 2 },
  { q: 'Que moneda se usa en Peru', o: ['Sol', 'Peso', 'Bolivar'], a: 0 },
  { q: 'Quien pinto la Mona Lisa', o: ['Picasso', 'Da Vinci', 'Van Gogh'], a: 1 },
  { q: 'Cual es el oceano mas grande', o: ['Atlantico', 'Indico', 'Pacifico'], a: 2 },
  { q: 'Cuantos lados tiene un hexagono', o: ['5', '6', '8'], a: 1 },
  { q: 'Que gas respiramos principalmente para vivir', o: ['Oxigeno', 'Nitrogeno', 'Helio'], a: 0 },
  { q: 'En que ciudad esta Machu Picchu (region)', o: ['Puno', 'Cusco', 'Ica'], a: 1 },
  { q: 'Cual es el rio mas caudaloso del mundo', o: ['Nilo', 'Amazonas', 'Misisipi'], a: 1 },
  { q: 'Que mide el PBI', o: ['La produccion de un pais', 'La poblacion', 'La temperatura'], a: 0 },
  { q: 'Que indicador mide el aumento general de precios', o: ['Inflacion', 'Desempleo', 'Exportaciones'], a: 0 },
  { q: 'Cuantos jugadores hay en un equipo de futbol en cancha', o: ['9', '11', '12'], a: 1 },
  { q: 'Cual es el animal terrestre mas rapido', o: ['Leon', 'Guepardo', 'Caballo'], a: 1 },
  { q: 'Que lenguaje se usa para dar estilo a paginas web', o: ['CSS', 'SQL', 'Java'], a: 0 },
];
const hang = new Map(), trivia = new Map(), guess = new Map();
const STAGES = ['😐', '😟', '😨', '😰', '😱', '💀'];

function hangView(g) {
  const word = [...g.word].map((c) => (g.tried.has(c) ? c : '_')).join(' ');
  return `🔤 *AHORCADO*\n\n*${word}*\n\n${STAGES[Math.min(5, 6 - g.lives)]} Vidas: ${'❤️'.repeat(g.lives)}${'🖤'.repeat(6 - g.lives)}\n📝 Usadas: ${[...g.tried].join(', ') || '-'}`;
}

module.exports = [
  {
    name: 'ahorcado', cat: 'Juegos', desc: 'Adivina la palabra (!ahorcado a)',
    async run({ jid, args, user, store, reply, prefix }) {
      let g = hang.get(jid);
      const letter = norm(args[0] || '');
      if (!g || /^(nuevo|reiniciar)$/.test(letter)) {
        g = { word: pick(WORDS), tried: new Set(), lives: 6 };
        hang.set(jid, g);
        return reply(`${hangView(g)}\n\nJuega con *${prefix}ahorcado letra*`);
      }
      if (!/^[a-z]$/.test(letter)) return reply(`${hangView(g)}\n\nEscribe una letra: *${prefix}ahorcado a*`);
      if (g.tried.has(letter)) return reply('Ya usaste esa letra.');
      g.tried.add(letter);
      if (!g.word.includes(letter)) g.lives--;
      if ([...g.word].every((c) => g.tried.has(c))) {
        hang.delete(jid); user.coins += 80; store.save();
        return reply(`🎉 *¡Ganaste!* La palabra era *${g.word}*\n+80 monedas 🪙`);
      }
      if (g.lives <= 0) { hang.delete(jid); return reply(`💀 *Perdiste.* La palabra era *${g.word}*`); }
      await reply(hangView(g));
    },
  },
  {
    name: 'trivia', cat: 'Juegos', desc: 'Preguntas (!trivia, luego !trivia a)',
    async run({ jid, args, user, store, reply, prefix }) {
      const cur = trivia.get(jid);
      const ans = (args[0] || '').toLowerCase();
      if (cur && /^[abc]$/.test(ans)) {
        trivia.delete(jid);
        if (Date.now() > cur.exp) return reply('⌛ Se acabo el tiempo. Pide otra con *!trivia*.');
        if ('abc'.indexOf(ans) === cur.t.a) { user.coins += 60; user.xp += 15; store.save(); return reply('✅ *¡Correcto!* +60 monedas y +15 XP'); }
        return reply(`❌ *Incorrecto.* La respuesta era *${'ABC'[cur.t.a]}) ${cur.t.o[cur.t.a]}*`);
      }
      const t = pick(TRIVIA);
      trivia.set(jid, { t, exp: Date.now() + 60000 });
      await reply(`🧠 *TRIVIA*\n\n*${t.q}?*\n\n${t.o.map((o, i) => `${'ABC'[i]}) ${o}`).join('\n')}\n\n_Responde con_ *${prefix}trivia a|b|c* _(60 s)_`);
    },
  },
  {
    name: 'adivina', cat: 'Juegos', desc: 'Adivina el numero 1-100 (!adivina 50)',
    async run({ jid, args, user, store, reply, prefix }) {
      const n = parseInt(args[0], 10);
      let g = guess.get(jid);
      if (!g || !Number.isFinite(n)) {
        guess.set(jid, { n: rand(1, 100), tries: 0 });
        return reply(`🔢 Pense un numero del *1 al 100*.\nAdivinalo con *${prefix}adivina numero*`);
      }
      g.tries++;
      if (n === g.n) {
        guess.delete(jid);
        const reward = Math.max(20, 120 - g.tries * 10);
        user.coins += reward; store.save();
        return reply(`🎉 *¡Correcto!* Era ${g.n}. Intentos: ${g.tries}\n+${reward} monedas 🪙`);
      }
      await reply(n < g.n ? '⬆️ Mas alto' : '⬇️ Mas bajo');
    },
  },
  {
    name: 'ppt', cat: 'Juegos', desc: 'Piedra, papel o tijera (!ppt piedra)',
    async run({ args, user, store, reply, prefix }) {
      const opts = ['piedra', 'papel', 'tijera'];
      const icon = { piedra: '🪨', papel: '📄', tijera: '✂️' };
      const me = norm(args[0] || '');
      if (!opts.includes(me)) return reply(`Uso: ${prefix}ppt piedra|papel|tijera`);
      const bot = pick(opts);
      const win = (me === 'piedra' && bot === 'tijera') || (me === 'papel' && bot === 'piedra') || (me === 'tijera' && bot === 'papel');
      let res = 'Empate 🤝';
      if (win) { res = 'Ganaste 🎉 (+30 monedas)'; user.coins += 30; store.save(); } else if (me !== bot) res = 'Perdiste 😅';
      await reply(`${icon[me]} vs ${icon[bot]}\n*${res}*`);
    },
  },
  {
    name: 'ship', cat: 'Diversion', desc: 'Compatibilidad (!ship @user)',
    async run({ m, args, sender, sock, jid, reply, prefix }) {
      const t = getTargets(m, args);
      if (!t.length) return reply(`Uso: ${prefix}ship @usuario  (o @a @b)`);
      const [a, b] = t.length > 1 ? [t[0], t[1]] : [sender, t[0]];
      const seed = [num(a), num(b)].sort().join('');
      let h = 0;
      for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % 101;
      const bar = '█'.repeat(Math.round(h / 10)) + '░'.repeat(10 - Math.round(h / 10));
      await sock.sendMessage(jid, { text: `💘 *SHIP*\n@${num(a)} + @${num(b)}\n\n${bar} *${h}%*`, mentions: [a, b] }, { quoted: m });
    },
  },
  {
    name: 'matrimonio', aliases: ['casar'], cat: 'Diversion', desc: 'Propone matrimonio (!matrimonio @user)',
    async run({ m, args, sender, sock, jid, reply, prefix }) {
      const t = getTargets(m, args)[0];
      if (!t) return reply(`Uso: ${prefix}matrimonio @usuario`);
      const end = pick(['dijo que SI 💍', 'lo penso y dijo que si 💖', 'salio corriendo 🏃', 'pidio tiempo para pensarlo 🤔']);
      await sock.sendMessage(jid, { text: `💒 @${num(sender)} le propuso matrimonio a @${num(t)} y ${end}`, mentions: [sender, t] }, { quoted: m });
    },
  },
];
