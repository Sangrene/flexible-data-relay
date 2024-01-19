import { GraphQLSchema } from "graphql";
import { eventBus } from "../event/eventBus.ts";
import { JSONSchema7 } from "../json-schema/jsonSchemaTypes.ts";
import { createGraphqlSchemaFromEntitiesSchema } from "./jsonToGraphql.ts";
import { EntityCore } from "../entities/entity.core.ts";

type CacheContent = {
  [tenant: string]: { entities: JSONSchema7[]; graphqlSchema: GraphQLSchema };
};
export const createTenantCache = async (
  entityCore: EntityCore,
  initContent?: CacheContent
) => {
  const schemas: CacheContent = initContent || {};

  const getTenantValue = (tenant: string) => {
    if (!schemas[tenant]) {
      schemas[tenant] = {
        entities: [],
        graphqlSchema: new GraphQLSchema({}),
      };
    }
    return schemas[tenant];
  };

  const getTenantSchema = (tenant: string) => {
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
      const graphqlSchema = createGraphqlSchemaFromEntitiesSchema(
        tenant,
        val.entities.map((entity) => ({
          name: entity.title || "",
          schema: entity,
        })),
        entityCore
      );
      val.graphqlSchema = graphqlSchema;
    },
  });

  return {
    getTenantSchema,
  };
};

export type TenantsCache = Awaited<ReturnType<typeof createTenantCache>>;
