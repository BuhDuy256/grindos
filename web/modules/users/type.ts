import type { ObjectId } from "mongodb";

export interface UserDocument {
  _id?: ObjectId;
  id: number;
  username: string;
  timezone: string;
  passwordHash: string | null;
  isAdmin: boolean;
  schemaVersion: 1;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface AiContextDocument {
  _id?: ObjectId;
  userId: number;
  mainGoal: string;
  userPersonaSummary?: string | null;
  metadata: Record<string, unknown>;
  bridgeChoices?: unknown[] | null;
  schemaVersion: 1;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthDTO {
  token: string;
  user_id: string;
  username: string;
  is_admin: boolean;
  is_onboarded: boolean;
}

export interface UserDTO {
  id: string;
  username: string;
  timezone: string;
}
