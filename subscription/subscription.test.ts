import { createEntityCore as createEntityCore } from "../entities/entity.core.ts";
import { createEntityInMemoryRepository } from "../entities/entitiesinMemoryRepository.ts";
import {
  createLocalSchemaChangeHandler,
  createTenantCache,
} from "../graphql/graphqlSchemasCache.ts";
import { createTenantCore } from "../tenants/tenant.core.ts";
import { createTenantInMemoryRepository } from "../tenants/tenantsInMemoryRepository.ts";
import { loadEnv } from "../env/loadEnv.ts";
import {
  assertSpyCall,
  spy,
} from "https://deno.land/std@0.212.0/testing/mock.ts";
import { createWebhookSubscriptionPlugin } from "../subscription/webhookSubscription.ts";
import { createSubscriptionManager } from "../subscription/subscriptionManager.ts";
import { Timeout } from "https://deno.land/x/timeout/mod.ts";
import * as mf from "https://deno.land/x/mock_fetch@0.3.0/mod.ts";



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
    env: loadEnv(),
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
    entityName: "entityTest",
  });

  const subscription = (
    await tenantCore.createSubscription({
      subscription: {
        owner: "tenant1",
        entityName: "entityTest",
        type: "webhook",
        webhookUrl: "https://localhost:3000/test",
      },
      tenant: tenant2,
    })
  )._unsafeUnwrap();

  await entityCore.createOrUpdateEntity({
    entity: { id: "id", data: { id: "id", name: "test" } },
    entityName: "entityTest",
    tenant: "tenant1",
  });
  await Timeout.wait(500);
  assertSpyCall(publishMessageSpy, 0, {
    args: [
      {
        subscription,
        action: "created",
        entity: { id: "id", data: { id: "id", name: "test" } },
      },
    ],
  });
});
