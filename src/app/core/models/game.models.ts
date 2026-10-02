import { Color, GameResult, PieceType, Uci } from './chess.models';
import { MoveEvaluation } from './classification.models';
import { VariantId } from '../../data/variants';

export type GameMode = 'bot' | 'friend';

export interface PlayerInfo {
  name: string;
  rating?: number;
  /** Retrato: pieza y color del medallón. */
  piece: PieceType;
  tint: string;
  isBot?: boolean;
}

export interface SavedGame {
  id: string;
  date: string;
  mode: GameMode;
  playerColor: Color;
  white: PlayerInfo;
  black: PlayerInfo;
  startFen: string;
  moves: Uci[];
  sans: string[];
  result: GameResult;
  termination: string;
  botId?: string;
  botElo?: number;
  ratingBefore?: number;
  ratingDelta?: number;
  xpGained?: number;
  opening?: string;
  /** Modo de juego; sin él, partida clásica. */
  variant?: VariantId;
  /** Evaluación por ply (índice 0 = primera jugada). */
  evaluations: (MoveEvaluation | null)[];
}

export interface GameSetup {
  mode: GameMode;
  botId?: string;
  botElo?: number;
  color: Color;
  feedback: boolean;
  variant?: VariantId;
}
