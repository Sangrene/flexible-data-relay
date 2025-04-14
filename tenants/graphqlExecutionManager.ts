import { ExecutionResult, graphql } from "graphql";
import { TenantCore } from "./tenant.core.ts";
import { EntityCore } from "../entities/entity.core.ts";
import { ok, err, Result } from "neverthrow";

export const executeSourceAgainstSchema = ({
  source,
  tenant,
  tenantCore,
  entityCore,
}: {
  tenantCore: TenantCore;
  entityCore: EntityCore;
  tenant: string;
  source: string;
}): Result<
  Promise<ExecutionResult>,
  {
    error: "TENANT_CACHE_NOT_SET_IN_CORE";
  }
> => {
  return tenantCore
    .getTenantGraphqlSchema({
      tenant,
      entityCore,
    })
    .match(
      (schema) => ok(graphql({ schema, source })),
      (e) => err(e)
    );
};
