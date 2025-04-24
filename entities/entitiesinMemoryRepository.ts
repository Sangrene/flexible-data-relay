import { JSONSchema7 } from "../json-schema/jsonSchemaTypes.ts";
import { Entity, EntityRepository } from "./entities.persistence.ts";

export const createEntityInMemoryRepository = (): EntityRepository => {
  const inMemoryStore: {
    [tenant: string]: { schemas: JSONSchema7[]; [entityName: string]: any[] };
  } = {};
  const getTenantDb = (tenant: string) => {
    if (!inMemoryStore[tenant]) {
      inMemoryStore[tenant] = {
        schemas: [],
      };
    }
    return inMemoryStore[tenant];
  };
  const getEntityCollection = (tenant: string, entityName: string) => {
    const db = getTenantDb(tenant);
    if (!db[entityName]) {
      inMemoryStore[tenant][entityName] = [];
    }
    return inMemoryStore[tenant][entityName];
  };

  const updateEntity = async ({
    entity,
    entityName,
    tenant,
  }: {
    entityName: string;
    entity: Entity;
    tenant: string;
  }) => {
    const index = getEntityCollection(tenant, entityName).findIndex(
      (item) => item.id === entity.id
    );
    inMemoryStore[tenant][entityName][index] = entity;
  };
  const createEntity = async ({
    entity,
    entityName,
    tenant,
  }: {
    entityName: string;
    entity: Entity;
    tenant: string;
  }) => {
    getEntityCollection(tenant, entityName).push(entity);
  };

  const createOrUpdateEntity = async ({
    entity,
    entityName,
    tenant,
  }: {
    entityName: string;
    entity: Entity;
    tenant: string;
  }) => {
    const index = getEntityCollection(tenant, entityName).findIndex(
      (item) => item.id === entity.id
    );
    if (index >= 0) {
      await updateEntity({ entityName, entity, tenant });
      return {
        action: "updated",
        entity,
      } as const;
    } else {
      await createEntity({ entityName, entity, tenant });
      return {
        action: "created",
        entity,
      } as const;
    }
  };
  return {
    getEntitySchema: async ({
      entityName,
      tenant,
    }: {
      entityName: string;
      tenant: string;
    }) =>
      getTenantDb(tenant).schemas.find((schema) => schema.title === entityName),
    setEntitySchema: async ({
      entityName,
      newSchema,
      tenant,
    }: {
      entityName: string;
      newSchema: JSONSchema7;
      tenant: string;
    }) => {
      const index = getTenantDb(tenant).schemas.findIndex(
        (schema) => schema.title === entityName
      );
      if (index > -1) {
        getTenantDb(tenant).schemas[index] = {
          ...newSchema,
          title: entityName,
        };
      } else {
        getTenantDb(tenant).schemas.push({ ...newSchema, title: entityName });
      }
    },
    getEntity: ({
      entityName,
      id,
      tenant,
    }: {
      entityName: string;
      id: string;
      tenant: string;
    }) => getTenantDb(tenant)[entityName].find((entity) => entity.id === id),
    getEntityList: async ({
      entityName,
      tenant,
    }: {
      entityName: string;
      tenant: string;
    }) => getTenantDb(tenant)[entityName],
    createEntity,
    updateEntity,
    createOrUpdateEntity,
    getAllSchemas: async (tenant: string) => {
      return inMemoryStore[tenant].schemas;
    },
    saveEntityList: async ({ entityList, entityName, tenant }) => {
      return entityList.map((entity) =>
        createOrUpdateEntity({ entity, entityName, tenant })
      );
    },
  };
};
