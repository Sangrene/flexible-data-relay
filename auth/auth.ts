import { TenantRepository } from "../tenants/tenant.persistence.ts";
import createJwtService from "./jwtService.ts";

interface AuthServerProps {
  tenantRepository: TenantRepository;
}

class WrongCredentialsError extends Error {
  constructor() {
    super("Unable to validate credentials");
  }
}

const createAuthServer = async ({ tenantRepository }: AuthServerProps) => {
  const jwtService = await createJwtService();
  const generateTokenFromCredentials = async ({
    clientId,
    clientSecret,
  }: {
    clientId: string;
    clientSecret: string;
  }) => {
    const tenant = await tenantRepository.getTenantById(clientId);
    if (tenant.lastSecret !== clientSecret) throw new WrongCredentialsError();
    const token = await jwtService.createJWT({ tenantId: tenant._id });
    return token;
  };

  const getTenantFromToken = async (token: string) => {
    const { tenantId } = await jwtService.verifyJWT(token);
    if (!tenantId) throw new WrongCredentialsError();
    const tenant = await tenantRepository.getTenantById(tenantId as string);
    return tenant;
  };

  return {
    generateTokenFromCredentials,
    getTenantFromToken,
  };
};

export default createAuthServer;

export type AuthServer = Awaited<ReturnType<typeof createAuthServer>>;
