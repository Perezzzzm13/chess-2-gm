// Extrae de game-icons.net (CC BY 3.0) solo los iconos que usa la app a src/app/data/icons.ts
// Uso: npm run icons
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const set = JSON.parse(readFileSync(require.resolve('@iconify-json/game-icons/icons.json'), 'utf8'))

// nombre en la app → nombre en game-icons.net
const ICONS = {
  swords: 'crossed-swords',
  puzzle: 'puzzle',
  book: 'open-book',
  friends: 'two-shadows',
  crown: 'crown',
  trophy: 'trophy-cup',
  star: 'round-star',
  flag: 'black-flag',
  dice: 'perspective-dice-six-faces-random',
  flip: 'cycle',
  bulb: 'light-bulb',
  search: 'magnifying-glass',
  lock: 'padlock',
  key: 'key',
  scales: 'scales',
  levelUp: 'upgrade',
  fire: 'fire',
  sparkles: 'sparkles',
  gem: 'cut-diamond',
  thumbUp: 'thumb-up',
  check: 'check-mark',
  cross: 'cross-mark',
  chat: 'chat-bubble',
  send: 'paper-plane',
  retry: 'anticlockwise-rotation',
  target: 'bullseye',
  quill: 'quill-ink',
  owl: 'owl',
  castle: 'castle',
  play: 'play-button',
  prev: 'previous-button',
  next: 'next-button',
  first: 'fast-backward-button',
  last: 'fast-forward-button',
  scroll: 'scroll-unfurled',
  share: 'share',
  palette: 'palette',
  exit: 'exit-door',
  shield: 'checked-shield',
  laurels: 'laurels',
  podium: 'podium',
  lightning: 'lightning-helix',
  duel: 'duel',
  board: 'empty-chessboard',
  king: 'chess-king',
  queen: 'chess-queen',
  rook: 'chess-rook',
  knight: 'chess-knight',
  bishop: 'chess-bishop',
  pawn: 'chess-pawn',
  // La Reina: el mapa de mejoras
  bomb: 'unlit-bomb',
  clusterBomb: 'cluster-bomb',
  explosion: 'explosion-rays',
  hourglass: 'hourglass',
  sands: 'sands-of-time',
  stopwatch: 'stopwatch',
  wall: 'brick-wall',
  coins: 'two-coins',
  goldBar: 'gold-bar',
  piggy: 'piggy-bank',
  chest: 'open-treasure-chest',
  magnet: 'magnet',
  horseshoe: 'horseshoe',
  sprint: 'sprint',
  wingfoot: 'wingfoot',
  expand: 'expand',
  battery: 'battery-pack',
  muscle: 'muscle-up',
  clover: 'clover',
  whirlwind: 'whirlwind',
  laser: 'laser-blast',
  sunRays: 'sun-radiations',
  teleport: 'teleport',
  aura: 'aura',
  fist: 'fist',
  crosshair: 'targeting',
  sonic: 'sonic-boom',
  starSwirl: 'star-swirl',
  growth: 'growth',
  crownCoin: 'crown-coin',
  heavyFall: 'heavy-fall',
  bell: 'ringing-bell',
}

const out = {}
for (const [key, name] of Object.entries(ICONS)) {
  const icon = set.icons[name]
  if (!icon) throw new Error(`No existe el icono ${name}`)
  out[key] = { body: icon.body, size: icon.width ?? set.width ?? 512 }
}

const names = Object.keys(ICONS)
const file = `// Generado por scripts/build-icons.mjs a partir de game-icons.net (CC BY 3.0). No editar a mano.

export type IconName =
${names.map((n) => `  | '${n}'`).join('\n')};

export const ICONS: Record<IconName, { body: string; size: number }> = ${JSON.stringify(out, null, 2)};
`
writeFileSync(new URL('../src/app/data/icons.ts', import.meta.url), file)
console.log(`Generados ${names.length} iconos`)
