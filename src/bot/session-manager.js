const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const pino = require('pino');
const baileys = require('@whiskeysockets/baileys');
const { handleMessage } = require('./handler');

const makeWASocket = baileys.default;
const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = baileys;

const QR_WINDOW_MS = 3 * 60 * 1000; // tiempo para escanear antes de liberar el cupo

const httpError = (status, message) => Object.assign(new Error(message), { status });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class SessionManager {
  constructor({ serverId, dir, max }) {
    this.serverId = serverId;
    this.dir = dir;
    this.max = max;
    this.live = new Map();
    this.logger = pino({ level: 'silent' });
    fs.mkdirSync(dir, { recursive: true });
  }

  // Cada carpeta dentro de /data/serverN es un registro (cupo ocupado).
  numbers() {
    return fs.readdirSync(this.dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  }
  used() { return this.numbers().length; }
  has(number) { return this.numbers().includes(number); }

  snapshot() {
    return this.numbers().map((number) => {
      const e = this.live.get(number);
      return { number, status: e ? e.status : 'inactivo', since: e ? e.createdAt : null };
    });
  }

  status(number) {
    if (!this.has(number)) return null;
    const e = this.live.get(number);
    return { number, status: e ? e.status : 'inactivo', qr: e ? e.qr : null };
  }

  async register(raw) {
    const number = String(raw || '').replace(/\D/g, '');
    if (!/^\d{8,15}$/.test(number)) throw httpError(400, 'Numero invalido. Usa el formato internacional sin +.');
    if (this.has(number)) throw httpError(409, 'Este numero ya esta registrado.');
    if (this.used() >= this.max) throw httpError(409, `Servidor ${this.serverId} lleno (${this.max}/${this.max}).`);

    fs.mkdirSync(path.join(this.dir, number), { recursive: true }); // reserva el cupo
    const entry = {
      number, status: 'esperando_qr', qr: null,
      createdAt: Date.now(), everConnected: false, removed: false, sock: null,
    };
    this.live.set(number, entry);
    await this.start(entry);

    for (let i = 0; i < 80 && !entry.qr && entry.status !== 'conectado'; i++) await sleep(250);
    return { server: this.serverId, number, status: entry.status, qr: entry.qr };
  }

  async start(entry) {
    const { state, saveCreds } = await useMultiFileAuthState(path.join(this.dir, entry.number));
    let version;
    try { ({ version } = await fetchLatestBaileysVersion()); } catch { /* usa la version por defecto */ }

    const sock = makeWASocket({
      version,
      auth: state,
      logger: this.logger,
      browser: Browsers.macOS('Xato Ds'),
      printQRInTerminal: false,
      markOnlineOnConnect: false,
      syncFullHistory: false,
    });
    entry.sock = sock;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (u) => {
      if (entry.removed || entry.sock !== sock) return;
      const { connection, lastDisconnect, qr } = u;

      if (qr) {
        entry.qr = await QRCode.toDataURL(qr, { margin: 1, width: 360 });
        entry.status = 'esperando_qr';
      }
      if (connection === 'open') {
        entry.status = 'conectado';
        entry.qr = null;
        entry.everConnected = true;
        console.log(`[server ${this.serverId}] ${entry.number} conectado`);
      }
      if (connection === 'close') {
        const code = lastDisconnect && lastDisconnect.error && lastDisconnect.error.output
          ? lastDisconnect.error.output.statusCode : undefined;

        if (code === DisconnectReason.loggedOut) {
          console.log(`[server ${this.serverId}] ${entry.number} cerro sesion desde el telefono`);
          return this.remove(entry.number);
        }
        if (!entry.everConnected && Date.now() - entry.createdAt > QR_WINDOW_MS) {
          console.log(`[server ${this.serverId}] ${entry.number} QR expirado, cupo liberado`);
          return this.remove(entry.number);
        }
        entry.status = 'reconectando';
        setTimeout(() => {
          if (!entry.removed) this.start(entry).catch((e) => console.error('reconexion fallida:', e.message));
        }, 3000);
      }
    });

    sock.ev.on('messages.upsert', ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const m of messages) {
        handleMessage(sock, m, { serverId: this.serverId }).catch((e) => console.error('error de comando:', e.message));
      }
    });
  }

  async remove(number) {
    const e = this.live.get(number);
    if (e) {
      e.removed = true;
      try { await e.sock.logout(); } catch { /* puede no estar conectado */ }
      try { e.sock.end(undefined); } catch { /* ignorar */ }
      this.live.delete(number);
    }
    fs.rmSync(path.join(this.dir, number), { recursive: true, force: true });
  }

  // Al reiniciar, reconecta las sesiones vinculadas y limpia las que nunca se escanearon.
  async restoreAll() {
    for (const number of this.numbers()) {
      const credsFile = path.join(this.dir, number, 'creds.json');
      let linked = false;
      try { linked = Boolean(JSON.parse(fs.readFileSync(credsFile, 'utf8')).me); } catch { /* sin creds */ }
      if (!linked) {
        fs.rmSync(path.join(this.dir, number), { recursive: true, force: true });
        continue;
      }
      const entry = {
        number, status: 'reconectando', qr: null,
        createdAt: Date.now(), everConnected: true, removed: false, sock: null,
      };
      this.live.set(number, entry);
      await this.start(entry);
    }
  }
}

module.exports = { SessionManager };
