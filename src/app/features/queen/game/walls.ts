import { Cell } from './queen-game';

/**
 * Muros del tablero: tramos rectos de 2 a 4 casillas, a veces doblados en L.
 * Se guardan como índices (y * tamaño + x) para consultarlos rápido.
 */
export function wallSegment(size: number, blocked: Set<number>, rng: () => number): number[] {
  for (let attempt = 0; attempt < 40; attempt++) {
    const length = 2 + Math.floor(rng() * 3);
    const horizontal = rng() < 0.5;
    const bend = rng() < 0.3;
    let x = Math.floor(rng() * size);
    let y = Math.floor(rng() * size);
    const cells: number[] = [];
    for (let i = 0; i < length; i++) {
      // Con codo: el último tramo gira 90 grados
      const turn = bend && i === length - 1;
      if (i > 0) {
        if (horizontal !== turn) x++;
        else y++;
      }
      if (x < 0 || y < 0 || x >= size || y >= size) break;
      cells.push(y * size + x);
    }
    if (cells.length < 2 || cells.some((c) => blocked.has(c))) continue;
    return cells;
  }
  return [];
}

/** Casillas a una distancia de rey o menos (sin salirse del tablero). */
export function around(c: Cell, radius: number, size: number): Cell[] {
  const cells: Cell[] = [];
  for (let y = c.y - radius; y <= c.y + radius; y++) {
    for (let x = c.x - radius; x <= c.x + radius; x++) {
      if (x >= 0 && y >= 0 && x < size && y < size) cells.push({ x, y });
    }
  }
  return cells;
}
