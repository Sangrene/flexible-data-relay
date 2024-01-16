import { GraphQLError, graphql } from "graphql";
import { GraphqlSchemasCache } from "../graphql/graphqlSchemasCache.ts";

export const executeSourceAgainstSchema = async ({
  source,
  tenant,
  schemasCache,
}: {
  schemasCache: GraphqlSchemasCache;
  tenant: string;
  source: string;
}) => {
  const schema = schemasCache.getTenantSchema(tenant);
  if (!schema) throw new Error(`No tenant associated with ${tenant}`);
  return graphql({
    schema: schema.graphqlSchema,
    source,
  });
};
