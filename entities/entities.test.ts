import { assertEquals } from "https://deno.land/std@0.209.0/assert/assert_equals.ts";
import { createEntityCore as createEntityCore } from "./entity.core.ts";
import { createEntityInMemoryRepository } from "./entitiesinMemoryRepository.ts";
import { createTenantCache } from "../graphql/graphqlSchemasCache.ts";
import { executeSourceAgainstSchema } from "../tenants/graphqlExecutionManager.ts";
import { createTenantCore } from "../tenants/tenant.core.ts";
import { createTenantInMemoryRepository } from "../tenants/tenantsInMemoryRepository.ts";
import { Timeout } from "https://deno.land/x/timeout@2.4/mod.ts";

Deno.test(async function canQueryJustAddedEntityWithGraphQL() {
  const persistence = createEntityInMemoryRepository();
  const entityCore = createEntityCore({ persistence });
  const store = createTenantCache({
    mode: "local",
  });
  const tenantCore = createTenantCore({
    tenantPersistenceHandler: createTenantInMemoryRepository(),
  });
  tenantCore.setCache(store);
  entityCore.setCache(store);
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
  await Timeout.wait(500);
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
    entityCore,
    tenantCore,
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
