import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { PaymentService } from '../services/payment';
import { MonthlyPaymentSummary, PaymentModeSummary, StudentFeeStatus } from '../models/payment';

@Component({
  selector: 'app-monthly-report',
  standalone: true,
  imports: [
    CurrencyPipe,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './monthly-report.html',
  styleUrl: './monthly-report.scss',
})
export class MonthlyReport implements OnInit {
  private readonly paymentService = inject(PaymentService);

  readonly loading = signal(true);

  readonly errorMessage = signal('');

  readonly summary = signal<MonthlyPaymentSummary | null>(
      null
    );

  readonly modeSummary = signal<PaymentModeSummary | null>(
      null
    );

  readonly students =  signal<StudentFeeStatus[]>([]);

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

  readonly collectionRate = computed(() => {
    const summary = this.summary();

    if (
      !summary ||
      summary.expectedAmount <= 0
    ) {
      return 0;
    }

    return Math.min(
      100,
      Math.round(
        (
          summary.collectedAmount /
          summary.expectedAmount
        ) * 100
      )
    );
  });

  readonly paymentTotal = computed(() => {
    const mode = this.modeSummary();

    if (!mode) {
      return 0;
    }

    return (
      mode.upiAmount +
      mode.cashAmount
    );
  });

  ngOnInit(): void {
    void this.loadReport();
  }

  async periodChanged(): Promise<void> {
    await this.loadReport();
  }

  monthName(): string {
    return (
      this.months.find(
        (month) =>
          month.value === this.selectedMonth
      )?.label ?? ''
    );
  }

  statusLabel(
    status: StudentFeeStatus['status']
  ): string {
    switch (status) {
      case 'paid':
        return 'Paid';

      case 'partial':
        return 'Partial';

      default:
        return 'Pending';
    }
  }

  private async loadReport(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const [
        summary,
        modeSummary,
        students,
      ] = await Promise.all([
        this.paymentService.getMonthlySummary(
          this.selectedMonth,
          this.selectedYear
        ),

        this.paymentService.getPaymentModeSummary(
          this.selectedMonth,
          this.selectedYear
        ),

        this.paymentService.getStudentFeeStatuses(
          this.selectedMonth,
          this.selectedYear
        ),
      ]);

      this.summary.set(summary);

      this.modeSummary.set(
        modeSummary
      );

      this.students.set(
        [...students].sort((a, b) => {
          const order = {
            pending: 0,
            partial: 1,
            paid: 2,
          };

          const difference =
            order[a.status] -
            order[b.status];

          if (difference !== 0) {
            return difference;
          }

          return a.student_name.localeCompare(
            b.student_name
          );
        })
      );
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : 'Unable to load monthly report.'
      );
    } finally {
      this.loading.set(false);
    }
  }
}
