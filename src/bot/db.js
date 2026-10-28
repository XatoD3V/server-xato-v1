// Base de datos JSON por servidor (data/serverN/db.json). No es una carpeta, asi que no cuenta como registro.
const fs = require('fs');
const config = require('../config');

class Store {
  constructor(file) {
    this.file = file;
    this.data = {};
    try { this.data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* nuevo */ }
    for (const k of ['users', 'groups', 'bots']) this.data[k] = this.data[k] || {};
    this.data.reminders = this.data.reminders || [];
    this.data.counter = this.data.counter || 0;
    this._t = null;
  }

  save() {
    clearTimeout(this._t);
    this._t = setTimeout(() => {
      try {
        fs.writeFileSync(this.file + '.tmp', JSON.stringify(this.data));
        fs.renameSync(this.file + '.tmp', this.file);
      } catch (e) { console.error('db:', e.message); }
    }, 800);
  }

  user(id) { return this.data.users[id] || null; }
  findByNum(n) { return Object.values(this.data.users).find((u) => String(u.id).split('@')[0].split(':')[0] === String(n)) || null; }
  users() { return Object.values(this.data.users); }

  createUser(id, { name, age }) {
    const n = ++this.data.counter;
    const u = {
      id, name, age, serial: 'XD-' + String(n).padStart(4, '0'), regAt: Date.now(),
      xp: 0, level: 1, coins: config.regBonus, lastDaily: 0, lastWork: 0, streak: 0, items: {},
    };
    this.data.users[id] = u;
    this.save();
    return u;
  }
  deleteUser(id) { delete this.data.users[id]; this.save(); }

  group(jid) {
    if (!this.data.groups[jid]) this.data.groups[jid] = { welcome: true, bye: true, antilink: false, warns: {} };
    return this.data.groups[jid];
  }
  bot(num) {
    if (!this.data.bots[num]) this.data.bots[num] = { mode: 'publico' };
    return this.data.bots[num];
  }
}

const levelFor = (xp) => Math.floor(Math.sqrt(xp / 50)) + 1;
const xpForLevel = (lvl) => (lvl - 1) ** 2 * 50;

module.exports = { Store, levelFor, xpForLevel };
