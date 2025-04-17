import { assertEquals } from "https://deno.land/std@0.209.0/assert/assert_equals.ts";
import { createEntityInMemoryRepository } from "./entitiesinMemoryRepository.ts";
import { createEntityCore } from "./entity.core.ts";
import { jsonToJsonSchema } from "../json-schema/jsonToJsonSchema.ts";
import {
  createLocalSchemaChangeHandler,
  createTenantCache,
} from "../graphql/graphqlSchemasCache.ts";
import {
  assertSpyCall,
  spy,
} from "https://deno.land/std@0.212.0/testing/mock.ts";

Deno.test(async function createsEntityIfItDoesntExistYet() {
  const ENTITY = { id: "id", a: 2, b: "truc" };
  const persistence = createEntityInMemoryRepository();
  const store = createTenantCache({
    createSchemaChangeHandler: createLocalSchemaChangeHandler(),
  });
  const core = createEntityCore({ persistence });
  core.setCache(store);
  await core.createOrUpdateEntity({
    entityName: "testEntity",
    entity: ENTITY,
    tenant: "test",
  });
  const entity = await persistence.getEntity({
    tenant: "test",
    entityName: "testEntity",
    id: "id",
  });
  assertEquals(entity, ENTITY);
});

Deno.test(async function updateEntityIfItAlreadyExists() {
  const ENTITY = { id: "id", a: 2, b: "truc" };
  const UPDATED_ENTITY = { id: "id", a: 2, b: "trac" };
  const persistence = createEntityInMemoryRepository();
  const store = createTenantCache({
    createSchemaChangeHandler: createLocalSchemaChangeHandler(),
  });
  const core = createEntityCore({ persistence });
  core.setCache(store);
  await core.createOrUpdateEntity({
    entityName: "testEntity",
    entity: ENTITY,
    tenant: "test",
  });
  await core.createOrUpdateEntity({
    entityName: "testEntity",
    entity: UPDATED_ENTITY,
    tenant: "test",
  });
  const entity = await persistence.getEntity({
    tenant: "test",
    entityName: "testEntity",
    id: "id",
  });
  assertEquals(entity, UPDATED_ENTITY);
});

Deno.test(async function storeEntitySchemaOnCreateEntity() {
  const ENTITY = { id: "id", a: 2, b: "truc" };
  const persistence = createEntityInMemoryRepository();
  const store = createTenantCache({
    createSchemaChangeHandler: createLocalSchemaChangeHandler(),
  });
  const core = createEntityCore({ persistence });
  core.setCache(store);
  await core.createOrUpdateEntity({
    entityName: "testEntity",
    entity: ENTITY,
    tenant: "",
  });

  const computedSchema = { ...jsonToJsonSchema(ENTITY), title: "testEntity" };
  const existingSchema = await core.getEntitySchema("testEntity", "");
  assertEquals(computedSchema, existingSchema);
});

Deno.test(
  async function updateSchemaIfAddingNewEntityWithDifferentProperties() {
    const ENTITY = { id: "id", a: 2, b: "truc" };
    const OTHER_ENTITY = { id: "id2", a: 2, b: "truc", c: true };
    const persistence = createEntityInMemoryRepository();
    const store = createTenantCache({
      createSchemaChangeHandler: createLocalSchemaChangeHandler(),
    });
    const core = createEntityCore({ persistence });
    core.setCache(store);
    await core.createOrUpdateEntity({
      entityName: "testEntity",
      entity: ENTITY,
      tenant: "",
    });
    await core.createOrUpdateEntity({
      entityName: "testEntity",
      entity: OTHER_ENTITY,
      tenant: "",
    });
    const computedSchema = {
      ...jsonToJsonSchema(OTHER_ENTITY),
      title: "testEntity",
    };
    const existingSchema = core.getEntitySchema("testEntity", "");
    assertEquals(computedSchema, existingSchema);
  }
);

Deno.test(
  async function updateSchemaIfAddingNewEntityWithDifferentPropertiesAndMergeOption() {
    const ENTITY = { id: "id", a: 2, b: "truc", d: false };
    const OTHER_ENTITY = { id: "id2", a: "truc", b: "truc", c: true };
    const persistence = createEntityInMemoryRepository();
    const store = createTenantCache({
      createSchemaChangeHandler: createLocalSchemaChangeHandler(),
    });
    const core = createEntityCore({ persistence });
    core.setCache(store);
    await core.createOrUpdateEntity({
      entityName: "testEntity",
      entity: ENTITY,
      tenant: "",
    });
    await core.createOrUpdateEntity({
      entityName: "testEntity",
      entity: OTHER_ENTITY,
      tenant: "",
      options: {
        schemaReconciliationMode: "merge",
      },
    });
    const computedSchema = {
      ...jsonToJsonSchema({ ...ENTITY, ...OTHER_ENTITY }),
      title: "testEntity",
    };
    const existingSchema = core.getEntitySchema("testEntity", "");
    assertEquals(computedSchema, existingSchema);
  }
);

Deno.test(async function returnsErrorIfEntityCreatedOrUpdatedDoesntHaveId() {
  const ENTITY = { a: 2, b: "truc" };
  const persistence = createEntityInMemoryRepository();
  const store = createTenantCache({
    createSchemaChangeHandler: createLocalSchemaChangeHandler(),
  });
  const core = createEntityCore({ persistence });
  core.setCache(store);
  const result = await core.createOrUpdateEntity({
    entityName: "testEntity",
    entity: ENTITY,
    tenant: "",
  });
  assertEquals(result._unsafeUnwrapErr(), { error: "MISSING_ID_ON_ENTITY" });
});

Deno.test(
  async function doesntUpdateSchemaOrStoreInRepositoryIfAddingEntityWithTransientOption() {
    const ENTITY = { id: "id", a: 2, b: "truc", d: false };
    const persistence = createEntityInMemoryRepository();
    const store = createTenantCache({
      createSchemaChangeHandler: createLocalSchemaChangeHandler(),
    });
    const saveEntityPersistenceSpy = spy(persistence, "createOrUpdateEntity");
    const core = createEntityCore({ persistence });
    core.setCache(store);
    await core.createOrUpdateEntity({
      entityName: "testEntity",
      entity: ENTITY,
      tenant: "tenant",
      options: { transient: false },
    });
    assertSpyCall(saveEntityPersistenceSpy, 0);
  }
);

Deno.test(async function canAddMultipleEntitiesAtTheSameTime() {
  const ENTITY = { id: "id", a: 2, b: "truc", d: false };
  const OTHER_ENTITY = { id: "id2", a: "truc", b: "truc", c: true };
  const persistence = createEntityInMemoryRepository();
  const store = createTenantCache({
    createSchemaChangeHandler: createLocalSchemaChangeHandler(),
  });

  const core = createEntityCore({ persistence });
  core.setCache(store);
  await core.createOrUpdateEntityList({
    tenant: "tenant",
    entityName: "entity",
    entityList: [ENTITY, OTHER_ENTITY],
  });
  assertEquals(core.getEntitySchema("entity", "tenant"), {
    title: "entity",
    type: "object",
    properties: {
      id: { type: "string" },
      a: { type: "string" },
      b: { type: "string" },
      d: { type: "boolean" },
      c: { type: "boolean" },
    },
  });
  assertEquals(
    (
      await core.getEntityList({
        entityName: "entity",
        tenant: "tenant",
        query: "{}",
      })
    ).length,
    2
  );
});
