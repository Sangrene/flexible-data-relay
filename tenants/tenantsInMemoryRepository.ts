import { JSONSchema7 } from "../json-schema/jsonSchemaTypes.ts";
import { TenantPersistenceHandler } from "./tenant.persistence.ts";

const inMemoryStore: { [id: string]: any[] } = {
  schemas: [],
};

export const tenantInMemoryRepository = (): TenantPersistenceHandler => {
  return {
    getJSONSchemaList: async() => {
      return inMemoryStore.schemas;
    },
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
