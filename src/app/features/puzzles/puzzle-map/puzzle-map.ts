import { afterNextRender, Component, computed, inject, linkedSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProfileService } from '../../../core/services/profile.service';
import { PuzzlePathService } from '../../../core/services/puzzle-path.service';
import { PuzzleChapter } from '../../../data/puzzle-path';
import { puzzleStartPosition, puzzleThemeLabels } from '../../../data/puzzles';
import { Board } from '../../../shared/components/board/board';
import { Icon } from '../../../shared/components/icon/icon';
import { Trail, trailFor, trailPath, TRAIL_WIDTH } from './trail';

interface ChapterTrail {
  trail: Trail;
  road: string;
}

@Component({
  selector: 'app-puzzle-map',
  imports: [RouterLink, Board, Icon],
  templateUrl: './puzzle-map.html',
  styleUrl: './puzzle-map.scss',
})
export class PuzzleMap {
  readonly profile = inject(ProfileService);
  readonly path = inject(PuzzlePathService);

  readonly trailWidth = TRAIL_WIDTH;
  /** La geometría no cambia: se calcula una vez por sala. */
  readonly trails: ChapterTrail[] = this.path.chapters.map((c) => {
    const trail = trailFor(c.stops.length);
    return { trail, road: trailPath(trail.points) };
  });

  /** La sala desplegada: por defecto, la del problema que toca. */
  readonly openChapter = linkedSignal<number | null>(() => this.path.current()?.chapter ?? this.path.chapters.length - 1);

  readonly next = computed(() => {
    const stop = this.path.current();
    if (!stop) return null;
    return {
      stop,
      chapter: this.path.chapters[stop.chapter],
      position: puzzleStartPosition(stop.puzzle),
      themes: puzzleThemeLabels(stop.puzzle).filter((t) => !['Corto', 'Largo'].includes(t)).slice(0, 2),
    };
  });

  /** Ficha del jugador que marca dónde está: la pieza de su rango con las piezas de su tablero. */
  readonly token = computed(() => `pieces/${this.profile.theme()}/w${this.profile.rank().piece.toUpperCase()}.webp`);

  constructor() {
    // Si el problema actual queda fuera de la pantalla, llevamos el mapa hasta él
    afterNextRender(() => {
      const current = document.querySelector('.stop--current');
      if (current && current.getBoundingClientRect().bottom > window.innerHeight) {
        current.scrollIntoView({ block: 'center' });
      }
    });
  }

  toggle(chapter: PuzzleChapter): void {
    if (this.path.chapterStatus(chapter) === 'locked') return;
    this.openChapter.update((open) => (open === chapter.index ? null : chapter.index));
  }

  /** Trazado dorado del tramo ya recorrido en la sala. */
  walked(chapter: PuzzleChapter): string {
    const done = chapter.stops.findIndex((s) => !this.path.isSolved(s));
    const reached = done === -1 ? chapter.stops.length : done + 1;
    return trailPath(this.trails[chapter.index].trail.points, reached);
  }
}
