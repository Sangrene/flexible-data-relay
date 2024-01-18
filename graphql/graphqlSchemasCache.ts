import { GraphQLSchema } from "graphql";
import { eventBus } from "../event/eventBus.ts";
import { JSONSchema7 } from "../json-schema/jsonSchemaTypes.ts";
import { createGraphqlSchemaFromEntitiesSchema } from "./jsonToGraphql.ts";
import { EntityPersistenceHandler } from "../entities/entities.persistence.ts";
import { TenantRepository } from "../tenants/tenant.persistence.ts";
import { logger } from "../logging/logger.ts";

export const createTenantCache = async (
  entityPersistence: EntityPersistenceHandler,
  tenantPersistence?: TenantRepository
) => {
  const schemas: {
    [tenant: string]: { entities: JSONSchema7[]; graphqlSchema: GraphQLSchema };
  } = {};
  const loadAllSchemas = async (tenantRepo: TenantRepository) => {
    const tenants = await tenantRepo.getAllTenants();
    const result = await Promise.all(
      tenants.map(async (tenant) => {
        return {
          schemas: await entityPersistence.getAllSchemas(tenant.name),
          tenant,
        };
      })
    );
    result.forEach((res) => {
      const graphqlSchema = createGraphqlSchemaFromEntitiesSchema(
        res.tenant.name,
        res.schemas.map((entity) => ({
          name: entity.title || "",
          schema: entity,
        })),
        entityPersistence
      );
      schemas[res.tenant.name] = {
        entities: res.schemas,
        graphqlSchema,
      };
    });
    logger.info(`Loaded ${tenants.length} tenants schema in cache.`);
  };
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
        entityPersistence
      );
      val.graphqlSchema = graphqlSchema;
    },
  });
  if (tenantPersistence) {
    await loadAllSchemas(tenantPersistence);
  }
  return {
    getTenantSchema,
  };
};

export type TenantsCache = Awaited<ReturnType<typeof createTenantCache>>;
