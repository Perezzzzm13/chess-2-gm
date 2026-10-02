import { EnemyKind } from '../game/enemies';
import PIXEL_PIECES from '../../../data/pixel-pieces.json';

/**
 * Piezas en píxel, 16×16. Cada letra es un color de la paleta de la pieza:
 * o contorno, b cuerpo, h brillo, s sombra, g gema. Un punto es transparente.
 */
export const SPRITE_SIZE = 16;

// Los dibujos viven en data/pixel-pieces.json: también los usa scripts/build-pieces.mjs para el tablero Píxel
export const SPRITES: Record<EnemyKind, string[]> = PIXEL_PIECES;

export interface SpritePalette {
  b: string;
  h: string;
  s: string;
  g: string;
}

export const OUTLINE = '#0b0406';

/** La reina del jugador: oro de neón con gemas carmesí. */
export const QUEEN_PALETTE: SpritePalette = { b: '#ffd25a', h: '#fff6c8', s: '#c07c18', g: '#ff3b5c' };
/** Agotada: el oro se apaga. */
export const TIRED_PALETTE: SpritePalette = { b: '#a88a52', h: '#d8c49a', s: '#6e5226', g: '#8a3a48' };
/** En frenesí: carmesí incandescente. */
export const FRENZY_PALETTE: SpritePalette = { b: '#ff5a74', h: '#ffe0e6', s: '#b0152e', g: '#ffd25a' };

/** Cada pieza enemiga tiene su color: de un vistazo se sabe cuánto vale. */
export const ENEMY_PALETTES: Record<EnemyKind, SpritePalette> = {
  p: { b: '#7d7590', h: '#b9b0cc', s: '#4a4358', g: '#b9b0cc' },
  n: { b: '#2fc4ef', h: '#c2f4ff', s: '#15709a', g: '#ffffff' },
  b: { b: '#b06cff', h: '#e6cdff', s: '#6531ad', g: '#ff3b5c' },
  r: { b: '#ff3b5c', h: '#ffbfca', s: '#a3172a', g: '#ffd25a' },
  q: { b: '#ff8a2a', h: '#ffd6aa', s: '#b0500e', g: '#ffffff' },
  k: { b: '#f4f0ff', h: '#ffffff', s: '#9a8fb8', g: '#ffd25a' },
};
