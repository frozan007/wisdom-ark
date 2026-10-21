import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase';

@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [],
  templateUrl: './splash.html',
  styleUrl: './splash.scss',
})
export class Splash implements OnInit {
  private readonly router = inject(Router);
  private readonly supabaseService = inject(SupabaseService);

  async ngOnInit(): Promise<void> {
    const minimumDelay = new Promise((resolve) => setTimeout(resolve, 1600));

    const [
      {
        data: { session },
      },
    ] = await Promise.all([
      this.supabaseService.getSession(),
      minimumDelay,
    ]);

    await this.router.navigate([
      session ? '/app/dashboard' : '/login',
    ]);
  }
}
