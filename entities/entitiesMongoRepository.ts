import { Db } from "mongodb";
import { EntityPersistenceHandler } from "./entities.persistence.ts";
import { JSONSchema7 } from "../json-schema/jsonSchemaTypes.ts";

const SCHEMAS_COLLECTION = "schemas";
const entitiesMongoRepository = (db: Db): EntityPersistenceHandler => {
  // const createEntityJSONSchema = async (
  //   entityName: string,
  //   schema: JSONSchema7
  // ) => {
  //   const collections = db.collection("schemas");
  //   const savedSchema = { ...schema, title: entityName };
  //   await collections.insertOne(savedSchema);
  //   return savedSchema;
  // };

  const getEntity = async (entityName: string, id: string) => {
    const collection = db.collection(entityName);
    const result = await collection.findOne({ id });
    return result;
  };
  return {
    getEntity,
  };
};
