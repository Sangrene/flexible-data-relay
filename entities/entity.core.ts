import { eventBus } from "../event/eventBus.ts";
import { jsonToJsonSchema } from "../json-schema/jsonToJsonSchema.ts";
import { EntityRepository } from "./entities.persistence.ts";
import isEqual from "https://deno.land/x/lodash@4.17.4-es/isEqual.js";

interface EntityCoreArgs {
  persistence: EntityRepository;
}
export const createEntityCore = ({ persistence }: EntityCoreArgs) => {
  const processNewEntitySchema = async ({
    entity,
    entityName,
    tenant,
  }: {
    entityName: string;
    entity: object & { id: string };
    tenant: string;
  }) => {
    const computedJsonSchema = {
      ...jsonToJsonSchema(entity),
      title: entityName,
    };
    const existingSchema = await persistence.getEntitySchema({
      entityName,
      tenant,
    });
    if (!isEqual(computedJsonSchema, existingSchema)) {
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
  }: {
    entityName: string;
    entity: any & { id: string };
    tenant: string;
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
    processNewEntitySchema({ entityName, entity, tenant });
    eventBus.publish({ queue: `entity.${action}`, message: { entity } });
    return entity;
  };

  const getEntitySchema = (entityName: string, tenant: string) => {
    return persistence.getEntitySchema({ tenant, entityName });
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
  };
};

export type EntityCore = ReturnType<typeof createEntityCore>;
