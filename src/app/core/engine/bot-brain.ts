import { Chess } from 'chess.js';
import { PositionAnalysis, Uci } from '../models/chess.models';
import { moveToUci, scoreToCp, sideToMove } from '../chess/chess-utils';
import { MAX_BOT_ELO, MIN_BOT_ELO } from '../../data/bots';

export interface BotStyle {
  /** Profundidad de búsqueda del motor. */
  depth: number;
  /** Número de candidatas que el bot considera. */
  multipv: number;
  /** Probabilidad de jugar una jugada al azar (los despistes típicos de principiante). */
  randomChance: number;
  /** "Temperatura" en centipeones: cuanto mayor, más se aleja de la mejor jugada. */
  temperature: number;
}

/**
 * Stockfish no permite bajar de ~1320 de ELO, así que simulamos la fuerza de juego:
 * menos profundidad, elección aleatoria ponderada entre candidatas y despistes ocasionales.
 */
export function botStyle(elo: number): BotStyle {
  const t = (Math.min(MAX_BOT_ELO, Math.max(MIN_BOT_ELO, elo)) - MIN_BOT_ELO) / (MAX_BOT_ELO - MIN_BOT_ELO);
  return {
    depth: Math.round(1 + t * 11),
    multipv: 5,
    randomChance: 0.3 * (1 - t) ** 2,
    temperature: 8 + 240 * (1 - t) ** 1.5,
  };
}

export function chooseBotMove(fen: string, analysis: PositionAnalysis, style: BotStyle, rng = Math.random): Uci {
  const chess = new Chess(fen);
  const legal = chess.moves({ verbose: true });

  if (rng() < style.randomChance || !analysis.lines.length) {
    return moveToUci(legal[Math.floor(rng() * legal.length)]);
  }

  // Puntuamos cada candidata desde el punto de vista del bot y elegimos con softmax
  const sign = sideToMove(fen) === 'w' ? 1 : -1;
  const scored = analysis.lines.map((l) => ({ move: l.move, cp: scoreToCp(l.score) * sign }));
  const bestCp = Math.max(...scored.map((s) => s.cp));
  const weights = scored.map((s) => Math.exp(-(bestCp - s.cp) / style.temperature));
  const total = weights.reduce((a, b) => a + b, 0);

  let r = rng() * total;
  for (let i = 0; i < scored.length; i++) {
    r -= weights[i];
    if (r <= 0) return scored[i].move;
  }
  return scored[0].move;
}

/** ¿Acepta el bot unas tablas? Solo si la posición está igualada o va perdiendo. */
export function botAcceptsDraw(botEvalCp: number, plies: number): boolean {
  if (botEvalCp < -150) return true;
  return plies >= 40 && Math.abs(botEvalCp) <= 40;
}
