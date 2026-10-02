import { inject, Injectable, Signal, signal } from '@angular/core';
import { MoveEvaluation } from '../models/classification.models';
import { SavedGame } from '../models/game.models';
import { AnalysisService } from '../engine/analysis.service';
import { GameHistoryService } from './game-history.service';

export interface ReviewState {
  evaluations: Signal<(MoveEvaluation | null)[]>;
  done: Signal<number>;
  complete: Signal<boolean>;
}

/**
 * Completa el análisis de una partida guardada. El estado se comparte por id de partida,
 * así que pasar del resumen a la revisión no relanza el análisis.
 */
@Injectable({ providedIn: 'root' })
export class GameReviewService {
  private readonly analysis = inject(AnalysisService);
  private readonly history = inject(GameHistoryService);
  private readonly states = new Map<string, ReviewState>();

  review(game: SavedGame): ReviewState {
    const existing = this.states.get(game.id);
    if (existing) return existing;

    const initial = game.moves.map((_, i) => game.evaluations[i] ?? null);
    const evaluations = signal(initial);
    const done = signal(initial.filter(Boolean).length);
    const complete = signal(initial.every(Boolean));
    const state: ReviewState = { evaluations, done, complete };
    this.states.set(game.id, state);

    if (!complete()) {
      this.analysis
        .analyzeGame(game.startFen, game.moves, initial, (count, _total, evals) => {
          evaluations.set([...evals]);
          done.set(evals.filter(Boolean).length);
        })
        .then((evals) => {
          complete.set(true);
          const latest = this.history.get(game.id) ?? game;
          this.history.save({ ...latest, evaluations: evals });
        });
    }
    return state;
  }
}
