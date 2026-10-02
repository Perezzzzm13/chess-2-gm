// Genera las piezas de cada tema en public/pieces/<tema>/<color><Pieza>.webp
// Uso: npm run pieces   (añade --preview hoja.png para crear también una hoja de muestra)
//
// Las piezas se diseñan en SVG (o en píxeles, el tema Píxel) pero se publican rasterizadas en WebP:
// un SVG con degradados, texturas y sombra obliga al navegador a interpretarlo y pintarlo cada vez,
// y con varios tableros en pantalla (la página de Tableros) eso se nota. Una imagen solo se decodifica.
import { mkdirSync, readFileSync, rmSync } from 'node:fs'
import sharp from 'sharp'
import { PALETTES, PIXEL, SHADOWS, TEXTURES } from './pieces/palettes.mjs'
import { SHAPES } from './pieces/shapes.mjs'

const OUT = new URL('../public/pieces/', import.meta.url)
const SPRITES = JSON.parse(readFileSync(new URL('../src/app/data/pixel-pieces.json', import.meta.url), 'utf8'))
const STROKE_WIDTH = 2.6
/** Lado en píxeles: suficiente para casillas de ~120 px en pantallas de densidad 2x. */
const SIZE = 256
const TYPES = ['k', 'q', 'r', 'b', 'n', 'p']

/** Filtro SVG con una o varias sombras/resplandores encadenados. */
function shadowFilter(shadows) {
  const drops = shadows
    .map((s) => `<feDropShadow dx="0" dy="${s.dy}" stdDeviation="${s.blur}" flood-color="${s.color}" flood-opacity="${s.opacity}"/>`)
    .join('')
  return `<filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">${drops}</filter>`
}

/** Paradas del degradado: colores repartidos por igual o pares [posición, color]. */
function gradientStops(fill) {
  return fill
    .map((stop, i) => {
      const [offset, color] = Array.isArray(stop) ? stop : [i / (fill.length - 1), stop]
      return `<stop offset="${offset}" stop-color="${color}"/>`
    })
    .join('')
}

function pieceSvg(type, palette, shadows) {
  const parts = SHAPES[type]
  const bodies = parts.filter((p) => p.role !== 'detail')
  const details = parts.filter((p) => p.role === 'detail')
  const texture = palette.texture ? TEXTURES[palette.texture.kind](palette.texture.color) : ''
  const detailPaths = details.map((p) => `<path d="${p.d}"/>`).join('')
  // Pegatina: la silueta engordada en blanco, por detrás de todo
  const sticker = palette.sticker
    ? `<g fill="${palette.sticker}" stroke="${palette.sticker}" stroke-width="11">${bodies.map((p) => `<path d="${p.d}"/>`).join('')}</g>`
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<defs>
${palette.horizon
  ? // Cromado: un solo degradado vertical para toda la pieza, así el horizonte es una línea continua
    `<linearGradient id="fill" gradientUnits="userSpaceOnUse" x1="0" y1="8" x2="0" y2="94">${gradientStops(palette.fill)}</linearGradient>`
  : `<linearGradient id="fill" x1="0.15" y1="0" x2="0.85" y2="1">${gradientStops(palette.fill)}</linearGradient>`}
<radialGradient id="shine" cx="0.32" cy="0.22" r="0.65">
<stop offset="0" stop-color="#fff" stop-opacity="${palette.shine}"/><stop offset="0.45" stop-color="#fff" stop-opacity="${palette.shine * 0.25}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
</radialGradient>${texture}${shadowFilter(shadows)}
</defs>
<g stroke-linejoin="round" stroke-linecap="round" filter="url(#shadow)">
${sticker}
${bodies
  .map((p) => {
    // Cada parte: relleno + textura + brillo, seguida de su contorno
    const fill = p.role === 'accent' ? palette.accent : 'url(#fill)'
    const tex = palette.texture && p.role === 'body' ? `<path d="${p.d}" fill="url(#tex)" opacity="${palette.texture.opacity}"/>` : ''
    return `<path d="${p.d}" fill="${fill}"/>${tex}<path d="${p.d}" fill="url(#shine)"/><path d="${p.d}" fill="none" stroke="${palette.stroke}" stroke-width="${STROKE_WIDTH}"/>`
  })
  .join('\n')}
<g fill="none" stroke="${palette.detail}" stroke-width="2">${detailPaths}</g>
</g>
</svg>
`
}

function vectorPiece(svg) {
  return sharp(Buffer.from(svg), { density: (72 * SIZE) / 100 }).resize(SIZE, SIZE)
}

/** Pieza del tema Píxel: el sprite de 16×16 con una sombra de un píxel, ampliado sin suavizar. */
function pixelPiece(type, palette) {
  const rows = SPRITES[type]
  const n = rows.length
  const rgba = Buffer.alloc(n * n * 4)
  const paint = (x, y, [r, g, b, a]) => rgba.set([r, g, b, a], (y * n + x) * 4)
  // Primero la sombra (desplazada un píxel abajo), luego la pieza encima
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch !== '.' && y + 1 < n && rows[y + 1][x] === '.') paint(x, y + 1, [0, 0, 0, 110])
    }),
  )
  rows.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && paint(x, y, [...hex(palette[ch]), 255])))
  return sharp(rgba, { raw: { width: n, height: n, channels: 4 } }).resize(SIZE, SIZE, { kernel: 'nearest' })
}

function hex(color) {
  const v = parseInt(color.slice(1), 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

const themes = [...Object.keys(PALETTES), 'pixel']
const preview = process.argv.includes('--preview')
const sheet = []

for (const theme of themes) {
  const dir = new URL(`${theme}/`, OUT)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  for (const color of ['w', 'b']) {
    for (const type of TYPES) {
      const image =
        theme === 'pixel' ? pixelPiece(type, PIXEL[color]) : vectorPiece(pieceSvg(type, PALETTES[theme][color], SHADOWS[theme][color]))
      const file = new URL(`${color}${type.toUpperCase()}.webp`, dir).pathname
      // Las de píxel van sin pérdida: cualquier artefacto se notaría en los bordes duros
      await image.webp(theme === 'pixel' ? { lossless: true } : { quality: 88, alphaQuality: 100 }).toFile(file)
      if (preview) sheet.push({ theme, file })
    }
  }
}
// Las piezas de temas que ya no existen se borran para no publicar archivos huérfanos
console.log(`Piezas generadas para ${themes.length} temas: ${themes.join(', ')}`)

if (preview) {
  // Hoja de muestra: cada tema en una fila, sobre casillas alternas claras y oscuras
  const BG = { wood: ['#e2bd85', '#8a5129'], neon: ['#2a1622', '#150a11'], graffiti: ['#bdb8ae', '#2c2a33'], synth: ['#3a1f6e', '#12082a'], throne: ['#2a2010', '#070605'], pixel: ['#e8c08a', '#9c5f3c'] }
  const CELL = 100
  const composites = await Promise.all(
    sheet.map(async ({ theme, file }, i) => ({
      input: await sharp(file).resize(CELL, CELL).toBuffer(),
      left: (i % 12) * CELL,
      top: Math.floor(i / 12) * CELL,
    })),
  )
  const backgrounds = sheet.map(({ theme }, i) => {
    const [r, g, b] = hex(BG[theme][i % 2])
    return { input: { create: { width: CELL, height: CELL, channels: 3, background: { r, g, b } } }, left: (i % 12) * CELL, top: Math.floor(i / 12) * CELL }
  })
  await sharp({ create: { width: 12 * CELL, height: themes.length * CELL, channels: 3, background: '#000' } })
    .composite([...backgrounds, ...composites])
    .png()
    .toFile(process.argv[process.argv.indexOf('--preview') + 1] ?? 'pieces-preview.png')
}
