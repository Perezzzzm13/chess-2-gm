// Geometría de las piezas (lienzo de 100×100). Diseño propio de estilo Staunton.
// Cada pieza es una lista de partes que se dibujan en orden:
//   body   → cuerpo relleno con el material del tema
//   accent → adornos rellenos (bolas, cruz, ojo)
//   detail → líneas decorativas sin relleno

const PLINTH = 'M17 93 Q17 84 26 83 H74 Q83 84 83 93 Z';
const RING = 'M27 84 Q27 77 35 76 H65 Q73 77 73 84 Z';
const base = [
  { role: 'body', d: PLINTH },
  { role: 'body', d: RING },
];

export const SHAPES = {
  p: [
    { role: 'body', d: 'M43 47 Q43 63 31 77 H69 Q57 63 57 47 Z' },
    ...base,
    { role: 'body', d: 'M36 45 Q36 39 50 39 Q64 39 64 45 Q64 50 50 50 Q36 50 36 45 Z' },
    { role: 'body', d: 'M37 27 a13 13 0 1 0 26 0 a13 13 0 1 0 -26 0 Z' },
  ],

  r: [
    { role: 'body', d: 'M35 77 L38 44 H62 L65 77 Z' },
    ...base,
    { role: 'body', d: 'M32 47 H68 L65 39 H35 Z' },
    { role: 'body', d: 'M29 40 V16 H39 V24 H45.5 V16 H54.5 V24 H61 V16 H71 V40 Z' },
    { role: 'detail', d: 'M38 62 H62' },
  ],

  b: [
    { role: 'body', d: 'M43 56 Q43 67 32 77 H68 Q57 67 57 56 Z' },
    ...base,
    { role: 'body', d: 'M35 53 Q35 48 50 48 Q65 48 65 53 Q65 58 50 58 Q35 58 35 53 Z' },
    { role: 'body', d: 'M50 15 C35 27 32 39 37 49 H63 C68 39 65 27 50 15 Z' },
    { role: 'accent', d: 'M45 11 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 Z' },
    { role: 'detail', d: 'M57 26 L46 39 M44 44 H56' },
  ],

  n: [
    {
      role: 'body',
      d: 'M35 77 C33 67 37 59 45 53 C40 51 33 53 27 55 C21 57 16 52 18 46 C20 39 29 33 34 27 C36 21 37 15 42 10 L47 18 C57 17 67 24 71 35 C76 48 73 63 70 77 Z',
    },
    ...base,
    { role: 'accent', d: 'M37 30 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0 Z' },
    { role: 'detail', d: 'M51 20 Q61 26 65 37 Q69 49 66 63 M22 50 Q26 52 31 51 M24 45 Q26 44 28 46' },
  ],

  q: [
    { role: 'body', d: 'M33 77 Q35 60 27 33 L38 47 L39 25 L46 46 L50 21 L54 46 L61 25 L62 47 L73 33 Q65 60 67 77 Z' },
    ...base,
    { role: 'accent', d: 'M23.5 31 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0 Z' },
    { role: 'accent', d: 'M35 23 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0 Z' },
    { role: 'accent', d: 'M45.5 18 a4.5 4.5 0 1 0 9 0 a4.5 4.5 0 1 0 -9 0 Z' },
    { role: 'accent', d: 'M57 23 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0 Z' },
    { role: 'accent', d: 'M68.5 31 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0 Z' },
    { role: 'detail', d: 'M34 64 Q50 59 66 64' },
  ],

  k: [
    { role: 'body', d: 'M34 77 Q36 62 31 46 Q50 40 69 46 Q64 62 66 77 Z' },
    ...base,
    { role: 'body', d: 'M31 46 Q29 32 41 30 Q50 35 59 30 Q71 32 69 46 Q50 40 31 46 Z' },
    { role: 'accent', d: 'M47 5 H53 V11 H59 V17 H53 V31 H47 V17 H41 V11 H47 Z' },
    { role: 'detail', d: 'M34 61 Q50 56 66 61' },
  ],
};
