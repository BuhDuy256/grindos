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

export interface UserRepository {
  create(input: CreateUserInput): Promise<UserDocument>;
  findById(id: number): Promise<UserDocument | null>;
  findByUsername(username: string): Promise<UserDocument | null>;
  list(): Promise<UserDocument[]>;
  hasAiContext(userId: number): Promise<boolean>;
  findAiContext(userId: number): Promise<AiContextDocument | null>;
  upsertAiContext(userId: number, input: UpsertAiContextInput): Promise<AiContextDocument>;
}
