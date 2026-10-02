import { Injectable, OnDestroy } from '@angular/core';
import { Chess } from 'chess.js';
import { PositionAnalysis } from '../models/chess.models';
import { terminalScore } from '../chess/chess-utils';
import { SearchOptions, UciEngine } from './uci-engine';

/**
 * Da acceso a dos instancias de Stockfish:
 *  - una para analizar (feedback, resumen y revisión), con caché por posición;
 *  - otra dedicada a pensar las jugadas de los bots, para que nunca esperen al análisis.
 */
@Injectable({ providedIn: 'root' })
export class EngineService implements OnDestroy {
  private analysisEngine?: UciEngine;
  private botEngine?: UciEngine;
  /** Guardamos la promesa para que dos peticiones simultáneas de la misma posición compartan búsqueda. */
  private readonly cache = new Map<string, Promise<PositionAnalysis>>();

  analyze(fen: string, options: SearchOptions = {}): Promise<PositionAnalysis> {
    const terminal = this.terminalAnalysis(fen);
    if (terminal) return Promise.resolve(terminal);

    const key = `${fen}|${options.depth ?? 12}|${options.multipv ?? 1}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    this.analysisEngine ??= new UciEngine();
    const search = this.analysisEngine.analyze(fen, options);
    this.cache.set(key, search);
    search.catch(() => this.cache.delete(key));
    return search;
  }

  /** Búsqueda para el bot (sin caché: el bot debe poder variar sus jugadas). */
  think(fen: string, options: SearchOptions): Promise<PositionAnalysis> {
    this.botEngine ??= new UciEngine();
    return this.botEngine.analyze(fen, options);
  }

  newBotGame(): void {
    this.botEngine?.newGame();
  }

  ngOnDestroy(): void {
    this.analysisEngine?.destroy();
    this.botEngine?.destroy();
  }

  /** Las posiciones terminales no se envían al motor: se resuelven directamente. */
  private terminalAnalysis(fen: string): PositionAnalysis | null {
    const chess = new Chess(fen);
    const score = terminalScore(chess);
    if (!score) return null;
    return { fen, depth: 0, lines: [{ move: '', pv: [], score, depth: 0 }] };
  }
}
