import { ExecutionResult, graphql } from "graphql";
import { TenantCore } from "./tenant.core.ts";
import { EntityCore } from "../entities/entity.core.ts";
import { Tenant } from "./tenant.model.ts";
export const executeSourceAgainstSchema = ({
  source,
  tenant,
  tenantCore,
  entityCore,
  tenantRequestingAccess,
}: {
  tenantCore: TenantCore;
  entityCore: EntityCore;
  tenant: string;
  tenantRequestingAccess: Tenant;
  source: string;
}): Promise<ExecutionResult> => {
  return graphql({
    schema: tenantCore.getTenantGraphqlSchema({
      tenant,
      entityCore,
      tenantRequestingAccess,
    }),
    source,
  });
};
