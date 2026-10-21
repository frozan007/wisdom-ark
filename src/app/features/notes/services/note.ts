import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase';
import { Note, NoteFormValue, NoteStatus, NoteType } from '../models/note';

@Injectable({
  providedIn: 'root',
})
export class NoteService {
  private readonly supabaseService =
    inject(SupabaseService);

  private readonly tableName = 'notes';

  async getNotes(): Promise<Note[]> {
    const { data, error } =
      await this.supabaseService.client
        .from(this.tableName)
        .select(`
          *,
          students (
            id,
            student_name,
            class_name
          ),
          schedules (
            id,
            title,
            subject,
            class_date,
            start_time
          )
        `)
        .order('created_at', {
          ascending: false,
        });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as Note[];
  }

  async getNote(
    id: string
  ): Promise<Note> {
    const { data, error } =
      await this.supabaseService.client
        .from(this.tableName)
        .select(`
          *,
          students (
            id,
            student_name,
            class_name
          ),
          schedules (
            id,
            title,
            subject,
            class_date,
            start_time
          )
        `)
        .eq('id', id)
        .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as Note;
  }

  async createNote(
    value: NoteFormValue
  ): Promise<Note> {
    const {
      data: { user },
      error: userError,
    } = await this.supabaseService.getUser();

    if (userError || !user) {
      throw new Error('You must be logged in.');
    }

    const completedAt =
      value.status === 'completed'
        ? new Date().toISOString()
        : null;

    const { data, error } =
      await this.supabaseService.client
        .from(this.tableName)
        .insert({
          owner_id: user.id,

          student_id:
            value.student_id || null,

          schedule_id:
            value.schedule_id || null,

          note_type:
            value.note_type,

          title:
            value.title.trim(),

          content:
            value.content?.trim() || null,

          due_date:
            value.due_date || null,

          status:
            value.status,

          completed_at:
            completedAt,
        })
        .select('*')
        .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as Note;
  }

  async updateNote(
    id: string,
    value: NoteFormValue
  ): Promise<Note> {
    const existing =
      await this.getNote(id);

    let completedAt =
      existing.completed_at;

    if (
      value.status === 'completed' &&
      existing.status !== 'completed'
    ) {
      completedAt =
        new Date().toISOString();
    }

    if (
      value.status === 'pending'
    ) {
      completedAt = null;
    }

    const { data, error } =
      await this.supabaseService.client
        .from(this.tableName)
        .update({
          student_id:
            value.student_id || null,

          schedule_id:
            value.schedule_id || null,

          note_type:
            value.note_type,

          title:
            value.title.trim(),

          content:
            value.content?.trim() || null,

          due_date:
            value.due_date || null,

          status:
            value.status,

          completed_at:
            completedAt,
        })
        .eq('id', id)
        .select('*')
        .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as Note;
  }

  async setStatus(
    id: string,
    status: NoteStatus
  ): Promise<void> {
    const { error } =
      await this.supabaseService.client
        .from(this.tableName)
        .update({
          status,

          completed_at:
            status === 'completed'
              ? new Date().toISOString()
              : null,
        })
        .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  }

  async deleteNote(
    id: string
  ): Promise<void> {
    const { error } =
      await this.supabaseService.client
        .from(this.tableName)
        .delete()
        .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  }

  async getPendingNotes():
    Promise<Note[]> {
    const { data, error } =
      await this.supabaseService.client
        .from(this.tableName)
        .select(`
          *,
          students (
            id,
            student_name,
            class_name
          )
        `)
        .eq('status', 'pending')
        .order('due_date', {
          ascending: true,
          nullsFirst: false,
        });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as Note[];
  }

  async getNotesByStudent(
    studentId: string
  ): Promise<Note[]> {
    const { data, error } =
      await this.supabaseService.client
        .from(this.tableName)
        .select(`
          *,
          students (
            id,
            student_name,
            class_name
          ),
          schedules (
            id,
            title,
            subject,
            class_date,
            start_time
          )
        `)
        .eq(
          'student_id',
          studentId
        )
        .order('created_at', {
          ascending: false,
        });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as Note[];
  }

  async getNotesByType(
    type: NoteType
  ): Promise<Note[]> {
    const { data, error } =
      await this.supabaseService.client
        .from(this.tableName)
        .select(`
          *,
          students (
            id,
            student_name,
            class_name
          )
        `)
        .eq('note_type', type)
        .order('created_at', {
          ascending: false,
        });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as Note[];
  }

  async getDashboardAcademicNotes(): Promise<Note[]> {
    const { data, error } =
      await this.supabaseService.client
        .from(this.tableName)
        .select(`
        *,
        students (
          id,
          student_name,
          class_name
        ),
        schedules (
          id,
          title,
          subject,
          class_date,
          start_time
        )
      `)
        .eq('status', 'pending')
        .order('due_date', {
          ascending: true,
          nullsFirst: false,
        })
        .order('created_at', {
          ascending: false,
        });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as Note[];
  }
}
