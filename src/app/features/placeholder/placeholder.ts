import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-placeholder',
  imports: [],
  templateUrl: './placeholder.html',
  styleUrl: './placeholder.scss',
})
export class Placeholder {
  private readonly route = inject(ActivatedRoute);

  readonly title =
    this.route.snapshot.data['title'] ?? 'Coming soon';

  readonly message =
    this.route.snapshot.data['message'] ??
    'This feature is under development.';
}
