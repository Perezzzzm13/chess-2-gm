import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ProfileService } from '../../core/services/profile.service';
import { IconName } from '../../data/icons';
import { Icon } from '../../shared/components/icon/icon';
import { RankEmblem } from '../../shared/components/rank-emblem/rank-emblem';

interface NavLink {
  path: string;
  label: string;
  icon: IconName;
}

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, RankEmblem, Icon],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  readonly profile = inject(ProfileService);

  /** El menú se reparte a ambos lados del letrero. */
  readonly left: NavLink[] = [
    { path: '/bots', label: 'Jugar', icon: 'swords' },
    { path: '/problemas', label: 'Problemas', icon: 'puzzle' },
    { path: '/aperturas', label: 'Aperturas', icon: 'book' },
  ];
  readonly right: NavLink[] = [
    { path: '/modos', label: 'Modos', icon: 'dice' },
    { path: '/amigos', label: 'Amigos', icon: 'friends' },
    { path: '/tableros', label: 'Tableros', icon: 'palette' },
  ];
}
