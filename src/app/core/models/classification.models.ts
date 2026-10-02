import { IconName } from '../../data/icons';
import { Color, Score, Uci } from './chess.models';

export type Classification =
  | 'brilliant'
  | 'great'
  | 'best'
  | 'excellent'
  | 'good'
  | 'book'
  | 'inaccuracy'
  | 'miss'
  | 'mistake'
  | 'blunder';

export interface ClassificationInfo {
  label: string;
  plural: string;
  /** Notación clásica (!!, ?!, ??…) para las que la tienen. */
  symbol: string;
  /** Icono para las que no tienen notación propia. */
  icon?: IconName;
  color: string;
  description: string;
}

/** Resultado de evaluar una jugada concreta. */
export interface MoveEvaluation {
  ply: number;
  color: Color;
  uci: Uci;
  san: string;
  classification: Classification;
  /** Probabilidad de ganar (0-100) del jugador que mueve, antes y después. */
  winBefore: number;
  winAfter: number;
  /** Puntos de probabilidad de victoria perdidos respecto a la mejor jugada. */
  loss: number;
  accuracy: number;
  scoreBefore: Score;
  scoreAfter: Score;
  bestMove: Uci;
  bestSan: string;
  bestPv: Uci[];
  /** Respuesta principal del rival tras la jugada realizada. */
  replyPv: Uci[];
  comment: string;
}
