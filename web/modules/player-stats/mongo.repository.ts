import { getMongoDb } from "@/lib/mongodb";
import type { PlayerStatsRepository, TaskCompletionStatDelta, UpdateStatsInput } from "./repository";
import type { PlayerStatsDocument } from "./type";

const COLLECTION = "player_stats";

let indexesReady = false;

async function collection() {
  const db = await getMongoDb();
  const stats = db.collection<PlayerStatsDocument>(COLLECTION);

  if (!indexesReady) {
    await stats.createIndex({ userId: 1 }, { unique: true });
    indexesReady = true;
  }

  return stats;
}

export class PlayerStatsMongoRepository implements PlayerStatsRepository {
  async createDefault(userId: number) {
    const now = new Date();
    const stats: PlayerStatsDocument = {
      userId,
      level: 1,
      exp: 0,
      strStat: 10,
      intStat: 10,
      vitStat: 10,
      streak: 0,
      difficultyMultiplier: 1,
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
    };

    await (await collection()).insertOne(stats);
    return stats;
  }

  async findByUserId(userId: number) {
    return (await collection()).findOne({ userId });
  }

  async applyTaskCompletionDelta(userId: number, delta: TaskCompletionStatDelta) {
    const stats = await this.findByUserId(userId);
    if (!stats) {
      return null;
    }

    const exp = Math.max(0, stats.exp + delta.exp);
    const strStat = Math.max(10, stats.strStat + delta.strStat);
    const intStat = Math.max(10, stats.intStat + delta.intStat);
    const vitStat = Math.max(10, stats.vitStat + delta.vitStat);
    const difficultyMultiplier = Math.max(
      1,
      Number((stats.difficultyMultiplier + delta.difficultyMultiplier).toFixed(2)),
    );
    const level = Math.max(1, Math.floor(exp / 1000) + 1);

    const result = await (await collection()).findOneAndUpdate(
      { userId },
      {
        $set: {
          level,
          exp,
          strStat,
          intStat,
          vitStat,
          difficultyMultiplier,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );

    return result;
  }

  async updateStats(userId: number, input: UpdateStatsInput) {
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (input.level !== undefined) set.level = input.level;
    if (input.exp !== undefined) set.exp = input.exp;
    if (input.strStat !== undefined) set.strStat = input.strStat;
    if (input.intStat !== undefined) set.intStat = input.intStat;
    if (input.vitStat !== undefined) set.vitStat = input.vitStat;
    if (input.streak !== undefined) set.streak = input.streak;
    if (input.difficultyMultiplier !== undefined) set.difficultyMultiplier = input.difficultyMultiplier;
    const result = await (await collection()).updateOne({ userId }, { $set: set });
    return result.matchedCount > 0;
  }

  async resetForUser(userId: number) {
    const result = await (await collection()).updateOne(
      { userId },
      {
        $set: {
          level: 1,
          exp: 0,
          strStat: 10,
          intStat: 10,
          vitStat: 10,
          streak: 0,
          difficultyMultiplier: 1,
          updatedAt: new Date(),
        },
      },
    );

    return result.matchedCount > 0;
  }
}

export const playerStatsRepository = new PlayerStatsMongoRepository();
