export interface MonthlyCollectionPoint {
  month: number;
  year: number;
  label: string;

  expected: number;
  collected: number;
  pending: number;
}

export interface ReportsSummary {
  month: number;
  year: number;

  activeStudents: number;

  expectedFees: number;
  collectedFees: number;
  pendingFees: number;

  paidStudents: number;
  partiallyPaidStudents: number;
  pendingStudents: number;

  collectionRate: number;
}

export interface PendingPaymentReportRow {
  studentId: string;
  studentName: string;
  className: string;

  monthlyFee: number;
  paidAmount: number;
  pendingAmount: number;

  paymentDueDay: number | null;

  status:
    | 'pending'
    | 'partial';
}