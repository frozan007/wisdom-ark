export type ScheduleStatus =
  | 'scheduled'
  | 'completed'
  | 'cancelled';

export type ScheduleClassType =
  | 'individual'
  | 'group'
  | 'online';

export interface ScheduleStudent {
  id: string;
  student_name: string;
  class_name: string;
  primary_phone: string;
}

export interface Schedule {
  id: string;
  owner_id: string;

  student_id: string | null;
  title: string;
  subject: string | null;

  class_date: string;
  start_time: string;
  end_time: string;

  class_type: ScheduleClassType;
  status: ScheduleStatus;

  location: string | null;
  description: string | null;

  created_at: string;
  updated_at: string;

  students?: ScheduleStudent | null;
}

export interface ScheduleFormValue {
  student_id: string | null;
  title: string;
  subject: string | null;

  class_date: string;
  start_time: string;
  end_time: string;

  class_type: ScheduleClassType;
  status: ScheduleStatus;

  location: string | null;
  description: string | null;
}