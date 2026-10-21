import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  AuthChangeEvent,
  createClient,
  Session,
  SupabaseClient,
} from '@supabase/supabase-js';

import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private readonly supabaseClient: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabasePublishableKey
  );

  get client(): SupabaseClient {
    return this.supabaseClient;
  }

  getSession() {
    return this.supabaseClient.auth.getSession();
  }

  getUser() {
    return this.supabaseClient.auth.getUser();
  }

  setSession(
    accessToken: string,
    refreshToken: string
  ) {
    return this.supabaseClient.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }

  signIn(email: string, password: string) {
    return this.supabaseClient.auth.signInWithPassword({
      email,
      password,
    });
  }

  async signUp(
    email: string,
    password: string,
    fullName: string
  ) {
    return this.client.auth.signUp({
      email: email.trim(),
      password,

      options: {
        data: {
          full_name: fullName.trim(),
        },
      },
    });
  }

  signOut() {
    return this.supabaseClient.auth.signOut();
  }

  onAuthStateChange(
    callback: (event: AuthChangeEvent, session: Session | null) => void
  ) {
    return this.supabaseClient.auth.onAuthStateChange(callback);
  }

  async sendPasswordReset(
    email: string
  ) {
    const redirectTo =
      Capacitor.isNativePlatform()
        ? 'wisdomark://reset-password'
        : `${window.location.origin}/reset-password`;

    return this.client.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo,
      }
    );
  }

  async updatePassword(
    password: string
  ) {
    return this.client.auth.updateUser({
      password,
    });
  }
}