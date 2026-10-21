export type NoteType =
  | 'general'
  | 'student_note'
  | 'class_note'
  | 'homework'
  | 'follow_up';

export type NoteStatus =
  | 'pending'
  | 'completed';

export interface NoteStudent {
  id: string;
  student_name: string;
  class_name: string;
}

export interface NoteSchedule {
  id: string;
  title: string;
  subject: string | null;
  class_date: string;
  start_time: string;
}

export interface Note {
  id: string;

  owner_id: string;

  student_id: string | null;
  schedule_id: string | null;

  note_type: NoteType;

  title: string;
  content: string | null;

  due_date: string | null;

  status: NoteStatus;

  completed_at: string | null;

  created_at: string;
  updated_at: string;

  students?: NoteStudent | null;

  schedules?: NoteSchedule | null;
}

export interface NoteFormValue {
  student_id: string | null;
  schedule_id: string | null;

  note_type: NoteType;

  title: string;
  content: string | null;

  due_date: string | null;

  status: NoteStatus;
}