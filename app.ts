import "https://deno.land/std@0.209.0/dotenv/load.ts";
import { runWebServer } from "./http/webserver.ts";
import { entityCore as createEntityCore } from "./entities/entity.core.ts";
import { createEntityInMemoryRepository } from "./entities/entitiesinMemoryRepository.ts";
import { tenantInMemoryRepository } from "./tenants/tenantsInMemoryRepository.ts";
import { createAuthCore } from "./auth/auth.ts";
import { createTenantCore } from "./tenants/tenant.core.ts";
import { schemaCache } from "./graphql/graphqlSchemasCache.ts";
import { createTenantsMongoRepository } from "./tenants/tenantsMongoRepository.ts";
import { createEntitiesMongoRepository } from "./entities/entitiesMongoRepository.ts";
import { getMasterDb, getTenantDb } from "./persistence/mongo.ts";

// const entityPersistence = createEntityInMemoryRepository();
// const tenantPersistence = tenantInMemoryRepository();
const entityPersistence = createEntitiesMongoRepository({ getTenantDb });
const tenantsPersistence = createTenantsMongoRepository(getMasterDb());
const entityCore = createEntityCore({ persistence: entityPersistence });
const cache = await schemaCache(entityPersistence, tenantsPersistence);
const tenantCore = createTenantCore({
  graphqlCacheSchemas: cache,
  tenantPersistenceHandler: tenantsPersistence,
});
const authCore = await createAuthCore({
  tenantCore,
});

runWebServer({
  entityCore,
  authCore,
  tenantCore,
  schemasCache: cache,
});
