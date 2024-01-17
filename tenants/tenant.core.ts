import { EntityPersistenceHandler } from "../entities/entities.persistence.ts";
import { GraphqlSchemasCache } from "../graphql/graphqlSchemasCache.ts";
import { TenantRepository } from "./tenant.persistence.ts";
import {
  createHash,
  randomBytes,
} from "https://deno.land/std@0.110.0/node/crypto.ts";

interface TenantCoreArgs {
  tenantPersistenceHandler: TenantRepository;
  entityPersistenceHandler: EntityPersistenceHandler;
  graphqlCacheSchemas: GraphqlSchemasCache;
}
export const createTenantCore = ({
  graphqlCacheSchemas,
  tenantPersistenceHandler,
}: TenantCoreArgs) => {
  const getTenantGraphqlSchema = async ({ tenant }: { tenant: string }) => {
    return graphqlCacheSchemas.getTenantSchema(tenant);
  };

  const createTenant = async (tenantName: string) => {
    const secret = randomBytes(64).toString("hex");
    const hash = createHash("md5").update(secret).digest("hex") as string;
    tenantPersistenceHandler.createTenant({
      name: tenantName,
      lastSecret: secret,
      lastSecretHash: hash,
      accessAllowed: [],
    });
  };

  return {
    getTenantGraphqlSchema,
    createTenant,
  };
};

export type TenantCore = ReturnType<typeof createTenantCore>;
