import { Chess } from 'chess.js';
import { opposite, uciToInput } from '../core/chess/chess-utils';
import { Color } from '../core/models/chess.models';
import rawPuzzles from './puzzles.json';

export interface Puzzle {
  id: string;
  /** Posición ANTES de la jugada del rival que plantea el problema. */
  fen: string;
  /** moves[0] es la jugada del rival; el resto, la solución alternando colores. */
  moves: string[];
  rating: number;
  themes: string[];
}

/** Puzzles reales de la base de datos pública de Lichess (dominio público, CC0). */
export const PUZZLES: Puzzle[] = rawPuzzles as Puzzle[];

/** Temas que se muestran como etiqueta (el resto son metadatos internos). */
export const PUZZLE_THEMES: Record<string, string> = {
  advancedPawn: 'Peón avanzado',
  advantage: 'Ventaja',
  anastasiaMate: 'Mate de Anastasia',
  arabianMate: 'Mate árabe',
  attackingF2F7: 'Ataque a f2/f7',
  attraction: 'Atracción',
  backRankMate: 'Mate del pasillo',
  bishopEndgame: 'Final de alfiles',
  clearance: 'Despeje',
  cornerMate: 'Mate en la esquina',
  crushing: 'Aplastante',
  defensiveMove: 'Jugada defensiva',
  deflection: 'Desviación',
  discoveredAttack: 'Ataque descubierto',
  discoveredCheck: 'Jaque descubierto',
  doubleCheck: 'Jaque doble',
  enPassant: 'Captura al paso',
  endgame: 'Final',
  epauletteMate: 'Mate de charreteras',
  exposedKing: 'Rey expuesto',
  fork: 'Ataque doble',
  hangingPiece: 'Pieza colgada',
  interference: 'Interferencia',
  kingsideAttack: 'Ataque al enroque',
  knightEndgame: 'Final de caballos',
  mate: 'Mate',
  mateIn1: 'Mate en 1',
  mateIn2: 'Mate en 2',
  mateIn3: 'Mate en 3',
  middlegame: 'Medio juego',
  opening: 'Apertura',
  operaMate: 'Mate de la ópera',
  pawnEndgame: 'Final de peones',
  pillsburysMate: 'Mate de Pillsbury',
  pin: 'Clavada',
  promotion: 'Coronación',
  queenEndgame: 'Final de damas',
  queensideAttack: 'Ataque en el flanco de dama',
  quietMove: 'Jugada tranquila',
  rookEndgame: 'Final de torres',
  sacrifice: 'Sacrificio',
  skewer: 'Enfilada',
  smotheredMate: 'Mate de la coz',
  trappedPiece: 'Pieza atrapada',
  zugzwang: 'Zugzwang',
};

export function puzzleThemeLabels(puzzle: Puzzle): string[] {
  return puzzle.themes.map((t) => PUZZLE_THEMES[t]).filter((t): t is string => !!t);
}

/** La posición que ve el jugador al empezar: tras la jugada del rival que plantea el problema. */
export function puzzleStartPosition(puzzle: Puzzle): { fen: string; lastMove: [string, string]; orientation: Color } {
  const chess = new Chess(puzzle.fen);
  const orientation = opposite(chess.turn());
  const move = chess.move(uciToInput(puzzle.moves[0]));
  return { fen: chess.fen(), lastMove: [move.from, move.to], orientation };
}
