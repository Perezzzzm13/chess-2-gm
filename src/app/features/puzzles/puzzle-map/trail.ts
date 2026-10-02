/**
 * Geometría del camino de una sala: los problemas van en filas de cuatro que serpentean
 * (izquierda → derecha, derecha → izquierda…) unidas por curvas, como un tablero de la oca.
 * Todo en unidades de un viewBox de TRAIL_WIDTH de ancho; la plantilla lo escala al contenedor.
 */
export const TRAIL_WIDTH = 400;

const COLUMNS = 4;
const ROW_HEIGHT = 100;
const MARGIN_X = 58;
const MARGIN_Y = 62;
/** Cuánto sobresale la curva al cambiar de fila. */
const BEND = 46;

export interface TrailPoint {
  x: number;
  y: number;
}

export interface Trail {
  height: number;
  points: TrailPoint[];
}

export function trailFor(count: number): Trail {
  const step = (TRAIL_WIDTH - 2 * MARGIN_X) / (COLUMNS - 1);
  const points = Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / COLUMNS);
    const col = row % 2 === 0 ? i % COLUMNS : COLUMNS - 1 - (i % COLUMNS);
    return { x: MARGIN_X + col * step, y: MARGIN_Y + row * ROW_HEIGHT };
  });
  const rows = Math.ceil(count / COLUMNS);
  return { height: 2 * MARGIN_Y + (rows - 1) * ROW_HEIGHT, points };
}

/** Trazado SVG que pasa por los primeros `count` puntos. */
export function trailPath(points: TrailPoint[], count = points.length): string {
  const visible = points.slice(0, count);
  if (!visible.length) return '';
  return visible
    .map((p, i) => {
      if (i === 0) return `M${p.x} ${p.y}`;
      const prev = visible[i - 1];
      if (prev.y === p.y) return `L${p.x} ${p.y}`;
      // Cambio de fila: la curva sale hacia el borde más cercano
      const out = p.x > TRAIL_WIDTH / 2 ? BEND : -BEND;
      return `C${prev.x + out} ${prev.y} ${p.x + out} ${p.y} ${p.x} ${p.y}`;
    })
    .join(' ');
}
