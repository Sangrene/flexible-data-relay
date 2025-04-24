import { JSONSchema7 } from "../json-schema/jsonSchemaTypes.ts";

export interface Entity {
  id: string;
  data: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface EntityRepository {
  getEntity: (p: {
    entityName: string;
    id: string;
    tenant: string;
  }) => Promise<Entity>;
  getEntityList: (p: {
    entityName: string;
    query: string;
    tenant: string;
  }) => Promise<Entity[]>;
  createEntity: (p: {
    entityName: string;
    entity: Entity;
    tenant: string;
  }) => Promise<any>;
  updateEntity: (p: {
    entityName: string;
    entity: Entity;
    tenant: string;
  }) => Promise<any>;
  createOrUpdateEntity: (p: {
    entityName: string;
    entity: Entity;
    tenant: string;
  }) => Promise<{ action: "created" | "updated"; entity: Entity }>;
  saveEntityList: (p: {
    entityName: string;
    tenant: string;
    entityList: Array<Entity>;
  }) => Promise<any>;
  getEntitySchema: (p: {
    entityName: string;
    tenant: string;
  }) => Promise<JSONSchema7 | undefined>;
  setEntitySchema: (p: {
    entityName: string;
    newSchema: JSONSchema7;
    tenant: string;
  }) => Promise<any>;
  getAllSchemas: (tenant: string) => Promise<JSONSchema7[]>;
}
