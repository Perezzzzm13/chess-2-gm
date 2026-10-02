import { IconName } from './icons';
import { Puzzle, PUZZLES } from './puzzles';

export interface PuzzleStop {
  puzzle: Puzzle;
  /** Posición en el camino, desde 0. */
  index: number;
  chapter: number;
}

export interface PuzzleChapter {
  index: number;
  name: string;
  icon: IconName;
  stops: PuzzleStop[];
  minRating: number;
  maxRating: number;
}

/** Las salas del castillo, de la entrada al trono. Cada una, un tramo de dificultad. */
const CHAPTERS: { name: string; icon: IconName }[] = [
  { name: 'Patio de armas', icon: 'pawn' },
  { name: 'Caballerizas', icon: 'knight' },
  { name: 'Capilla', icon: 'bishop' },
  { name: 'Torre del vigía', icon: 'rook' },
  { name: 'Murallas', icon: 'castle' },
  { name: 'Aposentos de la reina', icon: 'queen' },
  { name: 'Salón del rey', icon: 'king' },
  { name: 'Sala del trono', icon: 'crown' },
];

const ordered = [...PUZZLES].sort((a, b) => a.rating - b.rating || a.id.localeCompare(b.id));
const perChapter = Math.ceil(ordered.length / CHAPTERS.length);

/** Todos los problemas en el orden en que se juegan: de más fácil a más difícil. */
export const PUZZLE_STOPS: PuzzleStop[] = ordered.map((puzzle, index) => ({
  puzzle,
  index,
  chapter: Math.floor(index / perChapter),
}));

export const PUZZLE_CHAPTERS: PuzzleChapter[] = CHAPTERS.map((chapter, index) => {
  const stops = PUZZLE_STOPS.filter((s) => s.chapter === index);
  return {
    ...chapter,
    index,
    stops,
    minRating: stops[0]?.puzzle.rating ?? 0,
    maxRating: stops.at(-1)?.puzzle.rating ?? 0,
  };
}).filter((c) => c.stops.length > 0);
