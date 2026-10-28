const { getJson, norm } = require('../util');
const CAT = 'Mundo';

// [nombres aceptados, etiqueta, zona horaria]
const ZONES = [
  [['peru'], 'Peru', 'America/Lima'],
  [['mexico'], 'Mexico', 'America/Mexico_City'],
  [['colombia'], 'Colombia', 'America/Bogota'],
  [['argentina'], 'Argentina', 'America/Argentina/Buenos_Aires'],
  [['chile'], 'Chile', 'America/Santiago'],
  [['brasil', 'brazil'], 'Brasil', 'America/Sao_Paulo'],
  [['bolivia'], 'Bolivia', 'America/La_Paz'],
  [['ecuador'], 'Ecuador', 'America/Guayaquil'],
  [['venezuela'], 'Venezuela', 'America/Caracas'],
  [['uruguay'], 'Uruguay', 'America/Montevideo'],
  [['paraguay'], 'Paraguay', 'America/Asuncion'],
  [['panama'], 'Panama', 'America/Panama'],
  [['costa rica'], 'Costa Rica', 'America/Costa_Rica'],
  [['cuba'], 'Cuba', 'America/Havana'],
  [['republica dominicana', 'dominicana'], 'Rep. Dominicana', 'America/Santo_Domingo'],
  [['guatemala'], 'Guatemala', 'America/Guatemala'],
  [['honduras'], 'Honduras', 'America/Tegucigalpa'],
  [['el salvador', 'salvador'], 'El Salvador', 'America/El_Salvador'],
  [['nicaragua'], 'Nicaragua', 'America/Managua'],
  [['puerto rico'], 'Puerto Rico', 'America/Puerto_Rico'],
  [['usa', 'eeuu', 'estados unidos', 'nueva york', 'new york'], 'EEUU (Nueva York)', 'America/New_York'],
  [['los angeles', 'california'], 'EEUU (Los Angeles)', 'America/Los_Angeles'],
  [['canada', 'toronto'], 'Canada (Toronto)', 'America/Toronto'],
  [['espana', 'madrid'], 'Espana', 'Europe/Madrid'],
  [['francia', 'paris'], 'Francia', 'Europe/Paris'],
  [['alemania', 'berlin'], 'Alemania', 'Europe/Berlin'],
  [['italia', 'roma'], 'Italia', 'Europe/Rome'],
  [['reino unido', 'inglaterra', 'londres', 'uk'], 'Reino Unido', 'Europe/London'],
  [['portugal', 'lisboa'], 'Portugal', 'Europe/Lisbon'],
  [['rusia', 'moscu'], 'Rusia (Moscu)', 'Europe/Moscow'],
  [['turquia'], 'Turquia', 'Europe/Istanbul'],
  [['egipto'], 'Egipto', 'Africa/Cairo'],
  [['sudafrica'], 'Sudafrica', 'Africa/Johannesburg'],
  [['nigeria'], 'Nigeria', 'Africa/Lagos'],
  [['india'], 'India', 'Asia/Kolkata'],
  [['china'], 'China', 'Asia/Shanghai'],
  [['japon', 'tokio'], 'Japon', 'Asia/Tokyo'],
  [['corea', 'corea del sur', 'seul'], 'Corea del Sur', 'Asia/Seoul'],
  [['emiratos', 'dubai'], 'Emiratos (Dubai)', 'Asia/Dubai'],
  [['arabia', 'arabia saudita'], 'Arabia Saudita', 'Asia/Riyadh'],
  [['tailandia'], 'Tailandia', 'Asia/Bangkok'],
  [['indonesia'], 'Indonesia', 'Asia/Jakarta'],
  [['filipinas'], 'Filipinas', 'Asia/Manila'],
  [['australia', 'sidney', 'sydney'], 'Australia (Sidney)', 'Australia/Sydney'],
  [['nueva zelanda'], 'Nueva Zelanda', 'Pacific/Auckland'],
];
const DEFAULTS = ['peru', 'mexico', 'colombia', 'argentina', 'chile', 'brasil', 'usa', 'espana', 'japon', 'australia'];
const find = (q) => ZONES.find((z) => z[0].includes(norm(q)));
const short = (tz) => new Date().toLocaleString('es-PE', { timeZone: tz, weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });

module.exports = [
  {
    name: 'hora', aliases: ['time'], cat: CAT, desc: 'Hora por pais (!hora japon)',
    async run({ args, reply, prefix }) {
      if (!args.length) {
        const lines = DEFAULTS.map((d) => { const z = find(d); return `  ${z[1]}: ${short(z[2])}`; }).join('\n');
        return reply(`Hora actual\n${lines}\n\nPrueba: ${prefix}hora japon | ${prefix}paises para ver la lista`);
      }
      const z = find(args.join(' '));
      if (!z) return reply(`No tengo ese pais. Usa ${prefix}paises para ver la lista.`);
      const full = new Date().toLocaleString('es-PE', { timeZone: z[2], dateStyle: 'full', timeStyle: 'medium', hour12: false });
      await reply(`${z[1]}\n${full}\nZona: ${z[2]}`);
    },
  },
  {
    name: 'paises', aliases: ['horas'], cat: CAT, desc: 'Lista de paises para !hora',
    async run({ reply, prefix }) {
      await reply(`Paises disponibles (${ZONES.length})\n${ZONES.map((z) => z[1]).join(', ')}\n\nEjemplo: ${prefix}hora espana`);
    },
  },
  {
    name: 'clima', cat: CAT, desc: 'Clima de una ciudad (!clima Lima)',
    async run({ args, reply, prefix }) {
      const city = args.join(' ').trim();
      if (!city) return reply(`Uso: ${prefix}clima Lima`);
      try {
        const j = await getJson(`https://wttr.in/${encodeURIComponent(city)}?format=j1&lang=es`);
        const c = j.current_condition[0];
        const area = j.nearest_area && j.nearest_area[0];
        const place = area ? `${area.areaName[0].value}, ${area.country[0].value}` : city;
        const desc = (c.lang_es && c.lang_es[0] && c.lang_es[0].value) || c.weatherDesc[0].value;
        const days = (j.weather || []).slice(0, 3)
          .map((d) => `  ${d.date}: ${d.mintempC} a ${d.maxtempC} C`).join('\n');
        await reply(
          `Clima en ${place}\n${desc}\nTemperatura: ${c.temp_C} C (sensacion ${c.FeelsLikeC} C)\n` +
          `Humedad: ${c.humidity}%\nViento: ${c.windspeedKmph} km/h\n\nProximos dias\n${days}`
        );
      } catch { await reply('No encontre el clima de esa ciudad. Revisa el nombre o intenta mas tarde.'); }
    },
  },
];
