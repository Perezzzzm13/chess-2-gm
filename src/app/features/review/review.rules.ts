import { Color } from '../../core/models/chess.models';
import { Classification, MoveEvaluation } from '../../core/models/classification.models';

/** Fallos que el jugador puede intentar corregir. */
const RETRYABLE = new Set<Classification>(['inaccuracy', 'miss', 'mistake', 'blunder']);

/** Un intento cuenta como acierto si es al menos una jugada buena. */
export const GOOD_ENOUGH = new Set<Classification>(['brilliant', 'great', 'best', 'excellent', 'good', 'book']);

export function isRetryable(ev: MoveEvaluation): boolean {
  return RETRYABLE.has(ev.classification);
}

/**
 * Momentos clave: lo brillante y los fallos serios de cualquiera,
 * y además las imprecisiones propias (de esas también se aprende).
 */
export function isKeyMoment(ev: MoveEvaluation, playerColor: Color): boolean {
  if (['brilliant', 'great', 'miss', 'mistake', 'blunder'].includes(ev.classification)) return true;
  return ev.color === playerColor && ev.classification === 'inaccuracy';
}
