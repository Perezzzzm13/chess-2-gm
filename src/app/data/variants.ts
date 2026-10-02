import { START_FEN } from '../core/chess/chess-utils';
import { PieceType } from '../core/models/chess.models';

export type VariantId = 'clasico' | 'caballeria';

export interface Variant {
  id: VariantId;
  name: string;
  /** Una línea para la tarjeta del modo. */
  tagline: string;
  /** Cómo cambia la partida respecto al ajedrez normal. */
  rules: string;
  startFen: string;
  /** Pieza que la representa en las tarjetas. */
  piece: PieceType;
  /** Las variantes no mueven tu ELO: los bots están calibrados para el ajedrez normal. */
  rated: boolean;
}

export const VARIANTS: Variant[] = [
  {
    id: 'clasico',
    name: 'Clásico',
    tagline: 'El ajedrez de siempre.',
    rules: 'Reglas normales. Cuenta para tu ELO.',
    startFen: START_FEN,
    piece: 'k',
    rated: true,
  },
  {
    id: 'caballeria',
    name: 'Caballería',
    tagline: 'Todos los peones se convierten en caballos.',
    rules: 'Cada bando empieza con diez caballos y ningún peón. Sin peones no hay coronación ni captura al paso: todo es saltar y atacar.',
    startFen: 'rnbqkbnr/nnnnnnnn/8/8/8/8/NNNNNNNN/RNBQKBNR w KQkq - 0 1',
    piece: 'n',
    rated: false,
  },
];

export const CLASSIC = VARIANTS[0];

export function variantById(id: string | null | undefined): Variant {
  return VARIANTS.find((v) => v.id === id) ?? CLASSIC;
}
