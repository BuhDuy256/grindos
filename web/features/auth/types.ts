export interface AuthResponse {
  token: string;
  user_id: string;
  username: string;
  is_admin: boolean;
  is_onboarded?: boolean;
}
