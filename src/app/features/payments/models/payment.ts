export type PaymentMode =
  | 'cash'
  | 'upi';

export interface PaymentStudent {
  id: string;
  student_name: string;
  class_name: string;
  monthly_fee: number;
  payment_due_day: number | null;
}

export interface Payment {
  id: string;
  owner_id: string;
  student_id: string;

  amount: number;
  payment_mode: PaymentMode;

  payment_date: string;

  fee_month: number;
  fee_year: number;

  proof_image_path: string | null;

  reference_number: string | null;
  remarks: string | null;

  is_reversed: boolean;
  reversed_at: string | null;
  reversal_reason: string | null;

  created_at: string;
  updated_at: string;

  students?: PaymentStudent | null;

  proof_image_url?: string | null;
}

export interface PaymentFormValue {
  student_id: string;

  amount: number;

  payment_mode: PaymentMode;

  payment_date: string;

  fee_month: number;
  fee_year: number;

  reference_number: string | null;
  remarks: string | null;
}

export interface StudentFeeStatus {
  student_id: string;
  student_name: string;
  class_name: string;

  monthly_fee: number;

  paid_amount: number;
  pending_amount: number;

  payment_due_day: number | null;

  status:
    | 'paid'
    | 'partial'
    | 'pending';
}

export interface MonthlyPaymentSummary {
  month: number;
  year: number;

  expectedAmount: number;
  collectedAmount: number;
  pendingAmount: number;

  paidStudents: number;
  partiallyPaidStudents: number;
  pendingStudents: number;
  totalStudents: number;
}

export interface PaymentModeSummary {
  upiAmount: number;
  cashAmount: number;

  upiCount: number;
  cashCount: number;
}