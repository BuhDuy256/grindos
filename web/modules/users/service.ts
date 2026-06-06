import { ApiError } from "@/lib/api-error";
import { createToken, decodeToken } from "@/lib/token";
import { hashPassword, verifyPassword } from "@/lib/password";
import { parseApiId } from "@/lib/id";
import { createDefaultPlayerStats } from "@/modules/player-stats/service";
import { mapAuthToDTO, mapUserToDTO } from "./mapper";
import { userRepository } from "./mongo.repository";

export async function registerUser(input: { username: string; password: string }) {
  const existing = await userRepository.findByUsername(input.username);
  if (existing) {
    throw new ApiError(409, "Username already taken");
  }

  const user = await userRepository.create({
    username: input.username,
    timezone: "Asia/Ho_Chi_Minh",
    passwordHash: hashPassword(input.password),
  });
  await createDefaultPlayerStats(user.id);

  return mapAuthToDTO(user, createToken(user.id, user.isAdmin), false);
}

export async function loginUser(input: { username: string; password: string }) {
  const user = await userRepository.findByUsername(input.username);
  if (!user || !user.passwordHash || !verifyPassword(input.password, user.passwordHash)) {
    throw new ApiError(401, "Invalid username or password");
  }

  const isOnboarded = await userRepository.hasAiContext(user.id);
  return mapAuthToDTO(user, createToken(user.id, user.isAdmin), isOnboarded);
}

export async function getMe(token: string) {
  const payload = decodeToken(token);
  const userId = parseApiId(payload.sub, "user_id");
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new ApiError(401, "User not found");
  }

  const isOnboarded = await userRepository.hasAiContext(user.id);
  return mapAuthToDTO(user, token, isOnboarded);
}

export async function listUsers() {
  const users = await userRepository.list();
  return users.map(mapUserToDTO);
}

export async function ensureUserExists(userId: number) {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return user;
}

export async function deleteAiContext(userId: number) {
  await userRepository.deleteAiContext(userId);
  return { ok: true };
}

export async function registerInternal(username: string, timezone: string) {
  const user = await userRepository.createInternal(username, timezone);
  await createDefaultPlayerStats(user.id);
  return { user_id: user.id };
}

export async function getAiContext(userId: number) {
  const ctx = await userRepository.findAiContext(userId);
  if (!ctx) return null;
  return {
    main_goal: ctx.mainGoal,
    user_persona_summary: ctx.userPersonaSummary ?? null,
    metadata: ctx.metadata,
    bridge_choices: ctx.bridgeChoices ?? null,
  };
}

export async function createAiContext(userId: number, mainGoal: string, metadata: Record<string, unknown>) {
  const existing = await userRepository.findAiContext(userId);
  if (existing) throw new ApiError(409, "Context already exists");
  await userRepository.upsertAiContext(userId, { mainGoal, metadata });
  return { ok: true };
}

export async function patchAiContext(userId: number, fields: {
  main_goal?: string; user_persona_summary?: string | null;
  metadata?: Record<string, unknown>; bridge_choices?: unknown[] | null;
}) {
  await userRepository.patchAiContext(userId, {
    mainGoal: fields.main_goal,
    userPersonaSummary: fields.user_persona_summary,
    metadata: fields.metadata,
    bridgeChoices: fields.bridge_choices,
  });
  return { ok: true };
}

export async function saveOnboardingContext(
  userId: number,
  mainGoal: string,
  activeArc: Record<string, unknown>,
) {
  await ensureUserExists(userId);
  await userRepository.upsertAiContext(userId, {
    mainGoal,
    metadata: {
      current_arc: activeArc,
      campaign_history: [],
    },
  });
}
