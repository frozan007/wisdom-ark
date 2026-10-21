import { CurrencyPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StudentService } from '../../students/services/student';
import { PaymentService } from '../services/payment';
import { Student } from '../../students/models/student';
import { PaymentFormValue, PaymentMode, StudentFeeStatus } from '../models/payment';

@Component({
  selector: 'app-payment-form',
  standalone: true,
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './payment-form.html',
  styleUrl: './payment-form.scss',
})
export class PaymentForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);

  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  private readonly studentService = inject(StudentService);

  private readonly paymentService = inject(PaymentService);

  readonly students = signal<Student[]>([]);
  readonly feeStatus = signal<StudentFeeStatus | null>(null);

  readonly loading = signal(false);
  readonly loadingData = signal(true);

  readonly errorMessage = signal('');

  readonly proofPreview =
    signal<string | null>(null);

  private selectedProofFile:
    File | null = null;

  readonly months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  readonly years = Array.from(
    { length: 8 },
    (_, index) =>
      new Date().getFullYear() - 3 + index
  );

  readonly today =
    this.toDateKey(new Date());

  readonly paymentForm =
    this.formBuilder.nonNullable.group({
      student_id: [
        '',
        Validators.required,
      ],

      fee_month: [
        new Date().getMonth() + 1,
        [
          Validators.required,
          Validators.min(1),
          Validators.max(12),
        ],
      ],

      fee_year: [
        new Date().getFullYear(),
        Validators.required,
      ],

      amount: [
        0,
        [
          Validators.required,
          Validators.min(1),
        ],
      ],

      payment_mode: [
        'upi',
        Validators.required,
      ],

      payment_date: [
        this.today,
        Validators.required,
      ],

      reference_number: [''],

      remarks: [
        '',
        Validators.maxLength(1000),
      ],
    });

  ngOnInit(): void {
    void this.initialize();
  }

  async studentChanged(): Promise<void> {
    await this.loadFeeStatus();
  }

  async periodChanged(): Promise<void> {
    await this.loadFeeStatus();
  }

  paymentModeChanged(): void {
    this.errorMessage.set('');

    if (
      this.paymentForm.controls
        .payment_mode.value === 'cash'
    ) {
      this.selectedProofFile = null;
      this.proofPreview.set(null);
    }
  }

  onProofSelected(event: Event): void {
    this.errorMessage.set('');

    const input =
      event.target as HTMLInputElement;

    const file =
      input.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (!allowedTypes.includes(file.type)) {
      this.errorMessage.set(
        'Payment proof must be a JPEG, PNG or WebP image.'
      );

      input.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage.set(
        'Payment proof must not exceed 5 MB.'
      );

      input.value = '';
      return;
    }

    this.selectedProofFile = file;

    const reader = new FileReader();

    reader.onload = () =>
      this.proofPreview.set(
        reader.result as string
      );

    reader.readAsDataURL(file);
  }

  removeProof(
    fileInput: HTMLInputElement
  ): void {
    this.selectedProofFile = null;
    this.proofPreview.set(null);
    fileInput.value = '';
  }

  async submit(): Promise<void> {
    this.errorMessage.set('');

    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    const raw =
      this.paymentForm.getRawValue();

    if (
      raw.payment_mode === 'upi' &&
      !this.selectedProofFile
    ) {
      this.errorMessage.set(
        'Please upload the UPI payment screenshot.'
      );
      return;
    }

    const currentStatus =
      this.feeStatus();

    if (
      currentStatus &&
      Number(raw.amount) >
        currentStatus.pending_amount
    ) {
      const confirmed =
        window.confirm(
          'The payment amount is greater than the pending fee. Do you want to continue?'
        );

      if (!confirmed) {
        return;
      }
    }

    this.loading.set(true);

    try {
      const value: PaymentFormValue = {
        student_id: raw.student_id,

        amount: Number(raw.amount),

        payment_mode:
          raw.payment_mode as PaymentMode,

        payment_date:
          raw.payment_date,

        fee_month:
          Number(raw.fee_month),

        fee_year:
          Number(raw.fee_year),

        reference_number:
          raw.reference_number || null,

        remarks:
          raw.remarks || null,
      };

      await this.paymentService.createPayment(
        value,
        this.selectedProofFile
      );

      await this.router.navigate([
        '/app/payments',
      ]);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : 'Unable to save payment.'
      );
    } finally {
      this.loading.set(false);
    }
  }

  private async initialize(): Promise<void> {
    this.loadingData.set(true);

    try {
      const students =
        await this.studentService
          .getActiveStudentsForSelection();

      this.students.set(students);

      const params =
        this.route.snapshot.queryParamMap;

      const studentId =
        params.get('student');

      const month =
        Number(params.get('month'));

      const year =
        Number(params.get('year'));

      if (studentId) {
        this.paymentForm.controls
          .student_id
          .setValue(studentId);
      }

      if (
        month >= 1 &&
        month <= 12
      ) {
        this.paymentForm.controls
          .fee_month
          .setValue(month);
      }

      if (year > 0) {
        this.paymentForm.controls
          .fee_year
          .setValue(year);
      }

      await this.loadFeeStatus();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : 'Unable to load payment form.'
      );
    } finally {
      this.loadingData.set(false);
    }
  }

  private async loadFeeStatus():
    Promise<void> {
    const studentId =
      this.paymentForm.controls
        .student_id.value;

    if (!studentId) {
      this.feeStatus.set(null);
      return;
    }

    const month =
      Number(
        this.paymentForm.controls
          .fee_month.value
      );

    const year =
      Number(
        this.paymentForm.controls
          .fee_year.value
      );

    const status =
      await this.paymentService
        .getStudentFeeStatus(
          studentId,
          month,
          year
        );

    this.feeStatus.set(status);

    if (
      status &&
      status.pending_amount > 0
    ) {
      this.paymentForm.controls
        .amount
        .setValue(
          status.pending_amount
        );
    }
  }

  private toDateKey(
    date: Date
  ): string {
    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() + 1
      ).padStart(2, '0');

    const day =
      String(
        date.getDate()
      ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
