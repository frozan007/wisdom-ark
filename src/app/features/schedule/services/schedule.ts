import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase';
import { Schedule, ScheduleFormValue } from '../models/schedule';

@Injectable({
  providedIn: 'root',
})
export class ScheduleService {
  private readonly supabaseService = inject(SupabaseService);
  private readonly tableName = 'schedules';

  async getSchedulesForDate(date: string): Promise<Schedule[]> {
    const { data, error } = await this.supabaseService.client
      .from(this.tableName)
      .select(`
        *,
        students (
          id,
          student_name,
          class_name,
          primary_phone
        )
      `)
      .eq('class_date', date)
      .order('start_time', {
        ascending: true,
      });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as Schedule[];
  }

  async getUpcomingSchedules(
    fromDate: string,
    limit = 20
  ): Promise<Schedule[]> {
    const { data, error } = await this.supabaseService.client
      .from(this.tableName)
      .select(`
        *,
        students (
          id,
          student_name,
          class_name,
          primary_phone
        )
      `)
      .gte('class_date', fromDate)
      .eq('status', 'scheduled')
      .order('class_date', {
        ascending: true,
      })
      .order('start_time', {
        ascending: true,
      })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as Schedule[];
  }

  async getCompletedSchedules(
    limit = 30
  ): Promise<Schedule[]> {
    const { data, error } = await this.supabaseService.client
      .from(this.tableName)
      .select(`
        *,
        students (
          id,
          student_name,
          class_name,
          primary_phone
        )
      `)
      .eq('status', 'completed')
      .order('class_date', {
        ascending: false,
      })
      .order('start_time', {
        ascending: false,
      })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as Schedule[];
  }

  async getSchedulesForMonth(
    startDate: string,
    endDate: string
  ): Promise<Schedule[]> {
    const { data, error } = await this.supabaseService.client
      .from(this.tableName)
      .select(`
        *,
        students (
          id,
          student_name,
          class_name,
          primary_phone
        )
      `)
      .gte('class_date', startDate)
      .lte('class_date', endDate)
      .order('class_date', {
        ascending: true,
      })
      .order('start_time', {
        ascending: true,
      });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as Schedule[];
  }

  async getSchedule(id: string): Promise<Schedule> {
    const { data, error } = await this.supabaseService.client
      .from(this.tableName)
      .select(`
        *,
        students (
          id,
          student_name,
          class_name,
          primary_phone
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as Schedule;
  }

  async createSchedule(
    value: ScheduleFormValue
  ): Promise<Schedule> {
    const {
      data: { user },
      error: userError,
    } = await this.supabaseService.getUser();

    if (userError || !user) {
      throw new Error('You must be logged in.');
    }

    const { data, error } = await this.supabaseService.client
      .from(this.tableName)
      .insert({
        ...this.cleanFormValue(value),
        owner_id: user.id,
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as Schedule;
  }

  async updateSchedule(
    id: string,
    value: ScheduleFormValue
  ): Promise<Schedule> {
    const { data, error } = await this.supabaseService.client
      .from(this.tableName)
      .update(this.cleanFormValue(value))
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as Schedule;
  }

  async markCompleted(id: string): Promise<void> {
    const { error } = await this.supabaseService.client
      .from(this.tableName)
      .update({
        status: 'completed',
      })
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  }

  async cancelSchedule(id: string): Promise<void> {
    const { error } = await this.supabaseService.client
      .from(this.tableName)
      .update({
        status: 'cancelled',
      })
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  }

  async restoreSchedule(id: string): Promise<void> {
    const { error } = await this.supabaseService.client
      .from(this.tableName)
      .update({
        status: 'scheduled',
      })
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  }

  async deleteSchedule(id: string): Promise<void> {
    const { error } = await this.supabaseService.client
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  }

  async getTodayClassCount(date: string): Promise<number> {
    const { count, error } = await this.supabaseService.client
      .from(this.tableName)
      .select('*', {
        count: 'exact',
        head: true,
      })
      .eq('class_date', date)
      .neq('status', 'cancelled');

    if (error) {
      throw new Error(error.message);
    }

    return count ?? 0;
  }

  private cleanFormValue(
    value: ScheduleFormValue
  ): ScheduleFormValue {
    return {
      ...value,
      student_id: value.student_id || null,
      title: value.title.trim(),
      subject: value.subject?.trim() || null,
      location: value.location?.trim() || null,
      description: value.description?.trim() || null,
    };
  }

  async getSchedules(): Promise<Schedule[]> {
    const { data, error } = await this.supabaseService.client
      .from(this.tableName)
      .select(`
      *,
      students (
        id,
        student_name,
        class_name,
        primary_phone
      )
    `)
      .order('class_date', {
        ascending: false,
      })
      .order('start_time', {
        ascending: false,
      });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as Schedule[];
  }

  async getSchedulesForNoteSelection(): Promise<Schedule[]> {
    const { data, error } = await this.supabaseService.client
      .from(this.tableName)
      .select(`
      *,
      students (
        id,
        student_name,
        class_name,
        primary_phone
      )
    `)
      .order('class_date', {
        ascending: false,
      })
      .order('start_time', {
        ascending: false,
      })
      .limit(100);

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as Schedule[];
  }
}
