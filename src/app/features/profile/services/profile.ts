import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase';
import { UserProfile, UserProfileFormValue } from '../models/profile';

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private readonly supabaseService = inject(SupabaseService);

  private readonly tableName = 'profiles';

  private readonly bucketName = 'profile-images';

  async getProfile():
    Promise<UserProfile | null> {
    const {
      data: { user },
      error: userError,
    } =
      await this.supabaseService.getUser();

    if (userError || !user) {
      throw new Error(
        'You must be logged in.'
      );
    }

    const { data, error } =
      await this.supabaseService.client
        .from(this.tableName)
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data as UserProfile | null;
  }

  async saveProfile(
    value: UserProfileFormValue
  ): Promise<UserProfile> {
    const {
      data: { user },
      error: userError,
    } =
      await this.supabaseService.getUser();

    if (userError || !user) {
      throw new Error(
        'You must be logged in.'
      );
    }

    const payload = {
      id: user.id,

      full_name:
        value.full_name.trim(),

      tuition_name:
        value.tuition_name.trim() || null,

      phone:
        value.phone.trim() || null,

      address:
        value.address.trim() || null,
    };

    const { data, error } =
      await this.supabaseService.client
        .from(this.tableName)
        .upsert(
          payload,
          {
            onConflict: 'id',
          }
        )
        .select('*')
        .single();

    if (error) {
      throw new Error(error.message);
    }

    await this.supabaseService.client
      .auth
      .updateUser({
        data: {
          full_name:
            value.full_name.trim(),
        },
      });

    return data as UserProfile;
  }

  async uploadProfileImage(
    file: File
  ): Promise<string> {
    const {
      data: { user },
      error: userError,
    } =
      await this.supabaseService.getUser();

    if (userError || !user) {
      throw new Error(
        'You must be logged in.'
      );
    }

    const extension =
      file.name
        .split('.')
        .pop()
        ?.toLowerCase() || 'jpg';

    const path =
      `${user.id}/avatar.${extension}`;

    const { error: uploadError } =
      await this.supabaseService.client.storage
        .from(this.bucketName)
        .upload(
          path,
          file,
          {
            upsert: true,
            contentType: file.type,
          }
        );

    if (uploadError) {
      throw new Error(
        uploadError.message
      );
    }

    const { data, error } =
      await this.supabaseService.client
        .from(this.tableName)
        .update({
          profile_image_path: path,
        })
        .eq('id', user.id)
        .select('*')
        .single();

    if (error) {
      throw new Error(error.message);
    }

    return data.profile_image_path;
  }

  async getProfileImageUrl(
    path: string
  ): Promise<string> {
    const { data, error } =
      await this.supabaseService.client.storage
        .from(this.bucketName)
        .createSignedUrl(
          path,
          60 * 60
        );

    if (error) {
      throw new Error(
        error.message
      );
    }

    return data.signedUrl;
  }

  async removeProfileImage(
    path: string
  ): Promise<void> {
    const {
      data: { user },
      error: userError,
    } =
      await this.supabaseService.getUser();

    if (userError || !user) {
      throw new Error(
        'You must be logged in.'
      );
    }

    const { error: storageError } =
      await this.supabaseService.client.storage
        .from(this.bucketName)
        .remove([path]);

    if (storageError) {
      throw new Error(
        storageError.message
      );
    }

    const { error } =
      await this.supabaseService.client
        .from(this.tableName)
        .update({
          profile_image_path: null,
        })
        .eq('id', user.id);

    if (error) {
      throw new Error(error.message);
    }
  }
}
