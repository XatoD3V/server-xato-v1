// Recordatorios persistentes (se guardan en db.json y se reprograman al reiniciar).
const timers = new Map();
const MAX_MS = 7 * 24 * 3600 * 1000;

function schedule(getSock, store, r) {
  if (timers.has(r.id)) return;
  const delay = Math.max(0, r.at - Date.now());
  const t = setTimeout(async () => {
    timers.delete(r.id);
    store.data.reminders = store.data.reminders.filter((x) => x.id !== r.id);
    store.save();
    try {
      await getSock().sendMessage(r.jid, {
        text: `⏰ *RECORDATORIO*\n\n${r.text}\n\n_Programado por @${r.user.split('@')[0]}_`,
        mentions: [r.user],
      });
    } catch (e) { console.error('recordatorio:', e.message); }
  }, Math.min(delay, 2 ** 31 - 1));
  timers.set(r.id, t);
}

function add(getSock, store, { jid, user, bot, text, at }) {
  if (at - Date.now() > MAX_MS) throw new Error('max');
  const r = { id: `${Date.now()}${Math.floor(Math.random() * 1000)}`, jid, user, bot, text, at };
  store.data.reminders.push(r);
  store.save();
  schedule(getSock, store, r);
  return r;
}

function restore(getSock, store, bot) {
  for (const r of store.data.reminders.filter((x) => x.bot === bot)) schedule(getSock, store, r);
}

module.exports = { add, restore, MAX_MS };
