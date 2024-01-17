import { assertEquals } from "https://deno.land/std@0.209.0/assert/assert_equals.ts";
import { createAuthCore } from "./auth.ts";
import { createTenantCore } from "../tenants/tenant.core.ts";
import { tenantInMemoryRepository } from "../tenants/tenantsInMemoryRepository.ts";
import { createEntityInMemoryRepository } from "../entities/entitiesinMemoryRepository.ts";
import { schemaCache } from "../graphql/graphqlSchemasCache.ts";
import { assertExists } from "https://deno.land/std@0.209.0/assert/assert_exists.ts";

Deno.test(async function canGenerateTenantTokenFromIdAndCredentials() {
  const tenantPersistence = tenantInMemoryRepository();
  const entityPersistence = createEntityInMemoryRepository();
  const cache = schemaCache(entityPersistence);

  const tenantCore = createTenantCore({
    graphqlCacheSchemas: cache,
    tenantPersistenceHandler: tenantPersistence,
  });
  const authCore = await createAuthCore({ tenantCore });
  const newTenant = await tenantCore.createTenant("tenant");
  const token = await authCore.generateTokenFromCredentials({
    clientId: newTenant._id,
    clientSecret: newTenant.lastSecret,
  });
  assertExists(token);
});

Deno.test(async function canGetTenantUsingToken() {
  const tenantPersistence = tenantInMemoryRepository();
  const entityPersistence = createEntityInMemoryRepository();
  const cache = schemaCache(entityPersistence);

  const tenantCore = createTenantCore({
    graphqlCacheSchemas: cache,
    tenantPersistenceHandler: tenantPersistence,
  });
  const authCore = await createAuthCore({ tenantCore });
  const newTenant = await tenantCore.createTenant("tenant");
  const token = await authCore.generateTokenFromCredentials({
    clientId: newTenant._id,
    clientSecret: newTenant.lastSecret,
  });
  const gottenTenant = await authCore.getTenantFromToken(token);
  assertEquals(newTenant, gottenTenant);
});

