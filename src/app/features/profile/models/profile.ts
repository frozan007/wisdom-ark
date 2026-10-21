export interface UserProfile {
  id: string;

  full_name: string | null;
  tuition_name: string | null;
  phone: string | null;
  address: string | null;
  profile_image_path: string | null;

  created_at: string;
  updated_at: string;
}

export interface UserProfileFormValue {
  full_name: string;
  tuition_name: string;
  phone: string;
  address: string;
}