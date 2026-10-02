import { computed, inject, Injectable } from '@angular/core';
import { PUZZLE_CHAPTERS, PUZZLE_STOPS, PuzzleChapter, PuzzleStop } from '../../data/puzzle-path';
import { ProfileService } from './profile.service';

export type StopStatus = 'done' | 'current' | 'locked';
export type ChapterStatus = 'done' | 'current' | 'locked';

/**
 * Progreso en el mapa de problemas: se avanza en orden y cada problema resuelto abre el siguiente.
 * Los ya resueltos se pueden repetir, pero sin puntos ni experiencia.
 */
@Injectable({ providedIn: 'root' })
export class PuzzlePathService {
  private readonly profile = inject(ProfileService);

  readonly chapters = PUZZLE_CHAPTERS;
  readonly stops = PUZZLE_STOPS;

  private readonly solved = computed(() => new Set(this.profile.profile().solvedPuzzleIds));

  /** El primer problema sin resolver: hasta él, todo está abierto. */
  readonly frontier = computed(() => {
    const solved = this.solved();
    const index = this.stops.findIndex((s) => !solved.has(s.puzzle.id));
    return index === -1 ? this.stops.length : index;
  });

  /** El problema que toca ahora, o null si ya está todo el mapa resuelto. */
  readonly current = computed<PuzzleStop | null>(() => this.stops[this.frontier()] ?? null);

  readonly solvedCount = computed(() => this.stops.filter((s) => this.solved().has(s.puzzle.id)).length);

  byId(id: string | undefined): PuzzleStop | undefined {
    return this.stops.find((s) => s.puzzle.id === id);
  }

  isSolved(stop: PuzzleStop): boolean {
    return this.solved().has(stop.puzzle.id);
  }

  status(stop: PuzzleStop): StopStatus {
    if (this.isSolved(stop)) return 'done';
    return stop.index === this.frontier() ? 'current' : 'locked';
  }

  isOpen(stop: PuzzleStop): boolean {
    return this.status(stop) !== 'locked';
  }

  chapterStatus(chapter: PuzzleChapter): ChapterStatus {
    if (chapter.stops.every((s) => this.isSolved(s))) return 'done';
    return chapter.stops.some((s) => this.isOpen(s)) ? 'current' : 'locked';
  }

  chapterSolved(chapter: PuzzleChapter): number {
    return chapter.stops.filter((s) => this.isSolved(s)).length;
  }

  /** El siguiente problema del camino, si existe. */
  after(stop: PuzzleStop): PuzzleStop | undefined {
    return this.stops[stop.index + 1];
  }
}
