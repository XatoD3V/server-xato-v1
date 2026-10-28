require('dotenv').config();
const path = require('path');

const config = {
  brand: 'Xato S3erver Dev',
  botName: 'Xato Ds',
  developer: 'Xato D3v',
  owners: (process.env.OWNER_NUMBERS || '').split(',').map((n) => n.replace(/\D/g, '')).filter(Boolean),
  regBonus: 500,
  aiKey: process.env.POLLINATIONS_KEY || '',
  servers: 3,
  maxPerServer: Number(process.env.MAX_PER_SERVER) || 5,
  panelPort: Number(process.env.PANEL_PORT) || 3000,
  basePort: Number(process.env.NODE_BASE_PORT) || 3001,
  prefix: process.env.PREFIX || '!',
  adminPassword: process.env.ADMIN_PASSWORD || 'cambia-esta-clave',
  dataDir: path.join(__dirname, '..', 'data'),
  assetsDir: path.join(__dirname, '..', 'assets'),
};

module.exports = config;
