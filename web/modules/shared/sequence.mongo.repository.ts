import { getMongoDb } from "@/lib/mongodb";

interface CounterDocument {
  _id: string;
  value: number;
  schemaVersion: 1;
  createdAt: Date;
  updatedAt: Date;
}

const COLLECTION = "counters";

export async function nextSequence(name: string): Promise<number> {
  const now = new Date();
  const db = await getMongoDb();
  const counter = await db.collection<CounterDocument>(COLLECTION).findOneAndUpdate(
    { _id: name },
    {
      $inc: { value: 1 },
      $set: { updatedAt: now },
      $setOnInsert: { schemaVersion: 1, createdAt: now },
    },
    { upsert: true, returnDocument: "after" },
  );

  if (!counter) {
    throw new Error(`Cannot create sequence ${name}.`);
  }

  return counter.value;
}
