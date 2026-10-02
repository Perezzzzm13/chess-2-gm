import { Color, GameResult } from '../models/chess.models';

export const STARTING_RATING = 400;
export const STARTING_PUZZLE_RATING = 600;

/** XP total necesaria para alcanzar un nivel: 0, 100, 300, 600, 1000, 1500... */
export function xpForLevel(level: number): number {
  return 50 * level * (level - 1);
}

export function levelForXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

export function levelProgress(xp: number): { level: number; current: number; needed: number; ratio: number } {
  const level = levelForXp(xp);
  const base = xpForLevel(level);
  const needed = xpForLevel(level + 1) - base;
  const current = xp - base;
  return { level, current, needed, ratio: current / needed };
}

export function expectedScore(rating: number, opponent: number): number {
  return 1 / (1 + 10 ** ((opponent - rating) / 400));
}

export function scoreFor(result: GameResult, color: Color): number {
  if (result === '1/2-1/2') return 0.5;
  return (result === '1-0') === (color === 'w') ? 1 : 0;
}

/** Variación de ELO. K alto para que la demo sea dinámica y se note el progreso. */
export function ratingDelta(rating: number, opponent: number, score: number, k = 32): number {
  return Math.round(k * (score - expectedScore(rating, opponent)));
}

/** Por debajo de este número de jugadas (plies) la partida apenas da experiencia: evita "farmear" abandonando. */
export const MIN_PLIES_FOR_XP = 16;

export function gameXp(score: number, opponentElo: number, accuracy: number | null, plies: number): number {
  if (plies < MIN_PLIES_FOR_XP) return score === 1 ? 25 : 5;
  const base = 40;
  const result = score === 1 ? 100 : score === 0.5 ? 50 : 15;
  const challenge = Math.round(opponentElo / 25);
  const precision = accuracy ? Math.round(accuracy / 2) : 0;
  return base + result + challenge + precision;
}

export function puzzleXp(puzzleRating: number, firstTry: boolean): number {
  return Math.round(10 + puzzleRating / 60 + (firstTry ? 10 : 0));
}

export function openingXp(stars: number, firstTime: boolean): number {
  return 20 * stars + (firstTime ? 60 : 0);
}
