import { Db } from "mongodb";
import { EntityPersistenceHandler } from "./entities.persistence.ts";
import { JSONSchema7 } from "../json-schema/jsonSchemaTypes.ts";

const SCHEMAS_COLLECTION = "schemas";
const entitiesMongoRepository = ({
  getTenantDb,
}: {
  getTenantDb: (tenant: string) => Db;
}): EntityPersistenceHandler => {
  return {
    getEntity: async ({ entityName, id, tenant }) => {
      const collection = getTenantDb(tenant).collection(entityName);
      const result = (await collection.findOne({ id })) as any;
      return result;
    },
    createEntity: async ({ entity, entityName, tenant }) => {
      const collection = getTenantDb(tenant).collection(entityName);
      const savedEntity = await collection.insertOne({ ...entity });
      return savedEntity;
    },
    createOrUpdateEntity: async ({ entity, entityName, tenant }) => {
      const collection = getTenantDb(tenant).collection(entityName);
      const savedEntity = await collection.updateOne(
        { id: entity.id },
        { ...entity },
        { upsert: true }
      );
      return savedEntity;
    },
    getEntityList: async ({ entityName, query, tenant }) => {
      const collection = getTenantDb(tenant).collection(entityName);
      const result = (await collection
        .find(JSON.parse(query))
        .toArray()) as any[];
      return result;
    },
    getEntitySchema: async ({ entityName, tenant }) => {
      const collection = getTenantDb(tenant).collection(SCHEMAS_COLLECTION);
      const schema = (await collection.findOne({
        title: entityName,
      })) as JSONSchema7;
      return schema;
    },
    setEntiySchema: async ({ entityName, newSchema, tenant }) => {
      const collection = getTenantDb(tenant).collection(SCHEMAS_COLLECTION);
      const schema = await collection.updateOne(
        { title: entityName },
        { ...newSchema, title: entityName },
        { upsert: true }
      );
      return schema;
    },
    updateEntity: async ({ entity, entityName, tenant }) => {
      const collection = getTenantDb(tenant).collection(entityName);
      const savedEntity = await collection.updateOne(
        { id: entity.id },
        { ...entity }
      );
      return savedEntity;
    },
  };
};
