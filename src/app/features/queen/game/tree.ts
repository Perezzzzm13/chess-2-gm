import { IconName } from '../../../data/icons';
import { EnemyKind } from './enemies';
import { BASE_STATS, QueenStats } from './stats';

export type Branch = 'root' | 'queen' | 'gold' | 'time' | 'frenzy' | 'army' | 'knight' | 'bishop' | 'king';
export type Levels = Record<string, number>;

export interface BranchDef {
  name: string;
  /** Color de neón de la rama en el mapa. */
  color: string;
}

export const BRANCHES: Record<Branch, BranchDef> = {
  root: { name: 'La Reina', color: '#ffd25a' },
  queen: { name: 'La Reina', color: '#ffd25a' },
  gold: { name: 'Oro', color: '#f5e03a' },
  time: { name: 'Tiempo y combo', color: '#62f2ff' },
  frenzy: { name: 'Frenesí', color: '#ff3b5c' },
  army: { name: 'El ejército', color: '#b06cff' },
  knight: { name: 'Caballo', color: '#2fc4ef' },
  bishop: { name: 'Alfil', color: '#ff59c7' },
  king: { name: 'Rey y torre', color: '#f4f0ff' },
};

export interface TreeNode {
  id: string;
  branch: Branch;
  name: string;
  /** Qué hace, en una frase. */
  blurb: string;
  icon: IconName;
  /** En las mejoras de rango, la pieza que se desbloquea (se dibuja en vez del icono). */
  sprite?: EnemyKind;
  /** Posición en la rejilla del mapa; la corona está en (0, 0). */
  x: number;
  y: number;
  /** Se puede comprar en cuanto cualquiera de estas tenga un nivel. */
  requires: string[];
  max: number;
  cost: (level: number) => number;
  /** Lo que aporta con un nivel dado, ya formateado ("+4 casillas"). */
  effect: (level: number) => string;
  apply: (stats: QueenStats, level: number) => void;
  /** Habilidades y cambios de reglas: más grandes en el mapa. */
  major?: boolean;
}

const grow = (base: number, factor: number) => (level: number) => Math.round(base * factor ** level);
const table = (costs: number[]) => (level: number) => costs[level] ?? Infinity;
const once = (cost: number) => table([cost]);
/** Número corto en castellano: 1,5 en vez de 1.5. */
const n = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/0+$/, '').replace('.', ','));
const pct = (v: number) => `${n(Math.round(v * 1000) / 10)}%`;

export const TREE: TreeNode[] = [
  {
    id: 'crown', branch: 'root', name: 'La Reina', icon: 'crown', x: 0, y: 0, requires: [], max: 1,
    blurb: 'Todo empieza aquí. Cada mejora comprada abre las de al lado.',
    cost: () => 0, effect: () => 'Coronada', apply: () => undefined,
  },

  // ───────────── La reina (arriba) ─────────────
  {
    id: 'attack', branch: 'queen', name: 'Ataque', icon: 'swords', x: 0, y: -1, requires: ['crown'], max: 9,
    blurb: 'Daño por golpe. Lo que no cae de un golpe te hace rebotar.',
    cost: grow(12, 1.75), effect: (l) => `+${l} de daño`, apply: (s, l) => (s.attack += l),
  },
  {
    id: 'speed', branch: 'queen', name: 'Velocidad', icon: 'sprint', x: -1, y: -2, requires: ['attack'], max: 8,
    blurb: 'Se desliza más rápido y se recupera antes.',
    cost: grow(10, 1.6), effect: (l) => `+${3 * l} casillas/s`,
    apply: (s, l) => {
      s.slideSpeed += 3 * l;
      s.recovery -= 0.015 * l;
    },
  },
  {
    id: 'stamina', branch: 'queen', name: 'Stamina', icon: 'battery', x: 1, y: -2, requires: ['attack'], max: 10,
    blurb: 'Cada movimiento gasta 1. Sin stamina, la reina va agotada.',
    cost: grow(10, 1.6), effect: (l) => `+${2 * l} de stamina`,
    apply: (s, l) => {
      s.maxStamina += 2 * l;
      s.staminaRegen += 0.3 * l;
    },
  },
  {
    id: 'agility', branch: 'queen', name: 'Agilidad', icon: 'wingfoot', x: -1, y: -3, requires: ['speed'], max: 5,
    blurb: 'Casi sin pausa entre un movimiento y el siguiente.',
    cost: grow(45, 1.8), effect: (l) => `−${20 * l} ms de pausa`, apply: (s, l) => (s.recovery -= 0.02 * l),
  },
  {
    id: 'range', branch: 'queen', name: 'Alcance', icon: 'expand', x: 0, y: -3, requires: ['speed', 'stamina'], max: 6,
    blurb: 'Casillas que recorre en un movimiento.',
    cost: grow(25, 2.1), effect: (l) => `+${l} casillas`, apply: (s, l) => (s.range += l),
  },
  {
    id: 'secondWind', branch: 'queen', name: 'Segundo aire', icon: 'whirlwind', x: 1, y: -3, requires: ['stamina'], max: 5,
    blurb: 'La stamina vuelve mucho más deprisa.',
    cost: grow(45, 1.8), effect: (l) => `+${n(0.45 * l)}/s`, apply: (s, l) => (s.staminaRegen += 0.45 * l),
  },
  {
    id: 'doubleStrike', branch: 'queen', name: 'Golpe doble', icon: 'fist', x: -1, y: -4, requires: ['agility'], max: 1, major: true,
    blurb: 'Si un golpe no basta, pega dos veces seguidas.',
    cost: once(600), effect: () => 'Daño x2 al rebotar', apply: (s) => (s.doubleStrike = true),
  },
  {
    id: 'lance', branch: 'queen', name: 'Lanza', icon: 'crosshair', x: 0, y: -4, requires: ['range'], max: 1, major: true,
    blurb: 'Tras capturar no se para: sigue deslizándose y se lleva todo lo que caiga de un golpe.',
    cost: once(900), effect: () => 'Atraviesa piezas', apply: (s) => (s.lance = true),
  },
  {
    id: 'tireless', branch: 'queen', name: 'Incansable', icon: 'muscle', x: 1, y: -4, requires: ['secondWind'], max: 3,
    blurb: 'Agotada, apenas pierde velocidad.',
    cost: grow(150, 2.2), effect: (l) => `${40 + 18 * l}% de velocidad agotada`, apply: (s, l) => (s.tiredSpeed += 0.18 * l),
  },
  {
    id: 'ironQueen', branch: 'queen', name: 'Reina de hierro', icon: 'shield', x: 0, y: -5, requires: ['lance', 'doubleStrike', 'tireless'], max: 5,
    blurb: 'Golpes que parten torres por la mitad.',
    cost: grow(2500, 2), effect: (l) => `+${2 * l} de daño`, apply: (s, l) => (s.attack += 2 * l),
  },

  // ───────────── Oro (derecha) ─────────────
  {
    id: 'greed', branch: 'gold', name: 'Codicia', icon: 'gem', x: 1, y: 0, requires: ['crown'], max: 10,
    blurb: 'Más oro por cada captura.',
    cost: grow(20, 1.7), effect: (l) => `x${n(1 + 0.25 * l)} de oro`, apply: (s, l) => (s.greed += 0.25 * l),
  },
  {
    id: 'crit', branch: 'gold', name: 'Crítico', icon: 'starSwirl', x: 2, y: -1, requires: ['greed'], max: 8,
    blurb: 'Algunas capturas pagan mucho más.',
    cost: grow(30, 1.7), effect: (l) => `${pct(BASE_STATS.critChance + 0.03 * l)} de crítico`, apply: (s, l) => (s.critChance += 0.03 * l),
  },
  {
    id: 'golden', branch: 'gold', name: 'Piezas doradas', icon: 'crownCoin', x: 2, y: 1, requires: ['greed'], max: 6,
    blurb: 'De vez en cuando sale una pieza de oro macizo.',
    cost: grow(40, 1.8), effect: (l) => `${pct(0.015 * l)} doradas`, apply: (s, l) => (s.goldenChance += 0.015 * l),
  },
  {
    id: 'critMult', branch: 'gold', name: 'Golpe certero', icon: 'target', x: 3, y: -1, requires: ['crit'], max: 6,
    blurb: 'Los críticos multiplican más.',
    cost: grow(80, 1.9), effect: (l) => `críticos x${n(BASE_STATS.critMult + 0.5 * l)}`, apply: (s, l) => (s.critMult += 0.5 * l),
  },
  {
    id: 'sweep', branch: 'gold', name: 'Barrido', icon: 'coins', x: 3, y: 0, requires: ['crit', 'golden'], max: 5,
    blurb: 'Dejar el tablero vacío paga una propina.',
    cost: grow(60, 1.9), effect: (l) => `+${15 * l} por tablero limpio`, apply: (s, l) => (s.sweepBonus += 15 * l),
  },
  {
    id: 'goldenMult', branch: 'gold', name: 'Oro macizo', icon: 'goldBar', x: 3, y: 1, requires: ['golden'], max: 5,
    blurb: 'Las piezas doradas valen todavía más.',
    cost: grow(90, 1.9), effect: (l) => `doradas x${BASE_STATS.goldenMult + 2 * l}`, apply: (s, l) => (s.goldenMult += 2 * l),
  },
  {
    id: 'jackpot', branch: 'gold', name: 'Premio gordo', icon: 'bell', x: 4, y: -1, requires: ['critMult'], max: 3, major: true,
    blurb: 'Algunos críticos se convierten en premio gordo: x10.',
    cost: grow(400, 2.2), effect: (l) => `${5 * l}% de los críticos`, apply: (s, l) => (s.jackpotChance += 0.05 * l),
  },
  {
    id: 'chests', branch: 'gold', name: 'Cofres', icon: 'chest', x: 4, y: 0, requires: ['sweep'], max: 1, major: true,
    blurb: 'Aparecen cofres, casi siempre pegados a un muro. Ábrelos pasando por encima.',
    cost: once(350), effect: () => 'Salen cofres', apply: (s) => (s.chests = true),
  },
  {
    id: 'goldRush', branch: 'gold', name: 'Fiebre del oro', icon: 'sparkles', x: 4, y: 1, requires: ['goldenMult'], max: 3,
    blurb: 'Cazar una dorada da oro doble durante unos segundos.',
    cost: grow(500, 2.2), effect: (l) => `${2 * l} s de oro doble`, apply: (s, l) => (s.goldRush += 2 * l),
  },
  {
    id: 'interest', branch: 'gold', name: 'Hucha', icon: 'piggy', x: 5, y: 0, requires: ['chests'], max: 5,
    blurb: 'Al terminar, un extra sobre lo ganado.',
    cost: grow(800, 2), effect: (l) => `+${5 * l}% al terminar`, apply: (s, l) => (s.interest += 0.05 * l),
  },
  {
    id: 'midas', branch: 'gold', name: 'Toque de Midas', icon: 'crown', x: 6, y: 0, requires: ['interest'], max: 3, major: true,
    blurb: 'Encadena capturas y la siguiente pieza saldrá dorada.',
    cost: table([4000, 12000, 40000]), effect: (l) => `cada ${[0, 15, 10, 6][l]} de combo`, apply: (s, l) => (s.midasEvery = [0, 15, 10, 6][l]),
  },

  // ───────────── Tiempo y combo (arriba a la derecha) ─────────────
  {
    id: 'clock', branch: 'time', name: 'Reloj', icon: 'stopwatch', x: 1, y: -1, requires: ['crown'], max: 10,
    blurb: 'Más tiempo en cada partida.',
    cost: grow(20, 1.7), effect: (l) => `+${5 * l} s`, apply: (s, l) => (s.runTime += 5 * l),
  },
  {
    id: 'combo', branch: 'time', name: 'Combo', icon: 'lightning', x: 2, y: -2, requires: ['clock'], max: 8,
    blurb: 'Más margen para encadenar capturas.',
    cost: grow(15, 1.65), effect: (l) => `+${n(0.25 * l)} s para encadenar`, apply: (s, l) => (s.comboWindow += 0.25 * l),
  },
  {
    id: 'loot', branch: 'time', name: 'Botín', icon: 'hourglass', x: 3, y: -2, requires: ['combo'], max: 1, major: true,
    blurb: 'Salen objetos sueltos: relojes (+tiempo), rayos (stamina) y estrellas (frenesí).',
    cost: once(200), effect: () => 'Salen objetos', apply: (s) => (s.lootInterval = 9),
  },
  {
    id: 'comboGold', branch: 'time', name: 'Cadena de oro', icon: 'coins', x: 2, y: -3, requires: ['combo'], max: 5,
    blurb: 'Cada eslabón del combo multiplica más el oro.',
    cost: grow(70, 1.9), effect: (l) => `+${10 + 4 * l}% por eslabón`, apply: (s, l) => (s.comboBonus += 0.04 * l),
  },
  {
    id: 'chrono', branch: 'time', name: 'Cronófago', icon: 'sands', x: 3, y: -3, requires: ['combo'], max: 5,
    blurb: 'Cada captura le roba unas décimas al reloj.',
    cost: grow(120, 1.9), effect: (l) => `+${n(0.08 * l)} s por captura`, apply: (s, l) => (s.timePerCapture += 0.08 * l),
  },
  {
    id: 'lootMore', branch: 'time', name: 'Más botín', icon: 'growth', x: 4, y: -2, requires: ['loot'], max: 5,
    blurb: 'Los objetos salen más a menudo.',
    cost: grow(150, 1.8), effect: (l) => `${pct(1 - 0.85 ** l)} más a menudo`, apply: (s, l) => (s.lootInterval *= 0.85 ** l),
  },
  {
    id: 'fanfare', branch: 'time', name: 'Fanfarria', icon: 'laurels', x: 2, y: -4, requires: ['comboGold'], max: 3,
    blurb: 'Los hitos de combo (x5, x10, x25…) pagan mucho más.',
    cost: grow(300, 2.2), effect: (l) => `hitos x${1 + l}`, apply: (s, l) => (s.fanfare += l),
  },
  {
    id: 'overtime', branch: 'time', name: 'Prórroga', icon: 'retry', x: 4, y: -4, requires: ['chrono'], max: 3, major: true,
    blurb: 'Si el tiempo se acaba con un combo de 5 o más, la partida sigue un poco.',
    cost: grow(600, 2), effect: (l) => `+${4 * l} s de prórroga`, apply: (s, l) => (s.overtime += 4 * l),
  },

  // ───────────── Frenesí (arriba a la izquierda) ─────────────
  {
    id: 'frenzy', branch: 'frenzy', name: 'Frenesí', icon: 'fire', x: -1, y: -1, requires: ['crown'], max: 8,
    blurb: 'Se carga antes y dura más. En frenesí arrasa la línea entera.',
    cost: grow(30, 1.8), effect: (l) => `+${2 * l}% de carga · +${n(0.6 * l)} s`,
    apply: (s, l) => {
      s.frenzyCharge += 2 * l;
      s.frenzyDuration += 0.6 * l;
    },
  },
  {
    id: 'frenzyGold', branch: 'frenzy', name: 'Botín salvaje', icon: 'gem', x: -2, y: -2, requires: ['frenzy'], max: 5,
    blurb: 'Lo que cae en frenesí vale más.',
    cost: grow(60, 1.85), effect: (l) => `frenesí x${n(BASE_STATS.frenzyGold + 0.3 * l)}`, apply: (s, l) => (s.frenzyGold += 0.3 * l),
  },
  {
    id: 'demolish', branch: 'frenzy', name: 'Demoledora', icon: 'wall', x: -2, y: -3, requires: ['frenzy'], max: 1, major: true,
    blurb: 'En frenesí atraviesa los muros y los hace pedazos.',
    cost: once(300), effect: () => 'Rompe muros', apply: (s) => (s.frenzyBreaksWalls = true),
  },
  {
    id: 'shock', branch: 'frenzy', name: 'Onda expansiva', icon: 'sonic', x: -3, y: -2, requires: ['frenzyGold'], max: 3, major: true,
    blurb: 'Al desatar el frenesí, todo lo que hay alrededor cae.',
    cost: grow(250, 2.2), effect: (l) => `radio ${l + 1}`, apply: (s, l) => (s.frenzyShock = l + 1),
  },
  {
    id: 'fury', branch: 'frenzy', name: 'Furia', icon: 'explosion', x: -3, y: -3, requires: ['shock', 'demolish'], max: 5,
    blurb: 'Un frenesí más largo y que se carga antes.',
    cost: grow(400, 1.9), effect: (l) => `+${n(0.8 * l)} s · +${2 * l}% de carga`,
    apply: (s, l) => {
      s.frenzyDuration += 0.8 * l;
      s.frenzyCharge += 2 * l;
    },
  },
  {
    id: 'rampage', branch: 'frenzy', name: 'Desatada', icon: 'heavyFall', x: -4, y: -4, requires: ['fury'], max: 1, major: true,
    blurb: 'En frenesí no hay pausa entre movimientos y aparecen el doble de piezas.',
    cost: once(5000), effect: () => 'Frenesí sin freno', apply: (s) => (s.rampage = true),
  },

  // ───────────── El ejército (abajo) ─────────────
  {
    id: 'rate', branch: 'army', name: 'Ritmo', icon: 'dice', x: 0, y: 1, requires: ['crown'], max: 12,
    blurb: 'Las piezas aparecen más a menudo.',
    cost: grow(10, 1.55), effect: (l) => `${pct(1 - 0.86 ** l)} más rápido`, apply: (s, l) => (s.spawnInterval *= 0.86 ** l),
  },
  {
    id: 'army', branch: 'army', name: 'Ejército', icon: 'friends', x: -1, y: 2, requires: ['rate'], max: 10,
    blurb: 'Más piezas a la vez en el tablero.',
    cost: grow(15, 1.6), effect: (l) => `+${2 * l} piezas`, apply: (s, l) => (s.maxEnemies += 2 * l),
  },
  {
    id: 'treasure', branch: 'army', name: 'Tesoro', icon: 'trophy', x: 1, y: 2, requires: ['rate'], max: 10,
    blurb: 'Cada pieza vale más.',
    cost: grow(25, 1.75), effect: (l) => `x${n(1 + 0.3 * l)} de valor`, apply: (s, l) => (s.treasure += 0.3 * l),
  },
  ...(['n', 'b', 'r', 'q', 'k'] as const).map(
    (kind, i): TreeNode => ({
      id: `rank-${kind}`,
      branch: 'army',
      name: ['Caballos', 'Alfiles', 'Torres', 'Damas', 'Reyes'][i],
      icon: 'castle',
      sprite: kind,
      x: 0,
      y: 3 + i,
      requires: i === 0 ? ['army', 'treasure'] : [`rank-${['n', 'b', 'r', 'q'][i - 1]}`],
      max: 1,
      major: i === 4,
      blurb: [
        'Llegan caballos: aguantan dos golpes y valen cuatro peones.',
        'Llegan alfiles: duros y jugosos.',
        'Llegan torres: hace falta insistir, pero pagan bien.',
        'Llegan damas: casi una reina como tú.',
        'Llegan reyes: rarísimos, efímeros y carísimos.',
      ][i],
      cost: once([40, 160, 600, 2000, 6000][i]),
      effect: () => 'Desbloqueado',
      apply: (s: QueenStats) => (s.rank = Math.max(s.rank, i + 1)),
    }),
  ),
  {
    id: 'patience', branch: 'army', name: 'Paciencia', icon: 'hourglass', x: -1, y: 3, requires: ['army'], max: 5,
    blurb: 'Las piezas tardan más en esfumarse.',
    cost: grow(50, 1.8), effect: (l) => `+${15 * l}% de vida`, apply: (s, l) => (s.lifetimeMult += 0.15 * l),
  },
  {
    id: 'waves', branch: 'army', name: 'Oleadas', icon: 'flag', x: -1, y: 4, requires: ['patience'], max: 5, major: true,
    blurb: 'Cada poco irrumpe una oleada de piezas de golpe, aunque el tablero esté lleno.',
    cost: grow(300, 1.9), effect: (l) => `cada ${20 - 2 * l} s`, apply: (s, l) => (s.waveInterval = 20 - 2 * l),
  },
  {
    id: 'realm', branch: 'army', name: 'Reino', icon: 'board', x: 1, y: 4, requires: ['rank-b'], max: 2,
    blurb: 'Un tablero más grande: más sitio para cazar (y más muros).',
    cost: table([500, 3000]), effect: (l) => `${8 + 2 * l}×${8 + 2 * l}`,
    apply: (s, l) => {
      s.boardSize += 2 * l;
      s.walls += 2 * l;
    },
  },

  // ───────────── Caballo (izquierda) ─────────────
  {
    id: 'knight', branch: 'knight', name: 'Salto de caballo', icon: 'knight', x: -1, y: 0, requires: ['crown'], max: 1, major: true,
    blurb: 'Salta en L por encima de muros y piezas, y captura donde cae. Tecla 1 o clic derecho.',
    cost: once(120), effect: () => 'Habilidad', apply: (s) => (s.knight = true),
  },
  {
    id: 'horseshoe', branch: 'knight', name: 'Herraduras', icon: 'horseshoe', x: -2, y: -1, requires: ['knight'], max: 6,
    blurb: 'El salto se recarga antes.',
    cost: grow(80, 1.7), effect: (l) => `recarga ${n(BASE_STATS.knightCooldown - 0.8 * l)} s`, apply: (s, l) => (s.knightCooldown -= 0.8 * l),
  },
  {
    id: 'kick', branch: 'knight', name: 'Coz', icon: 'fist', x: -2, y: 1, requires: ['knight'], max: 1, major: true,
    blurb: 'Al caer golpea a todas las piezas pegadas.',
    cost: once(250), effect: () => 'Golpe alrededor', apply: (s) => (s.knightKick = true),
  },
  {
    id: 'doubleJump', branch: 'knight', name: 'Doble salto', icon: 'wingfoot', x: -3, y: -1, requires: ['horseshoe'], max: 2,
    blurb: 'Guarda más de un salto cargado.',
    cost: table([900, 4000]), effect: (l) => `${1 + l} saltos`, apply: (s, l) => (s.knightCharges += l),
  },
  {
    id: 'bomb', branch: 'knight', name: 'Bomba', icon: 'bomb', x: -3, y: 0, requires: ['horseshoe', 'kick'], max: 1, major: true,
    blurb: 'Al saltar deja una bomba: revienta muros y captura todo lo que pille.',
    cost: once(600), effect: () => 'Bombas', apply: (s) => (s.bomb = true),
  },
  {
    id: 'demolition', branch: 'knight', name: 'Derribo', icon: 'wall', x: -3, y: 1, requires: ['kick'], max: 5,
    blurb: 'Cada muro roto paga oro.',
    cost: grow(100, 1.8), effect: (l) => `+${4 * l} por muro`, apply: (s, l) => (s.wallGold += 4 * l),
  },
  {
    id: 'shortFuse', branch: 'knight', name: 'Mecha corta', icon: 'fire', x: -4, y: -1, requires: ['bomb'], max: 3,
    blurb: 'Las bombas explotan antes.',
    cost: grow(500, 2), effect: (l) => `${n(BASE_STATS.bombFuse - 0.2 * l)} s de mecha`, apply: (s, l) => (s.bombFuse -= 0.2 * l),
  },
  {
    id: 'bigBomb', branch: 'knight', name: 'Gran bomba', icon: 'explosion', x: -4, y: 0, requires: ['bomb'], max: 2,
    blurb: 'Explosiones más grandes.',
    cost: table([1500, 6000]), effect: (l) => `${3 + 2 * l}×${3 + 2 * l} casillas`, apply: (s, l) => (s.bombRadius += l),
  },
  {
    id: 'chain', branch: 'knight', name: 'Reacción en cadena', icon: 'sunRays', x: -4, y: 1, requires: ['bomb'], max: 1, major: true,
    blurb: 'Las piezas que caen por una bomba explotan a su vez.',
    cost: once(3000), effect: () => 'Explosiones en cadena', apply: (s) => (s.chainReaction = true),
  },
  {
    id: 'cluster', branch: 'knight', name: 'Racimo', icon: 'clusterBomb', x: -5, y: 0, requires: ['bigBomb'], max: 1, major: true,
    blurb: 'Cada bomba suelta cuatro bombitas al explotar.',
    cost: once(8000), effect: () => 'Bombas de racimo', apply: (s) => (s.cluster = true),
  },

  // ───────────── Alfil (abajo a la izquierda) ─────────────
  {
    id: 'bishop', branch: 'bishop', name: 'Rayo del alfil', icon: 'bishop', x: -1, y: 1, requires: ['crown'], max: 1, major: true,
    blurb: 'Dispara rayos en las cuatro diagonales y fulmina lo que tocan. Tecla 2.',
    cost: once(200), effect: () => 'Habilidad', apply: (s) => (s.bishop = true),
  },
  {
    id: 'prism', branch: 'bishop', name: 'Prisma', icon: 'sparkles', x: -2, y: 2, requires: ['bishop'], max: 6,
    blurb: 'El rayo se recarga antes.',
    cost: grow(120, 1.75), effect: (l) => `recarga ${n(BASE_STATS.bishopCooldown - 1.6 * l)} s`, apply: (s, l) => (s.bishopCooldown -= 1.6 * l),
  },
  {
    id: 'compass', branch: 'bishop', name: 'Rosa de los vientos', icon: 'sunRays', x: -3, y: 2, requires: ['prism'], max: 1, major: true,
    blurb: 'Rayos en las ocho direcciones.',
    cost: once(1500), effect: () => '8 rayos', apply: (s) => (s.bishopCompass = true),
  },
  {
    id: 'pierce', branch: 'bishop', name: 'Perforante', icon: 'laser', x: -2, y: 3, requires: ['prism'], max: 1, major: true,
    blurb: 'Los rayos atraviesan los muros y los derriban.',
    cost: once(900), effect: () => 'Atraviesa muros', apply: (s) => (s.bishopPierce = true),
  },
  {
    id: 'goldRay', branch: 'bishop', name: 'Rayo dorado', icon: 'gem', x: -3, y: 3, requires: ['compass', 'pierce'], max: 5,
    blurb: 'Lo que cae por el rayo vale más.',
    cost: grow(500, 1.9), effect: (l) => `rayo x${n(1 + 0.4 * l)}`, apply: (s, l) => (s.bishopGold += 0.4 * l),
  },
  {
    id: 'echo', branch: 'bishop', name: 'Eco', icon: 'bell', x: -4, y: 4, requires: ['goldRay'], max: 1, major: true,
    blurb: 'Medio segundo después, el rayo vuelve a disparar.',
    cost: once(6000), effect: () => 'Rayo doble', apply: (s) => (s.bishopEcho = true),
  },

  // ───────────── Rey y torre (abajo a la derecha) ─────────────
  {
    id: 'aura', branch: 'king', name: 'Aura real', icon: 'aura', x: 1, y: 1, requires: ['crown'], max: 1, major: true,
    blurb: 'Cada pocos segundos, la reina golpea sola todo lo que tiene pegado.',
    cost: once(180), effect: () => 'Pasiva', apply: (s) => (s.aura = true),
  },
  {
    id: 'court', branch: 'king', name: 'Corte', icon: 'king', x: 2, y: 2, requires: ['aura'], max: 6,
    blurb: 'El aura late más a menudo.',
    cost: grow(100, 1.75), effect: (l) => `cada ${n(BASE_STATS.auraInterval - 0.55 * l)} s`, apply: (s, l) => (s.auraInterval -= 0.55 * l),
  },
  {
    id: 'castle', branch: 'king', name: 'Enroque', icon: 'rook', x: 3, y: 2, requires: ['court'], max: 1, major: true,
    blurb: 'Se teletransporta a la pieza más valiosa y la captura de un golpe. Tecla 3.',
    cost: once(700), effect: () => 'Habilidad', apply: (s) => (s.castle = true),
  },
  {
    id: 'majesty', branch: 'king', name: 'Majestad', icon: 'expand', x: 2, y: 3, requires: ['court'], max: 2,
    blurb: 'El aura llega más lejos.',
    cost: table([1200, 5000]), effect: (l) => `${3 + 2 * l}×${3 + 2 * l} casillas`, apply: (s, l) => (s.auraRadius += l),
  },
  {
    id: 'watchtower', branch: 'king', name: 'Atalaya', icon: 'castle', x: 4, y: 2, requires: ['castle'], max: 5,
    blurb: 'El enroque se recarga antes.',
    cost: grow(400, 1.8), effect: (l) => `recarga ${n(BASE_STATS.castleCooldown - 2.4 * l)} s`, apply: (s, l) => (s.castleCooldown -= 2.4 * l),
  },
  {
    id: 'doubleCastle', branch: 'king', name: 'Enroque múltiple', icon: 'teleport', x: 4, y: 3, requires: ['watchtower'], max: 2, major: true,
    blurb: 'Encadena el enroque con las siguientes piezas más valiosas.',
    cost: table([3000, 10000]), effect: (l) => `${1 + l} piezas`, apply: (s, l) => (s.castleTargets += l),
  },
];

export const TREE_BY_ID: Record<string, TreeNode> = Object.fromEntries(TREE.map((node) => [node.id, node]));

export type NodeState = 'maxed' | 'owned' | 'available' | 'locked' | 'hidden';

/**
 * Cómo se ve un nodo: comprado (al máximo o no), disponible (algún vecino comprado),
 * bloqueado pero a la vista (a dos pasos) o escondido (más lejos: solo una silueta).
 */
export function nodeState(node: TreeNode, levels: Levels): NodeState {
  const level = levels[node.id] ?? 0;
  if (level >= node.max) return 'maxed';
  if (level > 0) return 'owned';
  if (isReachable(node, levels)) return 'available';
  return node.requires.some((id) => isReachable(TREE_BY_ID[id], levels)) ? 'locked' : 'hidden';
}

function isReachable(node: TreeNode, levels: Levels): boolean {
  return node.requires.length === 0 || node.requires.some((id) => (levels[id] ?? 0) > 0);
}

export function canBuy(node: TreeNode, levels: Levels, gold: number): boolean {
  const level = levels[node.id] ?? 0;
  return level < node.max && isReachable(node, levels) && gold >= node.cost(level);
}

/** Las estadísticas que dan unas mejoras concretas (con sus topes para que nada se rompa). */
export function statsFor(levels: Levels): QueenStats {
  const s: QueenStats = { ...BASE_STATS };
  for (const node of TREE) {
    const level = levels[node.id] ?? 0;
    if (level > 0) node.apply(s, Math.min(level, node.max));
  }
  s.recovery = Math.max(0.03, s.recovery);
  s.tiredSpeed = Math.min(0.95, s.tiredSpeed);
  s.knightCooldown = Math.max(1.5, s.knightCooldown);
  s.bishopCooldown = Math.max(3, s.bishopCooldown);
  s.castleCooldown = Math.max(4, s.castleCooldown);
  s.auraInterval = Math.max(1.2, s.auraInterval);
  s.bombFuse = Math.max(0.25, s.bombFuse);
  return s;
}

export const START_LEVELS: Levels = { crown: 1 };
