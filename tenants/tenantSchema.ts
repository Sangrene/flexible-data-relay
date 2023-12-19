import { GraphQLError, graphql } from "graphql";
import { createGraphqlSchemaFromEntitiesSchema } from "../graphql/jsonToGraphql.ts";
import { TenantPersistenceHandler } from "./tenant.persistence.ts";
import { EntityPersistenceHandler } from "../entities/entities.persistence.ts";
import { SchemaInMemoryStore } from "./inMemoryTenantGraphqlSchemas.ts";

export const getTenantSchema = async ({
  entityPersistenceHandler,
  tenant,
  tenantPersistenceHandler,
}: {
  tenant: string;
  tenantPersistenceHandler: TenantPersistenceHandler;
  entityPersistenceHandler: EntityPersistenceHandler;
}) => {
  const entitiesSchema = await tenantPersistenceHandler.getJSONSchemaList();
  const graphqlSchema = createGraphqlSchemaFromEntitiesSchema(
    entitiesSchema.map((schema) => ({ schema, name: schema.title || "" })),
    entityPersistenceHandler
  );
  return graphqlSchema;
};

export const executeSourceAgainstSchema = async ({
  source,
  store,
  tenant,
}: {
  store: SchemaInMemoryStore;
  tenant: string;
  source: string;
}) => {
  const { schemas } = store;
  const schema = schemas[tenant];
  if (!schema) return new GraphQLError(`No tenant associated with ${tenant}`);
  return graphql({
    schema: schemas[tenant],
    source,
  });
};
