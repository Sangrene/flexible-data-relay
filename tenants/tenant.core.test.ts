import { assertEquals } from "https://deno.land/std@0.212.0/assert/mod.ts";

import { createTenantCore } from "./tenant.core.ts";
import { createTenantInMemoryRepository } from "./tenantsInMemoryRepository.ts";
import {
  createLocalSchemaChangeHandler,
  createTenantCache,
} from "../graphql/graphqlSchemasCache.ts";
import { createEntityInMemoryRepository } from "../entities/entitiesinMemoryRepository.ts";
import { createEntityCore } from "../entities/entity.core.ts";
import {
  assertSpyCall,
  spy,
} from "https://deno.land/std@0.212.0/testing/mock.ts";
import { createWebhookSubscriptionPlugin } from "../subscription/webhookSubscription.ts";
import { createSubscriptionManager } from "../subscription/subscriptionManager.ts";
import { Timeout } from "https://deno.land/x/timeout/mod.ts";
import * as mf from "https://deno.land/x/mock_fetch@0.3.0/mod.ts";

Deno.test(async function createTenantWithRightSchema() {
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
  entityCore.setCache(cache);

  const tenant = await tenantCore.createTenant("tenant");
  const storedTenant = await tenantCore.getTenantById(tenant._id);
  assertEquals(tenant, storedTenant);
});

Deno.test(async function canTenantHaveAccessToHisOwnResource() {
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
  entityCore.setCache(cache);

  const tenant = await tenantCore.createTenant("tenant");
  assertEquals(
    tenantCore.accessGuard(tenant, { owner: "tenant" })._unsafeUnwrap(),
    true
  );
});

Deno.test(
  async function tenantCantHaveAccessToAnotherOwnerWithoutAuthorization() {
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
    entityCore.setCache(cache);

    const tenant = await tenantCore.createTenant("tenant");
    const guardResult = tenantCore.accessGuard(tenant, { owner: "" });
    assertEquals(guardResult.isErr(), true);
  }
);

Deno.test(
  async function tenantCanAccessAnotherOwnerResourceWithAuthorization() {
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
    entityCore.setCache(cache);

    await tenantCore.createTenant("tenant1");
    await tenantCore.createTenant("tenant2");
    await tenantCore.allowTenantAccessToOwnResource({
      currentTenantName: "tenant1",
      allowedTenantName: "tenant2",
    });
    const tenant2 = await tenantPersistence.getTenantByName("tenant2");
    assertEquals(
      tenantCore.accessGuard(tenant2!, { owner: "tenant1" })._unsafeUnwrap(),
      true
    );
  }
);

Deno.test(async function sendWebhookRequestIfSubscribedAndEntityIsUpdated() {
  mf.install();
  mf.mock("GET@/test", (_req, _params) => {
    return new Response("", {
      status: 200,
    });
  });
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
  entityCore.setCache(cache);
  const webhookSubscriptionPlugin = createWebhookSubscriptionPlugin();
  const publishMessageSpy = spy(webhookSubscriptionPlugin, "publishMessage");

  createSubscriptionManager({
    subscriptionPlugins: [webhookSubscriptionPlugin],
    tenantCore,
  });

  await tenantCore.createTenant("tenant1");
  const tenant2 = await tenantCore.createTenant("tenant2");
  await tenantCore.allowTenantAccessToOwnResource({
    currentTenantName: "tenant1",
    allowedTenantName: "tenant2",
  });

  const subscription = (
    await tenantCore.createSubscription({
      subscription: {
        owner: "tenant1",
        entityName: "entityTest",
        webhook: {
          url: "https://localhost:3000/test",
        },
      },
      tenant: tenant2,
    })
  )._unsafeUnwrap();

  await entityCore.createOrUpdateEntity({
    entity: { name: "test", id: "id" },
    entityName: "entityTest",
    tenant: "tenant1",
  });
  await Timeout.wait(500);
  assertSpyCall(publishMessageSpy, 0, {
    args: [
      {
        subscription,
        action: "created",
        entity: { name: "test", id: "id" },
      },
    ],
  });
});
