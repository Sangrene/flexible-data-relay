import { eventBus } from "../event/eventBus.ts";
import { JSONSchema7 } from "../json-schema/jsonSchemaTypes.ts";

type CacheContent = {
  [tenant: string]: { entities: JSONSchema7[] };
};
export const createTenantCache = async (initContent?: CacheContent) => {
  const schemas: CacheContent = initContent || {};

  const getTenantValue = (tenant: string) => {
    if (!schemas[tenant]) {
      schemas[tenant] = {
        entities: [],
      };
    }
    return schemas[tenant];
  };

  const getTenantCache = (tenant: string) => {
    return schemas[tenant];
  };

  eventBus.subscribe({
    queue: "entity-schema.updated",
    callback: ({ schema, tenant }) => {
      const val = getTenantValue(tenant);
      const index = val.entities.findIndex(
        (entity) => entity.title === schema.title
      );
      if (index > -1) {
        val.entities[index] = schema;
      } else {
        val.entities.push(schema);
      }
    },
  });

  return {
    getTenantCache,
  };
};

export type TenantsCache = Awaited<ReturnType<typeof createTenantCache>>;
