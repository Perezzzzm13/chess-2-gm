import { PieceType } from './chess.models';

export interface OpeningProgress {
  stars: number;
  completions: number;
}

export interface PlayerStats {
  games: number;
  wins: number;
  draws: number;
  losses: number;
}

export interface Profile {
  name: string;
  rating: number;
  peakRating: number;
  xp: number;
  puzzleRating: number;
  puzzlesSolved: number;
  puzzleStreak: number;
  bestPuzzleStreak: number;
  solvedPuzzleIds: string[];
  /** Problemas fallados alguna vez: la valoración solo baja la primera vez. */
  failedPuzzleIds: string[];
  openings: Record<string, OpeningProgress>;
  stats: PlayerStats;
  boardTheme: string;
  feedbackByDefault: boolean;
  soundOn: boolean;
  /** Modo demo: desbloquea todos los tableros sin necesidad de subir de nivel. */
  unlockAll: boolean;
  createdAt: string;
}

export interface Rank {
  id: string;
  name: string;
  minRating: number;
  motto: string;
  piece: PieceType;
  colors: [string, string];
}

export interface BoardTheme {
  id: string;
  name: string;
  description: string;
  requiredLevel: number;
}

export type RewardKind = 'xp' | 'level' | 'rank' | 'unlock' | 'rating';

export interface Reward {
  kind: RewardKind;
  title: string;
  detail?: string;
  amount?: number;
}
