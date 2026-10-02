import { computed, inject, Injectable, signal } from '@angular/core';
import { BoardTheme, Profile } from '../models/profile.models';
import { PlayerInfo } from '../models/game.models';
import { ProfileRepository } from '../repositories/profile.repository';
import { BOARD_THEMES, DEFAULT_BOARD_THEME } from '../../data/board-themes';
import { nextRank, rankForRating } from '../../data/ranks';
import {
  levelForXp,
  levelProgress,
  openingXp,
  puzzleXp,
  ratingDelta,
  STARTING_PUZZLE_RATING,
  STARTING_RATING,
} from '../progression/progression';
import { RewardsService } from './rewards.service';

function defaultProfile(): Profile {
  return {
    name: 'Invitado',
    rating: STARTING_RATING,
    peakRating: STARTING_RATING,
    xp: 0,
    puzzleRating: STARTING_PUZZLE_RATING,
    puzzlesSolved: 0,
    puzzleStreak: 0,
    bestPuzzleStreak: 0,
    solvedPuzzleIds: [],
    failedPuzzleIds: [],
    openings: {},
    stats: { games: 0, wins: 0, draws: 0, losses: 0 },
    boardTheme: DEFAULT_BOARD_THEME,
    feedbackByDefault: true,
    soundOn: true,
    unlockAll: false,
    createdAt: new Date().toISOString(),
  };
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly repository = inject(ProfileRepository);
  private readonly rewards = inject(RewardsService);

  readonly profile = signal<Profile>({ ...defaultProfile(), ...this.repository.load() });

  readonly level = computed(() => levelForXp(this.profile().xp));
  readonly levelProgress = computed(() => levelProgress(this.profile().xp));
  readonly rank = computed(() => rankForRating(this.profile().rating));
  readonly nextRank = computed(() => nextRank(this.profile().rating));
  readonly rankProgress = computed(() => {
    const next = this.nextRank();
    if (!next) return 1;
    const current = this.rank();
    return (this.profile().rating - current.minRating) / (next.minRating - current.minRating);
  });
  /** Ficha del jugador para partidas: nombre, ELO y retrato de su rango. */
  readonly playerInfo = computed<PlayerInfo>(() => {
    const p = this.profile();
    const rank = this.rank();
    return { name: p.name, rating: p.rating, piece: rank.piece, tint: rank.colors[1] };
  });

  readonly theme = computed(() => {
    const id = this.profile().boardTheme;
    const theme = BOARD_THEMES.find((t) => t.id === id);
    return theme && this.isUnlocked(theme) ? theme.id : DEFAULT_BOARD_THEME;
  });

  isUnlocked(theme: BoardTheme): boolean {
    return this.profile().unlockAll || this.level() >= theme.requiredLevel;
  }

  update(changes: Partial<Profile>): void {
    this.profile.update((p) => ({ ...p, ...changes }));
    this.repository.save(this.profile());
  }

  /** Suma experiencia y anuncia subidas de nivel y tableros desbloqueados. */
  addXp(amount: number, reason: string): void {
    const before = this.level();
    this.update({ xp: this.profile().xp + amount });
    this.rewards.toast({ kind: 'xp', title: `+${amount} XP`, detail: reason, amount });

    const after = this.level();
    if (after > before) {
      this.rewards.celebrate({ kind: 'level', title: `¡Nivel ${after}!`, detail: 'Tu leyenda crece en el reino.' });
      BOARD_THEMES.filter((t) => t.requiredLevel > before && t.requiredLevel <= after).forEach((t) =>
        this.rewards.celebrate({ kind: 'unlock', title: `Tablero desbloqueado: ${t.name}`, detail: t.description }),
      );
    }
  }

  /** Aplica el resultado de una partida contra un bot y devuelve la variación de ELO. */
  applyRatedResult(opponentElo: number, score: number): number {
    const p = this.profile();
    const rankBefore = this.rank();
    const delta = ratingDelta(p.rating, opponentElo, score);
    const rating = Math.max(100, p.rating + delta);
    this.update({ rating, peakRating: Math.max(p.peakRating, rating) });

    const rankAfter = this.rank();
    if (rankAfter.minRating > rankBefore.minRating) {
      this.rewards.celebrate({ kind: 'rank', title: `Nuevo rango: ${rankAfter.name}`, detail: rankAfter.motto });
    }
    return rating - p.rating;
  }

  recordGameStats(score: number): void {
    const s = this.profile().stats;
    this.update({
      stats: {
        games: s.games + 1,
        wins: s.wins + (score === 1 ? 1 : 0),
        draws: s.draws + (score === 0.5 ? 1 : 0),
        losses: s.losses + (score === 0 ? 1 : 0),
      },
    });
  }

  /**
   * Registra el desenlace de un puzzle y devuelve la variación de valoración.
   *  - solved: resuelto a la primera (sube valoración y racha)
   *  - failed: primer fallo (baja valoración y corta la racha)
   *  - solved-after-fail: resuelto tras fallar (solo un poco de XP, sin cambiar la valoración)
   */
  recordPuzzle(id: string, puzzleRating: number, outcome: 'solved' | 'failed' | 'solved-after-fail'): number {
    const p = this.profile();
    const solved = outcome !== 'failed';
    const delta = outcome === 'solved-after-fail' ? 0 : ratingDelta(p.puzzleRating, puzzleRating, solved ? 1 : 0, 24);
    const streak = outcome === 'solved' ? p.puzzleStreak + 1 : outcome === 'failed' ? 0 : p.puzzleStreak;
    this.update({
      puzzleRating: Math.max(100, p.puzzleRating + delta),
      puzzlesSolved: p.puzzlesSolved + (solved ? 1 : 0),
      puzzleStreak: streak,
      bestPuzzleStreak: Math.max(p.bestPuzzleStreak, streak),
      solvedPuzzleIds: solved ? [...new Set([...p.solvedPuzzleIds, id])] : p.solvedPuzzleIds,
      failedPuzzleIds: solved ? p.failedPuzzleIds : [...new Set([...p.failedPuzzleIds, id])],
    });
    if (solved) {
      const reason = outcome === 'solved' && streak > 1 ? `Puzzle resuelto · racha x${streak}` : 'Puzzle resuelto';
      this.addXp(puzzleXp(puzzleRating, outcome === 'solved'), reason);
    }
    return delta;
  }

  recordOpening(id: string, stars: number): void {
    const progress = this.profile().openings[id];
    const firstTime = !progress;
    this.update({
      openings: {
        ...this.profile().openings,
        [id]: { stars: Math.max(stars, progress?.stars ?? 0), completions: (progress?.completions ?? 0) + 1 },
      },
    });
    this.addXp(openingXp(stars, firstTime), firstTime ? 'Apertura aprendida' : 'Apertura repasada');
  }

  reset(): void {
    this.repository.clear();
    this.profile.set(defaultProfile());
  }
}
