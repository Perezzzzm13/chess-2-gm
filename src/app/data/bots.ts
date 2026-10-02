import { PieceType } from '../core/models/chess.models';

export interface BotProfile {
  id: string;
  name: string;
  title: string;
  elo: number;
  /** Retrato: pieza y color del medallón. */
  piece: PieceType;
  tint: string;
  bio: string;
  greeting: string;
}

export const MIN_BOT_ELO = 100;
export const MAX_BOT_ELO = 2000;

export const BOTS: BotProfile[] = [
  {
    id: 'cascabel',
    name: 'Cascabel',
    title: 'Bufón de la corte',
    elo: 100,
    piece: 'p',
    tint: '#8e44ad',
    bio: 'Mueve las piezas por pura diversión. A veces incluso de forma legal.',
    greeting: '¡Jiji! ¿Jugamos a las damas? Ah, no, que es ajedrez...',
  },
  {
    id: 'tomillo',
    name: 'Tomillo',
    title: 'Paje del castillo',
    elo: 250,
    piece: 'p',
    tint: '#4f8a3a',
    bio: 'Aprende ajedrez entre recado y recado. Le encanta capturar peones.',
    greeting: 'Perdón, traía la cena del rey... ¡pero juego rápido!',
  },
  {
    id: 'brisa',
    name: 'Brisa',
    title: 'Escudera novata',
    elo: 400,
    piece: 'n',
    tint: '#2f7fc1',
    bio: 'Valiente e impulsiva. Ataca siempre, piense lo que piense.',
    greeting: '¡En guardia! Hoy estreno escudo.',
  },
  {
    id: 'romero',
    name: 'Romero',
    title: 'Juglar errante',
    elo: 600,
    piece: 'b',
    tint: '#d9772b',
    bio: 'Canta mientras juega y a veces se olvida de defender.',
    greeting: 'Compondré una balada sobre esta partida.',
  },
  {
    id: 'ferran',
    name: 'Sir Ferrán',
    title: 'Caballero del reino',
    elo: 800,
    piece: 'n',
    tint: '#5d7088',
    bio: 'Honorable y metódico. Conoce las reglas de oro de la apertura.',
    greeting: 'Que gane quien mejor sirva al tablero.',
  },
  {
    id: 'isolda',
    name: 'Dama Isolda',
    title: 'Consejera de la reina',
    elo: 1000,
    piece: 'q',
    tint: '#c2457a',
    bio: 'Paciente y elegante. No regala nada, pero tampoco arriesga.',
    greeting: 'Muéstrame tu mejor ajedrez, por favor.',
  },
  {
    id: 'ulric',
    name: 'Ulric',
    title: 'Alquimista real',
    elo: 1200,
    piece: 'b',
    tint: '#1f8a80',
    bio: 'Mezcla táctica y estrategia como quien mezcla pociones.',
    greeting: 'Una pizca de táctica, dos de paciencia...',
  },
  {
    id: 'morgana',
    name: 'Morgana',
    title: 'Hechicera del bosque',
    elo: 1400,
    piece: 'q',
    tint: '#6a3fb5',
    bio: 'Sus combinaciones aparecen como por arte de magia.',
    greeting: 'Ya he visto cómo termina esta partida...',
  },
  {
    id: 'vlad',
    name: 'Conde Vlad',
    title: 'Señor de las sombras',
    elo: 1600,
    piece: 'r',
    tint: '#3a3a46',
    bio: 'Juega de noche y castiga cada debilidad de tu estructura.',
    greeting: 'Bienvenido a mi castillo. Siéntese... si se atreve.',
  },
  {
    id: 'elara',
    name: 'Archiduquesa Elara',
    title: 'Estratega imperial',
    elo: 1800,
    piece: 'q',
    tint: '#2a4fa8',
    bio: 'Ha ganado guerras sin mover un soldado. Sobre el tablero es implacable.',
    greeting: 'Que comience la campaña.',
  },
  {
    id: 'rey-sin-corona',
    name: 'El Rey Sin Corona',
    title: 'Leyenda del reino',
    elo: 2000,
    piece: 'k',
    tint: '#c9902a',
    bio: 'Nadie sabe de dónde vino. Solo que nunca ha perdido una partida aquí.',
    greeting: '...',
  },
];

export function botById(id: string | undefined): BotProfile | undefined {
  return BOTS.find((b) => b.id === id);
}

/** Bot "a medida" para ELOs personalizados. */
export function customBot(elo: number): BotProfile {
  return {
    id: 'custom',
    name: 'Autómata',
    title: 'Rival a medida',
    elo,
    piece: 'r',
    tint: '#7a6a5a',
    bio: 'Un autómata de relojería calibrado a tu gusto.',
    greeting: 'Tic, tac. Calibrado y listo.',
  };
}
