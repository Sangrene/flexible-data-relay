import { Access, Tenant } from "./tenant.model.ts";

export interface TenantRepository {
  getTenantById: (tenantId: string) => Promise<Tenant | null>;
  createTenant: (tenant: Omit<Tenant, "_id">) => Promise<Tenant>;
  getAllTenants: () => Promise<Tenant[]>;
  getTenantByName: (tenantName: string) => Promise<Tenant | null>;
  addAllowedAccessToTenant: (
    tenantName: string,
    access: Access
  ) => Promise<Tenant>;
}
