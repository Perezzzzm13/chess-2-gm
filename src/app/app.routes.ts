import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/home/home').then((m) => m.Home), title: 'Chess to GM' },
  { path: 'bots', loadComponent: () => import('./features/bots/bots').then((m) => m.Bots), title: 'Jugar contra bots · Chess to GM' },
  { path: 'partida', loadComponent: () => import('./features/play/play').then((m) => m.Play), title: 'Partida · Chess to GM' },
  { path: 'amigos', loadComponent: () => import('./features/friends/friends').then((m) => m.Friends), title: 'Jugar con amigos · Chess to GM' },
  { path: 'amigos/unirse/:code', loadComponent: () => import('./features/friends/friends').then((m) => m.Friends), title: 'Unirse a partida · Chess to GM' },
  { path: 'amigos/partida', loadComponent: () => import('./features/play/play').then((m) => m.Play), data: { mode: 'friend' }, title: 'Partida con amigos · Chess to GM' },
  { path: 'partidas/:id/resumen', loadComponent: () => import('./features/summary/summary').then((m) => m.Summary), title: 'Resumen · Chess to GM' },
  { path: 'partidas/:id/revision', loadComponent: () => import('./features/review/review').then((m) => m.Review), title: 'Revisión · Chess to GM' },
  { path: 'problemas', loadComponent: () => import('./features/puzzles/puzzle-map/puzzle-map').then((m) => m.PuzzleMap), title: 'Problemas · Chess to GM' },
  { path: 'problemas/:id', loadComponent: () => import('./features/puzzles/puzzle-solver/puzzle-solver').then((m) => m.PuzzleSolver), title: 'Problema · Chess to GM' },
  { path: 'aperturas', loadComponent: () => import('./features/openings/openings').then((m) => m.Openings), title: 'Aperturas · Chess to GM' },
  { path: 'aperturas/:id', loadComponent: () => import('./features/opening-trainer/opening-trainer').then((m) => m.OpeningTrainer), title: 'Entrenar apertura · Chess to GM' },
  { path: 'modos', loadComponent: () => import('./features/modes/modes').then((m) => m.Modes), title: 'Modos · Chess to GM' },
  { path: 'reina', loadComponent: () => import('./features/queen/queen').then((m) => m.Queen), title: 'La Reina · Chess to GM' },
  { path: 'tableros', loadComponent: () => import('./features/themes/themes').then((m) => m.Themes), title: 'Tableros · Chess to GM' },
  { path: 'perfil', loadComponent: () => import('./features/profile/profile').then((m) => m.ProfilePage), title: 'Perfil · Chess to GM' },
  { path: '**', redirectTo: '' },
];
