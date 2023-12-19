import { MongoClient } from "mongodb";

const client = new MongoClient(
  Deno.env.get("MONGODB_CONNECTION_STRING") || "http://localhost:27017"
);

const tenantDb = async (tenant: string) => {
  await client.connect();
  console.log("Connected successfully to server");
  const db = client.db(tenant);
  return db;
};
