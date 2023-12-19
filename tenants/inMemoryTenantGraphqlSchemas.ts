import { GraphQLSchema } from "graphql";

export const schemasInMemoryStore = () => {
  const schemas: { [tenant: string]: GraphQLSchema } = {};

  const setSchema = (tenant: string, schema: GraphQLSchema) => {
    schemas[tenant] = schema;
    return schemas;
  };

  const setSchemas = (
    newSchemas: { tenant: string; schema: GraphQLSchema }[]
  ) => {
    newSchemas.forEach((schema) => {
      schemas[schema.tenant] = schema.schema;
    });
    return newSchemas;
  };

  return {
    schemas,
    setSchema,
    setSchemas,
  };
};

export type SchemaInMemoryStore = ReturnType<typeof schemasInMemoryStore>;
