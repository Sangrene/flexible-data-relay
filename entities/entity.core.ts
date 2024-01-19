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
    await persistence.createOrUpdateEntity({ tenant, entityName, entity });
    processNewEntitySchema({ entityName, entity, tenant });
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

  return {
    createOrUpdateEntity,
    getEntitySchema,
    getAllEntitiesSchema,
    getEntityById,
  };
};

export type EntityCore = ReturnType<typeof createEntityCore>;
