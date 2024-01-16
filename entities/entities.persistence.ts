import { JSONSchema7 } from "../json-schema/jsonSchemaTypes.ts";

export interface EntityPersistenceHandler {
  getEntity: <T>(p: {
    entityName: string;
    id: string;
    tenant: string;
  }) => Promise<T>;
  getEntityList: <T>(p: {
    entityName: string;
    query: string;
    tenant: string;
  }) => Promise<T[]>;
  createEntity: (p: {
    entityName: string;
    entity: object & { id: string };
    tenant: string;
  }) => Promise<any>;
  updateEntity: (p: {
    entityName: string;
    entity: object & { id: string };
    tenant: string;
  }) => Promise<any>;
  createOrUpdateEntity: (p: {
    entityName: string;
    entity: object & { id: string };
    tenant: string;
  }) => Promise<any>;
  getEntitySchema: (p: {
    entityName: string;
    tenant: string;
  }) => Promise<JSONSchema7 | undefined>;
  setEntiySchema: (p: {
    entityName: string;
    newSchema: JSONSchema7;
    tenant: string;
  }) => Promise<any>;
}
