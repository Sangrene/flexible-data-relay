import { assertEquals } from "https://deno.land/std@0.209.0/assert/assert_equals.ts";
import { createAuthCore } from "./auth.ts";
import { createTenantCore } from "../tenants/tenant.core.ts";
import { createTenantInMemoryRepository } from "../tenants/tenantsInMemoryRepository.ts";
import { createEntityInMemoryRepository } from "../entities/entitiesinMemoryRepository.ts";
import { createLocalSchemaChangeHandler, createTenantCache } from "../graphql/graphqlSchemasCache.ts";
import { assertExists } from "https://deno.land/std@0.209.0/assert/assert_exists.ts";
import { createEntityCore } from "../entities/entity.core.ts";
import { loadEnv } from "../env/loadEnv.ts";

Deno.test(async function canGenerateTenantTokenFromIdAndCredentials() {
  const tenantPersistence = createTenantInMemoryRepository();
  const entityPersistence = createEntityInMemoryRepository();
  const entityCore = createEntityCore({ persistence: entityPersistence });
  const tenantCore = createTenantCore({
    tenantPersistenceHandler: tenantPersistence,
  });
  const cache = createTenantCache({
    initContent: await tenantCore.getAllSchemas(entityCore),
    createSchemaChangeHandler: createLocalSchemaChangeHandler(),
  });
  tenantCore.setCache(cache);

  const authCore = await createAuthCore({ tenantCore, env: loadEnv() });
  const newTenant = await tenantCore.createTenant("tenant");
  const token = await authCore.generateTokenFromCredentials({
    clientId: newTenant._id,
    clientSecret: newTenant.lastSecret,
  });
  assertExists(token);
});

Deno.test(async function canGetTenantUsingToken() {
  const tenantPersistence = createTenantInMemoryRepository();
  const entityPersistence = createEntityInMemoryRepository();
  const entityCore = createEntityCore({ persistence: entityPersistence });
  const tenantCore = createTenantCore({
    tenantPersistenceHandler: tenantPersistence,
  });
  const cache = createTenantCache({
    initContent: await tenantCore.getAllSchemas(entityCore),
    createSchemaChangeHandler: createLocalSchemaChangeHandler(),
  });
  tenantCore.setCache(cache);

  const authCore = await createAuthCore({ tenantCore, env: loadEnv() });
  const newTenant = await tenantCore.createTenant("tenant");
  const token = (await authCore.generateTokenFromCredentials({
    clientId: newTenant._id,
    clientSecret: newTenant.lastSecret,
  }))._unsafeUnwrap();

  const gottenTenant = await authCore.getTenantFromToken(token);
  assertEquals(newTenant, gottenTenant);
});
