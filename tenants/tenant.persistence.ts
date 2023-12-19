import { JSONSchema7 } from "../json-schema/jsonSchemaTypes.ts";

export interface TenantPersistenceHandler {
  getEntityJSONSchema: (entityName: string) => Promise<JSONSchema7>;
  getJSONSchemaList: () => Promise<JSONSchema7[]>;
  createEntityJSONSchema: (
    entityName: string,
    schema: JSONSchema7
  ) => Promise<JSONSchema7>;
  updateEntityJSONSchema: (
    entityName: string,
    schema: JSONSchema7
  ) => Promise<JSONSchema7>;
}
