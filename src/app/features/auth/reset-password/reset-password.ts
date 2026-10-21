import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPassword {
  private readonly formBuilder = inject(FormBuilder);

  private readonly supabaseService = inject(SupabaseService);

  private readonly router = inject(Router);

  readonly loading = signal(false);

  readonly errorMessage = signal('');

  readonly successMessage = signal('');

  readonly form =
    this.formBuilder.nonNullable.group({
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
        ],
      ],

      confirmPassword: [
        '',
        Validators.required,
      ],
    });

  async submit(): Promise<void> {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const {
      password,
      confirmPassword,
    } = this.form.getRawValue();

    if (
      password !==
      confirmPassword
    ) {
      this.errorMessage.set(
        'Passwords do not match.'
      );

      return;
    }

    this.loading.set(true);

    try {
      const { error } =
        await this.supabaseService
          .updatePassword(password);

      if (error) {
        throw error;
      }

      this.successMessage.set(
        'Password updated successfully.'
      );

      /*
       * Give the user a moment to see
       * the success state.
       */
      setTimeout(() => {
        void this.router.navigate([
          '/login',
        ]);
      }, 1500);

    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : 'Unable to update password.'
      );
    } finally {
      this.loading.set(false);
    }
  }
}
