// Panel web + API publica. Reparte los registros entre los 3 servidores (5 cada uno).
const express = require('express');
const crypto = require('crypto');
const path = require('path');
const config = require('./config');

const nodes = Array.from({ length: config.servers }, (_, i) => ({ id: i + 1, port: config.basePort + i }));
const adminTokens = new Map(); // token -> expiracion
const tickets = new Map();     // numero -> ticket del registro en curso
const hits = new Map();        // limitador simple por IP

function startGateway(INTERNAL_KEY) {
  async function call(node, method, p, body) {
    const r = await fetch(`http://127.0.0.1:${node.port}${p}`, {
      method,
      headers: { 'content-type': 'application/json', 'x-internal-key': INTERNAL_KEY },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30000),
    });
    return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) };
  }

  async function overview() {
    return Promise.all(nodes.map(async (n) => {
      try {
        const r = await call(n, 'GET', '/health');
        if (!r.ok) throw new Error('offline');
        return { id: n.id, online: true, max: r.data.max, used: r.data.used, sessions: r.data.sessions };
      } catch {
        return { id: n.id, online: false, max: config.maxPerServer, used: 0, sessions: [] };
      }
    }));
  }

  function limit(name, max, windowMs) {
    return (req, res, next) => {
      const k = `${name}:${req.ip}`;
      const now = Date.now();
      const h = hits.get(k);
      if (!h || now > h.reset) { hits.set(k, { count: 1, reset: now + windowMs }); return next(); }
      if (++h.count > max) return res.status(429).json({ error: 'Demasiados intentos. Espera un momento.' });
      next();
    };
  }

  function requireAdmin(req, res, next) {
    const token = (req.get('authorization') || '').replace('Bearer ', '');
    const exp = adminTokens.get(token);
    if (!exp || exp < Date.now()) { adminTokens.delete(token); return res.status(401).json({ error: 'Sesion de administrador invalida' }); }
    next();
  }

  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // ---- Publico ----
  app.get('/api/capacity', async (req, res) => {
    const ov = await overview();
    res.json(ov.map(({ id, online, used, max }) => ({ id, online, used, max })));
  });

  app.post('/api/register', limit('reg', 10, 60_000), async (req, res) => {
    const number = String(req.body.number || '').replace(/\D/g, '');
    if (!/^\d{8,15}$/.test(number)) return res.status(400).json({ error: 'Numero invalido. Usa formato internacional sin +.' });

    const ov = await overview();
    if (ov.some((s) => s.sessions.some((x) => x.number === number))) {
      return res.status(409).json({ error: 'Este numero ya esta registrado.' });
    }
    const target = ov.find((s) => s.online && s.used < s.max);
    if (!target) return res.status(409).json({ error: 'Capacidad completa. No hay cupos disponibles.' });

    try {
      const r = await call(nodes[target.id - 1], 'POST', '/sessions', { number });
      if (!r.ok) return res.status(r.status).json(r.data);
      const ticket = crypto.randomBytes(16).toString('hex');
      tickets.set(number, ticket);
      res.json({ ...r.data, ticket });
    } catch {
      res.status(502).json({ error: 'El servidor no respondio. Intenta de nuevo.' });
    }
  });

  app.get('/api/session/:number', async (req, res) => {
    const { number } = req.params;
    if (!tickets.get(number) || tickets.get(number) !== req.query.ticket) return res.status(403).json({ error: 'Ticket invalido' });
    const ov = await overview();
    const owner = ov.find((s) => s.sessions.some((x) => x.number === number));
    if (!owner) { tickets.delete(number); return res.status(404).json({ error: 'La sesion expiro o fue eliminada.' }); }
    const r = await call(nodes[owner.id - 1], 'GET', `/sessions/${number}`);
    res.status(r.status).json({ ...r.data, server: owner.id });
  });

  // ---- Administrador ----
  app.post('/api/admin/login', limit('login', 5, 60_000), (req, res) => {
    const a = Buffer.from(String(req.body.password || ''));
    const b = Buffer.from(config.adminPassword);
    const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
    if (!ok) return res.status(401).json({ error: 'Clave incorrecta' });
    const token = crypto.randomBytes(24).toString('hex');
    adminTokens.set(token, Date.now() + 2 * 60 * 60 * 1000);
    res.json({ token });
  });

  app.post('/api/admin/logout', requireAdmin, (req, res) => {
    adminTokens.delete((req.get('authorization') || '').replace('Bearer ', ''));
    res.json({ ok: true });
  });

  app.get('/api/admin/sessions', requireAdmin, async (req, res) => {
    const ov = await overview();
    res.json(ov.flatMap((s) => s.sessions.map((x) => ({ server: s.id, number: x.number, status: x.status, since: x.since }))));
  });

  app.delete('/api/admin/sessions/:number', requireAdmin, async (req, res) => {
    const ov = await overview();
    const owner = ov.find((s) => s.sessions.some((x) => x.number === req.params.number));
    if (!owner) return res.status(404).json({ error: 'Sesion no encontrada' });
    const r = await call(nodes[owner.id - 1], 'DELETE', `/sessions/${req.params.number}`);
    tickets.delete(req.params.number);
    res.status(r.status).json(r.data);
  });

  app.listen(config.panelPort, () => console.log(`[panel] http://localhost:${config.panelPort}`));
}

module.exports = { startGateway };
