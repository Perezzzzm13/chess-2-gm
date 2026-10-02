import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './layout/header/header';
import { RewardsOverlay } from './shared/components/rewards-overlay/rewards-overlay';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, RewardsOverlay],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
