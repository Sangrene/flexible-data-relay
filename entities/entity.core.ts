import { eventBus } from "../event/eventBus.ts";
import { jsonToJsonSchema } from "../json-schema/jsonToJsonSchema.ts";
import { EntityRepository, Entity } from "./entities.persistence.ts";
import isEqual from "https://deno.land/x/lodash@4.17.4-es/isEqual.js";
import deepMerge from "deepmerge";
import { TenantsCache } from "../graphql/graphqlSchemasCache.ts";
import { JSONSchema7 } from "../json-schema/jsonSchemaTypes.ts";
import { err, ok, Result } from "neverthrow";

interface EntityCoreArgs {
  persistence: EntityRepository;
}

export const createEntityCore = ({ persistence }: EntityCoreArgs) => {
  let tenantsCache: TenantsCache | undefined;

  const processNewEntitySchema = async ({
    schema,
    entityName,
    tenant,
    schemaReconciliationMode = "override",
  }: {
    entityName: string;
    schema: JSONSchema7;
    tenant: string;
    schemaReconciliationMode?: "merge" | "override";
  }) => {
    if (!tenantsCache) throw new Error("Tenants cache was not set");
    const existingSchema = tenantsCache.getEntitySchemaFromCache(
      tenant,
      entityName
    );

    if (!isEqual(schema, existingSchema)) {
      if (schemaReconciliationMode === "merge" && existingSchema) {
        console.log(existingSchema);
        console.log(schema);
        schema = {
          ...schema,
          properties: {
            ...existingSchema.properties,
            data: deepMerge(
              existingSchema.properties?.["data"] || {},
              schema.properties?.["data"] || {}
            ),
          },
        };
        console.log(schema);
      }
      persistence.setEntitySchema({
        tenant,
        entityName,
        newSchema: schema,
      });
      eventBus.publish({
        queue: "entity-schema.updated",
        message: { schema: schema, tenant },
      });
    }
  };

  const createOrUpdateEntity = async ({
    entity,
    entityName,
    tenant,
    options = {
      schemaReconciliationMode: "override",
      transient: false,
    },
  }: {
    entityName: string;
    entity: Omit<Entity, "createdAt" | "updatedAt">;
    tenant: string;
    options?: {
      schemaReconciliationMode?: "merge" | "override";
      transient?: boolean;
    };
  }): Promise<
    Result<any & { id: string }, { error: "MISSING_ID_ON_ENTITY" }>
  > => {
    if (!entity.id) {
      return err({ error: "MISSING_ID_ON_ENTITY" });
    }

    const entitySchema: JSONSchema7 = {
      title: entityName,
      ...jsonToJsonSchema(entity),
    };

    let action: "created" | "updated" = "created";
    if (!options.transient) {
      const result = await persistence.createOrUpdateEntity({
        tenant,
        entityName,
        entity: {
          ...entity,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      action = result.action;
    }
    processNewEntitySchema({
      entityName,
      schema: entitySchema,
      tenant,
      schemaReconciliationMode: options.schemaReconciliationMode,
    });
    eventBus.publish({ queue: `entity.${action}`, message: { entity } });
    return ok(entity);
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

  const createOrUpdateEntityList = async ({
    entityList,
    entityName,
    tenant,
    options = {
      schemaReconciliationMode: "override",
      transient: false,
    },
  }: {
    entityName: string;
    tenant: string;
    entityList: Array<Omit<Entity, "createdAt" | "updatedAt">>;
    options?: {
      schemaReconciliationMode?: "merge" | "override";
      transient?: boolean;
    };
  }) => {
    const mergedSchema = entityList.reduce<JSONSchema7>(
      (acc, entity) => deepMerge(acc, jsonToJsonSchema(entity)),
      { title: entityName }
    );
    if (!options.transient) {
      await persistence.saveEntityList({
        tenant,
        entityName,
        entityList: entityList.map((entity) => ({
          ...entity,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      });
    }
    processNewEntitySchema({
      entityName,
      schema: mergedSchema,
      tenant,
      schemaReconciliationMode: options.schemaReconciliationMode,
    });
    entityList.map((entity) => {
      eventBus.publish({ queue: `entity.created`, message: { entity } });
    });
    return entityList;
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
    createOrUpdateEntityList,
  };
};

export type EntityCore = ReturnType<typeof createEntityCore>;
