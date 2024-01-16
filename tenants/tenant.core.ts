import { EntityPersistenceHandler } from "../entities/entities.persistence.ts";
import { GraphqlSchemasCache } from "../graphql/graphqlSchemasCache.ts";
import { TenantRepository } from "./tenant.persistence.ts";

interface TenantCoreArgs {
  tenantPersistenceHandler: TenantRepository;
  entityPersistenceHandler: EntityPersistenceHandler;
  graphqlCacheSchemas: GraphqlSchemasCache;
}
const tenantCore = ({ graphqlCacheSchemas }: TenantCoreArgs) => {
  const getTenantGraphqlSchema = async ({ tenant }: { tenant: string }) => {
    return graphqlCacheSchemas.getTenantSchema(tenant);
  };

  return {
    getTenantGraphqlSchema,
  };
};

export type TenantCore = ReturnType<typeof tenantCore>;
