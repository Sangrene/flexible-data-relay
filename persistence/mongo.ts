import { Db, MongoClient } from "mongodb";

const client = new MongoClient(
  Deno.env.get("MONGODB_CONNECTION_STRING") || "mongodb://localhost:27017"
);
await client.connect();

const masterDb = client.db("master");

const tenantsDB: { [tenant: string]: Db } = {};

export const getTenantDb = (tenant: string) => {
  if (tenantsDB[tenant]) return tenantsDB[tenant];
  const db = client.db(tenant);
  tenantsDB[tenant] = db;
  return db;
};

export const getMasterDb = () => masterDb;
