import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase';
import { MonthlyPaymentSummary, Payment, PaymentFormValue, PaymentModeSummary, StudentFeeStatus } from '../models/payment';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private readonly supabaseService =
    inject(SupabaseService);

  private readonly tableName = 'payments';
  private readonly bucketName = 'payment-proofs';

  async getPayments(
    month?: number,
    year?: number
  ): Promise<Payment[]> {
    let query = this.supabaseService.client
      .from(this.tableName)
      .select(`
        *,
        students (
          id,
          student_name,
          class_name,
          monthly_fee,
          payment_due_day
        )
      `);

    query = query.eq('is_reversed', false);

    if (month !== undefined) {
      query = query.eq('fee_month', month);
    }

    if (year !== undefined) {
      query = query.eq('fee_year', year);
    }

    const { data, error } = await query
      .order('payment_date', {
        ascending: false,
      })
      .order('created_at', {
        ascending: false,
      });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as Payment[];
  }

  async createPayment(
    value: PaymentFormValue,
    proofFile?: File | null
  ): Promise<Payment> {
    const {
      data: { user },
      error: userError,
    } = await this.supabaseService.getUser();

    if (userError || !user) {
      throw new Error('You must be logged in.');
    }

    const { data, error } =
      await this.supabaseService.client
        .from(this.tableName)
        .insert({
          owner_id: user.id,

          student_id: value.student_id,

          amount: value.amount,

          payment_mode: value.payment_mode,

          payment_date: value.payment_date,

          fee_month: value.fee_month,
          fee_year: value.fee_year,

          reference_number:
            value.reference_number?.trim() || null,

          remarks:
            value.remarks?.trim() || null,
        })
        .select('*')
        .single();

    if (error) {
      throw new Error(error.message);
    }

    const payment = data as Payment;

    if (proofFile) {
      try {
        const path =
          await this.uploadPaymentProof(
            user.id,
            value.student_id,
            payment.id,
            proofFile
          );

        const { data: updated, error: updateError } =
          await this.supabaseService.client
            .from(this.tableName)
            .update({
              proof_image_path: path,
            })
            .eq('id', payment.id)
            .select('*')
            .single();

        if (updateError) {
          throw new Error(updateError.message);
        }

        return updated as Payment;
      } catch (error) {
        // Avoid leaving a payment record behind when
        // proof upload was part of the transaction.
        await this.supabaseService.client
          .from(this.tableName)
          .delete()
          .eq('id', payment.id);

        throw error;
      }
    }

    return payment;
  }

  async deletePayment(payment: Payment): Promise<void> {
    if (payment.proof_image_path) {
      const { error: storageError } =
        await this.supabaseService.client.storage
          .from(this.bucketName)
          .remove([
            payment.proof_image_path,
          ]);

      if (storageError) {
        throw new Error(storageError.message);
      }
    }

    const { error } =
      await this.supabaseService.client
        .from(this.tableName)
        .delete()
        .eq('id', payment.id);

    if (error) {
      throw new Error(error.message);
    }
  }

  async getProofUrl(
    path: string
  ): Promise<string> {
    const { data, error } =
      await this.supabaseService.client.storage
        .from(this.bucketName)
        .createSignedUrl(
          path,
          60 * 10
        );

    if (error) {
      throw new Error(error.message);
    }

    return data.signedUrl;
  }

  async getStudentFeeStatuses(
    month: number,
    year: number
  ): Promise<StudentFeeStatus[]> {
    const [students, payments] =
      await Promise.all([
        this.getFeeEligibleStudents(
          month,
          year
        ),
        this.getPayments(month, year),
      ]);

    return students.map((student) => {
      const studentPayments =
        payments.filter(
          (payment) =>
            payment.student_id === student.id
        );

      const paidAmount =
        studentPayments.reduce(
          (total, payment) =>
            total + Number(payment.amount),
          0
        );

      const monthlyFee =
        Number(student.monthly_fee);

      const pendingAmount =
        Math.max(
          monthlyFee - paidAmount,
          0
        );

      let status:
        | 'paid'
        | 'partial'
        | 'pending';

      if (
        monthlyFee === 0 ||
        paidAmount >= monthlyFee
      ) {
        status = 'paid';
      } else if (paidAmount > 0) {
        status = 'partial';
      } else {
        status = 'pending';
      }

      return {
        student_id: student.id,
        student_name: student.student_name,
        class_name: student.class_name,

        monthly_fee: monthlyFee,

        paid_amount: paidAmount,
        pending_amount: pendingAmount,

        payment_due_day:
          student.payment_due_day,

        status,
      };
    });
  }

  async getMonthlySummary(
    month: number,
    year: number
  ): Promise<MonthlyPaymentSummary> {
    const statuses =
      await this.getStudentFeeStatuses(
        month,
        year
      );

    const expectedAmount =
      statuses.reduce(
        (total, student) =>
          total + student.monthly_fee,
        0
      );

    const collectedAmount =
      statuses.reduce(
        (total, student) =>
          total + student.paid_amount,
        0
      );

    return {
      month,
      year,

      expectedAmount,

      collectedAmount,

      pendingAmount: statuses.reduce(
        (total, student) =>
          total + student.pending_amount,
        0
      ),

      paidStudents:
        statuses.filter(
          (student) =>
            student.status === 'paid'
        ).length,

      partiallyPaidStudents:
        statuses.filter(
          (student) =>
            student.status === 'partial'
        ).length,

      pendingStudents:
        statuses.filter(
          (student) =>
            student.status === 'pending'
        ).length,

      totalStudents: statuses.length,
    };
  }

  private async getActiveStudents(): Promise<any[]> {
    const { data, error } =
      await this.supabaseService.client
        .from('students')
        .select(`
          id,
          student_name,
          class_name,
          monthly_fee,
          payment_due_day
        `)
        .eq('status', 'active')
        .order('student_name');

    if (error) {
      throw new Error(error.message);
    }

    return data ?? [];
  }

  private async uploadPaymentProof(
    ownerId: string,
    studentId: string,
    paymentId: string,
    file: File
  ): Promise<string> {
    const extension =
      file.name
        .split('.')
        .pop()
        ?.toLowerCase() || 'jpg';

    const path =
      `${ownerId}/${studentId}/` +
      `${paymentId}/proof.${extension}`;

    const { error } =
      await this.supabaseService.client.storage
        .from(this.bucketName)
        .upload(
          path,
          file,
          {
            upsert: false,
            contentType: file.type,
          }
        );

    if (error) {
      throw new Error(error.message);
    }

    return path;
  }

  private async getFeeEligibleStudents(
    month: number,
    year: number
  ): Promise<any[]> {
    const { data, error } =
      await this.supabaseService.client
        .from('students')
        .select(`
        id,
        student_name,
        class_name,
        monthly_fee,
        payment_due_day,
        joining_date,
        status,
        archived_at
      `)
        .order('student_name');

    if (error) {
      throw new Error(error.message);
    }

    const targetMonthIndex = year * 12 + (month - 1);

    return (data ?? []).filter((student) => {
      const joiningDate = new Date(
        `${student.joining_date}T00:00:00`
      );

      const joiningMonthIndex =
        joiningDate.getFullYear() * 12 +
        joiningDate.getMonth();

      if (joiningMonthIndex > targetMonthIndex) {
        return false;
      }

      if (
        student.status === 'archived' &&
        student.archived_at
      ) {
        const archivedDate = new Date(student.archived_at);

        const archivedMonthIndex =
          archivedDate.getFullYear() * 12 +
          archivedDate.getMonth();

        if (archivedMonthIndex < targetMonthIndex) {
          return false;
        }
      }

      return true;
    });
  }

  async getStudentFeeStatus(
    studentId: string,
    month: number,
    year: number
  ): Promise<StudentFeeStatus | null> {
    const statuses =
      await this.getStudentFeeStatuses(
        month,
        year
      );

    return (
      statuses.find(
        (status) =>
          status.student_id === studentId
      ) ?? null
    );
  }

  async getRecentPayments(
    limit = 8
  ): Promise<Payment[]> {
    const { data, error } =
      await this.supabaseService.client
        .from(this.tableName)
        .select(`
        *,
        students (
          id,
          student_name,
          class_name,
          monthly_fee,
          payment_due_day
        )
      `)
        .eq('is_reversed', false)
        .order('payment_date', {
          ascending: false,
        })
        .order('created_at', {
          ascending: false,
        })
        .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as Payment[];
  }

  async getCurrentMonthSummary(): Promise<MonthlyPaymentSummary> {
    const now = new Date();

    return this.getMonthlySummary(
      now.getMonth() + 1,
      now.getFullYear()
    );
  }

  async getPaymentModeSummary(
    month: number,
    year: number
  ): Promise<PaymentModeSummary> {
    const payments =
      await this.getPayments(month, year);

    let upiAmount = 0;
    let cashAmount = 0;

    let upiCount = 0;
    let cashCount = 0;

    for (const payment of payments) {
      const amount = Number(payment.amount);

      if (payment.payment_mode === 'upi') {
        upiAmount += amount;
        upiCount++;
      }

      if (payment.payment_mode === 'cash') {
        cashAmount += amount;
        cashCount++;
      }
    }

    return {
      upiAmount,
      cashAmount,
      upiCount,
      cashCount,
    };
  }

  async getPaymentHistory(): Promise<Payment[]> {
    const { data, error } =
      await this.supabaseService.client
        .from(this.tableName)
        .select(`
        *,
        students (
          id,
          student_name,
          class_name,
          monthly_fee,
          payment_due_day
        )
      `)
        .order('payment_date', {
          ascending: false,
        })
        .order('created_at', {
          ascending: false,
        });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as Payment[];
  }

  async reversePayment(
    paymentId: string,
    reason: string
  ): Promise<void> {
    const cleanReason = reason.trim();

    if (cleanReason.length < 3) {
      throw new Error(
        'Please enter a valid reversal reason.'
      );
    }

    const { error } =
      await this.supabaseService.client
        .from(this.tableName)
        .update({
          is_reversed: true,
          reversed_at:
            new Date().toISOString(),

          reversal_reason:
            cleanReason,
        })
        .eq('id', paymentId)
        .eq('is_reversed', false);

    if (error) {
      throw new Error(error.message);
    }
  }
}
