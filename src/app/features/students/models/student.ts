export type StudentStatus = 'active' | 'inactive' | 'archived';

export type StudentGender =
  | 'male'
  | 'female'
  | 'other'
  | 'prefer_not_to_say';

export interface Student {
  id: string;
  owner_id: string;

  student_name: string;
  profile_image_path: string | null;
  profile_image_url?: string | null;

  date_of_birth: string | null;
  gender: StudentGender | null;

  school_name: string | null;
  class_name: string;
  subjects: string[];

  parent_name: string;
  primary_phone: string;
  alternative_phone: string | null;
  email: string | null;
  address: string | null;

  joining_date: string;
  monthly_fee: number;
  payment_due_day: number | null;

  status: StudentStatus;
  notes: string | null;

  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentFormValue {
  student_name: string;
  date_of_birth: string | null;
  gender: StudentGender | null;

  school_name: string | null;
  class_name: string;
  subjects: string[];

  parent_name: string;
  primary_phone: string;
  alternative_phone: string | null;
  email: string | null;
  address: string | null;

  joining_date: string;
  monthly_fee: number;
  payment_due_day: number | null;

  status: Exclude<StudentStatus, 'archived'>;
  notes: string | null;
}