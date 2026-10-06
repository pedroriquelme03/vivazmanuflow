// Converte as aquarelas verdes de src/assets para o tom azul da marca.
// Roda sob demanda: node scripts/gerar-plantas.mjs
import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const SAIDA = "public/plantas";

// Cada peça é recortada para encostar numa das laterais da página, por isso o
// nome já diz o lado e a altura em que ela deve ser posicionada.
const ARQUIVOS = [
  ["folhas-lado-esquerdo/Ativo 7@2x 1.png", "esq-topo.webp"],
  ["folhas-lado-esquerdo/Ativo 5@2x 1.png", "esq-meio.webp"],
  ["folhas-lado-esquerdo/Ativo 2@2x 1.png", "esq-base.webp"],
  ["folhas-lado-direito/Ativo 6@2x 1.png", "dir-topo.webp"],
  ["folhas-lado-direito/Ativo 11@2x 1.png", "dir-meio.webp"],
  ["folhas-lado-direito/Ativo 3@2x 1.png", "dir-base.webp"],
];

// Verdes da arte original ficam entre ~50 e ~190 graus de matiz.
const VERDE_MIN = 50;
const VERDE_MAX = 190;
// Faixa de azul destino: comprimir ajuda a deixar o conjunto mais coeso.
const AZUL_MIN = 188;
const AZUL_MAX = 224;

function paraHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
  else if (max === gn) h = ((bn - rn) / d + 2) * 60;
  else h = ((rn - gn) / d + 4) * 60;
  return [h, s, l];
}

function canal(p, q, t) {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
}

function paraRgb(h, s, l) {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hn = (((h % 360) + 360) % 360) / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(canal(p, q, hn + 1 / 3) * 255),
    Math.round(canal(p, q, hn) * 255),
    Math.round(canal(p, q, hn - 1 / 3) * 255),
  ];
}

function azular(r, g, b) {
  const [h, s, l] = paraHsl(r, g, b);
  if (h < VERDE_MIN || h > VERDE_MAX) {
    // Flor da helicônia: mantém o tom quente como contraste, só mais discreto.
    return paraRgb(h, s * 0.82, l);
  }
  const posicao = (h - VERDE_MIN) / (VERDE_MAX - VERDE_MIN);
  const novoH = AZUL_MIN + posicao * (AZUL_MAX - AZUL_MIN);
  return paraRgb(novoH, Math.min(s * 0.95, 0.6), l * 0.97);
}

await mkdir(SAIDA, { recursive: true });

for (const [origem, destino] of ARQUIVOS) {
  const entrada = sharp(await readFile(`src/assets/${origem}`));
  const { data, info } = await entrada
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i + 3] === 0) continue;
    const [r, g, b] = azular(data[i], data[i + 1], data[i + 2]);
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  const saida = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  })
    .webp({ quality: 88, alphaQuality: 90 })
    .toBuffer();

  await writeFile(`${SAIDA}/${destino}`, saida);
  console.log(destino, info.width + "x" + info.height, Math.round(saida.length / 1024) + "kB");
}
