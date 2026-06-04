import { toApiId } from "@/lib/id";
import type { AuthDTO, UserDocument, UserDTO } from "./type";

export function mapUserToDTO(user: UserDocument): UserDTO {
  return {
    id: toApiId(user.id),
    username: user.username,
    timezone: user.timezone,
  };
}

export function mapAuthToDTO(
  user: UserDocument,
  token: string,
  isOnboarded: boolean,
): AuthDTO {
  return {
    token,
    user_id: toApiId(user.id),
    username: user.username,
    is_admin: user.isAdmin,
    is_onboarded: isOnboarded,
  };
}
