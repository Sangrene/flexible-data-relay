import { Db } from "mongodb";
import { EntityPersistenceHandler } from "./entities.persistence.ts";
import { JSONSchema7 } from "../../json-schema/jsonSchemaTypes.ts";

const SCHEMAS_COLLECTION = "schemas";
const entitiesMongoRepository = (
  tenant: string,
  db: Db
): EntityPersistenceHandler => {
  const createEntityJSONSchema = async (
    entityName: string,
    schema: JSONSchema7
  ) => {
    const collections = db.collection("schemas");
    const savedSchema = { ...schema, title: entityName };
    await collections.insertOne(savedSchema);
    return savedSchema;
  };
  return {
    createEntityJSONSchema,
  };
};
