export type Color = 'w' | 'b';
export type ColorChoice = Color | 'random';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type GameResult = '1-0' | '0-1' | '1/2-1/2';

/** Jugada en formato UCI, p. ej. "e2e4" o "e7e8q". */
export type Uci = string;

export interface MoveInput {
  from: string;
  to: string;
  promotion?: PieceType;
}

/** Evaluación siempre desde el punto de vista de las blancas. */
export type Score =
  | { kind: 'cp'; value: number }
  /** Mate en N jugadas: positivo = ganan blancas. */
  | { kind: 'mate'; value: number }
  /** Posición terminal de jaque mate: 1 = han ganado blancas, -1 = negras. */
  | { kind: 'end'; value: 1 | -1 };

export interface EngineLine {
  move: Uci;
  pv: Uci[];
  score: Score;
  depth: number;
}

export interface PositionAnalysis {
  fen: string;
  depth: number;
  lines: EngineLine[];
}

export interface Arrow {
  from: string;
  to: string;
  color?: string;
}
