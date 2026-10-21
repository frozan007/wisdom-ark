import { inject, Injectable } from '@angular/core';
import { MonthlyCollectionPoint, PendingPaymentReportRow, ReportsSummary } from '../models/report';
import { PaymentService } from '../../payments/services/payment';
import { StudentService } from '../../students/services/student';

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  private readonly paymentService =
    inject(PaymentService);

  private readonly studentService =
    inject(StudentService);

  async getSummary(
    month: number,
    year: number
  ): Promise<ReportsSummary> {
    const [
      paymentSummary,
      activeStudentCount,
    ] = await Promise.all([
      this.paymentService
        .getMonthlySummary(
          month,
          year
        ),

      this.studentService
        .getActiveStudentCount(),
    ]);

    const collectionRate =
      paymentSummary.expectedAmount > 0
        ? Math.min(
            100,
            Math.round(
              (
                paymentSummary.collectedAmount /
                paymentSummary.expectedAmount
              ) * 100
            )
          )
        : 0;

    return {
      month,
      year,

      activeStudents:
        activeStudentCount,

      expectedFees:
        paymentSummary.expectedAmount,

      collectedFees:
        paymentSummary.collectedAmount,

      pendingFees:
        paymentSummary.pendingAmount,

      paidStudents:
        paymentSummary.paidStudents,

      partiallyPaidStudents:
        paymentSummary
          .partiallyPaidStudents,

      pendingStudents:
        paymentSummary.pendingStudents,

      collectionRate,
    };
  }

  async getPendingPayments(
    month: number,
    year: number
  ): Promise<PendingPaymentReportRow[]> {
    const statuses =
      await this.paymentService
        .getStudentFeeStatuses(
          month,
          year
        );

    return statuses
      .filter(
        (student) =>
          student.status === 'pending' ||
          student.status === 'partial'
      )
      .map((student) => ({
        studentId:
          student.student_id,

        studentName:
          student.student_name,

        className:
          student.class_name,

        monthlyFee:
          student.monthly_fee,

        paidAmount:
          student.paid_amount,

        pendingAmount:
          student.pending_amount,

        paymentDueDay:
          student.payment_due_day,

        status:
          student.status as
            | 'pending'
            | 'partial',
      }))
      .sort(
        (a, b) =>
          b.pendingAmount -
          a.pendingAmount
      );
  }

  async getCollectionTrend(
    endMonth: number,
    endYear: number,
    months = 6
  ): Promise<MonthlyCollectionPoint[]> {
    const periods:
      {
        month: number;
        year: number;
      }[] = [];

    let month = endMonth;
    let year = endYear;

    for (
      let index = 0;
      index < months;
      index++
    ) {
      periods.unshift({
        month,
        year,
      });

      month--;

      if (month === 0) {
        month = 12;
        year--;
      }
    }

    const summaries =
      await Promise.all(
        periods.map((period) =>
          this.paymentService
            .getMonthlySummary(
              period.month,
              period.year
            )
        )
      );

    return summaries.map(
      (summary) => ({
        month: summary.month,
        year: summary.year,

        label:
          this.formatMonthLabel(
            summary.month,
            summary.year
          ),

        expected:
          summary.expectedAmount,

        collected:
          summary.collectedAmount,

        pending:
          summary.pendingAmount,
      })
    );
  }

  private formatMonthLabel(
    month: number,
    year: number
  ): string {
    const date =
      new Date(
        year,
        month - 1,
        1
      );

    return new Intl.DateTimeFormat(
      'en-IN',
      {
        month: 'short',
        year: '2-digit',
      }
    ).format(date);
  }
}
