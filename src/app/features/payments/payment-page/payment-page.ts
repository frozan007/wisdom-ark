import { CurrencyPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { PaymentService } from '../services/payment';
import { MonthlyPaymentSummary, Payment, StudentFeeStatus } from '../models/payment';

type PaymentTab =
  | 'pending'
  | 'paid'
  | 'history';

@Component({
  selector: 'app-payment-page',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    TitleCasePipe,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './payment-page.html',
  styleUrl: './payment-page.scss',
})
export class PaymentPage implements OnInit {
  private readonly paymentService = inject(PaymentService);

  readonly loading = signal(true);
  readonly errorMessage = signal('');

  readonly summary =
    signal<MonthlyPaymentSummary | null>(
      null
    );

  readonly feeStatuses =
    signal<StudentFeeStatus[]>([]);

  readonly payments =
    signal<Payment[]>([]);

  readonly activeTab =
    signal<PaymentTab>('pending');

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

  selectedMonth =
    new Date().getMonth() + 1;

  selectedYear =
    new Date().getFullYear();

  ngOnInit(): void {
    void this.loadPaymentData();
  }

  async monthChanged(): Promise<void> {
    await this.loadPaymentData();
  }

  showPending(): void {
    this.activeTab.set('pending');
  }

  showPaid(): void {
    this.activeTab.set('paid');
  }

  showHistory(): void {
    this.activeTab.set('history');
  }

  pendingStudents(): StudentFeeStatus[] {
    return this.feeStatuses().filter(
      (student) =>
        student.status === 'pending' ||
        student.status === 'partial'
    );
  }

  paidStudents(): StudentFeeStatus[] {
    return this.feeStatuses().filter(
      (student) =>
        student.status === 'paid'
    );
  }

  monthName(): string {
    return (
      this.months.find(
        (month) =>
          month.value === this.selectedMonth
      )?.label ?? ''
    );
  }

  async viewProof(
    payment: Payment
  ): Promise<void> {
    if (!payment.proof_image_path) {
      return;
    }

    try {
      const url =
        await this.paymentService.getProofUrl(
          payment.proof_image_path
        );

      window.open(
        url,
        '_blank',
        'noopener,noreferrer'
      );
    } catch (error) {
      this.setError(error);
    }
  }

  private async loadPaymentData(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const [
        summary,
        statuses,
        payments,
      ] = await Promise.all([
        this.paymentService.getMonthlySummary(
          this.selectedMonth,
          this.selectedYear
        ),

        this.paymentService.getStudentFeeStatuses(
          this.selectedMonth,
          this.selectedYear
        ),

        this.paymentService.getPayments(
          this.selectedMonth,
          this.selectedYear
        ),
      ]);

      this.summary.set(summary);
      this.feeStatuses.set(statuses);
      this.payments.set(payments);
    } catch (error) {
      this.setError(error);
    } finally {
      this.loading.set(false);
    }
  }

  private setError(error: unknown): void {
    this.errorMessage.set(
      error instanceof Error
        ? error.message
        : 'Unable to load payments.'
    );
  }
}
