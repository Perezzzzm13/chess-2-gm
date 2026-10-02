import { MoveEvaluation } from '../../core/models/classification.models';

/**
 * Qué enseña el tablero:
 *  - game:  la partida tal cual (posición tras la jugada seleccionada)
 *  - best:  la posición previa con la mejor jugada (verde) y la jugada hecha (roja)
 *  - line:  la línea del motor, paso a paso
 *  - retry: la posición previa para que el jugador busque algo mejor
 */
export type ViewMode = 'game' | 'best' | 'line' | 'retry';

/** Recorrido por los propios fallos, uno tras otro. */
export interface Practice {
  plies: number[];
  index: number;
  solved: number;
}

export interface RetryState {
  status: 'idle' | 'checking' | 'right' | 'wrong';
  tries: number;
  hint: boolean;
  /** Evaluación del intento (o de la jugada original si la repite). */
  attempt?: MoveEvaluation;
  comment?: string;
  /** El jugador ha repetido la misma jugada de la partida. */
  same?: boolean;
}
