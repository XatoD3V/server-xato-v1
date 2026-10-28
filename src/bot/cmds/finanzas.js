const { getJson, norm, fmtNum } = require('../util');
const CAT = 'Finanzas';
let cache = { t: 0, rates: null, date: '' };

async function getRates() {
  if (cache.rates && Date.now() - cache.t < 60 * 60 * 1000) return cache;
  const j = await getJson('https://open.er-api.com/v6/latest/USD');
  if (j.result !== 'success') throw new Error('sin tasas');
  cache = { t: Date.now(), rates: j.rates, date: j.time_last_update_utc };
  return cache;
}
const convert = (rates, amount, from, to) => (amount / rates[from]) * rates[to];

module.exports = [
  {
    name: 'cambio', aliases: ['convertirmoneda', 'divisa'], cat: CAT, desc: 'Cambio de moneda (!cambio 100 usd pen)',
    async run({ args, reply, prefix }) {
      const amount = Number((args[0] || '').replace(',', '.'));
      const codes = args.slice(1).map((a) => norm(a).toUpperCase()).filter((a) => /^[A-Z]{3}$/.test(a));
      if (!Number.isFinite(amount) || codes.length < 2) {
        return reply(`Uso: ${prefix}cambio 100 usd pen\nTambien: ${prefix}cambio 50 eur a usd`);
      }
      try {
        const { rates, date } = await getRates();
        const [from, to] = codes;
        if (!rates[from] || !rates[to]) return reply('Moneda no reconocida. Usa codigos como USD, EUR, PEN, MXN, COP, ARS, CLP, BRL.');
        const r = convert(rates, amount, from, to);
        await reply(
          `${amount.toLocaleString('es-PE')} ${from} = ${r.toLocaleString('es-PE', { maximumFractionDigits: 2 })} ${to}\n` +
          `Tasa: 1 ${from} = ${fmtNum(Number(convert(rates, 1, from, to).toFixed(4)))} ${to}\n` +
          `Actualizado: ${date}`
        );
      } catch { await reply('No pude consultar las tasas de cambio. Intenta mas tarde.'); }
    },
  },
  {
    name: 'dolar', cat: CAT, desc: 'Valor del dolar en Latinoamerica',
    async run({ reply }) {
      try {
        const { rates, date } = await getRates();
        const lines = ['PEN', 'MXN', 'COP', 'ARS', 'CLP', 'BRL', 'EUR']
          .map((c) => `  ${c}: ${rates[c].toLocaleString('es-PE', { maximumFractionDigits: 2 })}`).join('\n');
        await reply(`1 USD equivale a:\n${lines}\n\nActualizado: ${date}`);
      } catch { await reply('No pude consultar el tipo de cambio. Intenta mas tarde.'); }
    },
  },
  {
    name: 'euro', cat: CAT, desc: 'Valor del euro en soles y dolares',
    async run({ reply }) {
      try {
        const { rates, date } = await getRates();
        await reply(
          `1 EUR equivale a:\n  PEN: ${convert(rates, 1, 'EUR', 'PEN').toFixed(2)}\n  USD: ${convert(rates, 1, 'EUR', 'USD').toFixed(2)}\n\nActualizado: ${date}`
        );
      } catch { await reply('No pude consultar el tipo de cambio. Intenta mas tarde.'); }
    },
  },
  {
    name: 'cripto', aliases: ['crypto'], cat: CAT, desc: 'Precio de Bitcoin, Ethereum y mas',
    async run({ reply }) {
      try {
        const j = await getJson('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,tether&vs_currencies=usd&include_24hr_change=true');
        const names = { bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL', tether: 'USDT' };
        const lines = Object.entries(names).filter(([id]) => j[id]).map(([id, s]) => {
          const ch = j[id].usd_24h_change;
          return `  ${s}: $${j[id].usd.toLocaleString('en-US')}  (${ch >= 0 ? '+' : ''}${ch.toFixed(2)}% 24h)`;
        }).join('\n');
        await reply(`Criptomonedas (USD)\n${lines}`);
      } catch { await reply('No pude consultar los precios. Intenta mas tarde.'); }
    },
  },
  {
    name: 'igv', cat: CAT, desc: 'Calcula IGV 18% (!igv 100 | !igv 118 incluido)',
    async run({ args, reply, prefix }) {
      const monto = Number((args[0] || '').replace(',', '.'));
      if (!Number.isFinite(monto) || monto < 0) return reply(`Uso: ${prefix}igv 100\nSi el monto ya incluye IGV: ${prefix}igv 118 incluido`);
      const incluido = args.slice(1).some((a) => norm(a).startsWith('inclu'));
      const base = incluido ? monto / 1.18 : monto;
      const igv = base * 0.18;
      await reply(`Base imponible: S/ ${base.toFixed(2)}\nIGV (18%): S/ ${igv.toFixed(2)}\nTotal: S/ ${(base + igv).toFixed(2)}`);
    },
  },
];
