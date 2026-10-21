import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase';

@Component({
  selector: 'app-signup',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './signup.html',
  styleUrl: './signup.scss',
})
export class Signup {
  private readonly formBuilder = inject(FormBuilder);

  private readonly supabaseService = inject(SupabaseService);

  private readonly router = inject(Router);

  readonly loading = signal(false);

  readonly errorMessage = signal('');

  readonly successMessage = signal('');

  readonly showPassword = signal(false);

  readonly showConfirmPassword = signal(false);

  readonly form =
    this.formBuilder.nonNullable.group({
      full_name: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(100),
        ],
      ],

      email: [
        '',
        [
          Validators.required,
          Validators.email,
        ],
      ],

      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
        ],
      ],

      confirm_password: [
        '',
        Validators.required,
      ],
    });

  async signup(): Promise<void> {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value =
      this.form.getRawValue();

    if (
      value.password !==
      value.confirm_password
    ) {
      this.errorMessage.set(
        'Passwords do not match.'
      );

      return;
    }

    this.loading.set(true);

    try {
      const {
        data,
        error,
      } =
        await this.supabaseService.signUp(
          value.email,
          value.password,
          value.full_name
        );

      if (error) {
        throw error;
      }

      /*
       * If email confirmation is enabled,
       * Supabase normally creates the user
       * but does not create an active session.
       */
      if (!data.session) {
        this.successMessage.set(
          'Account created. Please check your email and verify your account before logging in.'
        );

        this.form.reset({
          full_name: '',
          email: '',
          password: '',
          confirm_password: '',
        });

        return;
      }

      await this.router.navigate([
        '/app/dashboard',
      ]);

    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : 'Unable to create account.'
      );
    } finally {
      this.loading.set(false);
    }
  }

  togglePassword(): void {
    this.showPassword.update(
      value => !value
    );
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword.update(
      value => !value
    );
  }
}
