import { assertEquals } from "https://deno.land/std@0.209.0/assert/assert_equals.ts";
import { createEntityCore as createEntityCore } from "./entity.core.ts";
import { createEntityInMemoryRepository } from "./entitiesinMemoryRepository.ts";
import {
  createLocalSchemaChangeHandler,
  createTenantCache,
} from "../graphql/graphqlSchemasCache.ts";
import { executeSourceAgainstSchema } from "../tenants/graphqlExecutionManager.ts";
import { createTenantCore } from "../tenants/tenant.core.ts";
import { createTenantInMemoryRepository } from "../tenants/tenantsInMemoryRepository.ts";
import { loadEnv } from "../env/loadEnv.ts";
import { Timeout } from "https://deno.land/x/timeout/mod.ts";

Deno.test(async function canQueryJustAddedOwnEntityWithGraphQL() {
  const persistence = createEntityInMemoryRepository();
  const entityCore = createEntityCore({ persistence });
  const store = createTenantCache({
    createSchemaChangeHandler: createLocalSchemaChangeHandler(),
  });
  const tenantCore = createTenantCore({
    tenantPersistenceHandler: createTenantInMemoryRepository(),
    env: loadEnv(),
  });
  tenantCore.setCache(store);
  entityCore.setCache(store);
  const tenant = await tenantCore.createTenant("tenant");
  await entityCore.createOrUpdateEntity({
    entity: {
      id: "id",
      data: {
        myString: "String",
        myInt: 12,
        myFloat: 12.4,
      },
    },
    tenant: "tenant",
    entityName: "testEntity",
  });
  await Timeout.wait(500);
  const result = executeSourceAgainstSchema({
    source: `query {
      testEntity(id: "id") {
        id
        data {
          myString
          myInt
          myFloat
        }
      }
    }
    `,
    entityCore,
    tenantCore,
    tenant: "tenant",
    tenantRequestingAccess: tenant,
  });
  assertEquals((await result).data, {
    testEntity: {
      id: "id",
      data: {
        myString: "String",
        myInt: 12,
        myFloat: 12.4,
      },
    },
  });
});

