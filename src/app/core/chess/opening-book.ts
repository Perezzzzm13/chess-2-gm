import { Chess } from 'chess.js';
import { OPENING_NAMES, OPENINGS } from '../../data/openings';
import { positionKey } from './chess-utils';

/**
 * Posiciones teóricas conocidas. El valor es el nombre de la apertura si esa posición
 * la define (final de una línea con nombre) o null si solo es una posición intermedia.
 */
const BOOK = new Map<string, string | null>();

function register(name: string, sans: string[]): void {
  const chess = new Chess();
  sans.forEach((san, i) => {
    chess.move(san);
    const key = positionKey(chess.fen());
    if (i === sans.length - 1) BOOK.set(key, name);
    else if (!BOOK.has(key)) BOOK.set(key, null);
  });
}

OPENING_NAMES.forEach((o) => register(o.name, o.moves.split(' ')));
OPENINGS.forEach((o) => register(o.name, o.steps.map((s) => s.san)));

export function isBookPosition(fen: string): boolean {
  return BOOK.has(positionKey(fen));
}

/** Nombre de la apertura más concreta alcanzada en la partida. */
export function detectOpening(startFen: string, sans: string[]): string | undefined {
  const chess = new Chess(startFen);
  let name: string | undefined;
  for (const san of sans.slice(0, 24)) {
    try {
      chess.move(san);
    } catch {
      break;
    }
    const key = positionKey(chess.fen());
    if (!BOOK.has(key)) break;
    name = BOOK.get(key) ?? name;
  }
  return name;
}
