import "https://deno.land/std@0.209.0/dotenv/load.ts";
import { runWebServer } from "./http/webserver.ts";
import { entityCore as createEntityCore } from "./entities/entity.core.ts";
import { inMemoryRepository } from "./entities/entitiesinMemoryRepository.ts";
import { tenantInMemoryRepository } from "./tenants/tenantsInMemoryRepository.ts";
import createAuthServer from "./auth/auth.ts";
import { createTenantCore } from "./tenants/tenant.core.ts";
import { schemaCache } from "./graphql/graphqlSchemasCache.ts";

const entityPersistence = inMemoryRepository();
const tenantPersistence = tenantInMemoryRepository();
const authServer = await createAuthServer({
  tenantRepository: tenantPersistence,
});
const entityCore = createEntityCore({ persistence: entityPersistence });
const cache = schemaCache(entityPersistence);
const tenantCore = createTenantCore({
  entityPersistenceHandler: entityPersistence,
  graphqlCacheSchemas: cache,
  tenantPersistenceHandler: tenantPersistence,
});

const webserver = runWebServer({
  entityCore,
  authServer,
  tenantCore,
  schemasCache: cache,
});
