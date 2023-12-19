import { JSONSchema7 } from "../../json-schema/jsonSchemaTypes.ts";
import { EntityPersistenceHandler } from "./entities.persistence.ts";

const inMemoryStore: { [id: string]: any[] } = {
  schemas: [],
};

export const inMemoryRepository = (tenant: string): EntityPersistenceHandler => {
  return {
    getEntity: (entityName: string, id: string) =>
      inMemoryStore[entityName].find((entity) => entity.id === id),
    getEntityList: async (entityName: string) => inMemoryStore[entityName],
    getEntityJSONSchema: (entityName: string) =>
      inMemoryStore.schemas.find((schema) => schema.title === entityName),
    createEntityJSONSchema: async (entityName: string, schema: JSONSchema7) => {
      const savedSchema = { ...schema, title: entityName };
      inMemoryStore.schemas.push({ ...schema, title: entityName });
      return savedSchema;
    },
    updateEntityJSONSchema: async (
      entityName: string,
      newSchema: JSONSchema7
    ) => {
      const index = inMemoryStore.schemas.findIndex(
        (schema) => schema.title === entityName
      );
      const savedSchema = { ...newSchema, title: entityName };
      inMemoryStore.schemas[index] = savedSchema;
      return savedSchema;
    },
  };
};
