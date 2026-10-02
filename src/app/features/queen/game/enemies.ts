export type EnemyKind = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface EnemySpec {
  kind: EnemyKind;
  name: string;
  /** Golpes de ataque 1 que aguanta. */
  hp: number;
  /** Oro base que da al capturarla. */
  value: number;
  /** Segundos que tarda en desaparecer si nadie la captura. */
  lifetime: number;
  /** Probabilidad relativa de aparecer (si su rango está desbloqueado). */
  weight: number;
  /** Nivel de la mejora "Rangos" que la desbloquea. */
  rank: number;
}

/** El ejército enemigo, de la pieza más humilde al rey (rarísimo y muy jugoso). */
export const ENEMIES: Record<EnemyKind, EnemySpec> = {
  p: { kind: 'p', name: 'Peones', hp: 1, value: 1, lifetime: 7, weight: 10, rank: 0 },
  n: { kind: 'n', name: 'Caballos', hp: 2, value: 4, lifetime: 6, weight: 4, rank: 1 },
  b: { kind: 'b', name: 'Alfiles', hp: 2, value: 4, lifetime: 6, weight: 4, rank: 2 },
  r: { kind: 'r', name: 'Torres', hp: 4, value: 10, lifetime: 5.5, weight: 2.5, rank: 3 },
  q: { kind: 'q', name: 'Damas', hp: 7, value: 24, lifetime: 5, weight: 1.2, rank: 4 },
  k: { kind: 'k', name: 'Reyes', hp: 10, value: 80, lifetime: 4, weight: 0.35, rank: 5 },
};

export const ENEMY_ORDER: EnemyKind[] = ['p', 'n', 'b', 'r', 'q', 'k'];

/** Elige una pieza al azar entre las desbloqueadas. Con más rangos, menos peones. */
export function pickEnemy(rank: number, rng = Math.random): EnemyKind {
  const pool = ENEMY_ORDER.filter((k) => ENEMIES[k].rank <= rank);
  const weights = pool.map((k) => (k === 'p' ? Math.max(3, ENEMIES.p.weight - rank * 1.4) : ENEMIES[k].weight));
  let r = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[0];
}
