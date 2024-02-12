import { Db } from "mongodb";
import { EntityRepository } from "./entities.persistence.ts";
import { JSONSchema7 } from "../json-schema/jsonSchemaTypes.ts";

const SCHEMAS_COLLECTION = "schemas";
export const createEntitiesMongoRepository = ({
  getTenantDb,
}: {
  getTenantDb: (tenant: string) => Db;
}): EntityRepository => {
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
      const { matchedCount, upsertedId } = await collection.updateOne(
        { id: entity.id },
        { $set: { ...entity } },
        { upsert: true }
      );

      return {
        entity: { ...entity, _id: upsertedId?.toString() },
        action: matchedCount > 0 ? "updated" : "created",
      };
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
    setEntitySchema: async ({ entityName, newSchema, tenant }) => {
      const collection = getTenantDb(tenant).collection(SCHEMAS_COLLECTION);
      const schema = await collection.updateOne(
        { title: entityName },
        { $set: { ...newSchema, title: entityName } },
        { upsert: true }
      );
      return schema;
    },
    updateEntity: async ({ entity, entityName, tenant }) => {
      const collection = getTenantDb(tenant).collection(entityName);
      const savedEntity = await collection.updateOne(
        { id: entity.id },
        { $set: { ...entity } }
      );
      return savedEntity;
    },
    getAllSchemas: async (tenant) => {
      const collection = getTenantDb(tenant).collection(SCHEMAS_COLLECTION);
      const result = (await collection.find({}).toArray()) as any;
      return result;
    },
    saveEntityList: async ({ entityList, entityName, tenant }) => {
      const collection = getTenantDb(tenant).collection(entityName);
      const bulk = collection.initializeUnorderedBulkOp();
      entityList.map((entity) => {
        bulk
          .find({ id: entity.id })
          .upsert()
          .replaceOne({ ...entity });
      });
      const result = await bulk.execute();

      return {
        inserted: result.insertedCount,
        updated: result.matchedCount,
        result: result.getRawResponse(),
      };
    },
  };
};
