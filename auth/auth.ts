import { err, ok, Result } from "neverthrow";
import { Env } from "../env/loadEnv.ts";
import { TenantCore } from "../tenants/tenant.core.ts";
import { Tenant } from "../tenants/tenant.model.ts";
import createJwtService from "./jwtService.ts";

interface AuthServerProps {
  tenantCore: TenantCore;
  env: Env;
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

  const getTenantFromToken = async (
    token: string
  ): Promise<
    Result<Tenant, { error: "NO_TENANT_WITH_THIS_ID" | "BAD_CREDENTIALS" }>
  > => {
    const { tenantId } = await jwtService.verifyJWT(token);
    if (!tenantId) return err({ error: "BAD_CREDENTIALS" });
    const tenant = await tenantCore.getTenantById(tenantId as string);
    if (!tenant) return err({ error: "NO_TENANT_WITH_THIS_ID" });
    return ok(tenant);
  };

  const generateAdminTokenFromSecret = async (
    secret: string
  ): Promise<
    Result<string, { error: "BAD_SECRET" | "NO_ADMIN_SECRET_DEFINED" }>
  > => {
    const adminSecret = env.ADMIN_SECRET;
    if (!adminSecret) return err({ error: "NO_ADMIN_SECRET_DEFINED" });
    if (secret !== adminSecret) return err({ error: "BAD_SECRET" });
    const token = await jwtService.createJWT({ admin: true });
    return ok(token);
  };

  const getAdminFromToken = async (
    token: string
  ): Promise<Result<boolean, { error: "BAD_CREDENTIALS" }>> => {
    const { admin } = await jwtService.verifyJWT(token);
    if (!admin) return err({ error: "BAD_CREDENTIALS" });
    return ok(true);
  };

  return {
    generateTokenFromCredentials,
    getTenantFromToken,
    generateAdminTokenFromSecret,
    getAdminFromToken,
  };
};

export type AuthCore = Awaited<ReturnType<typeof createAuthCore>>;
