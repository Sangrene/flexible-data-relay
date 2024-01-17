import { assertEquals } from "https://deno.land/std@0.209.0/assert/assert_equals.ts";
import { entityCore as createEntityCore } from "./entity.core.ts";
import { createEntityInMemoryRepository } from "./entitiesinMemoryRepository.ts";
import { schemaCache } from "../graphql/graphqlSchemasCache.ts";
import { executeSourceAgainstSchema } from "../tenants/tenantSchema.ts";
import { Timeout } from "https://deno.land/x/timeout/mod.ts";

Deno.test(async function canQueryJustAddedEntityWithGraphQL() {
  const persistence = createEntityInMemoryRepository();
  const entityCore = createEntityCore({ persistence });
  const store = schemaCache(persistence);
  await entityCore.createOrUpdateEntity({
    entity: {
      id: "id",
      myString: "String",
      myInt: 12,
      myFloat: 12.4,
    },
    tenant: "tenant",
    entityName: "testEntity",
  });
  const result = await executeSourceAgainstSchema({
    source: `query {
      testEntity(id: "id") {
        id
        myString
        myInt
        myFloat
      }
    }
    `,
    schemasCache: store,
    tenant: "tenant",
  });

  assertEquals(result.data, {
    testEntity: {
      id: "id",
      myString: "String",
      myInt: 12,
      myFloat: 12.4,
    },
  });
});
