import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.212.0/assert/mod.ts";

import { createTenantCore } from "./tenant.core.ts";
import { tenantInMemoryRepository } from "./tenantsInMemoryRepository.ts";
import { createTenantCache } from "../graphql/graphqlSchemasCache.ts";
import { createEntityInMemoryRepository } from "../entities/entitiesinMemoryRepository.ts";
import { createEntityCore } from "../entities/entity.core.ts";

Deno.test(async function createTenantWithRightSchema() {
  const tenantPersistence = tenantInMemoryRepository();
  const entityPersistence = createEntityInMemoryRepository();
  const entityCore = createEntityCore({ persistence: entityPersistence });

  const tenantCore = createTenantCore({
    tenantPersistenceHandler: tenantPersistence,
  });
  const cache = await createTenantCache(
    entityCore,
    await tenantCore.getAllSchemas(entityCore)
  );
  tenantCore.setCache(cache);
  const tenant = await tenantCore.createTenant("tenant");
  const storedTenant = await tenantCore.getTenantById(tenant._id);
  assertEquals(tenant, storedTenant);
});

Deno.test(async function canTenantHaveAccessToHisOwnResource() {
  const tenantPersistence = tenantInMemoryRepository();
  const entityPersistence = createEntityInMemoryRepository();
  const entityCore = createEntityCore({ persistence: entityPersistence });

  const tenantCore = createTenantCore({
    tenantPersistenceHandler: tenantPersistence,
  });
  const cache = await createTenantCache(
    entityCore,
    await tenantCore.getAllSchemas(entityCore)
  );
  tenantCore.setCache(cache);
  const tenant = await tenantCore.createTenant("tenant");
  assertEquals(tenantCore.accessGuard(tenant, { owner: "tenant" }), true);
});

Deno.test(
  async function tenantCantHaveAccessToAnotherOwnerWithoutAuthorization() {
    const tenantPersistence = tenantInMemoryRepository();
  const entityPersistence = createEntityInMemoryRepository();
  const entityCore = createEntityCore({ persistence: entityPersistence });

  const tenantCore = createTenantCore({
    tenantPersistenceHandler: tenantPersistence,
  });
  const cache = await createTenantCache(
    entityCore,
    await tenantCore.getAllSchemas(entityCore)
  );
  tenantCore.setCache(cache);
    const tenant = await tenantCore.createTenant("tenant");
    assertThrows(() => tenantCore.accessGuard(tenant, { owner: "" }), Error);
  }
);

Deno.test(
  async function tenantCanAccessAnotherOwnerResourceWithAuthorization() {
    const tenantPersistence = tenantInMemoryRepository();
  const entityPersistence = createEntityInMemoryRepository();
  const entityCore = createEntityCore({ persistence: entityPersistence });

  const tenantCore = createTenantCore({
    tenantPersistenceHandler: tenantPersistence,
  });
  const cache = await createTenantCache(
    entityCore,
    await tenantCore.getAllSchemas(entityCore)
  );
  tenantCore.setCache(cache);
    await tenantCore.createTenant("tenant1");
    await tenantCore.createTenant("tenant2");
    await tenantCore.allowTenantAccessToOwnResource({
      currentTenantName: "tenant1",
      allowedTenantName: "tenant2",
    });
    const tenant2 = await tenantPersistence.getTenantByName("tenant2");
    assertEquals(tenantCore.accessGuard(tenant2!, { owner: "tenant1" }), true);
  }
);
