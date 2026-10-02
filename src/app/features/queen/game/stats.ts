/** Todo lo que la reina, sus habilidades y el ejército valen en una partida. Lo calcula el mapa de mejoras. */
export interface QueenStats {
  // ───── La reina ─────
  attack: number;
  /** Los golpes que no matan pegan dos veces. */
  doubleStrike: boolean;
  /** Casillas por segundo al deslizarse. */
  slideSpeed: number;
  /** Pausa tras cada movimiento antes de poder encadenar el siguiente. */
  recovery: number;
  maxStamina: number;
  staminaRegen: number;
  /** Velocidad sin stamina (fracción de la normal). */
  tiredSpeed: number;
  range: number;
  /** Tras capturar sigue deslizándose y se lleva lo que caiga de un golpe. */
  lance: boolean;

  // ───── Oro ─────
  greed: number;
  critChance: number;
  critMult: number;
  /** Probabilidad de que un crítico sea premio gordo (x10). */
  jackpotChance: number;
  goldenChance: number;
  goldenMult: number;
  /** Segundos de oro doble tras cazar una pieza dorada (0: nada). */
  goldRush: number;
  /** Oro por cada pieza al dejar el tablero limpio (multiplicado por el tesoro). */
  sweepBonus: number;
  chests: boolean;
  /** Fracción del oro de la partida que se añade al terminar. */
  interest: number;
  /** Cada tantos eslabones de combo, la siguiente pieza sale dorada (0: nunca). */
  midasEvery: number;

  // ───── Tiempo y combo ─────
  runTime: number;
  comboWindow: number;
  comboBonus: number;
  /** Multiplica el premio de los hitos de combo (x5, x10, x25…). */
  fanfare: number;
  /** Segundos que suma cada captura. */
  timePerCapture: number;
  /** Si el reloj llega a cero con combo, segundos extra (una vez). */
  overtime: number;
  /** Segundos entre objetos sueltos (0: no salen). */
  lootInterval: number;

  // ───── Frenesí ─────
  frenzyCharge: number;
  frenzyDuration: number;
  frenzyGold: number;
  /** Radio de la onda al activar el frenesí (0: sin onda). */
  frenzyShock: number;
  frenzyBreaksWalls: boolean;
  /** En frenesí no hay pausa entre movimientos y aparecen el doble de piezas. */
  rampage: boolean;

  // ───── Ejército ─────
  spawnInterval: number;
  maxEnemies: number;
  rank: number;
  treasure: number;
  boardSize: number;
  lifetimeMult: number;
  /** Segundos entre oleadas (0: sin oleadas). */
  waveInterval: number;
  walls: number;

  // ───── Caballo ─────
  knight: boolean;
  knightCooldown: number;
  knightCharges: number;
  /** Al caer, golpea a las piezas de alrededor. */
  knightKick: boolean;
  wallGold: number;
  bomb: boolean;
  bombRadius: number;
  bombFuse: number;
  cluster: boolean;
  /** Las piezas que caen por una bomba explotan a su vez. */
  chainReaction: boolean;

  // ───── Alfil ─────
  bishop: boolean;
  bishopCooldown: number;
  /** Rayos también en cruz, no solo en diagonal. */
  bishopCompass: boolean;
  bishopPierce: boolean;
  bishopGold: number;
  bishopEcho: boolean;

  // ───── Rey y torre ─────
  aura: boolean;
  auraInterval: number;
  auraRadius: number;
  castle: boolean;
  castleCooldown: number;
  castleTargets: number;
}

export const BASE_STATS: QueenStats = {
  attack: 1,
  doubleStrike: false,
  slideSpeed: 10,
  recovery: 0.2,
  maxStamina: 5,
  staminaRegen: 1.3,
  tiredSpeed: 0.4,
  range: 3,
  lance: false,

  greed: 1,
  critChance: 0.03,
  critMult: 2.5,
  jackpotChance: 0,
  goldenChance: 0,
  goldenMult: 8,
  goldRush: 0,
  sweepBonus: 0,
  chests: false,
  interest: 0,
  midasEvery: 0,

  runTime: 30,
  comboWindow: 1.1,
  comboBonus: 0.1,
  fanfare: 1,
  timePerCapture: 0,
  overtime: 0,
  lootInterval: 0,

  frenzyCharge: 7,
  frenzyDuration: 4,
  frenzyGold: 1.5,
  frenzyShock: 0,
  frenzyBreaksWalls: false,
  rampage: false,

  spawnInterval: 1.5,
  maxEnemies: 4,
  rank: 0,
  treasure: 1,
  boardSize: 8,
  lifetimeMult: 1,
  waveInterval: 0,
  walls: 3,

  knight: false,
  knightCooldown: 7,
  knightCharges: 1,
  knightKick: false,
  wallGold: 0,
  bomb: false,
  bombRadius: 1,
  bombFuse: 0.9,
  cluster: false,
  chainReaction: false,

  bishop: false,
  bishopCooldown: 14,
  bishopCompass: false,
  bishopPierce: false,
  bishopGold: 1,
  bishopEcho: false,

  aura: false,
  auraInterval: 5,
  auraRadius: 1,
  castle: false,
  castleCooldown: 18,
  castleTargets: 1,
};
