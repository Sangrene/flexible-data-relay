import "https://deno.land/std@0.209.0/dotenv/load.ts";
import { runWebServer } from "./http/webserver.ts";
import { entityCore as createEntityCore } from "./entities/entity.core.ts";
import { createEntityInMemoryRepository } from "./entities/entitiesinMemoryRepository.ts";
import { tenantInMemoryRepository } from "./tenants/tenantsInMemoryRepository.ts";
import { createAuthCore } from "./auth/auth.ts";
import { createTenantCore } from "./tenants/tenant.core.ts";
import { schemaCache } from "./graphql/graphqlSchemasCache.ts";

const entityPersistence = createEntityInMemoryRepository();
const tenantPersistence = tenantInMemoryRepository();
const entityCore = createEntityCore({ persistence: entityPersistence });
const cache = schemaCache(entityPersistence);
const tenantCore = createTenantCore({
  graphqlCacheSchemas: cache,
  tenantPersistenceHandler: tenantPersistence,
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
