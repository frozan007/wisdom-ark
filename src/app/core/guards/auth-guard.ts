import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = async (route, state) => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);

  try {
    const {
      data: { session },
      error,
    } = await supabaseService.getSession();

    if (error || !session) {
      return router.createUrlTree(['/login']);
    }

    return true;
  } catch {
    return router.createUrlTree(['/login']);
  }
};
