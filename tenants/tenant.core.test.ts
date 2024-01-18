import { assertEquals } from "https://deno.land/std@0.209.0/assert/assert_equals.ts";
import { createTenantCore } from "./tenant.core.ts";
import { tenantInMemoryRepository } from "./tenantsInMemoryRepository.ts";
import { schemaCache } from "../graphql/graphqlSchemasCache.ts";
import { createEntityInMemoryRepository } from "../entities/entitiesinMemoryRepository.ts";

Deno.test(async function createTenantWithRightSchema() {
  const tenantPersistence = tenantInMemoryRepository();
  const entityPersistence = createEntityInMemoryRepository();
  const cache = await schemaCache(entityPersistence, tenantPersistence);

  const tenantCore = createTenantCore({
    tenantPersistenceHandler: tenantPersistence,
    graphqlCacheSchemas: cache,
  });
  const tenant = await tenantCore.createTenant("tenant");
  const storedTenant = await tenantCore.getTenantById(tenant._id);
  assertEquals(tenant, storedTenant);
});
