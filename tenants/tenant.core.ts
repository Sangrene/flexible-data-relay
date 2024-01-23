import { EntityCore } from "../entities/entity.core.ts";
import { TenantsCache } from "../graphql/graphqlSchemasCache.ts";
import { createGraphqlSchemaFromEntitiesSchema } from "../graphql/jsonToGraphql.ts";
import { Subscription, Tenant } from "./tenant.model.ts";
import { TenantRepository } from "./tenant.persistence.ts";
import {
  createHash,
  randomBytes,
} from "https://deno.land/std@0.110.0/node/crypto.ts";

interface TenantCoreArgs {
  tenantPersistenceHandler: TenantRepository;
}
export const createTenantCore = ({
  tenantPersistenceHandler,
}: TenantCoreArgs) => {
  let tenantsCache: TenantsCache | undefined;

  const getTenantGraphqlSchema = async ({
    tenant,
    entityCore,
  }: {
    tenant: string;
    entityCore: EntityCore;
  }) => {
    if(!tenantsCache) throw new Error("Tenants cache is not set in tenant core.")
    const val = tenantsCache.getTenantCache(tenant);
    const graphqlSchema = createGraphqlSchemaFromEntitiesSchema(
      tenant,
      val.entities.map((entity) => ({
        name: entity.title || "",
        schema: entity,
      })),
      entityCore
    );
    return graphqlSchema;
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
    return await tenantPersistenceHandler.addAllowedAccessToTenant(
      allowedTenantName,
      {
        owner: currentTenantName,
      }
    );
  };

  const createSubscription = async ({
    subscription,
    tenant,
  }: {
    subscription: Omit<Subscription, "key">;
    tenant: Tenant;
  }) => {
    if (!tenant.accessAllowed.some((acc) => acc.owner === subscription.owner))
      throw new Error(
        "You don't have permission to subscribe to this resource"
      );
    const savedSubScription = { ...subscription, key: crypto.randomUUID() };
    await tenantPersistenceHandler.addSubscription({
      subscription: savedSubScription,
      tenantId: tenant._id,
    });

    return savedSubScription;
  };

  const accessGuard = (tenant: Tenant, { owner }: { owner: string }) => {
    if (tenant.name === owner) return true;
    const hasAccess = tenant.accessAllowed.some((item) => item.owner === owner);
    if (!hasAccess) throw new Error("You don't have access to this resource");
    return true;
  };

  const getAllTenants = async () => {
    return tenantPersistenceHandler.getAllTenants();
  };

  const setCache = (cache: TenantsCache) => {
    tenantsCache = cache;
  };

  const getAllSchemas = async (entityCore: EntityCore) => {
    const tenants = await tenantPersistenceHandler.getAllTenants();
    const result = await Promise.all(
      tenants.map(async (tenant) => {
        return {
          schemas: await entityCore.getAllEntitiesSchema(tenant.name),
          tenant,
        };
      })
    );
    const schemas: Record<string, any> = {};
    result.forEach((res) => {
      const graphqlSchema = createGraphqlSchemaFromEntitiesSchema(
        res.tenant.name,
        res.schemas.map((entity) => ({
          name: entity.title || "",
          schema: entity,
        })),
        entityCore
      );
      schemas[res.tenant.name] = {
        entities: res.schemas,
        graphqlSchema,
      };
    });
    return schemas;
  };

  return {
    getTenantGraphqlSchema,
    createTenant,
    getTenantById,
    allowTenantAccessToOwnResource,
    createSubscription,
    accessGuard,
    getAllTenants,
    setCache,
    getAllSchemas,
  };
};

export type TenantCore = ReturnType<typeof createTenantCore>;
