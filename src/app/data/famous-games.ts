export interface FamousGame {
  name: string;
  white: string;
  black: string;
  /** Dónde y cuándo se jugó. */
  where: string;
  sans: string[];
}

/** Partidas célebres que se reproducen en la portada, como un escaparate en la pared. */
export const FAMOUS_GAMES: FamousGame[] = [
  {
    name: 'La partida de la Ópera',
    white: 'Paul Morphy',
    black: 'Duque de Brunswick y Conde Isouard',
    where: 'París, 1858',
    sans: 'e4 e5 Nf3 d6 d4 Bg4 dxe5 Bxf3 Qxf3 dxe5 Bc4 Nf6 Qb3 Qe7 Nc3 c6 Bg5 b5 Nxb5 cxb5 Bxb5+ Nbd7 O-O-O Rd8 Rxd7 Rxd7 Rd1 Qe6 Bxd7+ Nxd7 Qb8+ Nxb8 Rd8#'.split(' '),
  },
  {
    name: 'La Inmortal',
    white: 'Adolf Anderssen',
    black: 'Lionel Kieseritzky',
    where: 'Londres, 1851',
    sans: 'e4 e5 f4 exf4 Bc4 Qh4+ Kf1 b5 Bxb5 Nf6 Nf3 Qh6 d3 Nh5 Nh4 Qg5 Nf5 c6 g4 Nf6 Rg1 cxb5 h4 Qg6 h5 Qg5 Qf3 Ng8 Bxf4 Qf6 Nc3 Bc5 Nd5 Qxb2 Bd6 Bxg1 e5 Qxa1+ Ke2 Na6 Nxg7+ Kd8 Qf6+ Nxf6 Be7#'.split(' '),
  },
  {
    name: 'La Siempreviva',
    white: 'Adolf Anderssen',
    black: 'Jean Dufresne',
    where: 'Berlín, 1852',
    sans: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O d3 Qb3 Qf6 e5 Qg6 Re1 Nge7 Ba3 b5 Qxb5 Rb8 Qa4 Bb6 Nbd2 Bb7 Ne4 Qf5 Bxd3 Qh5 Nf6+ gxf6 exf6 Rg8 Rad1 Qxf3 Rxe7+ Nxe7 Qxd7+ Kxd7 Bf5+ Ke8 Bd7+ Kf8 Bxe7#'.split(' '),
  },
];
