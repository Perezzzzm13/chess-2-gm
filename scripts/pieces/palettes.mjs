// Materiales de las piezas para cada tema de tablero.
//   fill     → degradado del cuerpo: colores repartidos por igual o pares [posición, color] para bandas duras
//   stroke   → contorno
//   detail   → líneas decorativas
//   accent   → adornos (bolas, cruz, ojo)
//   shine    → intensidad del brillo especular
//   texture  → textura opcional superpuesta (ver TEXTURES)
//   sticker  → borde de pegatina alrededor de la silueta (graffiti)
//   horizon  → degradado vertical común a toda la pieza (cromado con horizonte)
// El tema "pixel" no usa estas piezas vectoriales: dibuja los sprites de data/pixel-pieces.json (ver PIXEL).

export const PALETTES = {
  wood: {
    w: {
      fill: ['#fdecc8', '#e9c48e', '#bf8f55'],
      stroke: '#5b3a1e',
      detail: '#8a5a2b',
      accent: '#f3d49a',
      shine: 0.45,
      texture: { kind: 'wood', color: '#9a6a36', opacity: 0.35 },
    },
    b: {
      fill: ['#8a5634', '#4e2c18', '#22110a'],
      stroke: '#120802',
      detail: '#d7a86b',
      accent: '#b9773f',
      shine: 0.25,
      texture: { kind: 'wood', color: '#0c0603', opacity: 0.45 },
    },
  },

  // Letreros de neón: marfil con halo dorado contra tinta oscura con tubo carmesí
  neon: {
    w: {
      fill: ['#fffaf0', '#ffeec4', '#f1c86e'],
      stroke: '#ffd25a',
      detail: '#c98a1c',
      accent: '#ffffff',
      shine: 0.35,
    },
    b: {
      fill: ['#3b1426', '#1d0a14', '#0e040a'],
      stroke: '#ff3b5c',
      detail: '#ff8fa3',
      accent: '#ff3b5c',
      shine: 0.15,
    },
  },

  // Pegatinas pegadas en la pared: amarillo ácido contra negro con detalles rosas
  graffiti: {
    w: {
      fill: ['#fff35c', '#f5e03a', '#e2c414'],
      stroke: '#0b0406',
      detail: '#0b0406',
      accent: '#ff2f86',
      shine: 0.25,
      sticker: '#ffffff',
    },
    b: {
      fill: ['#34313c', '#1d1b22', '#0d0c10'],
      stroke: '#0b0406',
      detail: '#ff2f86',
      accent: '#ff2f86',
      shine: 0.18,
      sticker: '#ffffff',
    },
  },

  // Cromado de los ochenta: cielo arriba, horizonte duro y suelo rosa
  synth: {
    w: {
      fill: [[0, '#ffffff'], [0.5, '#8fe9ff'], [0.56, '#26318f'], [0.6, '#ff7fd2'], [1, '#ffe6f7']],
      horizon: true,
      stroke: '#1a0b3d',
      detail: '#1a0b3d',
      accent: '#ffffff',
      shine: 0.55,
    },
    b: {
      fill: [[0, '#c69bff'], [0.5, '#4b1d9e'], [0.56, '#0b0326'], [0.6, '#ff2fa8'], [1, '#4a0c5e']],
      horizon: true,
      stroke: '#ff59c7',
      detail: '#62f2ff',
      accent: '#62f2ff',
      shine: 0.3,
    },
  },

  // El trono: oro macizo contra obsidiana ribeteada de oro
  throne: {
    w: {
      fill: [[0, '#fff7d4'], [0.25, '#f8d978'], [0.5, '#dca63a'], [0.6, '#a8731c'], [1, '#f3cf6c']],
      stroke: '#3a2306',
      detail: '#7a4e0e',
      accent: '#fff3c0',
      shine: 0.6,
    },
    b: {
      fill: ['#3d3a46', '#15141b', '#050507'],
      stroke: '#e6b84a',
      detail: '#e6b84a',
      accent: '#ffd25a',
      shine: 0.25,
    },
  },
};

// Colores de los sprites del tema Píxel (o contorno, b cuerpo, h brillo, s sombra, g gema)
export const PIXEL = {
  w: { o: '#0b0406', b: '#f2e6cc', h: '#ffffff', s: '#b4a07c', g: '#ffd25a' },
  b: { o: '#0b0406', b: '#4a3550', h: '#7e6488', s: '#24182a', g: '#ff3b5c' },
  shadow: 'rgba(0, 0, 0, 0.45)',
};

// Patrones de textura (en coordenadas del lienzo de 100×100)
export const TEXTURES = {
  wood: (c) => `
    <pattern id="tex" width="24" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">
      <path d="M0 4 Q6 1 12 4 T24 4 M0 11 Q6 8.5 12 11 T24 11" fill="none" stroke="${c}" stroke-width="0.9"/>
    </pattern>`,
  veins: (c) => `
    <pattern id="tex" width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M-5 42 C12 30 22 48 38 22 S56 6 66 12 M8 64 C18 52 34 58 44 38 M30 -4 C34 10 26 16 32 28" fill="none" stroke="${c}" stroke-width="0.8"/>
    </pattern>`,
  cracks: (c) => `
    <pattern id="tex" width="44" height="44" patternUnits="userSpaceOnUse">
      <path d="M6 0 L13 11 L9 20 L18 28 L15 44 M13 11 L26 15 L32 8 L44 10 M18 28 L30 32 L38 27 M30 32 L33 44" fill="none" stroke="${c}" stroke-width="1.3" stroke-linejoin="round"/>
    </pattern>`,
  embers: (c) => `
    <pattern id="tex" width="30" height="30" patternUnits="userSpaceOnUse">
      <circle cx="6" cy="8" r="1.1" fill="${c}"/><circle cx="21" cy="5" r="0.8" fill="${c}"/>
      <circle cx="15" cy="19" r="1.3" fill="${c}"/><circle cx="26" cy="25" r="0.9" fill="${c}"/>
    </pattern>`,
  frost: (c) => `
    <pattern id="tex" width="26" height="26" patternUnits="userSpaceOnUse">
      <path d="M13 6 V20 M6 13 H20 M8 8 L18 18 M18 8 L8 18" fill="none" stroke="${c}" stroke-width="0.6" stroke-linecap="round"/>
      <circle cx="3" cy="22" r="0.8" fill="${c}"/>
    </pattern>`,
  stars: (c) => `
    <pattern id="tex" width="32" height="32" patternUnits="userSpaceOnUse">
      <circle cx="5" cy="7" r="0.9" fill="${c}"/><circle cx="20" cy="4" r="0.6" fill="${c}"/>
      <circle cx="13" cy="18" r="1.2" fill="${c}"/><circle cx="27" cy="22" r="0.7" fill="${c}"/>
      <circle cx="8" cy="28" r="0.6" fill="${c}"/>
      <path d="M24 12 l0.8 2 2 0.8 -2 0.8 -0.8 2 -0.8 -2 -2 -0.8 2 -0.8 Z" fill="${c}"/>
    </pattern>`,
};

// Sombra o resplandor de las piezas de cada tema (en unidades del viewBox 0-100), por color.
// Va dentro del propio SVG: el navegador lo rasteriza una vez, en vez de recalcular
// un filtro CSS por pieza en cada repintado.
export const SHADOWS = {
  wood: { w: [{ dy: 4, blur: 1.5, color: '#1e0c00', opacity: 0.45 }], b: [{ dy: 4, blur: 1.5, color: '#1e0c00', opacity: 0.45 }] },
  neon: {
    w: [
      { dy: 0, blur: 1.6, color: '#ffd25a', opacity: 1 },
      { dy: 0, blur: 5, color: '#ffb02e', opacity: 0.7 },
    ],
    b: [
      { dy: 0, blur: 1.6, color: '#ff3b5c', opacity: 1 },
      { dy: 0, blur: 5, color: '#ff1e4a', opacity: 0.7 },
    ],
  },
  // Sombra dura de pegatina, sin difuminar
  graffiti: {
    w: [{ dy: 3, blur: 0.1, color: '#000000', opacity: 0.6 }],
    b: [{ dy: 3, blur: 0.1, color: '#000000', opacity: 0.6 }],
  },
  synth: {
    w: [{ dy: 0, blur: 3, color: '#62f2ff', opacity: 0.75 }],
    b: [{ dy: 0, blur: 3, color: '#ff2fa8', opacity: 0.85 }],
  },
  throne: {
    w: [
      { dy: 0, blur: 2.5, color: '#ffcc4a', opacity: 0.55 },
      { dy: 4, blur: 2, color: '#000000', opacity: 0.5 },
    ],
    b: [
      { dy: 0, blur: 2, color: '#ffd25a', opacity: 0.7 },
      { dy: 4, blur: 2, color: '#000000', opacity: 0.5 },
    ],
  },
};
