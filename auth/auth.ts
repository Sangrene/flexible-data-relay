import { TenantCore } from "../tenants/tenant.core.ts";
import { Tenant } from "../tenants/tenant.model.ts";
import createJwtService from "./jwtService.ts";

interface AuthServerProps {
  tenantCore: TenantCore;
}

class WrongCredentialsError extends Error {
  constructor() {
    super("Unable to validate credentials");
  }
}

export const createAuthCore = async ({ tenantCore }: AuthServerProps) => {
  const jwtService = await createJwtService();
  const generateTokenFromCredentials = async ({
    clientId,
    clientSecret,
  }: {
    clientId: string;
    clientSecret: string;
  }) => {
    const tenant = await tenantCore.getTenantById(clientId);
    if (tenant.lastSecret !== clientSecret) throw new WrongCredentialsError();
    const token = await jwtService.createJWT({ tenantId: tenant._id });
    return token;
  };

  const getTenantFromToken = async (token: string) => {
    const { tenantId } = await jwtService.verifyJWT(token);
    if (!tenantId) throw new WrongCredentialsError();
    const tenant = await tenantCore.getTenantById(tenantId as string);
    return tenant;
  };

  const accessGuard = async (tenant: Tenant, { owner }: { owner: string }) => {
    const hasAccess = tenant.accessAllowed.some((item) => item.owner === owner);
    if (!hasAccess) throw new Error("You don't have access to this resource");
  };

  return {
    generateTokenFromCredentials,
    getTenantFromToken,
    accessGuard,
  };
};

export type AuthCore = Awaited<ReturnType<typeof createAuthCore>>;
