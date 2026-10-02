import { Color, PieceType, PositionAnalysis, Score, Uci } from '../models/chess.models';
import { Classification, ClassificationInfo, MoveEvaluation } from '../models/classification.models';
import { PIECE_VALUES, pvToSan, sideToMove, tryMove, uciToSan, winChanceFor } from './chess-utils';
import { buildComment } from './move-comments';

export const CLASSIFICATIONS: Record<Classification, ClassificationInfo> = {
  // Lo bueno va en verdes y azules; lo malo, de amarillo a rojo según la gravedad
  brilliant: {
    label: 'Brillante',
    plural: 'Brillantes',
    symbol: '!!',
    color: '#1baca6',
    description: 'Un sacrificio correcto y difícil de ver.',
  },
  great: {
    label: 'Genial',
    plural: 'Geniales',
    symbol: '!',
    color: '#3f8fdc',
    description: 'La única jugada buena en una posición crítica.',
  },
  best: {
    label: 'La mejor',
    plural: 'Mejores',
    symbol: '',
    icon: 'star',
    color: '#5fae2e',
    description: 'La jugada que elegiría el motor.',
  },
  excellent: {
    label: 'Excelente',
    plural: 'Excelentes',
    symbol: '',
    icon: 'thumbUp',
    color: '#86b83c',
    description: 'Casi tan buena como la mejor.',
  },
  good: {
    label: 'Buena',
    plural: 'Buenas',
    symbol: '',
    icon: 'check',
    color: '#8aa572',
    description: 'Sólida, aunque había algo mejor.',
  },
  book: {
    label: 'Teoría',
    plural: 'Teoría',
    symbol: '',
    icon: 'book',
    color: '#a8835a',
    description: 'Jugada conocida de la teoría de aperturas.',
  },
  inaccuracy: {
    label: 'Imprecisión',
    plural: 'Imprecisiones',
    symbol: '?!',
    color: '#e8b923',
    description: 'Pierde parte de la ventaja.',
  },
  miss: {
    label: 'Ocasión perdida',
    plural: 'Ocasiones perdidas',
    symbol: '',
    icon: 'cross',
    color: '#e0607a',
    description: 'Había una jugada ganadora y se escapó.',
  },
  mistake: {
    label: 'Error',
    plural: 'Errores',
    symbol: '?',
    color: '#ef8326',
    description: 'Empeora claramente la posición.',
  },
  blunder: {
    label: 'Error grave',
    plural: 'Errores graves',
    symbol: '??',
    color: '#d8352a',
    description: 'Un fallo que puede costar la partida.',
  },
};

export const CLASSIFICATION_ORDER: Classification[] = [
  'brilliant',
  'great',
  'best',
  'excellent',
  'good',
  'book',
  'inaccuracy',
  'miss',
  'mistake',
  'blunder',
];

export interface ClassifyInput {
  ply: number;
  fenBefore: string;
  uci: Uci;
  /** Análisis de la posición anterior con al menos 2 líneas (MultiPV 2). */
  before: PositionAnalysis;
  /** Score de la posición resultante (desde las blancas). */
  afterScore: Score;
  afterPv: Uci[];
  isBook: boolean;
  /** Puntos perdidos por el rival en su jugada anterior (para detectar omisiones). */
  opponentPreviousLoss: number;
}

/** Precisión de una jugada a partir de la pérdida de probabilidad de victoria (fórmula de Lichess). */
export function moveAccuracy(loss: number): number {
  const raw = 103.1668 * Math.exp(-0.04354 * loss) - 3.1669 + 1;
  return Math.max(0, Math.min(100, raw));
}

/** Precisión de la partida: mezcla de media aritmética y armónica para penalizar los errores. */
export function gameAccuracy(evals: MoveEvaluation[]): number {
  if (!evals.length) return 0;
  const values = evals.map((e) => Math.max(e.accuracy, 1));
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const harmonic = values.length / values.reduce((a, b) => a + 1 / b, 0);
  return (mean + harmonic) / 2;
}

export function classifyMove(input: ClassifyInput): MoveEvaluation {
  const { fenBefore, uci, before, afterScore } = input;
  const mover: Color = sideToMove(fenBefore);
  const [best, second] = before.lines;

  const bestWin = winChanceFor(best.score, mover);
  const playedIsBest = best.move === uci;
  // Si la jugada es la del motor usamos su propia línea para evitar ruido de profundidad
  const playedWin = playedIsBest ? Math.max(bestWin, winChanceFor(afterScore, mover)) : winChanceFor(afterScore, mover);
  const loss = Math.max(0, bestWin - playedWin);
  const secondGap = second ? bestWin - winChanceFor(second.score, mover) : 0;

  const classification = pickClassification({
    loss,
    bestWin,
    playedWin,
    playedIsBest,
    secondGap,
    isBook: input.isBook,
    sacrifice: isSacrifice(fenBefore, uci),
    bestIsMate: best.score.kind === 'mate' && Math.sign(best.score.value) === (mover === 'w' ? 1 : -1),
    opponentPreviousLoss: input.opponentPreviousLoss,
  });

  const evaluation: MoveEvaluation = {
    ply: input.ply,
    color: mover,
    uci,
    san: uciToSan(fenBefore, uci),
    classification,
    winBefore: bestWin,
    winAfter: playedWin,
    loss,
    accuracy: input.isBook ? 100 : moveAccuracy(loss),
    scoreBefore: best.score,
    scoreAfter: afterScore,
    bestMove: best.move,
    bestSan: uciToSan(fenBefore, best.move),
    bestPv: best.pv,
    replyPv: input.afterPv,
    comment: '',
  };
  evaluation.comment = buildComment(evaluation, fenBefore);
  return evaluation;
}

interface ClassificationFacts {
  loss: number;
  bestWin: number;
  playedWin: number;
  playedIsBest: boolean;
  secondGap: number;
  isBook: boolean;
  sacrifice: boolean;
  bestIsMate: boolean;
  opponentPreviousLoss: number;
}

function pickClassification(f: ClassificationFacts): Classification {
  if (f.isBook && f.loss < 6) return 'book';

  const nearBest = f.playedIsBest || f.loss <= 1;
  // Brillante: sacrificio de material que es la mejor opción y no estabas ya completamente ganado
  if (nearBest && f.sacrifice && f.playedWin >= 45 && f.bestWin < 97) return 'brilliant';
  // Genial: la única buena jugada, el resto empeoraban mucho
  if (f.playedIsBest && f.secondGap >= 18 && f.playedWin >= 40 && f.bestWin < 97) return 'great';
  if (nearBest) return 'best';

  const hadWinningChance = f.bestWin >= 70 && (f.opponentPreviousLoss >= 10 || f.bestIsMate);
  if (hadWinningChance && f.loss >= 8 && f.playedWin >= 30) return 'miss';

  if (f.loss < 2) return 'excellent';
  if (f.loss < 5) return 'good';
  if (f.loss < 10) return 'inaccuracy';
  if (f.loss < 20) return 'mistake';
  return 'blunder';
}

/** ¿La jugada deja material en prisa a cambio de algo? (heurística sencilla de sacrificio) */
export function isSacrifice(fenBefore: string, uci: Uci): boolean {
  const result = tryMove(fenBefore, uci);
  if (!result) return false;
  const { chess, move } = result;
  const moved = (move.promotion ?? move.piece) as PieceType;
  if (moved === 'p' || moved === 'k') return false;

  const value = PIECE_VALUES[moved];
  const captured = move.captured ? PIECE_VALUES[move.captured as PieceType] : 0;
  const opponent = chess.turn();
  const attackers = chess.attackers(move.to, opponent);
  if (!attackers.length) return false;

  const defenders = chess.attackers(move.to, move.color);
  const attackerValues = attackers
    .map((sq) => chess.get(sq)?.type as PieceType)
    .filter((t) => t !== 'k' || defenders.length === 0)
    .map((t) => PIECE_VALUES[t]);
  if (!attackerValues.length) return false;

  // Material neto perdido si el rival captura con su pieza más barata y nosotros recapturamos
  const cheapestAttacker = Math.min(...attackerValues);
  const recaptured = defenders.length > 0 ? cheapestAttacker : 0;
  return value - captured - recaptured >= 2;
}

/** Línea del mejor plan en notación SAN, para mostrarla en la revisión. */
export function bestLineSan(fenBefore: string, evaluation: MoveEvaluation, max = 6): string[] {
  return pvToSan(fenBefore, evaluation.bestPv, max);
}
