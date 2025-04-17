import { err, ok, Result } from "neverthrow";
import { Env } from "../env/loadEnv.ts";
import { TenantCore } from "../tenants/tenant.core.ts";
import createJwtService from "./jwtService.ts";

interface AuthServerProps {
  tenantCore: TenantCore;
  env: Env;
}

class WrongCredentialsError extends Error {
  constructor() {
    super("Unable to validate credentials");
  }
}

export const createAuthCore = async ({ tenantCore, env }: AuthServerProps) => {
  const jwtService = await createJwtService(env);
  const generateTokenFromCredentials = async ({
    clientId,
    clientSecret,
  }: {
    clientId: string;
    clientSecret: string;
  }): Promise<
    Result<string, { error: "NO_TENANT_WITH_THIS_ID" | "BAD_CREDENTIALS" }>
  > => {
    const tenant = await tenantCore.getTenantById(clientId);
    if (!tenant) {
      return err({ error: "NO_TENANT_WITH_THIS_ID" });
    }
    if (tenant.lastSecret !== clientSecret) {
      return err({ error: "BAD_CREDENTIALS" });
    }
    const token = await jwtService.createJWT({ tenantId: tenant._id });
    return ok(token);
  };

  const getTenantFromToken = async (token: string) => {
    const { tenantId } = await jwtService.verifyJWT(token);
    if (!tenantId) throw new WrongCredentialsError();
    const tenant = await tenantCore.getTenantById(tenantId as string);
    return tenant;
  };

  const generateAdminTokenFromSecret = async (secret: string) => {
    const adminSecret = env.ADMIN_SECRET;
    if (!adminSecret) return "Admin secret is not setup";
    if (secret !== adminSecret) return "Secret not match";
    const token = await jwtService.createJWT({ admin: true });
    return token;
  };

  const getAdminFromToken = async (token: string) => {
    const { admin } = await jwtService.verifyJWT(token);
    if (!admin) throw new WrongCredentialsError();
    return true;
  };

  return {
    generateTokenFromCredentials,
    getTenantFromToken,
    generateAdminTokenFromSecret,
    getAdminFromToken,
  };
};

export type AuthCore = Awaited<ReturnType<typeof createAuthCore>>;
