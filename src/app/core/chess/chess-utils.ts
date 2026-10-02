import { Chess, Move } from 'chess.js';
import { Color, MoveInput, PieceType, Score, Uci } from '../models/chess.models';

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export const PIECE_VALUES: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

export const PIECE_NAMES: Record<PieceType, string> = {
  p: 'peón',
  n: 'caballo',
  b: 'alfil',
  r: 'torre',
  q: 'dama',
  k: 'rey',
};

export function opposite(color: Color): Color {
  return color === 'w' ? 'b' : 'w';
}

export function colorName(color: Color): string {
  return color === 'w' ? 'blancas' : 'negras';
}

export function uciToInput(uci: Uci): MoveInput {
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: (uci[4] as PieceType | undefined) ?? undefined,
  };
}

export function moveToUci(move: Pick<Move, 'from' | 'to' | 'promotion'>): Uci {
  return move.from + move.to + (move.promotion ?? '');
}

/** Aplica una jugada UCI sobre una copia de la posición. Devuelve null si es ilegal. */
export function tryMove(fen: string, uci: Uci): { chess: Chess; move: Move } | null {
  const chess = new Chess(fen);
  try {
    const move = chess.move(uciToInput(uci));
    return { chess, move };
  } catch {
    return null;
  }
}

export function uciToSan(fen: string, uci: Uci): string {
  return tryMove(fen, uci)?.move.san ?? uci;
}

/** Convierte una línea de jugadas UCI en notación algebraica (SAN). */
export function pvToSan(fen: string, pv: Uci[], max = 6): string[] {
  const chess = new Chess(fen);
  const out: string[] = [];
  for (const uci of pv.slice(0, max)) {
    try {
      out.push(chess.move(uciToInput(uci)).san);
    } catch {
      break;
    }
  }
  return out;
}

/** Clave de posición para el libro de aperturas (ignora contadores de jugadas). */
export function positionKey(fen: string): string {
  return fen.split(' ').slice(0, 4).join(' ');
}

export function sideToMove(fen: string): Color {
  return fen.split(' ')[1] as Color;
}

/** Valor del score en centipeones (los mates se convierten en valores extremos). */
export function scoreToCp(score: Score): number {
  switch (score.kind) {
    case 'cp':
      return score.value;
    case 'mate':
      return Math.sign(score.value) * (10000 - Math.abs(score.value) * 10);
    case 'end':
      return score.value * 10000;
  }
}

/** Probabilidad de victoria de las blancas (0-100), fórmula de Lichess. */
export function whiteWinChance(score: Score): number {
  if (score.kind === 'end') return score.value > 0 ? 100 : 0;
  if (score.kind === 'mate') return score.value > 0 ? 100 : 0;
  const cp = Math.max(-1000, Math.min(1000, score.value));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

export function winChanceFor(score: Score, color: Color): number {
  const white = whiteWinChance(score);
  return color === 'w' ? white : 100 - white;
}

export function formatScore(score: Score): string {
  switch (score.kind) {
    case 'cp': {
      const pawns = score.value / 100;
      return (pawns > 0 ? '+' : '') + pawns.toFixed(1);
    }
    case 'mate':
      return (score.value > 0 ? '+' : '-') + 'M' + Math.abs(score.value);
    case 'end':
      return score.value > 0 ? '1-0' : '0-1';
  }
}

/** Score de una posición terminal o null si la partida sigue. */
export function terminalScore(chess: Chess): Score | null {
  if (chess.isCheckmate()) return { kind: 'end', value: chess.turn() === 'w' ? -1 : 1 };
  if (chess.isGameOver()) return { kind: 'cp', value: 0 };
  return null;
}

/** Piezas capturadas por cada bando (respecto a la posición inicial de la partida) y diferencia de material. */
export function materialInfo(fen: string, startFen = START_FEN): { captured: Record<Color, PieceType[]>; diff: number } {
  const start = pieceCounts(startFen);
  const counts = pieceCounts(fen);
  const order: PieceType[] = ['q', 'r', 'b', 'n', 'p'];
  // captured[w] = piezas negras que han capturado las blancas
  const captured: Record<Color, PieceType[]> = { w: [], b: [] };
  let diff = 0;
  for (const type of order) {
    const missingBlack = Math.max(0, start.b[type] - counts.b[type]);
    const missingWhite = Math.max(0, start.w[type] - counts.w[type]);
    captured.w.push(...Array(missingBlack).fill(type));
    captured.b.push(...Array(missingWhite).fill(type));
    diff += (counts.w[type] - counts.b[type]) * PIECE_VALUES[type];
  }
  return { captured, diff };
}

function pieceCounts(fen: string): Record<Color, Record<PieceType, number>> {
  const counts: Record<Color, Record<PieceType, number>> = {
    w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
    b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
  };
  for (const row of new Chess(fen).board()) {
    for (const sq of row) if (sq) counts[sq.color][sq.type]++;
  }
  return counts;
}

export function randomId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
