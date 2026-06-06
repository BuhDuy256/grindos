import type { AiContextDocument, UserDocument } from "./type";

export interface CreateUserInput {
  username: string;
  timezone: string;
  passwordHash: string;
  isAdmin?: boolean;
}

export interface UpsertAiContextInput {
  mainGoal: string;
  metadata: Record<string, unknown>;
}

export interface PatchAiContextInput {
  mainGoal?: string;
  userPersonaSummary?: string | null;
  metadata?: Record<string, unknown>;
  bridgeChoices?: unknown[] | null;
}

export interface UserRepository {
  create(input: CreateUserInput): Promise<UserDocument>;
  createInternal(username: string, timezone: string): Promise<UserDocument>;
  findById(id: number): Promise<UserDocument | null>;
  findByUsername(username: string): Promise<UserDocument | null>;
  list(): Promise<UserDocument[]>;
  hasAiContext(userId: number): Promise<boolean>;
  findAiContext(userId: number): Promise<AiContextDocument | null>;
  upsertAiContext(userId: number, input: UpsertAiContextInput): Promise<AiContextDocument>;
  patchAiContext(userId: number, input: PatchAiContextInput): Promise<boolean>;
  deleteAiContext(userId: number): Promise<boolean>;
}
