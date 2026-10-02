import { Branch, BRANCHES, TREE, TreeNode } from '../game/tree';

/** Píxeles entre dos casillas de la rejilla del mapa (a zoom 1). */
export const UNIT = 128;
/** Margen alrededor del árbol, en casillas: deja sitio a los rótulos de las ramas. */
const PAD = 2.2;

export interface Point {
  x: number;
  y: number;
}

export interface Edge {
  from: TreeNode;
  to: TreeNode;
}

export interface BranchLabel {
  branch: Branch;
  name: string;
  color: string;
  /** Posición en casillas, como los nodos. */
  x: number;
  y: number;
  /** Inclinación de la pintada, en grados. */
  tilt: number;
}

const xs = TREE.map((n) => n.x);
const ys = TREE.map((n) => n.y);

/** Límites del mapa en casillas (con margen). */
export const BOUNDS = {
  minX: Math.min(...xs) - PAD,
  minY: Math.min(...ys) - PAD,
  maxX: Math.max(...xs) + PAD,
  maxY: Math.max(...ys) + PAD,
};

export const WORLD = {
  width: (BOUNDS.maxX - BOUNDS.minX) * UNIT,
  height: (BOUNDS.maxY - BOUNDS.minY) * UNIT,
};

/** De casillas a píxeles del mundo (origen arriba a la izquierda). */
export function toWorld(p: Point): Point {
  return { x: (p.x - BOUNDS.minX) * UNIT, y: (p.y - BOUNDS.minY) * UNIT };
}

export function toGrid(p: Point): Point {
  return { x: p.x / UNIT + BOUNDS.minX, y: p.y / UNIT + BOUNDS.minY };
}

/** Cada conexión del árbol: de la mejora que hace falta a la que abre. */
export const EDGES: Edge[] = TREE.flatMap((to) =>
  to.requires.map((id) => ({ from: TREE.find((n) => n.id === id)!, to })),
);

/**
 * Rótulo de cada rama: más allá de su nodo más lejano, en la dirección en la que crece.
 * Así las ramas se reconocen de lejos sin tapar ningún nodo.
 */
export const BRANCH_LABELS: BranchLabel[] = (Object.keys(BRANCHES) as Branch[])
  .filter((b) => b !== 'root')
  .map((branch, i) => {
    const nodes = TREE.filter((n) => n.branch === branch);
    const cx = nodes.reduce((s, n) => s + n.x, 0) / nodes.length;
    const cy = nodes.reduce((s, n) => s + n.y, 0) / nodes.length;
    const len = Math.hypot(cx, cy) || 1;
    const dir = { x: cx / len, y: cy / len };
    const reach = Math.max(...nodes.map((n) => n.x * dir.x + n.y * dir.y));
    return {
      branch,
      name: BRANCHES[branch].name,
      color: BRANCHES[branch].color,
      x: dir.x * (reach + 1.25),
      y: dir.y * (reach + 1.25),
      tilt: i % 2 ? 6 : -7,
    };
  });
