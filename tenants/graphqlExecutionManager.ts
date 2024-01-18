import { graphql } from "graphql";
import { TenantsCache } from "../graphql/graphqlSchemasCache.ts";

export const executeSourceAgainstSchema = async ({
  source,
  tenant,
  schemasCache,
}: {
  schemasCache: TenantsCache;
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
