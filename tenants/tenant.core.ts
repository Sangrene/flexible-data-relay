import { TenantsCache } from "../graphql/graphqlSchemasCache.ts";
import { Subscription, Tenant } from "./tenant.model.ts";
import { TenantRepository } from "./tenant.persistence.ts";
import {
  createHash,
  randomBytes,
} from "https://deno.land/std@0.110.0/node/crypto.ts";

interface TenantCoreArgs {
  tenantPersistenceHandler: TenantRepository;
  graphqlCacheSchemas: TenantsCache;
}
export const createTenantCore = ({
  graphqlCacheSchemas,
  tenantPersistenceHandler,
}: TenantCoreArgs) => {
  const getTenantGraphqlSchema = async ({ tenant }: { tenant: string }) => {
    return graphqlCacheSchemas.getTenantSchema(tenant);
  };

  const createTenant = async (tenantName: string) => {
    const secret = randomBytes(64).toString("hex");
    const hash = createHash("md5").update(secret).digest("hex") as string;
    const tenant = await tenantPersistenceHandler.createTenant({
      name: tenantName,
      lastSecret: secret,
      lastSecretHash: hash,
      accessAllowed: [],
      subscriptions: [],
    });
    return tenant;
  };

  const getTenantById = async (id: string) => {
    return await tenantPersistenceHandler.getTenantById(id);
  };

  const allowTenantAccessToOwnResource = async ({
    currentTenantName,
    allowedTenantName,
  }: {
    allowedTenantName: string;
    currentTenantName: string;
  }) => {
    return await tenantPersistenceHandler.addAllowedAccessToTenant(allowedTenantName, {
      owner: currentTenantName,
    });
  };

  const createSubscription = async ({
    subscription,
    tenant,
  }: {
    subscription: Subscription;
    tenant: Tenant;
  }) => {
    if (!tenant.accessAllowed.some((acc) => acc.owner === subscription.owner))
      throw new Error(
        "You don't have permission to subscribe to this resource"
      );
    return await tenantPersistenceHandler.addSubscription({
      subscription,
      tenantId: tenant._id,
    });
  };

  const accessGuard = (tenant: Tenant, { owner }: { owner: string }) => {
    if (tenant.name === owner) return true;;
    const hasAccess = tenant.accessAllowed.some((item) => item.owner === owner);
    if (!hasAccess) throw new Error("You don't have access to this resource");
    return true;
  };

  return {
    getTenantGraphqlSchema,
    createTenant,
    getTenantById,
    allowTenantAccessToOwnResource,
    createSubscription,
    accessGuard,
  };
};

export type TenantCore = ReturnType<typeof createTenantCore>;
