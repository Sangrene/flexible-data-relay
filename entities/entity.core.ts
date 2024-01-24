import { eventBus } from "../event/eventBus.ts";
import { jsonToJsonSchema } from "../json-schema/jsonToJsonSchema.ts";
import { EntityRepository } from "./entities.persistence.ts";
import isEqual from "https://deno.land/x/lodash@4.17.4-es/isEqual.js";
import deepMerge from "deepmerge";
import { TenantsCache } from "../graphql/graphqlSchemasCache.ts";

interface EntityCoreArgs {
  persistence: EntityRepository;
}

export const createEntityCore = ({ persistence }: EntityCoreArgs) => {
  let tenantsCache: TenantsCache | undefined;

  const processNewEntitySchema = async ({
    entity,
    entityName,
    tenant,
    options,
  }: {
    entityName: string;
    entity: object & { id: string };
    tenant: string;
    options: {
      schemaReconciliationMode: "merge" | "override";
    };
  }) => {
    if (!tenantsCache) throw new Error("Tenants cache was not set");
    const existingSchema = tenantsCache.getEntitySchemaFromCache(
      tenant,
      entityName
    );
    let computedJsonSchema = {
      ...jsonToJsonSchema(entity),
      title: entityName,
    };

    if (!isEqual(computedJsonSchema, existingSchema)) {
      if (options.schemaReconciliationMode === "merge" && existingSchema) {
        computedJsonSchema = deepMerge(existingSchema, computedJsonSchema);
      }
      persistence.setEntiySchema({
        tenant,
        entityName,
        newSchema: computedJsonSchema,
      });
      eventBus.publish({
        queue: "entity-schema.updated",
        message: { schema: computedJsonSchema, tenant },
      });
    }
  };

  const createOrUpdateEntity = async ({
    entity,
    entityName,
    tenant,
    options = {
      schemaReconciliationMode: "override",
    },
  }: {
    entityName: string;
    entity: any & { id: string };
    tenant: string;
    options?: {
      schemaReconciliationMode: "merge" | "override";
    };
  }) => {
    if (!entity.id)
      throw new Error(
        "Entity should have an 'id' field that serves as identifier"
      );
    const { action } = await persistence.createOrUpdateEntity({
      tenant,
      entityName,
      entity,
    });
    processNewEntitySchema({ entityName, entity, tenant, options });
    eventBus.publish({ queue: `entity.${action}`, message: { entity } });
    return entity;
  };

  const getEntitySchema = (entityName: string, tenant: string) => {
    return tenantsCache?.getEntitySchemaFromCache(tenant, entityName);
  };

  const getAllEntitiesSchema = (tenant: string) => {
    return persistence.getAllSchemas(tenant);
  };

  const getEntityById = (p: {
    entityName: string;
    id: string;
    tenant: string;
  }) => {
    return persistence.getEntity(p);
  };

  const getEntityList = async (p: {
    entityName: string;
    query: string;
    tenant: string;
  }) => {
    return persistence.getEntityList(p);
  };

  return {
    createOrUpdateEntity,
    getEntitySchema,
    getAllEntitiesSchema,
    getEntityById,
    getEntityList,
    setCache: (cache: TenantsCache) => {
      tenantsCache = cache;
    },
  };
};

export type EntityCore = ReturnType<typeof createEntityCore>;
