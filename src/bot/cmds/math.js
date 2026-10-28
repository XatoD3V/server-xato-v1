const { fmtNum } = require('../util');

function parse(args) {
  const nums = args.join(' ').split(/\s+/).filter(Boolean).map((t) => Number(t.replace(',', '.')));
  if (!nums.length || nums.some((n) => !Number.isFinite(n))) return null;
  return nums;
}
const CAT = 'Matematicas';

module.exports = [
  {
    name: 'suma', aliases: ['sumar'], cat: CAT, desc: 'Suma numeros (!suma 5 10 3)',
    async run({ args, reply, prefix }) {
      const n = parse(args);
      if (!n || n.length < 2) return reply(`Uso: ${prefix}suma 5 10 3`);
      await reply(`${n.join(' + ')} = ${fmtNum(n.reduce((a, b) => a + b))}`);
    },
  },
  {
    name: 'resta', aliases: ['restar'], cat: CAT, desc: 'Resta numeros (!resta 20 5)',
    async run({ args, reply, prefix }) {
      const n = parse(args);
      if (!n || n.length < 2) return reply(`Uso: ${prefix}resta 20 5`);
      await reply(`${n.join(' - ')} = ${fmtNum(n.slice(1).reduce((a, b) => a - b, n[0]))}`);
    },
  },
  {
    name: 'multiplicacion', aliases: ['multiplicar', 'mult'], cat: CAT, desc: 'Multiplica (!multiplicacion 4 5)',
    async run({ args, reply, prefix }) {
      const n = parse(args);
      if (!n || n.length < 2) return reply(`Uso: ${prefix}multiplicacion 4 5`);
      await reply(`${n.join(' x ')} = ${fmtNum(n.reduce((a, b) => a * b))}`);
    },
  },
  {
    name: 'division', aliases: ['dividir', 'div'], cat: CAT, desc: 'Divide (!division 100 4)',
    async run({ args, reply, prefix }) {
      const n = parse(args);
      if (!n || n.length < 2) return reply(`Uso: ${prefix}division 100 4`);
      if (n.slice(1).some((x) => x === 0)) return reply('No se puede dividir entre cero.');
      await reply(`${n.join(' / ')} = ${fmtNum(n.slice(1).reduce((a, b) => a / b, n[0]))}`);
    },
  },
  {
    name: 'potencia', aliases: ['pot'], cat: CAT, desc: 'Potencia (!potencia 2 10)',
    async run({ args, reply, prefix }) {
      const n = parse(args);
      if (!n || n.length !== 2) return reply(`Uso: ${prefix}potencia 2 10`);
      const r = n[0] ** n[1];
      if (!Number.isFinite(r)) return reply('Resultado fuera de rango.');
      await reply(`${n[0]} ^ ${n[1]} = ${fmtNum(r)}`);
    },
  },
  {
    name: 'raiz', aliases: ['sqrt'], cat: CAT, desc: 'Raiz cuadrada (!raiz 144)',
    async run({ args, reply, prefix }) {
      const n = parse(args);
      if (!n || n.length !== 1) return reply(`Uso: ${prefix}raiz 144`);
      if (n[0] < 0) return reply('No existe raiz real de un numero negativo.');
      await reply(`Raiz de ${n[0]} = ${fmtNum(Math.sqrt(n[0]))}`);
    },
  },
  {
    name: 'porcentaje', aliases: ['porc'], cat: CAT, desc: 'X% de un numero (!porcentaje 20 150)',
    async run({ args, reply, prefix }) {
      const n = parse(args);
      if (!n || n.length !== 2) return reply(`Uso: ${prefix}porcentaje 20 150`);
      await reply(`${n[0]}% de ${n[1]} = ${fmtNum((n[0] * n[1]) / 100)}`);
    },
  },
];
