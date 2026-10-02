import { Component, computed, input } from '@angular/core';
import { Classification } from '../../../core/models/classification.models';
import { CLASSIFICATIONS } from '../../../core/chess/classification';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-class-badge',
  imports: [Icon],
  templateUrl: './class-badge.html',
  styleUrl: './class-badge.scss',
})
export class ClassBadge {
  readonly classification = input.required<Classification>();
  readonly showLabel = input(false);
  readonly size = input<'sm' | 'md' | 'lg'>('sm');

  readonly info = computed(() => CLASSIFICATIONS[this.classification()]);
}
