import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
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
    // On the phone the native splash stays up until the session check is
    // done, so no extra delay is added. In the browser this page is the only
    // splash, so it is kept on screen briefly to avoid a flash.
    const isNative = Capacitor.isNativePlatform();
    const minimumDelay = new Promise((resolve) =>
      setTimeout(resolve, isNative ? 0 : 800)
    );

    let hasSession = false;

    try {
      const [
        {
          data: { session },
        },
      ] = await Promise.all([
        this.supabaseService.getSession(),
        minimumDelay,
      ]);

      hasSession = !!session;
    } catch (error) {
      console.error('Unable to check session:', error);
    }

    await this.router.navigate(
      [hasSession ? '/app/dashboard' : '/login'],
      { replaceUrl: true }
    );

    if (isNative) {
      await SplashScreen.hide();
    }
  }
}
