import { getMongoDb } from "@/lib/mongodb";
import { nextSequence } from "@/modules/shared/sequence.mongo.repository";
import type {
  CreateUserInput,
  UpsertAiContextInput,
  UserRepository,
} from "./repository";
import type { AiContextDocument, UserDocument } from "./type";

const USERS_COLLECTION = "users";
const AI_CONTEXTS_COLLECTION = "ai_contexts";

let indexesReady = false;

async function ensureIndexes() {
  if (indexesReady) {
    return;
  }

  const db = await getMongoDb();
  await Promise.all([
    db.collection<UserDocument>(USERS_COLLECTION).createIndex({ id: 1 }, { unique: true }),
    db.collection<UserDocument>(USERS_COLLECTION).createIndex({ username: 1 }, { unique: true }),
    db.collection<AiContextDocument>(AI_CONTEXTS_COLLECTION).createIndex(
      { userId: 1 },
      { unique: true },
    ),
  ]);
  indexesReady = true;
}

async function usersCollection() {
  await ensureIndexes();
  return (await getMongoDb()).collection<UserDocument>(USERS_COLLECTION);
}

async function aiContextsCollection() {
  await ensureIndexes();
  return (await getMongoDb()).collection<AiContextDocument>(AI_CONTEXTS_COLLECTION);
}

export class UserMongoRepository implements UserRepository {
  async create(input: CreateUserInput) {
    const now = new Date();
    const user: UserDocument = {
      id: await nextSequence("users"),
      username: input.username,
      timezone: input.timezone,
      passwordHash: input.passwordHash,
      isAdmin: input.isAdmin ?? false,
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    await (await usersCollection()).insertOne(user);
    return user;
  }

  async findById(id: number) {
    return (await usersCollection()).findOne({ id, deletedAt: null });
  }

  async findByUsername(username: string) {
    return (await usersCollection()).findOne({ username, deletedAt: null });
  }

  async list() {
    return (await usersCollection())
      .find({ deletedAt: null }, { sort: { id: 1 } })
      .toArray();
  }

  async hasAiContext(userId: number) {
    const context = await (await aiContextsCollection()).findOne({ userId });
    return context !== null;
  }

  async findAiContext(userId: number) {
    return (await aiContextsCollection()).findOne({ userId });
  }

  async upsertAiContext(userId: number, input: UpsertAiContextInput) {
    const now = new Date();
    const update = {
      $set: {
        mainGoal: input.mainGoal,
        metadata: input.metadata,
        updatedAt: now,
      },
      $setOnInsert: {
        userId,
        userPersonaSummary: null,
        bridgeChoices: null,
        schemaVersion: 1 as const,
        createdAt: now,
      },
    };

    const context = await (await aiContextsCollection()).findOneAndUpdate(
      { userId },
      update,
      { upsert: true, returnDocument: "after" },
    );

    if (!context) {
      throw new Error("Cannot save AI context.");
    }

    return context;
  }
}

export const userRepository = new UserMongoRepository();
