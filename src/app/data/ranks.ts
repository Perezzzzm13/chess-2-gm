import { Rank } from '../core/models/profile.models';

/** Rangos por ELO. Nombres propios del reino de Chess to GM. */
export const RANKS: Rank[] = [
  {
    id: 'gambit-apprentice',
    name: 'Aprendiz del Gambito',
    minRating: 0,
    motto: 'Todo gran reinado empieza con un humilde peón.',
    piece: 'p',
    colors: ['#e0995a', '#7a3d14'],
  },
  {
    id: 'ivory-sentinel',
    name: 'Centinela de Marfil',
    minRating: 500,
    motto: 'Ya no dejas piezas colgando... casi nunca.',
    piece: 'r',
    colors: ['#e8dcc0', '#9c8b66'],
  },
  {
    id: 'dawn-rider',
    name: 'Jinete del Alba',
    minRating: 700,
    motto: 'Tus caballos saltan con la primera luz del día.',
    piece: 'n',
    colors: ['#f2a65a', '#b8572a'],
  },
  {
    id: 'tower-warden',
    name: 'Guardián de la Torre',
    minRating: 900,
    motto: 'Columnas abiertas, muros inquebrantables.',
    piece: 'r',
    colors: ['#7fa7c9', '#34597a'],
  },
  {
    id: 'center-alchemist',
    name: 'Alquimista del Centro',
    minRating: 1100,
    motto: 'Conviertes casillas centrales en oro puro.',
    piece: 'b',
    colors: ['#7ed6a5', '#2f7a55'],
  },
  {
    id: 'midnight-strategist',
    name: 'Estratega de Medianoche',
    minRating: 1300,
    motto: 'Tus planes se tejen mientras el rival duerme.',
    piece: 'n',
    colors: ['#8f8ce8', '#3b3796'],
  },
  {
    id: 'duke-of-diagonals',
    name: 'Duque de las Diagonales',
    minRating: 1500,
    motto: 'Tus alfiles cruzan el reino de esquina a esquina.',
    piece: 'b',
    colors: ['#e07fb6', '#8a2f66'],
  },
  {
    id: 'board-archmage',
    name: 'Archimago del Tablero',
    minRating: 1700,
    motto: 'Ves combinaciones donde otros solo ven piezas.',
    piece: 'q',
    colors: ['#b18cff', '#5a2fb0'],
  },
  {
    id: 'mate-weaver',
    name: 'Tejedor de Mates',
    minRating: 1900,
    motto: 'Cada jugada es un hilo; el último, una red sin salida.',
    piece: 'q',
    colors: ['#ff7a6b', '#a3201a'],
  },
  {
    id: 'eternal-sovereign',
    name: 'Soberano Eterno',
    minRating: 2100,
    motto: 'El tablero entero se inclina ante tu corona.',
    piece: 'k',
    colors: ['#ffe08a', '#b8860b'],
  },
];

export function rankForRating(rating: number): Rank {
  return [...RANKS].reverse().find((r) => rating >= r.minRating) ?? RANKS[0];
}

export function nextRank(rating: number): Rank | null {
  return RANKS.find((r) => r.minRating > rating) ?? null;
}
