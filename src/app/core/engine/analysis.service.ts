import { inject, Injectable } from '@angular/core';
import { Chess } from 'chess.js';
import { PositionAnalysis, Uci } from '../models/chess.models';
import { MoveEvaluation } from '../models/classification.models';
import { classifyMove } from '../chess/classification';
import { tryMove, uciToInput } from '../chess/chess-utils';
import { isBookPosition } from '../chess/opening-book';
import { EngineService } from './engine.service';

/** Profundidad de análisis: buen equilibrio entre precisión y velocidad en el navegador. */
const ANALYSIS_DEPTH = 12;
const BOOK_PLIES = 24;

@Injectable({ providedIn: 'root' })
export class AnalysisService {
  private readonly engine = inject(EngineService);

  analyzePosition(fen: string): Promise<PositionAnalysis> {
    // Siempre MultiPV 2: la posición resultante de una jugada es la previa de la siguiente y así se reutiliza la caché
    return this.engine.analyze(fen, { depth: ANALYSIS_DEPTH, multipv: 2 });
  }

  async evaluateMove(ply: number, fenBefore: string, uci: Uci, opponentPreviousLoss: number): Promise<MoveEvaluation> {
    const result = tryMove(fenBefore, uci);
    if (!result) throw new Error(`Jugada ilegal ${uci} en ${fenBefore}`);
    const fenAfter = result.chess.fen();

    const [before, after] = await Promise.all([this.analyzePosition(fenBefore), this.analyzePosition(fenAfter)]);

    return classifyMove({
      ply,
      fenBefore,
      uci,
      before,
      afterScore: after.lines[0].score,
      afterPv: after.lines[0].pv,
      isBook: ply < BOOK_PLIES && isBookPosition(fenAfter),
      opponentPreviousLoss,
    });
  }

  /**
   * Completa las evaluaciones que falten de una partida, en orden.
   * Reutiliza las ya existentes (por ejemplo, las calculadas durante la partida).
   */
  async analyzeGame(
    startFen: string,
    moves: Uci[],
    existing: (MoveEvaluation | null)[],
    onProgress?: (done: number, total: number, evaluations: (MoveEvaluation | null)[]) => void,
  ): Promise<MoveEvaluation[]> {
    const fens = fensFor(startFen, moves);
    const evaluations: (MoveEvaluation | null)[] = moves.map((_, i) => existing[i] ?? null);

    for (let i = 0; i < moves.length; i++) {
      if (!evaluations[i]) {
        const previousLoss = i > 0 ? (evaluations[i - 1]?.loss ?? 0) : 0;
        evaluations[i] = await this.evaluateMove(i, fens[i], moves[i], previousLoss);
      }
      onProgress?.(i + 1, moves.length, evaluations);
    }
    return evaluations as MoveEvaluation[];
  }
}

/** FEN de cada posición: fens[i] es la posición antes de la jugada i (fens[n] es la final). */
export function fensFor(startFen: string, moves: Uci[]): string[] {
  const chess = new Chess(startFen);
  const fens = [chess.fen()];
  for (const uci of moves) {
    chess.move(uciToInput(uci));
    fens.push(chess.fen());
  }
  return fens;
}
