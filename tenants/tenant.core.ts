import { EntityCore } from "../entities/entity.core.ts";
import { TenantsCache } from "../graphql/graphqlSchemasCache.ts";
import { createGraphqlSchemaFromEntitiesSchema } from "../graphql/jsonToGraphql.ts";
import { Access, Subscription, Tenant } from "./tenant.model.ts";
import { TenantRepository } from "./tenant.persistence.ts";
import {
  createHash,
  randomBytes,
} from "https://deno.land/std@0.110.0/node/crypto.ts";
import { Result, err, ok } from "neverthrow";

interface TenantCoreArgs {
  tenantPersistenceHandler: TenantRepository;
}
export const createTenantCore = ({
  tenantPersistenceHandler,
}: TenantCoreArgs) => {
  let tenantsCache: TenantsCache | undefined;

  const getTenantGraphqlSchema = ({
    tenant,
    entityCore,
    tenantRequestingAccess,
  }: {
    tenant: string;
    tenantRequestingAccess: Tenant;
    entityCore: EntityCore;
  }) => {
    if (!tenantsCache) {
      throw new Error("CACHE_NOT_SET_IN_TENANT_CORE");
    }
    const requestTenantAllowedEntities =
      tenantRequestingAccess.accessAllowed.filter(
        (item) => item.owner === tenant
      );
    const val = tenantsCache.getTenantCache(tenant);
    const graphqlSchema = createGraphqlSchemaFromEntitiesSchema(
      tenant,
      (tenant === tenantRequestingAccess.name
        ? val.entities
        : val.entities?.filter((entity) =>
            requestTenantAllowedEntities.some(
              (item) => item.entityName === entity.title
            )
          )
      )?.map((entity) => ({
        name: entity.title || "",
        schema: entity,
      })) || [],
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
    entityName,
  }: {
    allowedTenantName: string;
    currentTenantName: string;
    entityName: string;
  }) => {
    return await tenantPersistenceHandler.addAllowedAccessToTenant(
      allowedTenantName,
      {
        owner: currentTenantName,
        entityName,
      }
    );
  };

  const createSubscription = async ({
    subscription,
    tenant,
  }: {
    subscription: Omit<Subscription, "key">;
    tenant: Tenant;
  }): Promise<
    Result<
      Subscription & { key: string },
      { error: "NO_PERMISSION_TO_SUBSCRIBE_TO_THIS_RESOURCE" }
    >
  > => {
    if (!tenant.accessAllowed.some((acc) => acc.owner === subscription.owner)) {
      return err({ error: "NO_PERMISSION_TO_SUBSCRIBE_TO_THIS_RESOURCE" });
    }
    const savedSubScription = { ...subscription, key: crypto.randomUUID() };
    await tenantPersistenceHandler.addSubscription({
      subscription: savedSubScription,
      tenantId: tenant._id,
    });

    return ok(savedSubScription);
  };

  const accessGuard = (
    tenant: Tenant,
    access: Access
  ): Result<true, { error: "NO_ACCESS" }> => {
    if (tenant.name === access.owner) return ok(true);
    const hasAccess = tenant.accessAllowed.some(
      (item) =>
        item.owner === access.owner && item.entityName === access.entityName
    );
    if (!hasAccess) {
      return err({ error: "NO_ACCESS" });
    }
    return ok(true);
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
