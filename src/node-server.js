// Un servidor de sesiones. Se ejecuta 3 veces (SERVER_ID 1, 2 y 3).
const express = require('express');
const path = require('path');
const config = require('./config');
const { SessionManager } = require('./bot/session-manager');

const id = Number(process.env.SERVER_ID);
const port = Number(process.env.SERVER_PORT);
const key = process.env.INTERNAL_KEY;

const manager = new SessionManager({
  serverId: id,
  dir: path.join(config.dataDir, `server${id}`),
  max: config.maxPerServer,
});

const app = express();
app.use(express.json());
app.use((req, res, next) =>
  req.get('x-internal-key') === key ? next() : res.status(401).json({ error: 'no autorizado' })
);

const fail = (res, e) => res.status(e.status || 500).json({ error: e.message });

app.get('/health', (req, res) =>
  res.json({ id, max: config.maxPerServer, used: manager.used(), sessions: manager.snapshot() })
);

app.post('/sessions', async (req, res) => {
  try {
    res.status(201).json(await manager.register(req.body.number));
  } catch (e) {
    fail(res, e);
  }
});

app.get('/sessions/:number', (req, res) => {
  const s = manager.status(req.params.number);
  s ? res.json(s) : res.status(404).json({ error: 'sesion no encontrada' });
});

app.delete('/sessions/:number', async (req, res) => {
  try {
    if (!manager.has(req.params.number)) return res.status(404).json({ error: 'sesion no encontrada' });
    await manager.remove(req.params.number);
    res.json({ ok: true });
  } catch (e) {
    fail(res, e);
  }
});

app.listen(port, '127.0.0.1', () => {
  console.log(`[server ${id}] activo en :${port}  (limite ${config.maxPerServer} registros)`);
  manager.restoreAll().catch((e) => console.error(`[server ${id}] error al restaurar:`, e.message));
});
