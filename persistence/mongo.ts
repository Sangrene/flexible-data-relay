import { Db, MongoClient } from "mongodb";

const connectClient = async (client: MongoClient) => {
  await client.connect();
};

const createGetTenantDb =
  ({ client, tenantsDB }: { tenantsDB: TenantsDbMap; client: MongoClient }) =>
  (tenant: string) => {
    if (tenantsDB[tenant]) return tenantsDB[tenant];
    const db = client.db(tenant);
    tenantsDB[tenant] = db;
    return db;
  };

const createGetMasterDb =
  ({ client }: { client: MongoClient }) =>
  () =>
    client.db("master");

type TenantsDbMap = { [tenant: string]: Db };

export const createMongoService = async () => {
  const client = new MongoClient(
    Deno.env.get("MONGODB_CONNECTION_STRING") || "mongodb://localhost:27017"
  );
  const tenantsDB: TenantsDbMap = {};

  await connectClient(client);

  return {
    getMasterDb: createGetMasterDb({ client }),
    getTenantDb: createGetTenantDb({ client, tenantsDB }),
  };
};

export type MongoService = Awaited<ReturnType<typeof createMongoService>>;
