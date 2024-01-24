import { assertEquals } from "https://deno.land/std@0.209.0/assert/assert_equals.ts";
import { createAuthCore } from "./auth.ts";
import { createTenantCore } from "../tenants/tenant.core.ts";
import { createTenantInMemoryRepository } from "../tenants/tenantsInMemoryRepository.ts";
import { createEntityInMemoryRepository } from "../entities/entitiesinMemoryRepository.ts";
import { createTenantCache } from "../graphql/graphqlSchemasCache.ts";
import { assertExists } from "https://deno.land/std@0.209.0/assert/assert_exists.ts";
import { createEntityCore } from "../entities/entity.core.ts";

Deno.test(async function canGenerateTenantTokenFromIdAndCredentials() {
  const tenantPersistence = createTenantInMemoryRepository();
  const entityPersistence = createEntityInMemoryRepository();
  const entityCore = createEntityCore({ persistence: entityPersistence });
  const tenantCore = createTenantCore({
    tenantPersistenceHandler: tenantPersistence,
  });
  const cache = await createTenantCache({
    initContent: await tenantCore.getAllSchemas(entityCore),
    mode: "local",
  });
  tenantCore.setCache(cache);

  const authCore = await createAuthCore({ tenantCore });
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
  const cache = await createTenantCache({
    initContent: await tenantCore.getAllSchemas(entityCore),
    mode: "local",
  });
  tenantCore.setCache(cache);

  const authCore = await createAuthCore({ tenantCore });
  const newTenant = await tenantCore.createTenant("tenant");
  const token = await authCore.generateTokenFromCredentials({
    clientId: newTenant._id,
    clientSecret: newTenant.lastSecret,
  });
  const gottenTenant = await authCore.getTenantFromToken(token);
  assertEquals(newTenant, gottenTenant);
});
