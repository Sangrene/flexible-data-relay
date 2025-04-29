import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.212.0/assert/mod.ts";

import { createTenantCore } from "./tenant.core.ts";
import { createTenantInMemoryRepository } from "./tenantsInMemoryRepository.ts";
import {
  createLocalSchemaChangeHandler,
  createTenantCache,
} from "../graphql/graphqlSchemasCache.ts";
import { createEntityInMemoryRepository } from "../entities/entitiesinMemoryRepository.ts";
import { createEntityCore } from "../entities/entity.core.ts";

import { loadEnv } from "../env/loadEnv.ts";

Deno.test("Create tenant with right schema", async () => {
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

  const tenant = await tenantCore.createTenant("tenant");
  const storedTenant = await tenantCore.getTenantById(tenant._id);
  assertEquals(tenant, storedTenant);
});

Deno.test("Tenant can have access to his own resource", async () => {
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

  const tenant = await tenantCore.createTenant("tenant");
  assertEquals(
    tenantCore
      .accessGuard(tenant, { owner: "tenant", entityName: "entityTest" })
      ._unsafeUnwrap(),
    true
  );
});

Deno.test(
  "Tenant can't have access to entity if granted access to another entity",
  async () => {
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

    const tenant = await tenantCore.createTenant("tenant");
    await tenantCore.createTenant("tenant2");
    await tenantCore.allowTenantAccessToOwnResource({
      currentTenantName: "tenant2",
      allowedTenantName: "tenant",
      entityName: "entityTest",
    });
    const guardResult = tenantCore.accessGuard(tenant, {
      owner: "tenant2",
      entityName: "",
    });
    assertEquals(guardResult.isErr(), true);
  }
);

Deno.test(
  "Tenant can't have access to entity if granted access to another entity with same name",
  async () => {
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

    const tenant = await tenantCore.createTenant("tenant");
    await tenantCore.createTenant("tenant2");
    await tenantCore.allowTenantAccessToOwnResource({
      currentTenantName: "tenant2",
      allowedTenantName: "tenant",
      entityName: "entityTest",
    });
    const guardResult = tenantCore.accessGuard(tenant, {
      owner: "tenant3",
      entityName: "entityTest",
    });
    assertEquals(guardResult.isErr(), true);
  }
);

Deno.test(
  "Tenant can access another owner resource with authorization",
  async () => {
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

    await tenantCore.createTenant("tenant1");
    await tenantCore.createTenant("tenant2");
    await tenantCore.allowTenantAccessToOwnResource({
      currentTenantName: "tenant1",
      allowedTenantName: "tenant2",
      entityName: "entityTest",
    });
    const tenant2 = await tenantPersistence.getTenantByName("tenant2");
    assertEquals(
      tenantCore
        .accessGuard(tenant2!, { owner: "tenant1", entityName: "entityTest" })
        ._unsafeUnwrap(),
      true
    );
  }
);

Deno.test("Tenant can query his own entity", async () => {
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
  const tenant = await tenantCore.createTenant("tenant");
  await entityCore.createOrUpdateEntity({
    entity: { id: "id", data: { id: "id", name: "test" } },
    entityName: "entityTest",
    tenant: "tenant",
  });

  const result = tenantCore.getTenantGraphqlSchema({
    tenant: "tenant",
    tenantRequestingAccess: tenant,
    entityCore,
  });
  assertExists(result.getQueryType()?.getFields()["entityTest"]);
  assertExists(result.getQueryType()?.getFields()["entityTestList"]);
});

Deno.test("Schema is filtered if tenant has access to another tenant resource", async () => {
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
    await tenantCore.createTenant("tenant");
    const tenant2 = await tenantCore.createTenant("tenant2");

    await entityCore.createOrUpdateEntity({
      entity: { id: "id", data: { id: "id", name: "test" } },
      entityName: "entityTest",
      tenant: "tenant",
    });
    await entityCore.createOrUpdateEntity({
      entity: { id: "id2", data: { id: "id2", name: "test2" } },
      entityName: "entityTest2",
      tenant: "tenant",
    });
    await tenantCore.allowTenantAccessToOwnResource({
      currentTenantName: "tenant",
      allowedTenantName: "tenant2",
      entityName: "entityTest2",
    });
    const result = tenantCore.getTenantGraphqlSchema({
      tenant: "tenant",
      tenantRequestingAccess: tenant2,
      entityCore,
    });
    assertExists(result.getQueryType()?.getFields()["entityTest2"]);
    assertExists(result.getQueryType()?.getFields()["entityTest2List"]);
    assertEquals(result.getQueryType()?.getFields()["entityTest"], undefined);
    assertEquals(
      result.getQueryType()?.getFields()["entityTestList"],
      undefined
    );
  }
);

Deno.test(
  "Tenant can't subscribe to queue if rabbitMQ is not configured",
  async () => {
    const tenantPersistence = createTenantInMemoryRepository();
    const tenantCore = createTenantCore({
      tenantPersistenceHandler: tenantPersistence,
      env: {
        ...loadEnv(),
        RABBIT_MQ_CONNECTION_STRING: undefined,
      },
    });
    const tenant = await tenantCore.createTenant("tenant");
    const result = await tenantCore.createSubscription({
      subscription: {
        type: "queue",
        entityName: "entityTest",
        owner: "tenant",
        queueName: "queueTest",
      },
      tenant: tenant,
    });
    assertEquals(result._unsafeUnwrapErr(), {
      error: "CANT_SUBSCRIBE_USING_QUEUE_BECAUSE_RABBITMQ_NOT_CONFIGURED",
    });
  }
);

Deno.test(
  "When tenant is created, associated user is created in message broker ",
  async () => {
    const tenantPersistence = createTenantInMemoryRepository();
    const tenantCore = createTenantCore({
      tenantPersistenceHandler: tenantPersistence,
      env: loadEnv(),
    });
  }
);
