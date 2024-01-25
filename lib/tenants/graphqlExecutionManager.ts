import { graphql } from "graphql";
import { TenantCore } from "./tenant.core.ts";
import { EntityCore } from "../entities/entity.core.ts";

export const executeSourceAgainstSchema = async ({
  source,
  tenant,
  tenantCore,
  entityCore,
}: {
  tenantCore: TenantCore;
  entityCore: EntityCore;
  tenant: string;
  source: string;
}) => {
  const schema = await tenantCore.getTenantGraphqlSchema({
    tenant,
    entityCore,
  });
  if (!schema) throw new Error(`No tenant associated with ${tenant}`);
  return graphql({
    schema,
    source,
  });
};
